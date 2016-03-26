// ==UserScript==
// @name        SoundCloud.com downloader
//
// @include     http://soundcloud.com/*
// @include     http://*.soundcloud.com/*
// @include     https://soundcloud.com/*
// @include     https://*.soundcloud.com/*
// ==/UserScript==

(typeof mono === 'undefined') && (mono = {loadModule: function() {this.loadModuleStack.push(arguments);},loadModuleStack: []});

mono.loadModule('soundcloud', function(moduleName, initData) {
  "use strict";

  var language = initData.getLanguage;
  var preference = initData.getPreference;
  var moduleState = preference.moduleSoundcloud ? 1 : 0;

  mono.onMessage(function(message, cb){
    if (message.action === 'getModuleInfo') {
      if (message.url !== location.href) return;
      return cb({state: moduleState, moduleName: moduleName});
    }
    if (message.action === 'changeState') {
      if (moduleName !== message.moduleName) {
        return;
      }
      return sc.changeState(message.state);
    }
  });

  if (moduleState) {
    mono.asyncCall(function() {
      sc.run();
    });
  }

  var sc = {
    client_id: '02gUJC0hH2ct1EGOcYXQIzRFU91c72Ea',

    lastRow: null,
    timer: 0,
    btnClass: 'savefrom-helper--btn',

    nodeId: 0,

    tracks: {},
    audioElClassList: ['soundList__item', 'searchList__item', 'trackList__item', 'compactTrackList__item', 'soundBadgeList__item'],

    refreshClientId: function() {
      SaveFrom_Utils.bridge({
        func: function(cb) {
          if (typeof webpackJsonp === 'undefined') {
            return;
          }
          webpackJsonp([],{0:function(e,t,n) {
            "use strict";
            var getObjList = function() {
              var list = [];
              for (var key in n) {
                if (!n.hasOwnProperty(key)) {
                  continue;
                }
                var obj = n[key];
                if (typeof obj !== 'object') {
                  continue;
                }
                var hasExports = false;
                for (var key2 in obj) {
                  if (obj[key2].exports) {
                    hasExports = true;
                  }
                  break;
                }
                if (!hasExports) {
                  continue;
                }
                list.push(obj);
              }

              return list;
            };

            var clientId;
            getObjList().some(function(obj) {
              for (var index in obj) {
                var item = obj[index];
                if (!item) {
                  continue;
                }
                var exports = item.exports;
                if (!exports) {
                  continue;
                }
                var _store = exports._store;
                if (!_store) {
                  continue;
                }

                clientId = _store.client_id;
                if (clientId) {
                  break;
                }
              }

              if (clientId) {
                return true;
              }
            });

            cb({client_id: clientId});
          }});
        },
        cb: function(data) {
          if (!data || !data.client_id) {
            return;
          }

          mono.storage.setExpire({
            scClientId: data.client_id
          }, 21600);

          sc.client_id = data.client_id;
        }
      });
    },

    loadClientId: function() {
      mono.storage.getExpire(['scClientId'], function(storage, _storage) {
        if (_storage.scClientId) {
          this.client_id = _storage.scClientId;
        }

        if (!storage.scClientId) {
          this.refreshClientId();
        }
      }.bind(this), 1);
    },

    run: function(){
      moduleState = 1;
      this.loadClientId();

      if (SaveFrom_Utils.mutationWatcher.isAvailable()) {
        this.mutationMode.enable();
      } else {
        mono.off(document, 'mouseenter', sc.onMouseOver, true);
        mono.on(document, 'mouseenter', sc.onMouseOver, true);

        mono.onUrlChange(function (url) {
          sc.handleSingleTrack();
        }, 1);
      }
    },

    changeState: function(state) {
      moduleState = state;
      sc.mutationMode.stop();
      mono.clearUrlChange();
      mono.off(document, 'mouseenter', sc.onMouseOver, true);
      sc.rmBtn();
      if (state) {
        sc.run();
      }
    },

    rmBtn: function() {
      ['sfSkip', 'sfId', 'sfSingle'].forEach(function(attr) {
        var dataAttr = mono.dataAttr2Selector(attr);
        var dataAttrList = document.querySelectorAll('['+dataAttr+']');
        for (var i = 0, item; item = dataAttrList[i]; i++) {
          item.removeAttribute(dataAttr);
        }
      });
      var btnList = document.querySelectorAll('.'+sc.btnClass);
      for (var i = 0, item; item = btnList[i]; i++) {
        item.parentNode.removeChild(item);
      }
    },

    checkOverEl: function(row) {
      var _this = sc;
      if (row.dataset.sfSkip > 0) {
        return;
      }
      row.dataset.sfSkip = '1';

      _this.handleRow.call(_this, row);
    },

    onMouseOver: function(e) {
      var _this = sc;
      var node = e.target;
      if (node.nodeType !== 1) {
        return;
      }

      var row = null;

      for (var i = 0, className; className = _this.audioElClassList[i]; i++) {
        if (node.classList.contains(className)) {
          row = node;
          break;
        }
      }

      if (row === null) {
        return;
      }

      if (!_this.checkOverElTr) {
        _this.checkOverElTr = mono.throttle(_this.checkOverEl, 750);
      }
      _this.checkOverElTr.call(_this, row);
    },


    handleSingleTrack: function()
    {
      var count = 0;

      var timer = setInterval(function(){
        count++;

        var row = document.querySelector('.listenEngagement,.listen-content .visualSound .sound__footer');
        if(row || count > 10)
        {
          clearInterval(timer);
          sc.handleRow(row, 1);
        }
      }, 1000);
    },

    onGotTrackInfo: function(parent, row, info) {
      if (!info) {
        return;
      }
      sc.appendButton(parent, row, info);
    },

    handleRow: function(row, single) {
      if (!row) {
        return;
      }

      var parent = row.querySelector('.soundActions .sc-button-group');
      if(!parent) {
        // console.log('no parent!', row);
        return;
      }

      if(single) {
        if (parent.getElementsByClassName(sc.btnClass).length === 0) {
          sc.getTrackInfo(window.location.href, row, sc.onGotTrackInfo.bind(sc, parent, row));
        }
        return;
      }

      var a = row.querySelector('a.sound__coverArt[href], a.soundTitle__title[href], a.trackItemWithEdit__trackTitle[href], a.trackItem__trackTitle[href], .chartTrack__title>a[href]');
      if(a !== null) {
        sc.getTrackInfo(a.href, row, sc.onGotTrackInfo.bind(sc, parent, row));
        return;
      }
    },


    getTrackInfo: function(url, row, cb) {
      url = url.replace(/#.*$/i, '');

      if(url.search(/^\/\/(?:[\w-]+\.)?soundcloud\.com(?:\d+)?\//i) > -1) {
        url = window.location.protocol + url;
      } else
      if(url.search(/https?:\/\//i) == -1) {
        if(url.charAt(0) != '/') {
          url = '/' + url;
        }

        url = window.location.protocol + '//' + window.location.host + url;
      }

      if (sc.tracks[url] && sc.tracks[url].cbList) {
        sc.tracks[url].cbList.push(cb);
        return;
      }

      if(sc.tracks[url] && !sc.tracks[url].cbList) {
        cb(sc.tracks[url]);
        return;
      }

      var obj = sc.tracks[url] = {
        cbList: [cb]
      };

      var request = {
        action: 'getSoundcloudTrackInfo',
        trackUrl: url,
        client_id: sc.client_id
      };

      mono.sendMessage(request, function(response){
        sc.tracks[url] = sc.setTrackInfo(response);

        var cb;
        while(cb = obj.cbList.shift()) {
          cb(sc.tracks[url]);
        }
      });
    },

    setTrackInfo: function(data) {
      var url = data.trackUrl;
      if(!url) {
        return;
      }
      var tInfo = {};

      var info = data.data;
      if(!info) {
        return;
      }

      if(info.kind != 'track' && info.tracks && info.tracks.length == 1) {
        info = info.tracks[0];
      }

      if(info.kind == 'track' && info.stream_url) {
        sc.setSingleTrackParams(tInfo, info);
        tInfo.checkLinks = data.checkLinks;
        return tInfo;
      }

      if (info.tracks) {
        var playlist = [];
        for(var i = 0, len = info.tracks.length; i < len; i++) {
          var t = {};
          sc.setSingleTrackParams(t, info.tracks[i]);
          playlist.push(t);
        }

        if(playlist.length > 0) {
          if(info.title) {
            tInfo.title = info.title;
          }

          tInfo.playlist = playlist;
          tInfo.checkLinks = data.checkLinks;
          return tInfo;
        }
      }
    },


    setSingleTrackParams: function(track, info) {
      var downloadUrl = info.stream_url;
      downloadUrl += (downloadUrl.indexOf('?') == -1) ? '?' : '&';
      downloadUrl += 'client_id=' + sc.client_id;
      track.url = downloadUrl;

      var param = ['id', 'title', 'duration'];
      for(var i = 0; i < param.length; i++) {
        if(info[param[i]]) {
          track[param[i]] = info[param[i]];
        }
      }

      if (track.title && info.user && info.user.username) {
        track.title = info.user.username + ' - ' + track.title;
      }
    },

    onDlBtnClick: function(e) {
      SaveFrom_Utils.downloadOnClick(e);

      if ([1].indexOf(preference.cohortIndex) !== -1) {
        var isSingle = document.querySelector('.l-listen-engagement');
        var isRecommended = document.querySelector('.sidebarModule .sidebarContent .soundBadgeList');
        var isPlaylistDetail = document.querySelector('.listenDetails .listenDetails__trackList');
        if (isSingle && isSingle.contains(this)) {
          mono.sendMessage({action: 'trackCohort', category: 'soundcloud', event: 'click', label: 'music-single'});
        } else
        if (isRecommended && isRecommended.contains(this)) {
          mono.sendMessage({action: 'trackCohort', category: 'soundcloud', event: 'click', label: 'music-recommend'});
        } else
        if (isPlaylistDetail && isPlaylistDetail.contains(this)) {
          mono.sendMessage({action: 'trackCohort', category: 'soundcloud', event: 'click', label: 'music-playlist-single'});
        } else {
          mono.sendMessage({action: 'trackCohort', category: 'soundcloud', event: 'click', label: 'music-list'});
        }
      }
    },

    appendButton: function(parent, row, info) {
      var track = info;

      // update parent after latency
      if (!document.body.contains(row)) {
        return;
      } else
      if (!document.body.contains(parent)) {
        parent = row.querySelector('.soundActions .sc-button-group');
        if (!parent) {
          return;
        }
      }

      if (row.dataset.sfSkip > 1) {
        return;
      }
      row.dataset.sfSkip = '2';

      var btnClass = ['sc-button-small', 'sc-button-medium', 'sc-button-large'];
      for(var i = 0; i < btnClass.length; i++) {
        if(parent.querySelector('.' + btnClass[i])) {
          btnClass = [btnClass[i]];
        }
      }

      var a = document.createElement('a');

      var sfId = row.dataset.sfId;
      if (sfId) {
        a.dataset.sfParentId = row.dataset.sfId;
      }

      a.className = sc.btnClass + ' sc-button sc-button-responsive ' + btnClass[0];
      a.style.position = 'relative';

      var icon = document.createElement('img');

      if(track.playlist) {
        a.href = '#';
        a.title = language.playlist;

        var title = track.title ? mono.fileName.modify(track.title) : 'soundcloud';

        a.addEventListener('click', function (event) {
          event.preventDefault();
          setTimeout(function () {
            SaveFrom_Utils.playlist.popupPlaylist(track.playlist, title, true);
          }, 100);
        }, false);

        if (track.checkLinks === false) {
          icon.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAAJElEQVQoz2P4//8/A7mYgWqa6+vr/xPCtNE86udRP9PWz6RiANU4hUYGNDpOAAAAAElFTkSuQmCC';
        } else {
          icon.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAAMUlEQVR42mL8//8/A7mAiYECwILC82Uk7IzN/xmpYjPjqJ9H/UxTP1OkGQAAAP//AwDcahUV6UvyJwAAAABJRU5ErkJggg==';
        }
        icon.alt = language.playlist;
      } else {
        if (track.checkLinks === false) {
          a.href = '#';
          a.title = language.noLinksFound;

          a.addEventListener('click', function(e) {
            e.preventDefault();
            var style = {
              backgroundColor: '#fff',
              border: '1px solid #777',
              padding: '2px 5px 3px'
            };
            SaveFrom_Utils.showTooltip(this,language.noLinksFound, undefined, style);
          });

          icon.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAAVklEQVQoz2P4//8/A7mYgSqa0UF9ff1/GEaXG0SagYrmI2vAg+djtZkIA+bjdTYeA+YT5WcsBswnNcDmY9NIlGaoAQnYxHEFGMHQxqe5gRDGqpnuGQMALmDKhkjc9oYAAAAASUVORK5CYII=';
          icon.alt = 'noLinksFound'
        } else {
          a.href = track.url;
          a.title = language.download;

          if(track.title) {
            a.setAttribute('download',
              mono.fileName.modify(track.title.trim() + '.mp3'));

            a.addEventListener('click', this.onDlBtnClick, false);
          }

          icon.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAAPklEQVR42mNgGHTgvw/DfxgexJqBiuYja8CD55NrwHxyXTCfWP/OJ0sjFgPmkxvXCWRFDy6MT3MDITw40j8Ak46HYQ4gDfUAAAAASUVORK5CYII=';
          icon.alt = 'download';
        }
      }

      SaveFrom_Utils.setStyle(icon, {
        width: '15px',
        height: '15px',
        position: 'absolute',
        top: '50%',
        left: '50%',
        margin: '-7px 0 0 -7px'
      });
      a.appendChild(icon);

      parent.appendChild(a);

      icon = null;
      a = null;
      parent = null;
    },
    mutationMode: {
      observer: null,
      stop: function() {
        if (sc.mutationMode.observer) {
          sc.mutationMode.observer.stop();
        }
      },
      enable: function() {
        if (sc.mutationMode.observer) {
          return sc.mutationMode.observer.start();
        }

        var onTrackOverTr = mono.throttle(function() {
          mono.off(this, 'mouseenter', onTrackOverTr);
          if (!moduleState) {
            return;
          }

          sc.handleRow.call(sc, this);
        }, 750);

        sc.mutationMode.observer = SaveFrom_Utils.mutationWatcher.run({
          callback: function(summaryList) {
            var summary, n, i, node;
            for (i = 0; i < 6; i++) {
              summary = summaryList[i];
              for (n = 0; node = summary.added[n]; n++) {
                if (node.dataset.sfSkip > 0) {
                  continue;
                }
                node.dataset.sfSkip = '1';
                node.dataset.sfId = '' + sc.nodeId++;

                mono.on(node, 'mouseenter', onTrackOverTr);
              }
            }
            for (i = 6; i < 8; i++) {
              summary = summaryList[i];
              for (n = 0; node = summary.added[n]; n++) {
                var _node = null;
                if (i === 6) {
                  _node = mono.getParentByClass(node, 'listenEngagement');
                } else {
                  _node = mono.getParentByClass(node, 'visualSound');
                }

                if (_node.dataset.sfSingle > 0) {
                  continue;
                }
                _node.dataset.sfSkip = '1';

                if (_node.classList.contains('streamContext')) {
                  return;
                }

                _node.dataset.sfSingle = '1';

                sc.handleRow(_node, 1);
              }
            }

            summary = summaryList[8];
            for (n = 0; node = summary.removed[n]; n++) {
              node = document.querySelector('[' + mono.dataAttr2Selector('sfId') + '="' + node.dataset.sfParentId + '"]');

              if (!node) {
                return;
              }

              if (node.dataset.sfSingle) {
                return;
              }

              node.dataset.sfSkip = '1';

              if (document.body.contains(node)) {
                sc.handleRow(node);
              }
            }
          },
          queries: [
            {css: 'li.trackList__item', is: 'added'},
            {css: 'li.compactTrackList__item', is: 'added'},
            {css: 'li.searchList__item', is: 'added'},
            {css: 'li.soundList__item', is: 'added'},
            {css: 'li.soundBadgeList__item', is: 'added'},
            {css: 'li.chartTracks__item', is: 'added'},
            {css: 'div.listenEngagement .soundActions .sc-button-group', is: 'added'},
            {css: 'div.visualSound .soundActions .sc-button-group', is: 'added'},
            {css: '.savefrom-helper--btn', is: 'removed'}
          ],
          filterTarget: [
            {css: 'div.waveform__layer'},
            {css: 'a.commentPopover__username'},
            {css: '.commentPopover'},
            {css: 'div.playbackTimeline__timePassed'},
            {css: 'div.commentsList'},
            {css: 'div.commentsList__item'},
            {css: 'div.commentsList__body'}
          ]
        });
      }
    }
  };

}, null, function syncIsActive() {
  "use strict";

  if (mono.isSafari || mono.isGM) {
    if (!mono.checkUrl(document.URL, [
        'http://soundcloud.com/*',
        'http://*.soundcloud.com/*',
        'https://soundcloud.com/*',
        'https://*.soundcloud.com/*'
      ])) {
      return false;
    }
  }

  if (mono.isIframe()) {
    return false;
  }

  return true;
});