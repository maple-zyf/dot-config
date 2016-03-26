// ==UserScript==
// @name        Vkontakte downloader
//
// @include     http://vk.com/*
// @include     http://*.vk.com/*
// @include     http://vkontakte.ru/*
// @include     http://*.vkontakte.ru/*
// @include     https://vk.com/*
// @include     https://*.vk.com/*
// @include     https://vkontakte.ru/*
// @include     https://*.vkontakte.ru/*
// ==/UserScript==

(typeof mono === 'undefined') && (mono = {loadModule: function() {this.loadModuleStack.push(arguments);},loadModuleStack: []});

mono.loadModule('vk', function(moduleName, initData) {
  "use strict";

  var language = initData.getLanguage;
  var preference = initData.getPreference;
  var moduleState = preference.moduleVkontakte ? 1 : 0;
  var allowDownloadMode = mono.isSafari || mono.isChrome || mono.isFF || (mono.isGM && mono.isTM);

  var iframe = mono.isIframe();
  var videoExt = false;

  if (iframe) {
    if (window.location.href.search(/\/video_ext\.php\?.+/) > -1) {
      videoExt = true;
    } else
    if (window.location.href.search(/\/widget_comments\.php\?.+/) !== -1){
      iframe = false;
    } else {
      return;
    }
  }

  mono.onMessage(function(message, cb) {
    if (message.action === 'getModuleInfo') {
      if (message.url !== location.href) return;
      return cb({state: moduleState, moduleName: moduleName});
    }
    if (message.action === 'changeState') {
      if (moduleName !== message.moduleName) {
        return;
      }
      return vk.changeState(message.state);
    }
    if (!moduleState) {
      return;
    }
    if (message.action === 'updateLinks') {
      updateLinks();
    }
    if (message.action === 'downloadMP3Files') {
      if (allowDownloadMode) {
        audio.downloadMP3Files();
      } else {
        audio.showListOfAudioFiles(false);
      }
    }
    if (message.action === 'downloadPlaylist') {
      audio.showListOfAudioFiles(true);
    }
    if (message.action === 'downloadPhotos') {
      photo.downloadPhoto();
    }
  });

  if (moduleState) {
    mono.asyncCall(function() {
      vk.run();
    });
  }

  var vk = {
    contextMenu: null,
    isMutation: false,
    run: function() {
      moduleState = 1;

      if (/m\.vk\.com/.test(location.hostname)) {
        return mVk.run();
      }

      if (videoExt) {
        return video.addFrameBtn();
      }

      photo.injectStyle();

      if (SaveFrom_Utils.mutationWatcher.isAvailable()) {
        vk.isMutation = true;
        audio.addCustomStyle();
        vk.mutationMode.enable();
      } else {
        audio.showLinks();
        /*@if isVkOnly=0>*/
        videoFeed.run();
        /*@if isVkOnly=0<*/

        mono.onUrlChange(function (url) {
          clearTimeout(titleTimer);
          titleTimer = setTimeout(function () {
            removeDownloadLinks();
            video.catchPopup(url);
            photo.showLinks();
          }, 200);
        }, 1);
      }
    },
    changeState: function(state) {
      if (iframe) {
        return;
      }
      moduleState = state;
      removeDownloadLinks();
      mono.clearUrlChange();
      audio.hideLinks();

      videoFeed.off();

      vk.hideMenu();

      photo.rmCurrentPhotoBtn();

      audio.rmBitrate();

      photo.rmPhotoAlbumDlBtn();

      vk.mutationMode.stop();

      if (state) {
        vk.run();
      }
    },
    hideMenu: function() {
      if (vk.contextMenu) {
        vk.contextMenu.hide();
        vk.contextMenu = null;
      }
    },
    mutationMode: {
      observer: null,
      stop: function() {
        if (this.observer) {
          this.observer.stop();
        }

        ['sfSkip'].forEach(function(attr) {
          var dataAttr = mono.dataAttr2Selector(attr);
          var dataAttrList = document.querySelectorAll('['+dataAttr+']');
          for (var i = 0, item; item = dataAttrList[i]; i++) {
            item.removeAttribute(dataAttr);
          }
        });
      },
      wrapAudioOnMouseOver: function(e) {
        mono.off(this, 'mouseenter', vk.mutationMode.wrapAudioOnMouseOver);
        if (!moduleState) {
          return;
        }
        audio.onMouseOver.apply(this, arguments);
      },
      wrapVideoFeedOnMouseOver: function(e) {
        mono.off(this, 'mouseenter', vk.mutationMode.wrapVideoFeedOnMouseOver);
        if (!moduleState) {
          return;
        }
        videoFeed.onLinkHover.apply(this, arguments);
      },
      enable: function() {
        if (this.observer) {
          return this.observer.start();
        }

        this.observer = SaveFrom_Utils.mutationWatcher.run({
          callback: function(summaryList) {
            var summary, n, i, node;

            for (i = 0; i < 6; i++) {
              summary = summaryList[i];
              for (n = 0; node = summary.added[n]; n++) {
                if (node.dataset.sfSkip > 0) {
                  continue;
                }
                node.dataset.sfSkip = '1';

                mono.on(node, 'mouseenter', vk.mutationMode.wrapAudioOnMouseOver);
              }
            }

            summary = summaryList[6];
            for (n = 0; node = summary.added[n]; n++) {
              if (node.dataset.sfSkip > 0) {
                continue;
              }
              node.dataset.sfSkip = '1';

              mono.on(node, 'mouseenter', vk.mutationMode.wrapVideoFeedOnMouseOver);
            }

            for (i = 7; i < 13; i++) {
              summary = summaryList[i];
              for (n = 0; node = summary.added[n]; n++) {
                if (node.dataset.sfSkip > 0) {
                  continue;
                }
                node.dataset.sfSkip = '1';

                var layer = SaveFrom_Utils.getParentById(node, 'mv_box');
                video.getLinksFromPlayer(layer, node, video.appendButton);
              }
            }

            for (i = 13; i < 15; i++) {
              summary = summaryList[i];
              for (n = 0; node = summary.added[n]; n++) {
                if (node.dataset.sfSkip > 0) {
                  continue;
                }
                node.dataset.sfSkip = '1';

                photo.addPhotoAlbumDlBtn(node);
              }
            }

            summary = summaryList[15];
            for (n = 0; node = summary.added[n]; n++) {
              if (node.dataset.sfSkip > 0) {
                continue;
              }
              node.dataset.sfSkip = '1';

              var layer = SaveFrom_Utils.getParentById(node, 'layer_wrap');
              var pvPhoto = layer && layer.querySelector('#pv_photo');
              pvPhoto && photo.addDlCurrentPhotoBtn(pvPhoto);
            }

            summary = summaryList[16];
            for (n = 0; node = summary.added[n]; n++) {
              if (node.dataset.sfSkip > 0) {
                continue;
              }
              node.dataset.sfSkip = '1';

              var layer = SaveFrom_Utils.getParentById(node, 'wk_layer_wrap');
              var pvPhoto = layer && layer.querySelector('#pv_photo');
              pvPhoto && photo.addDlCurrentPhotoBtn(pvPhoto);
            }

            summary = summaryList[17];
            for (n = 0; node = summary.removed[n]; n++) {
              mono.onRemoveListener(node);
            }
          },
          queries: [
            {css: '#ac_performer', is: 'added'},
            {css: '#pd_performer', is: 'added'},
            {css: '#gp_performer', is: 'added'},
            {css: '.audio', is: 'added'},
            {css: '.audioRow', is: 'added'},
            {css: '.audioRowWall', is: 'added'},

            {css: '.post_video_desc a.lnk', is: 'added'},

            {css: '#mv_box #video_player', is: 'added'},
            {css: '#mv_box #html5_player', is: 'added'},
            {css: '#mv_box #flash_video_obj', is: 'added'},
            {css: '#mv_box #video_yt_player', is: 'added'},
            {css: '#mv_box #playerObj', is: 'added'},
            {css: '#mv_box #player', is: 'added'},

            {css: '#photos_albums_container', is: 'added'},
            {css: '#photos_container', is: 'added'},

            {css: '#layer_wrap #pv_open_original', is: 'added'},
            {css: '#wk_layer_wrap #pv_open_original', is: 'added'},

            {css: '.' + mono.onRemoveClassName, is: 'removed'}
          ]
        });
      }
    }
  };

  var domain = window.location.hostname.replace(/^(?:[\w\-]+\.)*(\w+\.[a-z]{2,6})$/i, '$1');
  var downloadLinkClassName = 'savefrom_vk_download';
  var titleTimer = 0;


  var updateLinks = function () {
    vk.changeState(0);
    vk.changeState(1);
  };


  var createTextLink = function (href, text, blank) {
    if(blank == undefined)
      blank = true;

    var a = document.createElement('a');
    a.href = href;
    a.className = downloadLinkClassName;
    a.textContent = text;

    if(blank)
      a.setAttribute('target', '_blank');

    return a;
  };


  var removeDownloadLinks = function () {
    var selector = 'a.' + downloadLinkClassName +
      ',div.' + downloadLinkClassName +
      ',span.' + downloadLinkClassName;

    audio.lastRow = null;
    videoFeed.lastLink = undefined;

    var e = document.querySelectorAll(selector);
    for(var i = e.length-1; i >= 0; i--) {
      if (audio.elIsHidden(e[i])) {
        e[i].parentNode.removeChild(e[i]);
      }
    }
  };

  var getFolderName = function () {
    var folderName = document.title;
    var sep = folderName.indexOf('|');
    if (sep !== -1) {
      folderName = folderName.substr(0, sep -1);
    }

    return mono.fileName.modify(folderName);
  };


  ///////////////////////////////////////////////////////////////////
  //  AUDIO

  var audio = {
    audioElClassList: ['audio', 'audioRow', 'audioRowWall'],
    lastRow: null,
    className: downloadLinkClassName,

    getMp3Link: function(elID, cb) {
      var audioId = elID.split('_');
      var ownerId = audioId[0];
      audioId = audioId[1];
      mono.request({
        type: 'POST',
        data: 'act=reload_audio&al=1&audio_id=' + audioId + '&owner_id=' + ownerId,
        url: document.location.protocol + '//' + domain + '/audio',
        localXHR: true
      }, function(err, resp, data) {
        if (err || !data) {
          return cb();
        }

        data = data.substr(data.indexOf('['));
        try {
          var arr = JSON.parse(data);
          var src = arr[0];
          var duration = parseInt(arr[1]) || undefined;
          cb(elID, src, duration);
        } catch(e) {
          cb();
        }
      });
    },

    getLinksFromJson: function(albumData, list, onSuccess, onError) {
      if (!list['all']) {
        return onError();
      }
      var trackList = [];
      var linkList = {};
      for (var i = 0, item; item = list['all'][i]; i++) {
        if (albumData.aId !== undefined && item[8] !== albumData.aId) {
          continue;
        }
        var aId = item[0]+'_'+item[1];
        if (linkList[aId] !== undefined) {
          continue;
        }
        var url = item[2];
        var title = mono.fileName.decodeSpecialChars(mono.decodeUnicodeEscapeSequence(item[5] + ' - ' + item[6]));

        trackList.push({
          url: url,
          title: title,
          filename: mono.fileName.modify(title + '.mp3')
        });
        linkList[aId] = url;
      }

      if (trackList.length === 0) {
        return onError();
      }
      onSuccess(linkList, trackList);
    },

    getAudioLinksViaAPI: function(albumData, onSuccess, onError, reSend) {
      var url = document.location.protocol + '//' + domain + '/' + albumData.page;
      var params = {
        act: 'load_audios_silent',
        al: 1
      };
      if (albumData.gid !== undefined) {
        params.gid = albumData.gid;
      }
      if (albumData.id !== undefined) {
        params.id = albumData.id;
      }
      if (albumData.please_dont_ddos === undefined) {
        albumData.please_dont_ddos = 2;
      }
      params.please_dont_ddos = albumData.please_dont_ddos;
      var post = mono.param(params);
      if (reSend === undefined) {
        reSend = 0;
      }
      var _this = this;
      var onXhrError = function() {
        if (reSend > 2) {
          return onError();
        }
        setTimeout(function() {
          _this.getAudioLinksViaAPI(albumData, onSuccess, onError, ++reSend);
        }, 250);
      };
      mono.request({
        type: 'POST',
        url: url,
        data: post,
        timeout: 60 * 1000,
        localXHR: true
      }, function(err, resp, data){
        if (err) {
          return onXhrError();
        }

        if (!data) {
          return onError();
        }

        var regexp1 = /\"/g;
        data = data.split('<!>');
        for (var n = 0, len = data.length; n < len; n++) {
          var str = data[n];
          if (str.indexOf('{') !== 0) {
            continue;
          }
          try {
            str = str.replace(/\'/g, '"').replace(/<([^>]*)>/g, function(str, arg1) {
              var r = arg1.replace(regexp1, '\'');
              return '<'+r+'>';
            });
            var list = JSON.parse(str);
          } catch (e) {
            return onError();
          }
          return _this.getLinksFromJson.call(_this, albumData, list, onSuccess, onError);
        }
        onError();
      });
    },

    getLinksFromAlbum: function(albumData, cb) {
      this.getAudioLinksViaAPI(albumData, cb, function onError() {
        cb();
      });
    },

    getAlbumId: function(url) {
      var albumData = undefined;
      var m1 = url.match(/audios(\d+)/);
      if (m1 !== null) {
        albumData = {page: 'audio', id: m1[1], gid: 0};
      }
      var m1 = url.match(/audios-(\d+)/);
      if (m1 !== null) {
        albumData = {page: 'audio', id: 0, gid: m1[1]};
      }
      var allowArgs = false;
      var aId = url.match(/album_id=(\d+)/);
      if (aId) {
        albumData.aId = aId[1];
        allowArgs = true;
      }
      if (allowArgs === false) {
        var friendId = url.match(/friend=(\d+)/);
        if (friendId) {
          delete albumData.gid;
          albumData.id = friendId[1];
          albumData.please_dont_ddos = 3;
          allowArgs = true;
        }
      }

      if (allowArgs === false && url.indexOf('?') !== -1) {
        return;
      }
      return albumData;
    },

    getAudioLinks: function(container, cb, noAlbum) {
      var _this = this;
      container = container || document;
      var singleEl = container !== document;

      if (noAlbum === undefined && !singleEl) {
        var albumData = this.getAlbumId(location.href);
        if (albumData) {
          return this.getLinksFromAlbum(albumData, function(linkList, trackList) {
            if (!linkList) {
              return _this.getAudioLinks(container, cb, 1);
            }
            cb(linkList, trackList);
          });
        }
      }

      var durationList = {};
      var linkList = {};
      var audioId = null;
      var audioUrl = null;

      var img = container.querySelectorAll('img.playimg');
      for (var i = 0, el; el = img[i]; i++) {
        if (!singleEl && _this.elIsHidden(el)) {
          continue;
        }
        var onclick = el.getAttribute('onclick');
        if (onclick === null || onclick.search(/(operate|operatewall)/i) === -1) {
          continue;
        }
        if (photo.isReply(el)) {
          continue;
        }

        audioId = null;
        audioUrl = null;
        var r = onclick.match(/(?:operate|operatewall)\s*\x28\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\x22\x27](\w+)[\x22\x27]/i);
        if (r && r.length > 4) {
          audioId = r[1];
          audioUrl = 'http://cs' + r[2] + '.' + domain + '/u' + r[3] + '/audio/' + r[4] + '.mp3';
        } else {
          r = onclick.match(/(?:operate|operatewall)\s*\x28\s*[\x22\x27]?([\w\-]+)[\x22\x27]?\s*,\s*[\x22\x27](https?:\/\/[\w\_]+\.(?:vkontakte\.ru|vk\.com)\/u\d+\/audio\/\w+\.mp3)[\x22\x27]/i);
          if (r && r.length > 2) {
            audioId = r[1];
            audioUrl = r[2];
          }
        }

        if(!audioId && el.id && el.id.search(/^imgbutton/i) !== -1) {
          audioId = el.id.replace(/^imgbutton/i, '');
        }

        linkList[audioId] = audioUrl;
      }

      var wait_link = 0;
      var ready_link = 0;
      var gotLink = function (audioId, src, duration) {
        ready_link++;
        if (src) {
          linkList[audioId] = src;
        }
        if (duration) {
          durationList[audioId] = duration;
        }
        if (wait_link !== ready_link) {
          return;
        }
        cb(linkList, undefined, durationList);
      };

      var play = container.querySelectorAll(['div.play', 'div.play_new']);
      for(var i = 0, el; el = play[i]; i++) {
        if (!el.id || (!singleEl && _this.elIsHidden(el))) {
          continue;
        }
        if (photo.isReply(el)) {
          continue;
        }
        audioId = el.id.replace(/^[^\d]+?(\-?\d+.+)$/i, '$1');
        var info = document.getElementById('audio_info' + audioId);
        if (info === null || !info.value) {
          continue;
        }
        var infoValue = info.value;
        audioUrl = SaveFrom_Utils.getMatchFirst(infoValue, /(https?:\/\/.+\.mp3)/i);
        if(audioUrl) {
          linkList[audioId] = infoValue;
          var extraPos = infoValue.indexOf('extra=');
          if (extraPos !== -1) {
            var duration = infoValue.substr(infoValue.indexOf(',', extraPos) + 1);
            duration = parseInt(duration);
            if (!isNaN(duration)) {
              durationList[audioId] = duration;
            }
          }
        } else
        if (cb !== undefined) {
          wait_link++;
          audio.getMp3Link(audioId, gotLink);
        }
      }

      if (wait_link === 0) {
        cb(linkList, undefined, durationList);
      }
    },

    getTitle: function(container, id) {
      if(!id || !container) {
        return '';
      }

      var name = '';

      var performer = container.querySelector('#performer' + id);
      if(performer === null) {
        performer = container.querySelector('#performerWall' + id);
      }
      if(performer === null) {
        performer = container.querySelector('.info b');
      }

      var title = container.querySelector('#title' + id);
      if(title === null) {
        title = container.querySelector('#titleWall' + id);
      }
      if(title === null) {
        title = container.querySelector('span.title');
      }

      if(performer !== null && performer.textContent) {
        name += performer.textContent.trim();
      }

      if(title !== null && title.textContent) {
        if(name) {
          name += ' - ';
        }

        name += title.textContent.trim();
      }

      if(name) {
        return name.replace(/\<a\s+[^\>]+\>/ig, '').replace(/\<\/a\>/ig, '');
      }

      return '';
    },

    secondsFromDuration: function(value) {
      var m = value.match(/^(?:\s*(\d+)\s*\:)?\s*(\d+)\s*\:\s*(\d+)/);
      if(m && m.length > 3) {
        if(!m[1]) {
          m[1] = 0;
        }

        return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]);
      }

      return 0;
    },

    secondsFromDurationNode: function(node) {
      if(!node) {
        return 0;
      }

      var text = node.textContent;
      if(!text) {
        return 0;
      }

      return this.secondsFromDuration(text);
    },

    tooltip: {
      tooltip: undefined,
      updatePos: function(button, options) {
        var btnPosition = SaveFrom_Utils.getPosition(button);
        var size = SaveFrom_Utils.getSize(this.tooltip);

        this.tooltip.style.top = (btnPosition.top + options.top - size.height)+'px';

        var left = btnPosition.left + parseInt(options.width / 2) - parseInt(size.width / 2);
        var pageWidth = document.body.clientWidth + document.body.scrollLeft;
        if (pageWidth < left + size.width) {
          left = pageWidth -  size.width;
        }
        this.tooltip.style.left = left + 'px';
      },
      show: function(button, options) {
        var _this = this;
        if (this.tooltip !== undefined) {
          this.hide();
        } else {
          this.tooltip = mono.create('div', {
            class: 'sf-tooltip',
            style: mono.extend({
              position: 'absolute',
              display: 'none',
              zIndex: 9999,
              opacity: 0,
              transition: 'opacity 0.2s',
              whiteSpace: 'nowrap'
            }, options.style),
            on: ['mouseenter', function(e) {
              _this.hide();
            }]
          });
          document.body.appendChild(this.tooltip);
        }
        this.tooltip.style.display = 'block';

        setTimeout(function() {
          _this.updatePos(button, options);
          _this.tooltip.style.opacity = 1;
        });

        return this.tooltip;
      },
      hide: function() {
        this.tooltip.style.opacity = 0;
        this.tooltip.style.display = 'none';
      }
    },

    rmBitrate: function() {
      if (audio.rmBitrate.style === undefined) {
        document.body.appendChild(audio.rmBitrate.style = mono.create('style', {
          text: '.sf-bitrate-value {display: none;}'
        }));
      }
      var bitrateList = document.querySelectorAll('.sf-bitrate-value');
      for (var i = 0, item; item = bitrateList[i]; i++) {
        item.parentNode.removeChild(item);
      }
    },

    insertBitrate: function(bitrate, actionCntainer) {
      if (!bitrate || !actionCntainer || !actionCntainer.classList.contains('actions')) {
        return;
      }
      var durationContainer = actionCntainer.nextElementSibling;
      if (!durationContainer || !durationContainer.classList.contains('duration')) {
        return;
      }

      if (audio.rmBitrate.style !== undefined) {
        audio.rmBitrate.style.parentNode.removeChild(audio.rmBitrate.style);
        audio.rmBitrate.style = undefined;
      }

      var ex = durationContainer.querySelector('span.sf-bitrate-value');
      if (ex !== null) {
        return;
      }
      var el = mono.create('span', {
        text: ' '+bitrate,
        class: 'sf-bitrate-value',
        style: {
          position: 'absolute',
          width: '80px',
          textAlign: 'right',
          right: 0,
          top: '21px',
          opacity: '0.8'
        }
      });
      durationContainer.appendChild(el);
    },

    onDlBtnOver: function(e) {
      var tooltip = audio.tooltip;
      if (e.type !== 'mouseenter') {
        tooltip.hide();
        return;
      }
      var _this = this;

      var options = undefined;
      var ttp = tooltip.show(_this, options = {
        top: -6,
        width: 24,
        style: {
          backgroundColor: '#fff',
          border: '1px solid #ccc',
          color: 'rgb(48, 48, 48)'
        }
      });
      var dataBitrate = _this.dataset.bitrate;
      var dataSize = _this.dataset.size;
      if (dataBitrate || dataSize) {
        if (dataBitrate) {
          audio.insertBitrate(dataBitrate, _this.parentNode);
          dataBitrate = ' ~ ' + dataBitrate;
        }
        ttp.style.padding = '2px 5px 3px';
        ttp.textContent = ' (' + dataSize + dataBitrate + ')';
        return;
      }
      ttp.style.padding = '2px 2px 0 2px';
      ttp.textContent = '';
      ttp.appendChild(mono.create('img', {
        src: '/images/upload.gif',
        height: 8,
        width: 32,
        style: {
          marginTop: '2px',
          marginBottom: '1px'
        }
      }));

      audio.onOverInsertBitrate(_this, _this.parentNode, function(response) {
        ttp.style.padding = '2px 5px 3px';
        if (!response.fileSize) {
          ttp.textContent = language.getFileSizeFailTitle;
          tooltip.updatePos(_this, options);
          return;
        }
        var size = _this.dataset.size;
        var bitrate = _this.dataset.bitrate;

        if (bitrate) {
          bitrate = ' ~ ' + bitrate;
        }

        ttp.textContent = ' (' + size + bitrate + ')';

        tooltip.updatePos(_this, options);
      });
    },

    getDlBtn: function(url, filename, duration, rowId) {
      var args = {
        href: url,
        class: [audio.className, 'sf-audio-btn'],
        data: {
          duration: duration || '',
          rowId: rowId
        },
        style: {
          width: '16px',
          height: '16px',
          verticalAlign: 'middle'
        },
        on: [
          ['mouseenter', this.onDlBtnOver],
          ['mouseleave', this.onDlBtnOver]
        ]
      };
      if (filename) {
        args.download = mono.fileName.modify(filename);
        args.on.push(['click', function(e) {
          SaveFrom_Utils.downloadOnClick(e, null, {
            useFrame: true
          });

          var rowList = document.querySelectorAll('#'+this.dataset.rowId);
          for (var i = 0, row; row = rowList[i]; i++) {
            row.style.backgroundColor = '#f4f7fc';
          }

          if ([1].indexOf(preference.cohortIndex) !== -1 && this.parentNode) {
            if (this.parentNode.id === 'gp_performer') {
              mono.sendMessage({action: 'trackCohort', category: 'vk', event: 'click', label: 'music-player'});
            } else
            if (['pd_performer', 'ac_performer'].indexOf(this.parentNode.id) !== -1) {
              mono.sendMessage({action: 'trackCohort', category: 'vk', event: 'click', label: 'music-playnow'});
            } else {
              mono.sendMessage({action: 'trackCohort', category: 'vk', event: 'click', label: 'music-list'});
            }
          }
        }]);
      }
      if (mono.isGM || mono.isOpera || mono.isSafari) {
        args.title = language.downloadTitle;
      }
      return mono.create('a', args);
    },

    onOverInsertBitrate: function(dlBtn, actions, cb) {
      var onResponse = function(response) {
        if (!response.fileSize) {
          cb && cb(response);
          return;
        }

        var size = SaveFrom_Utils.sizeHuman(response.fileSize, 2);
        var bitrate = '';
        if (dlBtn.dataset.duration) {
          bitrate = Math.floor((response.fileSize / dlBtn.dataset.duration) / 125) + ' ' + language.kbps;
        }

        dlBtn.dataset.bitrate = bitrate;
        dlBtn.dataset.size = size;

        audio.insertBitrate(bitrate, actions);

        cb && cb(response);
      };
      try {
        mono.sendMessage({action: 'getFileSize', url: dlBtn.href}, onResponse);
      } catch (e) {
        onResponse({});
      }
    },

    handleAudioRow: function(container, audioId, url, duration) {
      if (container && container.id !== 'audio'+audioId) {
        container = null;
      }
      if (!container) {
        container = document.getElementById('audio'+audioId);
      }
      if (!container || !url) {
        return;
      }

      var data = container.querySelectorAll(['.info', 'div.actions', 'div.duration']);
      if (data.length !== 3) {
        return;
      }
      var _data = [null, null, null];
      for (var n = 0, el; el = data[n]; n++) {
        if (el.classList.contains('info')) {
          _data[0] = el;
        } else
        if (el.classList.contains('actions')) {
          _data[1] = el;
        } else
        if (el.classList.contains('duration')) {
          _data[2] = el;
        }
      }
      data = _data;

      var info = data[0];
      info.style.position = 'relative';

      if (!duration) {
        duration = data[2];
        duration = this.secondsFromDurationNode(duration);
      }

      var actions = data[1];

      var title = this.getTitle(container, audioId);
      var filename = title ? title + '.mp3' : '';

      var rowId = container.id;

      var dlBtn = this.getDlBtn(url, filename, duration, rowId);

      var style = {};

      if (actions.childNodes.length === 0 || actions.querySelectorAll(['div.audio_edit_wrap', 'div.audio_remove_wrap', 'div.audio_add_wrap:not(.unshown)']).length === 0) {
        if (!mono.matches(info, '.post_media ' + info.tagName)) {
          if (mono.matches(info, '.pad_audio_table ' + info.tagName)) {
            style.margin = '9px 40px 9px 0';
          } else {
            if (mono.matches(info, '#profile_audios ' + info.tagName)) {
              style.marginRight = '35px';
            } else {
              style.margin = '6px 6px 6px 0';
            }
          }
        } else
        if (mono.matches(info, '.audio_list ' + info.tagName)) {
          style.padding = '0';
        }
      } else {
        audio.insertTitleWrapStyle(info);

        if (mono.matches(info, '.pad_audio_table ' + info.tagName)) {
          if (mono.matches(info, '.post_info ' + info.tagName)) {
            style.margin = '0 7px 0 0';
          } else {
            style.margin = '9px 7px 0 0';
          }
        }
      }
      style.zIndex = 2;
      dlBtn.classList.add('audio_edit_wrap');
      dlBtn.classList.add('fl_r');
      SaveFrom_Utils.setStyle(dlBtn, style);

      if(preference.vkShowBitrate === 1) {
        this.onOverInsertBitrate(dlBtn, actions);
      }

      actions.appendChild(dlBtn);
    },

    handleCurrentAudioRow: function(container, data) {
      var duration = parseInt(data[3]);
      if (isNaN(duration)) {
        duration = undefined;
      }
      var url = data[2];

      if (!duration) {
        duration = this.secondsFromDuration(data[4]);
      }
      var title = data[5] + ' - ' + data[6];
      var filename = title ? title + '.mp3' : '';

      var rowId = 'audio'+data[0]+'_'+data[1];

      var dlBtn = this.getDlBtn(url, filename, duration, rowId);
      dlBtn.classList.remove('sf-audio-btn');
      SaveFrom_Utils.setStyle(dlBtn, {
        background: 'url('+SaveFrom_Utils.svg.getSrc('download', '#6C8CAC')+') center no-repeat',
        backgroundSize: '12px',
        width: '12px',
        height: '12px',
        padding: 0,
        margin: 0,
        cssFloat: 'left',
        marginRight: '3px',
        marginTop: '1px',
        marginBottom: '-2px'
      });

      vk.isMutation && mono.onRemoveEvent(dlBtn, function() {
        mono.on(container, 'mouseenter', vk.mutationMode.wrapAudioOnMouseOver);
      });

      container.insertBefore(dlBtn, container.firstChild);
    },

    addDlTrackBtn: function(container) {
      var _this = this;
      this.getAudioLinks(container, function(linkList, trackList, durationList) {
        if (!durationList) {
          durationList = {};
        }
        if (container) {
          container.dataset.sfAddingBtn = '0';
        }
        for (var audioId in linkList) {
          _this.handleAudioRow.call(_this, container, audioId, linkList[audioId], durationList[audioId]);
        }
      });
    },

    getCurrentTrack: function(data) {
      if (data.pad_lastsong) {
        try {
          return JSON.parse(data.pad_lastsong);
        } catch (e) {}
      }

      if (data.audio_id && data.pad_playlist) {
        try {
          data.audio_id = JSON.parse(data.audio_id);
          data.pad_playlist = JSON.parse(data.pad_playlist);
          if (data.pad_playlist[data.audio_id]) {
            return data.pad_playlist[data.audio_id];
          }
        } catch (e) {}
      }

      if (data.lastSong) {
        return data.lastSong;
      }

      if (data.defaultTrack) {
        return data.defaultTrack;
      }
    },

    addDlCurrentTrackBtn: function(container) {
      var _this = this;
      SaveFrom_Utils.bridge({
        args: [
          ['pad_lastsong', 'pad_playlist', 'audio_id']
        ],
        func: function(itemList, cb) {
          var stData = {};
          for (var i = 0, item; item = itemList[i]; i++) {
            stData[item] = localStorage[item];
          }
          if (typeof cur !== 'undefined') {
            stData.defaultTrack = cur.defaultTrack;
          }
          if (typeof audioPlayer !== "undefined") {
            stData.lastSong = audioPlayer.lastSong;
          }
          cb(stData);
        },
        cb: function(data) {
          container.dataset.sfAddingBtn = '0';
          if (!data) {
            return;
          }

          data = audio.getCurrentTrack(data);
          if (!data) {
            return;
          }

          _this.handleCurrentAudioRow(container, data);
        },
        timeout: 300
      });
    },

    onMouseOver: function(e) {
      var _this = audio;
      var node = e.target;
      if (node.nodeType !== 1) {
        return;
      }
      var isCurrentTrack = 0;
      var row = null;
      if (['ac_performer','pd_performer', 'gp_performer'].indexOf(node.id) !== -1) {
        row = node;
        isCurrentTrack = 1;
      }
      if (row === null) {
        for (var i = 0, className; className = _this.audioElClassList[i]; i++) {
          if (node.classList.contains(className)) {
            row = node;
            break;
          }
        }
      }
      if (row === null || row.dataset.sfAddingBtn === '1' || row.getElementsByClassName(audio.className).length !== 0) {
        return;
      }
      row.dataset.sfAddingBtn = '1';

      if (isCurrentTrack === 0) {
        _this.addDlTrackBtn.call(_this, row);
      } else {
        _this.addDlCurrentTrackBtn.call(_this, row);
      }
    },

    insertTitleWrapStyle: function(info) {
      if (audio.insertTitleWrapStyle.ready) {
        return;
      }

      if (!mono.matches(info, '#audio.new ' + info.tagName) && !mono.matches(info, '#pad_playlist_panel ' + info.tagName)) {
        return;
      }

      var titleWrapNode = info.querySelector('.title_wrap');
      if (!titleWrapNode) {
        return;
      }

      var width = parseInt(SaveFrom_Utils.getStyle(titleWrapNode, 'width')) - 20;
      if (isNaN(width)) {
        return;
      }

      audio.insertTitleWrapStyle.ready = true;
      SaveFrom_Utils.addStyleRules('#audio.new .audio.over .title_wrap', {
        width: width + 'px !important'
      }, 'sf-audio');

      SaveFrom_Utils.addStyleRules('#pad_playlist_panel .audio.over .title_wrap', {
        width: width + 'px !important'
      }, 'sf-audio');
    },

    addCustomStyle: function() {
      if (this.addCustomStyle.hasStyle === 1) {
        return;
      }
      this.addCustomStyle.hasStyle = 1;

      var currentStyle = document.querySelector('#savefrom-styles.sf-audio');
      if (currentStyle) {
        currentStyle.parentNode.removeChild(currentStyle);
      }

      audio.insertTitleWrapStyle.ready = false;

      SaveFrom_Utils.addStyleRules('.' + downloadLinkClassName+'.sf-audio-btn', {
        'background': 'url('+SaveFrom_Utils.svg.getSrc('download', '#5f7fa2')+') center no-repeat !important',
        'opacity': '0.4'
      }, 'sf-audio');

      SaveFrom_Utils.addStyleRules('#audio.new .audio.current.over .area .' + downloadLinkClassName+'.sf-audio-btn,' +
        '#pad_playlist .audio.current.over .area .' + downloadLinkClassName+'.sf-audio-btn', {
        'background': 'url('+SaveFrom_Utils.svg.getSrc('download', '#FFFFFF')+') center no-repeat !important'
      }, 'sf-audio');

      SaveFrom_Utils.addStyleRules('.audios_module .module_body .audio .actions .' + downloadLinkClassName +','+
        '#choose_audio_rows .audio .actions .' + downloadLinkClassName, {
        verticalAlign: 'top',
        margin: '7px'
      }, 'sf-audio');

      SaveFrom_Utils.addStyleRules('.audio.no_actions .actions .' + downloadLinkClassName, {
        'margin-right': '38px !important'
      }, 'sf-audio');

      SaveFrom_Utils.addStyleRules('.audio .actions .' + downloadLinkClassName, {
        'display': 'none'
      }, 'sf-audio');

      SaveFrom_Utils.addStyleRules('.audio.over .actions .' + downloadLinkClassName, {
        'display': 'block'
      }, 'sf-audio');

      SaveFrom_Utils.addStyleRules('.audio.over .actions .' + downloadLinkClassName+':hover', {
        'opacity': '1 !important'
      }, 'sf-audio');

      SaveFrom_Utils.addStyleRules('.audio.current .sf-bitrate-value', {
        'visibility': 'hidden'
      }, 'sf-audio');

      SaveFrom_Utils.addStyleRules('#audios_list .post_friends .post_table .post_media.wall_audio .actions .' + downloadLinkClassName, {
        margin: '2px 2px 0 0'
      }, 'sf-audio');

      SaveFrom_Utils.addStyleRules('#audios_list .post_friends .post_table .post_media.wall_audio .audio.current.over .actions .' + downloadLinkClassName + ',' +
        '#pad_playlist .post_info .audio.current.over .actions .' + downloadLinkClassName, {
        'background': 'url('+SaveFrom_Utils.svg.getSrc('download', '#5f7fa2')+') center no-repeat !important'
      }, 'sf-audio');
    },

    hideLinks: function() {
      if (this.addCustomStyle.hasStyle) {
        this.addCustomStyle.hasStyle = 0;

        var currentStyle = document.querySelector('#savefrom-styles.sf-audio');
        if (currentStyle) {
          currentStyle.parentNode.removeChild(currentStyle);
        }

        SaveFrom_Utils.addStyleRules('.' + downloadLinkClassName, {
          'display': 'none'
        }, 'sf-audio');
      }
      mono.off(document, 'mouseenter', this.onMouseOver, true);
      if (audio.tooltip.tooltip) {
        audio.tooltip.tooltip.parentNode.removeChild(audio.tooltip.tooltip);
        audio.tooltip.tooltip = undefined;
      }
    },

    showLinks: function() {
      this.addCustomStyle();
      mono.off(document, 'mouseenter', this.onMouseOver, true);
      mono.on(document, 'mouseenter', this.onMouseOver, true);
    },

    elIsHidden: function isHidden(el) {
      return (el.offsetParent === null)
    },

    getTitleForLinkList: function(linkList) {
      var list = [];
      if (!linkList) {
        return list;
      }
      for(var i in linkList) {
        var id = i;
        var row = document.getElementById('audio' + id);
        if (row === null) {
          continue;
        }
        var title = audio.getTitle(row, id);

        var duration = 0;
        var d = row.querySelector('div.duration');
        if(d !== null) {
          duration = audio.secondsFromDurationNode(d);
        }

        var filename = mono.fileName.modify(title ? title + '.mp3' : '');

        list.push({url: linkList[i], filename: filename, title: title, duration: duration});
      }
      return list;
    },

    downloadMP3Files: function() {
      var container = photo.getLayer() || document;
      audio.getAudioLinks(container, function(linkList, trackList) {
        var list = trackList || audio.getTitleForLinkList(linkList);

        if (list.length === 0) {
          return alert(language.vkMp3LinksNotFound);
        }
        // mp3
        SaveFrom_Utils.downloadList.showBeforeDownloadPopup(list, {
          type: 'audio',
          folderName: getFolderName()
        });
      });
    },

    showListOfAudioFiles: function(showPlaylist) {
      var container = photo.getLayer() || document;
      audio.getAudioLinks(container, function(linkList, trackList) {
        var list;
        if(showPlaylist) {
          list = trackList || audio.getTitleForLinkList(linkList);

          if(list.length !== 0) {
            return SaveFrom_Utils.playlist.popupPlaylist(list, getFolderName(), true);
          }
        } else {
          list = [];
          for(var i in linkList) {
            list.push({url: linkList[i]});
          }

          if(list.length !== 0) {
            return SaveFrom_Utils.playlist.popupFilelist(list);
          }
        }

        alert(language.vkMp3LinksNotFound);
      });
    }
  };

  //  /AUDIO
  ///////////////////////////////////////////////////////////////////



  ///////////////////////////////////////////////////////////////////
  //  VIDEO

  var video = {
    panelId: 'savefrom__vk_video_links',
    videoAttr: 'data-savefrom-video',
    hiddenAttr: 'data-savefrom-hidden',
    btnBoxId: 'sf-iframe-dl-btn',
    btnBox: null,
    style: {fontSize: '10pt', margin: '15px 0', padding: '0'},

    isVideoPageRegExp: /video(-?[0-9]+)_([0-9]+)/,

    lastWaitChange: undefined,

    waitChange: function(onCheck, cb, options) {
      options = options || {
          repeat: 0
        };
      var abort = false;
      var n = options.count || 12;
      var onCb = function(data) {
        cb(data);
        if (options.repeat > 0) {
          options.repeat--;
          n = options.count || 12;
          wait();
        }
      };
      var wait = function() {
        if (abort) return;

        n--;
        setTimeout(function() {
          if (abort) return;
          if (n < 0) {
            return onCb();
          }

          onCheck(function(data) {
            if (abort) return;

            if (data) {
              return onCb(data);
            }
            wait();
          });
        }, options.timer || 500);
      };
      if (options.now) {
        onCheck(function(data) {
          if (abort) return;

          if (data) {
            return onCb(data);
          }
          wait();
        });
      } else {
        wait();
      }
      return {
        abort: function() {
          abort = true;
        }
      }
    },

    getLinksFormUrl: function(url) {
      if (!url) return;

      if (url.substr(0, 2) === '//') {
        url = 'http:'+url;
      }

      /*@if isVkOnly=0>*/
      if (preference.showUmmyItem && this.isRutubeLink(url)) {
        return video.getRutubeLinks(url);
      }

      if (this.isPladformLink(url)) {
        return video.getPladformLinks(url);
      }
      /*@if isVkOnly=0<*/

      var request;
      var hostingList = SaveFrom_Utils.embedDownloader.hostings;
      for (var hostingName in hostingList) {
        var hosting = hostingList[hostingName];
        for (var i = 0, item; item = hosting.re[i]; i++) {
          var data = url.match(item);
          if (data) {
            request = {
              hosting: hostingName,
              action: hosting.action,
              extVideoId: data[1]
            };
            break;
          }
        }
        if (request) break;
      }

      if (!request) return;
      return {
        request: request
      }
    },

    getLinksFromFlashVars: function(flashVars) {
      var params = mono.parseUrlParams(flashVars, {
        argsOnly: 1,
        forceSep: '&',
        useDecode: 1
      });
      var links = video.getLinksFromHtml5MetaData(params);
      return links;
    },

    getLinksFromHtml5MetaData: function(metaData) {
      if (!metaData) return;

      var title = metaData.md_title;

      if (title === undefined) return;

      var videoUrlRegExp = /url([0-9]+)/;
      var urlList = {};

      var hasLinks = false;
      for (var key in metaData) {
        if (key === 'extra_data' && metaData.extra === "52") {
          urlList['Instagram'] = metaData[key];
          hasLinks = true;
          continue;
        }
        var quality = key.match(videoUrlRegExp);
        if (quality === null) continue;

        var link = metaData[key];
        var vPos = link.indexOf('?');
        if (vPos !== -1) {
          link = link.substr(0, vPos);
        }
        hasLinks = true;
        urlList[quality[1]] = link;
      }

      if (!hasLinks) {
        return;
      }

      return {
        title: title,
        links: urlList
      }
    },

    onOtherLinkClick: function(e) {
      var n = 10;
      var waitChangeVideo = setInterval(function() {
        n--;
        if (n < 0) {
          return clearInterval(waitChangeVideo);
        }
        if (document.body.contains(video.bindOtherLinks.lastLayer)) return;

        video.catchPopup();
        clearInterval(waitChangeVideo);
      }, 500);
    },

    bindOtherLinks: function(layer) {
      video.waitChange(function onCheck(cb) {
        if (!layer.querySelector('.mv_narrow_column')) {
          return cb();
        }
        cb(layer.querySelector('#mv_title'));
      }, function onReady(title) {
        if (!title) return;

        video.bindOtherLinks.lastLayer = title;
        var linkList = layer.querySelectorAll('a');
        for (var i = 0, link; link = linkList[i]; i++) {
          var href = link.getAttribute('href');
          if (!href || !href.match(video.isVideoPageRegExp)) {
            continue;
          }
          link.removeEventListener('click', video.onOtherLinkClick);
          link.addEventListener('click', video.onOtherLinkClick);
        }
      }, {now: 1, timer: 500, count: 4});
    },

    /*@if isVkOnly=0>*/
    getRutubeLinks: function(src) {
      if (!/rutube[^\/]+\/(?:play|video)\/embed\/(\d+)/.test(src) && !/video\.rutube\./.test(src)) {
        return;
      }

      var links = SaveFrom_Utils.popupMenu.prepareLinks.rutube(src);

      return {
        isUmmy: true,
        links: links
      };
    },

    isRutubeLink: function(src) {
      return /\/\/.*rutube\..*/.test(src);
    },

    getPladformLinks: function(src) {
      if (!src) {
        return;
      }

      var params = mono.parseUrlParams(src);
      return {
        request: {
          action: 'getPladformVideo',
          extVideoId: {
            playerId: params.pl,
            videoId: params.videoid
          }
        }
      };
    },

    isPladformLink: function(src) {
      return /\/\/.*pladform\..*/.test(src);
    },
    /*@if isVkOnly=0<*/

    getLinksVideoEl: function(videoEl, layer) {
      "use strict";
      var title = layer.querySelector('.vv_summary');
      if (!title) {
        return null;
      }
      title = title.textContent;

      var linkList = {};
      var hasLinks;
      var sourceList = videoEl.querySelectorAll('source');
      for (var i = 0, node; node = sourceList[i]; i++) {
        var src = node.src || '';
        var pos = src.indexOf('?');
        if (pos !== -1) {
          src = src.substr(0, pos);
        }
        var m = src.match(/\.(\d+)\.[^\/]+$/);
        if (m === null) {
          continue;
        }
        linkList[m[1]] = src;
        hasLinks = true;
      }

      if (!hasLinks) {
        return;
      }

      return {
        title: title,
        links: linkList
      }
    },

    getLinksFromPlayer: function(layer, playerNode, cb) {
      if (!playerNode) return;

      var links, flashVars;
      if (playerNode.tagName === 'OBJECT') {
        flashVars = playerNode.querySelector('param[name="flashvars"]');
        if (flashVars) {
          flashVars = flashVars.getAttribute('value');
          links = video.getLinksFromFlashVars(flashVars);
        }
      } else
      if (playerNode.tagName === 'IFRAME') {
        var src = playerNode.getAttribute('src');
        if (!links) {
          links = video.getLinksFormUrl(src);
        }
      } else
      if (playerNode.tagName === 'EMBED') {
        var url = playerNode.getAttribute('src');
        if (!links) {
          flashVars = playerNode.getAttribute('flashvars');
          if (flashVars) {
            links = video.getLinksFromFlashVars(flashVars);
          }
        }
        if (!links) {
          links = video.getLinksFormUrl(url);
        }
      }
      if (playerNode.tagName === 'VIDEO' && playerNode.id !== 'html5_player') {
        links = video.getLinksVideoEl(playerNode, layer);
      }
      if (links) {
        return cb(links, layer);
      }
      if (playerNode.id === 'html5_player') {
        SaveFrom_Utils.bridge({
          func: function(cb) {
            if (!window.html5video || !window.html5video.vars) {
              return cb();
            }
            cb(window.html5video.vars);
          },
          cb: function(data) {
            var links = video.getLinksFromHtml5MetaData(data);
            if (links) {
              return cb(links, layer);
            }
          },
          timeout: 300
        });
      }
      if (playerNode.tagName === 'A') {
        var href = playerNode.href;
        var pos;
        if ((pos = href.indexOf('away.php?to=')) !== -1) {
          href = decodeURIComponent(href.substr(pos + 12));
          links = SaveFrom_Utils.embedDownloader.checkUrl(href);
          if (links) {
            return cb({request: links}, layer);
          }
        }
      }
    },

    catchPopup: function(url) {
      if (!url) {
        url = document.URL;
      }

      delete video.bindOtherLinks.lastLayer;
      if (url.match(video.isVideoPageRegExp) === null) return;

      if (video.lastWaitChange !== undefined) {
        video.lastWaitChange.abort();
      }
      video.lastWaitChange = video.waitChange(function onCheck(cb) {
        cb(document.getElementById('mv_box'));
      }, function onReady(layer) {
        video.bindOtherLinks(layer);
        if (!layer) return;

        video.lastWaitChange = video.waitChange(function onCheck(cb) {
          var player = layer.querySelector('#video_player');
          if (!player || player.tagName === 'DIV') {
            player = layer.querySelector('#html5_player') || layer.querySelector('#flash_video_obj')/*@if isVkOnly=0>*/ || layer.querySelector('#video_yt_player')/*@if isVkOnly=0<*/;
          }
          if (!player) {
            player = layer.querySelector('#playerObj') || layer.querySelector('#player');
            if (player && player.tagName === 'OBJECT' && !player.querySelector('param[name="flashvars"]')) {
              player = undefined;
            }
          }
          cb(player);
        }, function onReady(playerNode) {
          video.getLinksFromPlayer(layer, playerNode, video.appendButton);
        }, {now: 1});
      }, {now: 1});
    },

    preparePladformLinks: function(response) {
      if (response && response.action === 'getRutubeLinks') {
        response.links = null;
      }

      var links = response && response.links;
      var title = 'noname';
      var linkList = {};

      for (var i = 0, item; item = links[i]; i++) {
        title = item.title;
        if (linkList[item.quality]) {
          item.quality =+ ' ';
        }
        linkList[item.quality.toUpperCase()] = item.url;
      }

      return {
        title: title,
        links: linkList
      }
    },

    prepareLinks: function(links) {
      var title = links.title;

      var linkList = [];
      for (var quality in links.links) {
        var item = links.links[quality];

        var ext = item.match(/[\w]+\.(mp4|flv)(?:\?|$)/i);
        if (!ext) {
          ext = 'flv';
        } else {
          ext = ext[1];
        }
        var format = ext.toUpperCase();

        linkList.push({href: item, quality: quality, title: title, ext: ext, format: format, forceDownload: true, useIframe: true});
      }

      return linkList;
    },

    appendButton: function(links, container) {
      var funcClassName = 'sf-under-video';

      var isInTopControls = null;
      var isInViews = null;
      var isInMenu = null;

      var controlsBody =  container.querySelector('#mv_controls');
      if (!controlsBody) {
        controlsBody = container.querySelector('#mv_top_controls');
        isInTopControls = controlsBody;
      }
      if (!controlsBody) return;

      if (!isInTopControls) {
        var viewsWrap = controlsBody.querySelector('#mv_date_views_wrap');
        viewsWrap = viewsWrap && viewsWrap.parentNode;
        isInViews = !!viewsWrap;

        var actions = controlsBody.querySelector('.mv_share_actions');
        var actionsWrapper = actions && actions.querySelector('.mv_share_actions_wrap');
        if (actionsWrapper && !audio.elIsHidden(actionsWrapper)) {
          var separatorList = actions.querySelectorAll('.mv_rtl_divider');
          var separator;
          if (separatorList.length === 0) {
            separator = mono.create('div', {class: 'mv_rtl_divider fl_l'});
            actions.appendChild(separator);
          } else {
            separator = separatorList[separatorList.length - 1];
          }
          separatorList = null;
          isInMenu = true;
        }
        actionsWrapper = null;
      }
      controlsBody = null;


      var oldBtnList = container.querySelectorAll('.'+downloadLinkClassName);
      for (var i = 0, node; node = oldBtnList[i]; i++) {
        node.parentNode.removeChild(node);
      }
      node = null;
      oldBtnList = null;

      var dlBtn = mono.create('div', {
        class: [downloadLinkClassName, funcClassName],
        style: {
          cursor: 'pointer'
        },
        on: [
          ['click', function(e) {
            e.stopPropagation();

            mono.onRemoveEvent(this, vk.hideMenu);

            if (vk.contextMenu && vk.contextMenu.isShow) {
              vk.hideMenu();
              return;
            }

            if ([1].indexOf(preference.cohortIndex) !== -1) {
              mono.sendMessage({action: 'trackCohort', category: 'vk', event: 'click', label: 'video-under-video'});
            }

            var menu = vk.contextMenu = SaveFrom_Utils.popupMenu.quickInsert(this, language.download+'...', 'sf-single-video-menu', {
              parent: container,
              offsetRight: !isInTopControls ? 0 : -160
            });

            if (links.isUmmy) {
              menu.update(links.links);
              return;
            }

            if (links.request) {
              var onResponse = function(response) {
                var mLinks;
                if (response && links.request.action === 'getPladformVideo') {
                  if (preference.showUmmyItem && response.action === 'getRutubeLinks') {
                    mLinks = SaveFrom_Utils.popupMenu.prepareLinks.rutube(response.links);
                  } else {
                    mLinks = video.prepareLinks(video.preparePladformLinks(response));
                  }

                  menu.update(mLinks);
                  return;
                }
                if(!response || !response.links) {
                  return menu.update(language.noLinksFound);
                }
                mLinks = SaveFrom_Utils.popupMenu.prepareLinks[links.request.hosting](response.links, response.title);
                menu.update(mLinks);
              };
              try {
                mono.sendMessage(links.request, onResponse);
              } catch (e) {
                onResponse();
              }
              return;
            }

            var mLinks = video.prepareLinks(links);
            menu.update(mLinks);
          }],
          ['mousedown', function(e) {e.stopPropagation();}],
          ['keydown', function(e) {e.stopPropagation();}]
        ]
      });

      if (isInTopControls) {
        mono.create(isInTopControls, {
          append: [
            mono.create(dlBtn, {
              style: {
                margin: '-5px',
                padding: '5px',
                marginTop: '6px'
              },
              append: [
                mono.create('img', {
                  src: SaveFrom_Utils.svg.getSrc('download', '#99AEC8'),
                  width: 15,
                  height: 15
                })
              ]
            })
          ]
        });
        isInTopControls = !!isInTopControls;
        dlBtn = null;
        return;
      }

      mono.create(dlBtn, {
        class: ['mv_share_button', 'fl_l'],
        append: [
          mono.create('img', {
            src: SaveFrom_Utils.svg.getSrc('download', '#99AEC8'),
            width: 12,
            height: 12,
            style: {
              marginBottom: '-2px',
              marginRight: '5px'
            }
          }),
          mono.create('span', {
            text: language.download
          })
        ]
      });

      var addInViews = function(dlBtn) {
        "use strict";
        viewsWrap.appendChild(mono.create(dlBtn, {
          style: {
            paddingTop: '2px',
            paddingBottom: '2px',
            marginTop: '3px',
            marginLeft: '10px',
            borderRadius: '3px'
          }
        }));
      };

      var addInMenu = function(dlBtn) {
        "use strict";
        var actionsWidth = actions.getBoundingClientRect().width;
        var divider;

        separator.parentNode.insertBefore(mono.create(document.createDocumentFragment(), {
          append: [
            divider = mono.create('div', {
              class: ['mv_rtl_divider', 'fl_l', downloadLinkClassName]
            }),
            mono.create(dlBtn, {
              class: ['flat_button']
            })
          ]
        }), separator);

        var newActionsWidth = actions.getBoundingClientRect().width;

        if (isInViews && actionsWidth !== newActionsWidth) {
          divider.parentNode.removeChild(divider);
          dlBtn.classList.remove('flat_button');
          addInViews(dlBtn);
        }

        actions = null;
      };

      if (isInMenu) {
        addInMenu(dlBtn);
      } else
      if (isInViews) {
        addInViews(dlBtn);
      }

      dlBtn = null;
      viewsWrap = null;
    },

    onFramePlayerOver: function(event) {
      if(!video.btnBox) {
        mono.off(document, 'mouseenter', video.onFramePlayerOver, true);
        mono.off(document, 'mouseleave', video.onFramePlayerOver, true);
        return;
      }

      var panel = document.getElementById(video.panelId);
      if (panel && (panel.getAttribute(video.videoAttr) !== 'active' ||
        panel.getAttribute(video.hiddenAttr))) {
        panel = null;
      }

      if(event.type === 'mouseenter') {
        if(video.btnBox.style.display == 'none')
          video.btnBox.style.display = 'block';

        if(panel) {
          panel.style.display = 'block';
        }
      } else
      if(event.type === 'mouseleave') {
        video.btnBox.style.display = 'none';

        if(panel) {
          panel.style.display = 'none';
        }
      }
    },

    frameLinksShow: function(links, title, parent, style, action) {
      if(!links)
        return;

      if(!parent)
        parent = document.getElementById(video.panelId);

      if(!parent)
        return;

      SaveFrom_Utils.emptyNode(parent);

      if(action == 'getYoutubeLinks')
      {
        SaveFrom_Utils.video.yt.init();
        SaveFrom_Utils.video.yt.show(links, parent, preference.moduleShowDownloadInfo, {
          link: null,
          text: null,
          btn: {color: '#777', borderColor: '#555', fontSize: '95%'},
          fsIcon: null,
          fsText: {fontSize: '80%'}
        }, title);

        return;
      }

      if(title)
        title = title.replace(/\x2B+/g, ' ').trim();

      var html = false;
      if(typeof(links) == 'string')
        html = true;
      else if(links.length == 0)
        return;

      SaveFrom_Utils.setStyle(parent, {
        color: '#fff',
        display: 'block',
        float: 'none',
        fontSize: '11pt',
        fontWeight: 'normal',
        margin: 0,
        padding: '5px',
        textAlign: 'center'
      });

      if(style && typeof(style) == 'object')
        SaveFrom_Utils.setStyle(parent, style);

      if(html)
      {
        parent.textContent = links;
        return;
      }

      var color = '';
      for(var i = 0; i < links.length; i++)
      {
        var a = null;

        if(typeof(links[i]) == 'object' && links[i].url)
        {
          var ext = links[i].ext;
          if(!ext)
          {
            ext = 'FLV';
            if(links[i].url.search(/\.mp4$/i) != -1)
              ext = 'MP4';
          }

          var name = links[i].name ? links[i].name : ext;
          a = createTextLink(links[i].url, name);

          if(!links[i].noTitle)
          {
            if(title)
            {
              a.setAttribute('download', mono.fileName.modify(
                title + '.' + ext.toLowerCase()));
            }

            a.addEventListener('click', function(event){
              SaveFrom_Utils.downloadOnClick(event, null, {
                useFrame: true
              });
            }, false);
          }

          if(links[i].subname)
          {
            var st = document.createElement('span');
            SaveFrom_Utils.setStyle(st, {
              fontSize: '80%',
              fontWeight: 'normal',
              marginLeft: '3px'
            });
            st.textContent = links[i].subname;
            a.appendChild(st);
          }
        }

        if(a)
        {
          a.style.marginLeft = '10px';
          a.style.color = '#fff';

          a.title = language.downloadTitle;
          parent.appendChild(a);

          SaveFrom_Utils.appendFileSizeIcon(a,
            {color: '#a0a0a0', opacity: '.75'},
            {fontSize: '95%', opacity: '.9'});

          if(!color)
            color = SaveFrom_Utils.getStyle(a, 'color');
        }
      }
    },

    appendFrameBtn: function(links, container) {
      if(container.querySelector('.' + downloadLinkClassName)) {
        return;
      }

      var oldPanel = document.getElementById(video.panelId);
      if(oldPanel) {
        oldPanel.parentNode.removeChild(oldPanel);
      }

      if(video.btnBox && video.btnBox.parentNode) {
        video.btnBox.parentNode.removeChild(video.btnBox);
      }

      var panel = mono.create('div', {
        id: video.panelId,
        class: downloadLinkClassName,
        style: {
          background: '#000',
          border: 0,
          display: 'block',
          fontFamily: 'Arial,Helvetica,sans-serif',
          lineHeight: 'normal',
          position: 'absolute',
          top: '25px',
          left: 0,
          right: 0,
          zIndex: 99990,
          color: '#fff',
          float: 'none',
          fontWeight: 'normal',
          textAlign: 'center'
        }
      });

      var box = video.btnBox = mono.create('div', {
        id: video.btnBoxId,
        class: downloadLinkClassName,
        style: {
          background: '#000',
          border: '1px solid #fff',
          display: 'none',
          fontFamily: 'Arial,Helvetica,sans-serif',
          fontSize: '13px',
          lineHeight: 'normal',
          position: 'absolute',
          top: '2px',
          right: '2px',
          padding: '3px 5px',
          margin: 0,
          zIndex: 99999
        },
        append: [
          mono.create('a', {
            href: '#',
            text: language.download,
            style: {
              color: '#fff',
              textDecoration: 'none'
            },
            on: ['click', function(e) {
              e.stopPropagation();
              e.preventDefault();

              var isHidden = panel.getAttribute(video.videoAttr) !== 'active' || panel.style.display === 'none';

              if (isHidden && [1].indexOf(preference.cohortIndex) !== -1) {
                mono.sendMessage({action: 'getActiveTabUrl'}, function(tabUrl) {
                  if (typeof tabUrl === 'string' && tabUrl.indexOf('vk.com/') !== -1) {
                    mono.sendMessage({action: 'trackCohort', category: 'vk', event: 'click', label: 'video-on-video'});
                  } else {
                    mono.sendMessage({action: 'trackCohort', category: 'vk', event: 'click', label: 'video-iframe'});
                  }
                });
              }

              if(panel.getAttribute(video.videoAttr) === 'active') {
                if(panel.style.display === 'none') {
                  panel.style.display = 'block';
                  panel.removeAttribute(video.hiddenAttr);
                } else {
                  panel.style.display = 'none';
                  panel.setAttribute(video.hiddenAttr, '1');
                }
                return false;
              }

              panel.setAttribute(video.videoAttr, 'active');

              if (links.request) {
                panel.appendChild(mono.create('img', {src: '/images/upload.gif'}));
                var onResponse = function(response) {
                  var links = response ? response.links : undefined;
                  if (links) {
                    video.frameLinksShow(links, response.title, null, video.style, response.action);
                  } else {
                    video.frameLinksShow(language.noLinksFound, '', null, video.style);
                  }
                };
                try {
                  mono.sendMessage(links.request, onResponse);
                } catch (e) {
                  video.frameLinksShow(language.noLinksFound, '', null, video.style);
                }
                return;
              }

              var mLinks = video.prepareLinks(links);
              var pLinks = [];
              for (var i = 0, item; item = mLinks[i]; i++) {
                pLinks.push({ext: item.format, subname: item.quality, url: item.href});
              }
              video.frameLinksShow(pLinks, links.title, panel);
            }]
          })
        ]
      });

      mono.off(document, 'mouseenter', video.onFramePlayerOver, true);
      mono.off(document, 'mouseleave', video.onFramePlayerOver, true);
      mono.on(document, 'mouseenter', video.onFramePlayerOver, true);
      mono.on(document, 'mouseleave', video.onFramePlayerOver, true);

      container.parentNode.insertBefore(panel, container);
      container.parentNode.insertBefore(box, container);

      var n = 3;
      var waitPanelChange = setInterval(function() {
        n--;
        if (n < 0) {
          return clearInterval(waitPanelChange);
        }
        if (!document.body.contains(panel)) {
          container.parentNode.insertBefore(panel, container);
          container.parentNode.insertBefore(box, container);
          clearInterval(waitPanelChange);
        }
      }, 500);
    },

    addFrameBtn: function() {
      var layer = document.getElementById('page_wrap');
      if (!layer) return;

      if (video.lastWaitChange !== undefined) {
        video.lastWaitChange.abort();
      }
      video.lastWaitChange = video.waitChange(function onCheck(cb) {
        if (!document.body.contains(layer)) {
          layer = document.getElementById('page_wrap');
          if (!layer) {
            return cb();
          }
        }
        var player = layer.querySelector('#video_player');
        if (!player || player.tagName === 'DIV') {
          player = layer.querySelector('#html5_player') || layer.querySelector('#flash_video_obj');
        }
        if (!player) {
          player = layer.querySelector('#playerObj') || layer.querySelector('#player');
          if (player && player.tagName === 'OBJECT' && !player.querySelector('param[name="flashvars"]')) {
            player = undefined;
          }
        }

        cb(player);
      }, function onReady(playerNode) {
        video.getLinksFromPlayer(layer, playerNode, video.appendFrameBtn);
      });
    }
  };

  var videoFeed = {
    linkDataAttr: 'savefromHasBtn',
    lastLink: undefined,
    getLinkAsAjaxRequest: function(_details, index) {
      "use strict";
      index = index || 0;

      var details = mono.extend({}, _details);

      var abort = function() {
        if (index < 1) {
          return videoFeed.getLinkAsAjaxRequest(_details, ++index);
        }

        _details.error && _details.error();
      };

      var data = details.data;

      if (index === 0) {
        data.act = 'show_inline';
      } else
      if (index === 1) {
        data.act = 'show';
      }

      mono.request(details, function(err, res, data) {
        if (err || !data) {
          return abort();
        }

        if (data.indexOf('href="/join"') !== -1) {
          return abort();
        }

        _details.success(data);
      });
    },
    getLinkAsAjax: function(link, cb, moduleName) {
      var onClick = link.getAttribute('onclick') || '';
      var videoData = onClick.match(/showVideo\(['"]{1}([^'"]+)['"]{1},.?['"]{1}([^'"]+)['"]{1},.*\)/);
      if (!videoData) {
        return cb();
      }
      videoFeed.getLinkAsAjaxRequest({
        localXHR: 1,
        type: 'POST',
        url: document.location.protocol + '//' + domain + '/al_video.php',
        data: {
          list: videoData[2],
          video: videoData[1],
          act: 'show_inline',
          module: moduleName,
          al: 1
        },
        success: function(pageData) {
          if(!pageData) {
            return cb();
          }

          var frameSrc = pageData.match(/<iframe[^>]+src=['"]{1}([^'">]+)['"]{1}[^>]+>/i);
          if (!frameSrc) {
            // search dailymotion
            frameSrc = pageData.match(/var\s+opts\s+=\s+({[^}]*})/im);
            if (frameSrc) {
              frameSrc = frameSrc[1].match(/url:\s+['"]{1}([^'"]+)['"]{1}/i);
              if (frameSrc && frameSrc[1].indexOf('//') !== 0 && frameSrc[1].indexOf('http') !== 0) {
                frameSrc = null;
              }
            }
          }

          if (!frameSrc) {
            try {
              mono.sendMessage({action: 'getVkLinksFromData', data: pageData}, function(response) {
                return cb(response, 'vk');
              });
            } catch (e) {
              cb({}, 'vk');
            }
            return;
          }

          if (!frameSrc) {
            return cb();
          }

          var url = frameSrc[1];

          /*@if isVkOnly=0>*/
          if (preference.showUmmyItem && video.isRutubeLink(url)) {
            return cb(video.getRutubeLinks(url));
          }
          /*@if isVkOnly=0<*/

          if (url.indexOf('//') === 0) {
            url = 'http:' + url;
          }
          if (url.indexOf('http') !== 0) {
            return cb();
          }

          var data = SaveFrom_Utils.embedDownloader.checkUrl(url);
          if(!data) {
            return cb();
          }

          var request = {
            action: data.action,
            extVideoId: data.extVideoId
          };

          mono.sendMessage(request, function(response) {
            var hosting = data.hosting;

            if (response.action !== request.action) {
              hosting = SaveFrom_Utils.embedDownloader.reMapHosting(response.action);
            }

            return cb(response, hosting);
          });
        },
        error: function() {
          cb();
        }
      });
    },
    addDownloadBtn: function(link) {
      var url = link.href;

      var dlBtn = mono.create('a', {
        href: 'http://savefrom.net/?url=' + encodeURIComponent(url),
        style: {
          display: 'inline-block',
          width: '16px',
          height: '16px',
          marginLeft: '5px',
          backgroundImage: 'url('+SaveFrom_Utils.svg.getSrc('download', '#78A2CC')+')',
          backgroundRepeat: 'no-repeat',
          marginBottom: '-4px'
        },
        on: ['click', function(e) {
          var _this = this;
          e.preventDefault();
          // e.stopPropagation();

          mono.onRemoveEvent(btnWrapper, vk.hideMenu);

          if (vk.contextMenu && vk.contextMenu.isShow) {
            vk.hideMenu();
            return;
          }

          var parentEl = document.querySelector('#wk_box');
          if (!parentEl || !parentEl.contains(this)) {
            parentEl = null;
          }
          var args = {
            parent: parentEl
          };

          var url = this.getAttribute(SaveFrom_Utils.embedDownloader.dataAttr);
          var eRequest = SaveFrom_Utils.embedDownloader.checkUrl(url);
          if(!eRequest) {
            vk.contextMenu = SaveFrom_Utils.popupMenu.quickInsert(dlBtn, language.noLinksFound, 'sf-popupMenu', args);
            return;
          }

          var request = {
            action: eRequest.action,
            extVideoId: eRequest.extVideoId
          };

          var menu = vk.contextMenu = SaveFrom_Utils.popupMenu.quickInsert(dlBtn, language.download + ' ...', 'sf-popupMenu', args);

          var onResponse = function(response) {
            var hosting = eRequest.hosting;

            if(response.action != request.action) {
              hosting = SaveFrom_Utils.embedDownloader.reMapHosting(response.action);
            }

            if (Array.isArray(response.links) && response.links.length === 0) {
              response.links = undefined;
            }

            if(response.links) {
              var links = SaveFrom_Utils.popupMenu.prepareLinks[hosting](response.links, response.title);
              menu.update(links);
            } else {
              photo.getModuleName(videoFeed.getLinkAsAjax.bind(null, SaveFrom_Utils.getParentByTagName(_this.parentNode, 'A'), function(response, hosting) {
                if (response && response.links) {
                  var links;
                  if (response.isUmmy) {
                    links = response.links;
                  } else {
                    links = SaveFrom_Utils.popupMenu.prepareLinks[hosting](response.links, response.title);
                  }
                  menu.update(links);
                  return;
                }
                menu.update(language.noLinksFound);
              }));
            }
          };

          try {
            mono.sendMessage(request, onResponse);
          } catch (e) {
            onResponse({});
          }

          if ([1].indexOf(preference.cohortIndex) !== -1) {
            mono.sendMessage({action: 'trackCohort', category: 'vk', event: 'click', label: 'video-feed-arrow'});
          }
        }]
      });

      dlBtn.setAttribute(SaveFrom_Utils.embedDownloader.dataAttr, url);

      var btnWrapper = mono.create('span', {
        class: 'sf-video-feed-container',
        on: ['click', function(e) {
          e.stopPropagation();
        }],
        append: [
          dlBtn
        ]
      });

      var postVideoTitle = link.querySelector('.post_video_title');
      if (postVideoTitle) {
        postVideoTitle.appendChild(btnWrapper);
      } else {
        link.appendChild(btnWrapper);
      }
    },
    onLinkHover: function(event)
    {
      var link = event.target;
      if(link.tagName !== 'A') {
        link = link.parentNode;
      }
      if(link === null || link.tagName !== 'A') {
        return;
      }

      var href = link.href || '';
      var id = link.id;
      if (id.indexOf('post_media_lnk') !== 0 || href.indexOf('/video') === -1 ) {
        return;
      }

      if (videoFeed.lastLink === link) {
        return;
      }
      videoFeed.lastLink = link;
      if (vk.contextMenu && vk.contextMenu.isShow) {
        vk.hideMenu();
      }

      var hasBtn = link.dataset[videoFeed.linkDataAttr];
      if (hasBtn) {
        return;
      }


      link.dataset[videoFeed.linkDataAttr] = 1;

      videoFeed.addDownloadBtn(link);
    },
    run: function() {
      mono.off(document, 'mouseenter', this.onLinkHover, true);
      mono.on(document, 'mouseenter', this.onLinkHover, true);
    },
    off: function() {
      mono.off(document, 'mouseenter', this.onLinkHover, true);
      var btnList = document.querySelectorAll('.sf-video-feed-container');
      for (var i = 0, item; item = btnList[i]; i++) {
        item.parentNode.removeChild(item);
      }
      var dataAttr = mono.dataAttr2Selector(videoFeed.linkDataAttr);
      var dataAttrList = document.querySelectorAll('*['+dataAttr+']');
      for (i = 0, item; item = dataAttrList[i]; i++) {
        item.removeAttribute(dataAttr);
      }
    }
  };

  //  /VIDEO
  ///////////////////////////////////////////////////////////////////



  ///////////////////////////////////////////////////////////////////
  //  PHOTO

  var photo = {
    photoCache: {},
    albumCache: {},
    offsetStep: 10,
    getAlbumId: function(url) {
      if (/(\?|&|#)act=edit/i.test(url)) {
        return;
      }

      var dataList = [];

      dataList.push(url);

      var params = mono.parseUrl(url);
      if (params.w) {
        dataList.push(params.w);
      }
      if (params.z) {
        dataList.push.apply(dataList, params.z.split('/'));
      }

      if (/#/.test(url)) {
        dataList.push(url.substr(url.indexOf('#') + 1));
        dataList.push(decodeURIComponent(url.substr(url.indexOf('#') + 1)));
      }

      dataList.reverse();

      var aid = null;
      var m = null;
      dataList.some(function(data) {
        m = data.match(/(?:\/|#|=|^)(albums?|tag|photos|feed(?:\d+)?_|wall)(-?\d+)(?:_(\d+))?/i);
        if (m) {
          if(m[3]) {
            if (/^(feed|wall)/.test(m[1])) {
              aid = m[1] + m[2] + '_' + m[3];
            } else {
              aid = 'album' + m[2] + '_' + m[3];
            }

          } else {
            if (m[1] == 'albums') {
              m[1] = 'photos';
            }

            aid = m[1] + m[2];
          }
          return true;
        }
      });

      return aid;
    },
    getLinksFromJson: function(list, onSuccess) {
      var src = ['w_src', 'z_src', 'y_src', 'x_src'];
      var links = {};
      var title = this.getTitle === true ? undefined : null;
      for (var n = 0, item; item = list[n]; n++) {
        if (!item.id) {
          continue;
        }
        if (title === undefined && item.album) {
          title = mono.fileName.decodeSpecialChars(mono.decodeUnicodeEscapeSequence(item.album.replace(/<[^>]+>/g, '')));
        }
        for (var i = 0, type; type = src[i]; i++) {
          if (item[type] === undefined) {
            continue;
          }
          links[item.id] = this.photoCache[item.id] = item[type];
          break;
        }
      }
      onSuccess(links, title);
    },
    getLinksViaAPI: function(post, onSuccess, onError, reSend) {
      if (reSend === undefined) {
        reSend = 0;
      }
      var _this = this;
      var url = document.location.protocol + '//' + domain + '/al_photos.php';
      var onXhrError = function() {
        if (reSend > 2) {
          return onError();
        }
        setTimeout(function() {
          _this.getLinksViaAPI(post, onSuccess, onError, ++reSend);
        }, 250);
      };
      mono.request({
        type: 'POST',
        url: url,
        data: post,
        localXHR: true,
        timeout: 60 * 1000
      }, function(err, resp, data) {
        if (err) {
          return onXhrError();
        }

        if (!data) {
          return onError();
        }

        var count = undefined;
        data = data.split('<!>');
        for (var n = 0, len = data.length; n < len; n++) {
          var str = data[n];
          if (count === undefined && str.indexOf('<!int>') === 0) {
            count = parseInt(str.substr(6));
            continue;
          }
          if (str.indexOf('<!json>') !== 0) {
            continue;
          }
          try {
            var list = JSON.parse(str.substr(7));
          } catch (e) {
            return onError();
          }
          if (!Array.isArray(list)) {
            continue;
          }
          return _this.getLinksFromJson.call(_this, list, onSuccess.bind(_this, count));
        }
        onError();
      });
    },
    getAlbumLinks: function(id, onProgress, cb) {
      var _this = mono.extend({getTitle: true}, this);
      var title = undefined;
      var url = location.href;
      if (url.indexOf('albums') !== -1 || url.indexOf('tags') !== -1 || url.indexOf('photos') !== -1) {
        title = null;
        _this.getTitle = false;
      }
      var post = 'act=show&al=1&list=' + id + '&offset={offset}';
      var offset = 0;
      var linkList = {};
      var summ = 0;
      var inProgress = 0;
      var count = 0;
      var abort = false;
      var nextStep = function() {
        if (abort) {
          return;
        }
        inProgress++;
        _this.getLinksViaAPI(post.replace('{offset}', offset), function onSuccess(fullCount, links, aTitle) {
          if (title === undefined && aTitle) {
            title = aTitle;
            _this.getTitle = false;
          }
          if (count < fullCount) {
            count = fullCount;
          }
          var newLinks = 0;
          for (var item in links) {
            if (linkList[item] !== undefined) {
              continue;
            }
            linkList[item] = links[item];
            newLinks++;
            summ++;
          }
          onProgress(summ, count);
          inProgress--;
          if (newLinks === 0) {
            if (inProgress === 0) {
              if (count === fullCount) {
                _this.albumCache[id] = {links: linkList, title: title};
              }
              if (!title) {
                title = getFolderName();
              }
              cb(linkList, title);
            }
            return;
          }
          nextStep();
        }, function onError() {
          inProgress--;

          if (inProgress === 0) {
            return cb(linkList, title);
          }
        });
        offset += _this.offsetStep;
      };
      nextStep();
      nextStep();
      return {
        abort: function() {
          abort = true;
        }
      }
    },
    getModuleName: function(cb) {
      var dataArg = 'sfModule';
      var script = mono.create('script', {
        text: '('+function() {
          if (window.cur && window.cur.module && typeof(window.cur.module) === 'string') {
            document.body.dataset['{dataArg}'] = window.cur.module;
          }
        }.toString().replace('{dataArg}', dataArg) +')();'
      });
      document.body.appendChild(script);
      setTimeout(function() {
        script.parentNode.removeChild(script);
        cb(document.body.dataset[dataArg]);
      });
    },
    getFullSizeSrc: function(list, count, onProgress, cb) {
      var _this = this;
      var abort = false;
      this.getModuleName(function(curModule) {
        var post = 'act=show&al=1&list={list}&module=' + curModule + '&photo={id}';
        var index = 0;
        var inProgress = 0;
        var linkList = {};
        var summ = 0;

        var keyList = (function() {
          var keyList = [];
          for (var key in list) {
            keyList.push(key);
          }
          return keyList;
        })();

        var nextStep = function() {
          if (abort) {
            return;
          }

          var photoId = keyList[index];
          var listItem = list[photoId];
          if (listItem === undefined) {
            if (inProgress === 0) {
              cb(linkList);
            }
            return;
          }

          inProgress++;

          if (_this.photoCache[photoId] !== undefined) {
            linkList[photoId] = _this.photoCache[photoId];
            summ++;
            onProgress(summ, count);
            index++;
            nextStep();
            inProgress--;
            return;
          }

          index++;

          var _post = post.replace('{list}', listItem.list).replace('{id}', photoId);
          _this.getLinksViaAPI(_post, function onSuccess(_count, links) {
            var link = links[photoId];
            if (!link) {
              link = listItem.src;
            }

            linkList[photoId] = link;

            summ++;
            onProgress(summ, count);

            inProgress--;
            nextStep();
          }, function onError() {
            linkList[photoId] = listItem.src;

            summ++;
            onProgress(summ, count);

            inProgress--;
            nextStep();
          });
        };
        nextStep();
        nextStep();
      });
      return {
        abort: function() {
          abort = true;
        }
      }
    },
    isReply: function(el) {
      return mono.matches(el, '.replies ' + el.tagName) || mono.matches(el, '.wl_replies ' + el.tagName);
    },
    getWallPostContent: function() {
      var postId = location.href.match(/wall(-?\d+_\d+)/);
      postId = postId && postId[1];

      if (!postId) {
        return;
      }

      return document.getElementById('post' + postId) || document.getElementById('wpt' + postId);
    },
    findLinks: function(container, onProgress, cb, force) {
      var links = container.querySelectorAll('a[onclick]');
      var linkList = {};
      var count = 0;
      for (var i = 0, el; el = links[i]; i++) {
        var onclick = el.getAttribute('onclick');
        if (onclick.search(/showPhoto\s*\(/i) === -1) {
          continue;
        }
        if (photo.isReply(el)) {
          continue;
        }
        var photoId = '', listId = '';
        var params = onclick.match(/showPhoto\s*\(\s*[\"']([-\d_]+)[\"']\s*,\s*[\"']([\w\-]+)[\"']/i);
        if(params && params.length > 2) {
          photoId = params[1];
          listId = params[2];
        }
        if(photoId && listId) {
          var json = onclick.match(/\{[\"']?temp[\"']?\s*:\s*(\{.+?\})/i);
          if(json) {
            json = json[1].replace(/(\{|,)\s*(\w+)\s*:/ig, '$1"$2":');
            var src = undefined;
            try {
              json = JSON.parse(json);
              if(!json.base) {
                json.base = '';
              }
              var typeList = ['w_', 'z_', 'y_', 'x_'];
              for (var n = 0, type; type = typeList[n]; n++) {
                if (!json[type]) {
                  continue;
                }
                if(typeof json[type] == 'object') {
                  src = json.base + json[type][0] + '.jpg';
                } else {
                  src = json.base + json[type] + '.jpg';
                }
                break;
              }
            } catch(err){}

            if(src && linkList[photoId] === undefined) {
              linkList[photoId] = {src: src, list: listId};
              count++;
            }
          }
        }
      }
      if (count === 0 && container !== document && force === undefined) {
        var postContainer = this.getWallPostContent();
        if (!postContainer) {
          return cb(undefined);
        }
        return this.findLinks(postContainer, onProgress, cb, 1);
      }
      if (count === 0) {
        return cb(undefined);
      }
      onProgress(0, count);
      return this.getFullSizeSrc(linkList, count, onProgress, cb);
    },
    getPopup: function(title, type, onClose) {
      var template = SaveFrom_Utils.playlist.getInfoPopupTemplate();
      var progressEl;

      mono.create(template.textContainer, {
        append: [
          mono.create('p', {
            text: title,
            style: {
              color: '#0D0D0D',
              fontSize: '20px',
              marginBottom: '11px',
              marginTop: '13px'
            }
          }),
          progressEl = mono.create('p', {
            text: '',
            style: {
              color: '#868686',
              fontSize: '14px',
              lineHeight: '24px'
            }
          })
        ]
      });

      var popupEl = SaveFrom_Utils.popupDiv(template.body, 'sf_progress_popup', undefined, undefined, onClose);

      var setState = function(state) {
        if (setState.state === state) {
          return;
        }
        setState.state = state;

        template.buttonContainer.style.display = 'none';
        progressEl.style.display = 'none';
        mono.sendMessage({action: 'getWarningIcon', type: type, color: '#77D1FA'}, function(icon) {
          template.icon.style.backgroundImage = 'url('+icon+')';
        });
        if (state === 'progress') {
          progressEl.style.display = 'block';
        }
        if (state === 'error') {
          mono.sendMessage({action: 'getWarningIcon', type: type, color: '#AAAAAA'}, function(icon) {
            template.icon.style.backgroundImage = 'url('+icon+')';
          });
          progressEl.style.display = 'block';
        }
      };

      return {
        onPrepare: function(text) {
          setState('progress');
          progressEl.textContent = text;
        },
        onProgress: function(count, max) {
          progressEl.textContent = language.vkFoundFiles.replace('%d', count) + ' ' + language.vkFoundOf + ' ' + max;
        },
        onReady: function() {
          mono.trigger(popupEl, 'kill');
        },
        onError: function(text) {
          setState('error');
          progressEl.textContent = text;
        }
      }
    },
    getLayer: function() {
      var layer = document.getElementById('layer_wrap');
      if (layer === null || layer.style.display === "none" || layer.textContent.length === 0) {
        layer = null;
      }
      if (layer === null) {
        layer = document.getElementById('wk_layer_wrap');
        if (layer === null || layer.style.display === "none" || layer.textContent.length === 0) {
          layer = null;
        }
      }
      return layer;
    },
    getLinks: function(container, id) {
      var _this = this;
      var process = undefined;
      var popup = this.getPopup(getFolderName(), 'photo', function onClose() {
        if (process) {
          process.abort();
        }
      });
      var _cb = function(linkList, title) {
        if (!linkList) {
          linkList = {};
        }
        var links = [];
        for (var item in linkList) {
          var filename = SaveFrom_Utils.getMatchFirst(linkList[item], /\/([\w\-]+\.[a-z0-9]{3,4})(?:\?|$)/i);
          if (!filename) {
            continue;
          }
          links.push({
            filename: filename,
            url: linkList[item]
          });
        }
        if (links.length === 0) {
          popup.onError(language.noLinksFound);
          return;
        }

        var zeroCount = String(links.length).length;
        links.forEach(function(item, index) {
          var number = String(index + 1);
          while (number.length < zeroCount) {
            number = '0' + number;
          }
          item.filename = number + '-' + item.filename;
        });

        popup.onReady();

        title = title || getFolderName();
        if (!allowDownloadMode) {
          return _this.showListOfLinks(title, links, true);
        }
        SaveFrom_Utils.downloadList.showBeforeDownloadPopup(links, {
          count: links.length,
          folderName: title,
          type: 'photo',
          onShowList: function() {
            // show list on links
            _this.showListOfLinks(title, links, true);
          }
        });
      };
      popup.onPrepare(language.download+' ...');
      if (id) {
        if (this.albumCache[id] !== undefined) {
          _cb(this.albumCache[id].links, this.albumCache[id].title || getFolderName());
          return;
        }
        process = this.getAlbumLinks(id, popup.onProgress, _cb);
        return;
      }

      if (!container || container === document) {
        container = this.getLayer();
      }

      process = this.findLinks(container || document, popup.onProgress, _cb);
    },
    rmPhotoAlbumDlBtn: function() {
      var dlAlbumBtn = document.querySelectorAll(['.sf-dl-ablum-btn-divide','.sf-dl-ablum-btn']);
      for (var i = 0, item; item = dlAlbumBtn[i]; i++) {
        item.parentNode.removeChild(item);
      }
    },
    addPhotoAlbumDlBtn: function(container) {
      var _this = this;
      var body = container.previousElementSibling;
      if (!body.classList.contains('summary_wrap')) {
        return;
      }

      body = body.querySelector('.summary');

      if (!body) {
        return;
      }

      if (body.querySelector('.sf-dl-ablum-btn') !== null) {
        return;
      }

      var btnCnt = mono.create('span', {
        append: mono.create('a', {
          text: language.vkDownloadPhotoAlbum,
          href: '#',
          style: {
            fontWeight: 'bolder'
          },
          class: 'sf-dl-ablum-btn',
          on: ['click', function(e) {
            e.preventDefault();

            var id = photo.getAlbumId(window.location.href);
            _this.getLinks.call(_this, container, id);

            if ([1].indexOf(preference.cohortIndex) !== -1) {
              mono.sendMessage({action: 'trackCohort', category: 'vk', event: 'click', label: 'photo-albom'});
            }
          }]
        })
      });

      body.appendChild(
        mono.create(document.createDocumentFragment(), {
          append: [
            mono.create('span', {
              class: 'divide sf-dl-ablum-btn-divide',
              text: '|'
            }),
            btnCnt
          ]
        })
      );

      body = null;
      btnCnt = null;
    },
    getContainer: function() {
      var container = document.getElementById('photos_albums_container');
      if(!container) {
        container = document.getElementById('photos_container');
      }

      return container;
    },
    getFilenameFromUrl: function(url) {
      return SaveFrom_Utils.getMatchFirst(url, /\/([\w\-]+\.[a-z0-9]{3,4})(?:\?|$)/i);
    },
    rmCurrentPhotoBtn: function(insertContainer) {
      var exBtn = undefined;
      var imgList = document.querySelectorAll('.sf-dl-current-photo-btn');
      for (var i = 0, imgItem; imgItem = imgList[i]; i++) {
        if (!insertContainer || !insertContainer.contains(imgItem)) {
          imgItem.parentNode.removeChild(imgItem);
        } else {
          exBtn = imgItem;
        }
      }
      return exBtn;
    },
    getCurrentPhotoOrigLinkEl: function(container) {
      return container.querySelector('#pv_open_original');
    },
    style: null,
    injectStyle: function() {
      if (this.style) {
        if (!this.style.parentNode) {
          document.head.appendChild(this.style);
        }
        return;
      }

      this.style = mono.create('style', {
        text: "div > .sf-dl-current-photo-btn {" +
        'display: none;' +
        'border: 1px solid #F8F8F8;' +
        'width: 20px;' +
        'height: 20px;' +
        'padding: 0;' +
        'position: absolute;' +
        'background: url('+SaveFrom_Utils.svg.getSrc('download', '#777777')+') center no-repeat #F8F8F8;' +
        'background-size: 12px;' +
        'top: 20px;' +
        'left: 30px;' +
        'cursor: pointer;' +
        "}" +
        "div > .sf-dl-current-photo-btn:hover {" +
        'background: url('+SaveFrom_Utils.svg.getSrc('download', '#00B75A')+') center no-repeat #F8F8F8;' +
        'background-size: 12px;' +
        "}" +
        "div > .sf-dl-current-photo-btn:active {" +
        "outline: 0;" +
        "box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.125);" +
        "}" +
        "div:hover > .sf-dl-current-photo-btn {display: block;}"
      });

      document.head.appendChild(this.style);
    },
    addDlCurrentPhotoBtn: function(container) {
      var insertContainer = container.parentNode;
      var exBtn = this.rmCurrentPhotoBtn(insertContainer);
      if (exBtn) {
        return;
      }

      var _this = this;

      var btn = mono.create('a', {
        class: 'sf-dl-current-photo-btn',
        href: '#',
        title: language.download,
        on: ['click', function(e) {
          e.stopPropagation();
          e.preventDefault();

          mono.onRemoveEvent(this, vk.hideMenu);

          if (vk.contextMenu && vk.contextMenu.isShow) {
            vk.hideMenu();
            return;
          }

          var menu = vk.contextMenu = SaveFrom_Utils.popupMenu.quickInsert(this, language.download + ' ...', "photoDlMenu", {
            parent: insertContainer
          });

          var link = _this.getCurrentPhotoOrigLinkEl(_this.getLayer());
          link = link && link.href;
          if (!link) {
            return menu.update(language.noLinksFound);
          }

          var photoFileName = mono.fileName.modify(_this.getFilenameFromUrl(link));
          var dotPos = photoFileName.lastIndexOf('.');
          var photoExt = photoFileName.substr(dotPos+1);
          var photoTitle = photoFileName.substr(0, dotPos);

          var menuItems = [];
          menuItems.push({
            href: link, title: photoTitle, quality: language.download,
            format: ' ', ext: photoExt, forceDownload: true,
            isOther: true,
            isBlank: true,
            func: function() {
              menu.hide();
            }
          });
          menuItems.push({
            href: '#getAlbum', title: '', quality: language.vkDownloadPhotoAlbum,
            format: ' ', ext: '', noSize: true,
            isOther: true,
            func: function(e){
              e.preventDefault();

              photo.downloadPhoto();
              menu.hide();
            }
          });
          menu.update(menuItems);
        }]
      });

      insertContainer.appendChild(btn);
    },
    currentPhotoAddBtn: function(container) {
      if (!container) {
        return;
      }
      var pvPhoto = container.querySelector('#pv_photo');
      if (!pvPhoto) {
        return;
      }
      var _this = this;
      var onSelectorFound = function(pvPhoto, pvOpenOriginal) {
        if (!pvOpenOriginal) {
          _this.rmCurrentPhotoBtn();
          return;
        }
        var originalLink = pvOpenOriginal.href;
        if (!originalLink) {
          _this.rmCurrentPhotoBtn();
          return;
        }
        _this.addDlCurrentPhotoBtn(pvPhoto);
      };
      var n = 0;
      var wait = function() {
        n++;
        setTimeout(function() {
          var pvOpenOriginal = _this.getCurrentPhotoOrigLinkEl(container);
          if (pvOpenOriginal || n > 9) {
            return onSelectorFound(pvPhoto, pvOpenOriginal);
          }
          wait();
        }, 300);
      };
      wait();
    },
    showLinks: function() {
      if (!mono.isSafari && !mono.isOpera) {
        this.currentPhotoAddBtn(this.getLayer());
      }

      var container = this.getContainer();
      if (!container) {
        return;
      }

      this.addPhotoAlbumDlBtn(container);
    },
    downloadPhoto: function() {
      var container = this.getContainer();
      var id = this.getAlbumId(window.location.href);
      if (!id) {
        var link = document.querySelector('#pv_album_name a');
        if (link && !audio.elIsHidden(link)) {
          id = this.getAlbumId(link.href);
        }
      }
      this.getLinks(container, id);

      if ([1].indexOf(preference.cohortIndex) !== -1) {
        mono.sendMessage({action: 'trackCohort', category: 'vk', event: 'click', label: 'photo-menu'});
      }
    },
    showListOfPhotos: function(title, links) {
      title = title.replace(/[<>]+/g, '_');
      var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style type="text/css">' +
        'a,img{display:block;margin-bottom:5px;}' +
        '</style></head><body>' + title +
        '<p style="width:640px">' +
        language.vkListOfPhotosInstruction +
        '</p><br><br>';

      for (var i = 0, item; item = links[i]; i++) {
        var src = item.url;
        var fileName = item.filename;
        if(fileName) {
          html += '<a href="' + src + '" download="' + fileName + '">' +
            '<img src="' + src + '" alt="photo"></a>';
        } else {
          html += '<img src="' + src + '" alt="photo">';
        }
      }

      html += '</body></html>';

      var url = 'data:text/html;charset=utf-8;base64,' + encodeURIComponent(btoa(SaveFrom_Utils.utf8Encode(html)));

      window.open(url, '_blank');
    },
    showListOfLinks: function(title, links, showListOfPhotosLink) {
      var listOfPhotoLink;
      if (showListOfPhotosLink) {
        listOfPhotoLink = mono.create(document.createDocumentFragment(), {
          append: [
            mono.create('p', {
              append: [
                mono.create('a', {
                  text: language.vkListOfPhotos,
                  href: '#',
                  class: 'sf__hidden',
                  style: {
                    fontWeight: 'bolder',
                    border: 'none',
                    textDecoration: 'underline'
                  },
                  on: ['click', function(e) {
                    e.preventDefault();
                    photo.showListOfPhotos(title, links);
                  }]
                })
              ]
            })
          ]
        });
      } else {
        listOfPhotoLink = '';
      }

      var textareaText = '';
      for (var i = 0, item; item = links[i]; i++) {
        textareaText += item.url + '\r\n';
      }

      var container = mono.create(document.createDocumentFragment(), {
        append: [
          mono.create('p', {
            text: title,
            style: {
              color: '#0D0D0D',
              fontSize: '20px',
              marginBottom: '11px',
              marginTop: '5px'
            }
          }),
          mono.create('p', {
            append: mono.parseTemplate(language.vkListOfLinksInstruction)
          }),
          listOfPhotoLink,

          mono.create('textarea', {
            text: textareaText,
            cols: 60,
            rows: 10,
            style: {
              width: '100%'
            }
          }),
          (!mono.isChrome && !mono.isFF)? undefined : mono.create('button', {
            text: language.copy,
            style: {
              height: '27px',
              backgroundColor: '#ffffff',
              border: '1px solid #9e9e9e',
              marginTop: '6px',
              paddingLeft: '10px',
              paddingRight: '10px',
              borderRadius: '5px',
              fontSize: '14px',
              cursor: 'pointer',
              cssFloat: 'right'
            },
            on: ['click', function(e) {
              var _this = this;
              _this.disabled = true;
              mono.sendMessage({action: 'addToClipboard', text: textareaText});
              setTimeout(function() {
                _this.disabled = false;
              }, 1000);
            }],
            append: mono.create('style', {
              text: '#savefrom_popup_box button:hover:not(:disabled){' +
              'background-color: #597A9E !important;' +
              'border-color: #597A9E !important;' +
              'color: #fff;' +
              '}' +
              '#savefrom_popup_box button:active{' +
              'opacity: 0.9;' +
              '}'
            })
          })
        ]
      });

      SaveFrom_Utils.popupDiv(container);
    }
  };

  //  /PHOTO
  ///////////////////////////////////////////////////////////////////

  // do...

  var mVk = {
    mobileMenu: null,
    observer: null,
    styleEl: null,
    run: function() {
      "use strict";
      var _this = this;

      if (!SaveFrom_Utils.mutationWatcher.isAvailable()) {
        // console.error('MutationObserver is not supported!');
        return;
      }

      if (_this.observer) {
        return _this.observer.start();
      }

      _this.observer = SaveFrom_Utils.mutationWatcher.run({
        callback: function(summaryList) {
          var summary, n, node;

          summary = summaryList[0];
          for (n = 0; node = summary.added[n]; n++) {
            if (node.dataset.sfSkip > 0) {
              continue;
            }
            node.dataset.sfSkip = '1';

            _this.insertAudioBtn(node);
          }

          summary = summaryList[1];
          for (n = 0; node = summary.added[n]; n++) {
            if (!node.parentNode.classList.contains('video_view')) {
              continue;
            }

            if (node.dataset.sfSkip > 0) {
              continue;
            }
            node.dataset.sfSkip = '1';

            _this.insertVideoBtn(node);
          }

          summary = summaryList[2];
          for (n = 0; node = summary.removed[n]; n++) {
            mono.onRemoveListener(node);
          }
        },
        queries: [
          {css: 'div.audio_item', is: 'added'},
          {css: 'div.vv_body', is: 'added'},
          {css: '.' + mono.onRemoveClassName, is: 'removed'}
        ]
      });

      _this.insertStyle();
    },
    hideMenu: function() {
      if (mVk.mobileMenu) {
        mVk.mobileMenu.hide();
        mVk.mobileMenu = null;
      }
    },
    insertStyle: function() {
      "use strict";
      if (this.styleEl) {
        if (!this.styleEl.parentNode) {
          document.head.appendChild(this.styleEl);
        }
        return;
      }

      var audioBtnClassName = '.' + downloadLinkClassName + '.sf-audio';
      this.styleEl = mono.create('style', {
        class: 'sf-style',
        text: audioBtnClassName + '{' +
        'display: block;' +
        'float: right;' +
        'border-radius: 3px;' +
        'width: 22px;' +
        'height: 22px;' +
        'margin-top: 1px;' +
        'margin-left: 3px;' +
        'margin-right: 3px;' +
        'background: url('+SaveFrom_Utils.svg.getSrc('download', '#ffffff')+') center no-repeat;' +
        'background-size: 12px;' +
        'background-color: #5E80AA;' +
        '}'
      });
      document.head.appendChild(this.styleEl);
    },
    onAudioBtnClick: function(e) {
      "use strict";
      e.stopPropagation();

      SaveFrom_Utils.downloadOnClick(e, null, {
        useFrame: true
      });
    },
    getAudioDlBtnNode: function(url) {
      "use strict";
      return mono.create('a', {
        class: [downloadLinkClassName, 'sf-audio'],
        href: url,
        target: '_blank',
        on: ['click', this.onAudioBtnClick]
      });
    },
    insertAudioBtn: function(node) {
      "use strict";
      var url = node.querySelector('input');
      url = url && url.value;
      if (!url) {
        return;
      }
      var pos = url.indexOf('?');
      if (pos !== -1) {
        url = url.substr(0, pos);
      }

      var aiDur = node.querySelector('.ai_dur');

      if (!aiDur) {
        return;
      }

      var parent = aiDur.parentNode;

      var btn = this.getAudioDlBtnNode(url);

      var exBtn = parent.querySelector('.' + downloadLinkClassName);
      if (exBtn) {
        exBtn.parentNode.replaceChild(btn, exBtn);
      } else {
        var nextEl = aiDur.nextElementSibling;

        if (!nextEl) {
          return;
        }

        parent.insertBefore(btn, nextEl);
      }
    },
    onVideoBtnClick: function(links, e) {
      "use strict";
      e.preventDefault();
      e.stopPropagation();

      mVk.hideMenu();

      var lightBox = mVk.mobileMenu = SaveFrom_Utils.mobileLightBox.show(language.download + ' ...');

      var mLinks;
      if (links.request) {
        var onResponse = function(response) {
          if (response && links.request.action === 'getPladformVideo') {
            mLinks = video.prepareLinks(video.preparePladformLinks(response));

            lightBox.update(mLinks);
            return;
          }
          if(!response || !response.links) {
            return lightBox.update(language.noLinksFound);
          }
          mLinks = SaveFrom_Utils.popupMenu.prepareLinks[links.request.hosting](response.links, response.title);
          lightBox.update(mLinks);
        };
        try {
          mono.sendMessage(links.request, onResponse);
        } catch (e) {
          onResponse();
        }
        return;
      }

      mLinks = video.prepareLinks(links);
      lightBox.update(mLinks);
    },
    appendVideoBtn: function(links, layer) {
      "use strict";
      var container = layer.querySelector('.mv_actions');
      var btn = mono.create('li', {
        class: [downloadLinkClassName, 'sf-video-ctr'],
        append: mono.create('a', {
          class: [downloadLinkClassName, 'mva_item'],
          text: language.download,
          on: ['click', this.onVideoBtnClick.bind(this, links)]
        })
      });
      container && container.appendChild(btn);
      mono.onRemoveEvent(btn, mVk.hideMenu);
    },
    insertVideoBtn: function(node) {
      "use strict";
      var firstChild = node.querySelectorAll('iframe, video, a')[0];
      if (!firstChild) {
        return;
      }

      video.getLinksFromPlayer(mono.getParentByClass(node, 'video_view'), firstChild, this.appendVideoBtn.bind(this));
    }
  };
}, null, function syncIsActive() {
  "use strict";
  /*@if isVkOnly=0>*/
  if (mono.isSafari || mono.isGM) {
    if (!mono.checkUrl(document.URL, [
        'http://vk.com/*',
        'http://*.vk.com/*',
        'http://vkontakte.ru/*',
        'http://*.vkontakte.ru/*',
        'https://vk.com/*',
        'https://*.vk.com/*',
        'https://vkontakte.ru/*',
        'https://*.vkontakte.ru/*'
      ])) {
      return false;
    }
  }
  /*@if isVkOnly=0<*/

  return true;
});