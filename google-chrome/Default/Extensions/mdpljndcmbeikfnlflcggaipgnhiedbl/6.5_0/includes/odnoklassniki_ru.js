// ==UserScript==
// @name        Odnoklassniki downloader
//
// @include     http://odnoklassniki.ru/*
// @include     http://*.odnoklassniki.ru/*
// @include     https://odnoklassniki.ru/*
// @include     https://*.odnoklassniki.ru/*
// @include     http://ok.ru/*
// @include     http://*.ok.ru/*
// @include     https://ok.ru/*
// @include     https://*.ok.ru/*
// ==/UserScript==

(typeof mono === 'undefined') && (mono = {loadModule: function() {this.loadModuleStack.push(arguments);},loadModuleStack: []});

mono.loadModule('odnoklassniki', function(moduleName, initData) {
  "use strict";

  var language = initData.getLanguage;
  var preference = initData.getPreference;
  var moduleState = preference.moduleOdnoklassniki ? 1 : 0;
  var allowDownloadMode = mono.isSafari || mono.isChrome || mono.isFF || (mono.isGM && mono.isTM);

  mono.onMessage(function(message, cb){
    if (message.action === 'getModuleInfo') {
      if (message.url !== location.href) return;
      return cb({state: moduleState, moduleName: moduleName});
    }
    if (message.action === 'changeState') {
      if (moduleName !== message.moduleName) {
        return;
      }
      return odnoklassniki.changeState(message.state);
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
  });

  if (moduleState) {
    mono.asyncCall(function() {
      odnoklassniki.run();
    });
  }

  var odnoklassniki = {
    linkCache: {},
    contextMenu: null,
    videoToken: null,
    run: function() {
      moduleState = 1;

      audio.getJsSessionId();
      videoFeed.injectStyle();
      photo.injectStyle();

      if (SaveFrom_Utils.mutationWatcher.isAvailable()) {
        return odnoklassniki.mutationMode.enable();
      }

      audio.showLinks();
      videoFeed.enable();
      mono.onUrlChange(function(url, oldUrl) {
        video.catchPopup();
      }, 1);
    },
    changeState: function(state) {
      moduleState = state;
      video.rmBtn();
      audio.disable();
      photo.rmCurrentPhotoBtn();
      mono.clearUrlChange();
      videoFeed.disable();
      videoFeed.rmBtn();
      odnoklassniki.hideMenu();
      odnoklassniki.mutationMode.stop();
      odnoklassniki.clearCache();
      if (state) {
        odnoklassniki.run();
      }
    },
    hideMenu: function() {
      if (odnoklassniki.contextMenu) {
        odnoklassniki.contextMenu.hide();
        odnoklassniki.contextMenu = null;
      }
    },
    clearCache: function() {
      var linkCache = odnoklassniki.linkCache;
      for (var key in linkCache) {
        delete linkCache[key];
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
      wrapOnPhotoOver: function() {
        mono.off(this, 'mouseenter', odnoklassniki.mutationMode.wrapOnPhotoOver);

        if (!moduleState) {
          return;
        }

        photo.addCurrentDlBtn(this);
      },
      wrapVideoFeedOnImgOver: function() {
        mono.off(this, 'mouseenter', odnoklassniki.mutationMode.wrapVideoFeedOnImgOver);

        if (!moduleState) {
          return;
        }

        videoFeed.onImgOver.call(this);
      },
      wrapAudioOnMouseOver: function() {
        if (!moduleState) {
          return;
        }

        audio.onMouseOver.apply(this, arguments);
      },
      wrapAudioOnMouseOut: function() {
        if (!moduleState) {
          return;
        }

        audio.onMouseOut.apply(this, arguments);
      },
      enable: function() {
        if (this.observer) {
          return this.observer.start();
        }

        var _this = this;

        this.observer = SaveFrom_Utils.mutationWatcher.run({
          callback: function(summaryList) {
            var summary, n, i, node;

            for (i = 0; i < 2; i++) {
              summary = summaryList[i];
              for (n = 0; node = summary.added[n]; n++) {
                if (node.sfSkip > 0) {
                  continue;
                }
                node.sfSkip = '1';

                mono.on(node, 'mouseenter', _this.wrapAudioOnMouseOver);
                mono.on(node, 'mouseleave', _this.wrapAudioOnMouseOut);
              }
            }

            if (!mono.isSafari && !mono.isOpera) {
              summary = summaryList[2];
              for (n = 0; node = summary.added[n]; n++) {
                if (node.dataset.sfSkip > 0) {
                  continue;
                }
                node.dataset.sfSkip = '1';

                mono.on(node, 'mouseenter', _this.wrapOnPhotoOver);
              }
            }

            summary = summaryList[3];
            for (n = 0; node = summary.added[n]; n++) {
              if (node.dataset.sfSkip > 0) {
                continue;
              }
              node.dataset.sfSkip = '1';

              var parent = mono.getParent(node, '.vp_video');
              if (!parent) {
                return;
              }

              var info = video.getPlayerOptions(node);
              if (info) {
                video.appendLinkUnderVideo(parent.parentNode, info);
              }
            }

            for (i = 4; i < 7; i++) {
              summary = summaryList[i];
              for (n = 0; node = summary.added[n]; n++) {
                if (node.dataset.sfSkip > 0) {
                  continue;
                }
                node.dataset.sfSkip = '1';

                mono.on(node, 'mouseenter', _this.wrapVideoFeedOnImgOver);
              }
            }

            summary = summaryList[7];
            for (n = 0; node = summary.removed[n]; n++) {
              mono.onRemoveListener(node);
            }
          },
          queries: [
            {css: '.track.js-track', is: 'added'},
            {css: '.mus-tr_i', is: 'added'},
            {css: '#photo-layer_photo', is: 'added'},
            {css: '.vp_video .vid-card_cnt', is: 'added'},
            {css: '.d_comment_text_w img', is: 'added'},
            {css: '.video-card .video-card_img-w img', is: 'added'},
            {css: '.vid-card_cnt img', is: 'added'},
            {css: '.' + mono.onRemoveClassName, is: 'removed'}
          ]
        });
      }
    }
  };

  var downloadLinkClassName = 'savefrom_ok_download';

  var updateLinks = function() {
    odnoklassniki.clearCache();
    removeDownloadLinks();
    audio.getJsSessionId();
    video.catchPopup();
  };

  var createTextLink = function(href, text, blank) {
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
    var selector = '.' + downloadLinkClassName;

    var e = document.querySelectorAll(selector);
    for(var i = e.length-1; i >= 0; i--)
      e[i].parentNode.removeChild(e[i]);
  };

  ///////////////////////////////////////////////////////////////////
  //  AUDIO

  var audio = {
    downloadIdPrefix: 'savefrom_ok_audio_download_',
    infoIdPrefix: 'savefrom_ok_audio_info_',
    lastRow: null,
    lastRowCandidate: null,
    timer: 0,
    jsessionId: '',
    scriptNode: null,
    cache: {},
    ajaxTimer: {},


    showRowElements: function(row, show, force)
    {
      if(!row)
        return;

      var node = row.querySelectorAll('div.' + downloadLinkClassName);

      if(show && (!node || node.length == 0))
      {
        if(!audio.showRowLinks(row))
          return;

        node = row.querySelectorAll('div.' + downloadLinkClassName);
      }

      if(node && node.length > 0)
      {
        var d = show ? '' : 'none';
        for(var i = 0; i < node.length; i++)
        {
          node[i].style.display = d;
        }
      }
    },


    getNodeTrackId: function(node)
    {
      var query = node.getAttribute('data-query');
      if(query) {
        try {
          query = JSON.parse(query);
          if(query && query.trackId) {
            return query.trackId;
          }
        } catch(e) {
          return null;
        }
      }

      var span = node.querySelector('span.track_play[onclick]');
      if (span) {
        var onClick = span.getAttribute('onclick') || '';
        var trackId = onClick.match(/playMediatopic\(['"]?(\d+)['"]?/);
        return trackId && trackId[1];
      }

      return null;
    },


    getTrackId: function(parent)
    {
      if(!parent)
        return null;

      var trackId = audio.getNodeTrackId(parent);
      if(trackId)
      {
        var links = {};
        links[trackId] = parent;
        return links;
      }

      var id = parent.id;
      if(id)
      {
        var hashPos = id.indexOf('#');
        if (hashPos !== -1) {
          id = id.substr(hashPos + 1);
        }
        trackId = SaveFrom_Utils.getMatchFirst(id, /^\w+_(\d+)$/i);
        if (!trackId) {
          if (id.indexOf('GROUP_FEED') !== -1) {
            trackId = id.substr( id.lastIndexOf('_') + 1 );
          }
        }
        if(trackId)
        {
          var links = {};
          links[trackId] = parent;
          return links;
        }
      }

      return null;
    },


    showRowLinks: function(row)
    {
      var links = audio.getTrackId(row);
      for(var i in links)
      {
        if(audio.handleRow(i, links[i]))
          return true;
      }

      return false;
    },

    disable: function() {
      mono.off(document, 'mouseenter', audio.onMouseOver, true);
      mono.off(document, 'mouseleave', audio.onMouseOut, true);

      audio.lastRowCandidate = null;
      audio.lastRow = null;
      var dlBtn = document.querySelectorAll('.'+downloadLinkClassName);
      for (var i = 0, item; item = dlBtn[i]; i++) {
        item.parentNode.removeChild(item);
      }
    },

    getJsSessionId: function() {
      "use strict";
      var url = location.protocol + '//' +  location.host + '/web-api/music/conf';
      mono.request({
        type: 'POST',
        url: url,
        data: '_',
        json: true,
        localXHR: true
      }, function(err, resp, data) {
        if (err || !data || !data.sid) {
          console.error('Get jsSessionId error!', err);
          return;
        }

        audio.jsessionId = data.sid;
      });
    },

    showLinks: function() {
      "use strict";
      audio.cache = {};

      for(var i in audio.ajaxTimer) {
        window.clearTimeout(audio.ajaxTimer[i]);
      }

      audio.ajaxTimer = {};

      mono.off(document, 'mouseenter', audio.onMouseOver, true);
      mono.off(document, 'mouseleave', audio.onMouseOut, true);

      mono.on(document, 'mouseenter', audio.onMouseOver, true);
      mono.on(document, 'mouseleave', audio.onMouseOut, true);
    },


    getLink: function(trackId)
    {
      if(!trackId || !audio.jsessionId)
        return;

      audio.ajaxTimer[trackId] = window.setTimeout(function(){
        delete audio.ajaxTimer[trackId];
        audio.deleteLink(trackId);
      }, 30000);

      mono.sendMessage({
        action: 'getOdnoklassnikiAudioLinks',
        url: location.href,
        trackId: trackId,
        jsessionId: audio.jsessionId
      }, function(response){
        audio.setLink(response.trackId, response.data);
      });
    },


    onMouseOver: function(event)
    {
      if (!audio.jsessionId) {
        return;
      }

      var node = event.target;

      if (node.nodeType !== 1) {
        return;
      }

      if (
        !node.classList.contains('track') &&
        !node.classList.contains('mus-tr_i')
      ) {
        return;
      }

      var row = node;
      if(row) {
        audio.lastRowCandidate = row;
        window.clearTimeout(audio.timer);

        if(audio.lastRow == row)
          return;

        audio.timer = window.setTimeout(function(){
          audio.showRowElements(audio.lastRow, false);
          audio.lastRow = row;
          audio.lastRowCandidate = null;
          audio.showRowElements(audio.lastRow, true);
        }, 250);
      }
    },


    onMouseOut: function(event)
    {
      if(!audio.lastRow && !audio.lastRowCandidate) {
        return;
      }

      var node = event.target;
      if(SaveFrom_Utils.isParent(node, audio.lastRow) ||
        SaveFrom_Utils.isParent(node, audio.lastRowCandidate))
      {
        window.clearTimeout(audio.timer);
        audio.timer = window.setTimeout(function(){
          audio.showRowElements(audio.lastRow, false);
          audio.lastRow = null;
          audio.lastRowCandidate = null;
        }, 1000);
      }
      node = null;
    },


    handleRow: function(trackId, row)
    {
      if(!trackId || !row)
        return false;

      var parent = row;
      parent.style.position = 'relative';

      var duration = row.querySelector('.m_c_duration, .m_portal_duration');

      var box = document.createElement('div');
      box.className = downloadLinkClassName;

      var right = 40;
      var mmpcw = document.getElementById('mmpcw');
      if (mmpcw && mmpcw.contains(row)) {
        right = 65;
      }

      SaveFrom_Utils.setStyle(box, {
        color: '#fff',
        background: '#46aa19',
        border: '1px solid #337d12',
        borderRadius: '3px',
        padding: '1px 5px',
        position: 'absolute',
        right: right + 'px',
        top: '50%',
        lineHeight: '15px',
        fontSize: '12px',
        opacity: 0,
        zIndex: 9999,
        cursor: 'pointer'
      });

      box.addEventListener('click', audio.onBoxClick, false);

      var title = audio.getTitle(trackId, row);

      var link1 = createTextLink('#', '...');
      link1.id = audio.downloadIdPrefix + trackId;
      link1.title = language.downloadTitle;
      if(duration)
      {
        link1.setAttribute('data-savefrom-helper-duration',
          audio.secondsFromDurationNode(duration));
      }

      if(title)
      {
        title += '.mp3';
        link1.setAttribute('download', mono.fileName.modify(title));
      }

      SaveFrom_Utils.setStyle(link1, {
        color: '#fff',
        fontWeight: 'normal'
      });

      link1.addEventListener('click', audio.onDownloadLinkClick, false);

      box.appendChild(link1);
      parent.appendChild(box);

      if(audio.cache[trackId])
        audio.setLinkFromCache(trackId, link1);
      else
        audio.getLink(trackId);

      box.style.marginTop = '-' + (box.offsetHeight / 2) + 'px';
      box.style.opacity = '1';

      var close = document.createElement('span');
      close.textContent = String.fromCharCode(215);
      close.title = language.close;
      SaveFrom_Utils.setStyle(close, {
        color: '#fff',
        fontFamily: 'Tahoma,Helvetica,sans-serif',
        fontSize: '15px',
        marginLeft: '7px',
        opacity: '.7',
        cursor: 'pointer'
      });
      close.addEventListener('click', audio.onCloseBtnClick, false);
      box.appendChild(close);

      return true;
    },


    onBoxClick: function(event)
    {
      event.preventDefault();
      event.stopPropagation();

      var a = this.querySelector('a.' + downloadLinkClassName);
      if(a) {
        mono.trigger(a, 'click', {cancelable: true});
        return false;
      }

      this.style.display = 'none';
      return false;
    },


    onDownloadLinkClick: function(event)
    {
      if(event.button == 2)
        return false;

      event.stopPropagation();

      if(this.href == '#')
      {
        event.preventDefault();
        return false;
      }

      SaveFrom_Utils.downloadOnClick(event);

      if ([1].indexOf(preference.cohortIndex) !== -1) {
        var mmpcw = document.getElementById('mmpcw');
        if (!mmpcw || !mmpcw.contains(this)) {
          mono.sendMessage({action: 'trackCohort', category: 'ok', event: 'click', label: 'music-feed'});
        } else {
          mono.sendMessage({action: 'trackCohort', category: 'ok', event: 'click', label: 'music-list'});
        }
      }
      return false;
    },


    onCloseBtnClick: function(event)
    {
      if(event.button == 2)
        return true;

      event.preventDefault();
      event.stopPropagation();

      var parent = mono.getParent(this, '.' + downloadLinkClassName);
      if(parent)
        parent.style.display = 'none';

      return false;
    },


    deleteLink: function(trackId, node)
    {
      if(!node && trackId)
        node = document.getElementById(audio.downloadIdPrefix + trackId);

      if(!node)
        return;

      var box = node.parentNode;
      if (!box) {
        return;
      }
      box.parentNode.removeChild(box);
    },


    getHash: function(src, magic)
    {
      if(!magic)
        magic = [4,3,5,6,1,2,8,7,2,9,3,5,7,1,4,8,8,3,4,3,1,7,3,5,9,8,1,4,3,7,2,8];

      var a = [];
      for(var i = 0; i < src.length; i++)
      {
        a.push(parseInt('0x0' + src.charAt(i)));
      }

      src = a;

      var res = [];
      src = src.slice(0);
      src[32] = src[31];
      var sum = 0;
      var i = 32;
      while(i-- > 0)
        sum += src[i];

      for(var x = 0; x < 32; x++)
        res[x] = Math.abs(sum - src[x + 1] * src[x] * magic[x]);

      return res.join('');
    },


    setLinkFromCache: function(trackId, node)
    {
      if(!audio.cache[trackId])
        return false;

      if(!node)
        node = document.getElementById(audio.downloadIdPrefix + trackId);

      if(!node)
        return;

      node.href = audio.cache[trackId].url;
      node.textContent = '';
      if(audio.cache[trackId].downloadAttr)
        node.setAttribute('download', audio.cache[trackId].downloadAttr);

      var icon = mono.create('div', {
        style: {
          display: 'inline-block',
          width: '16px',
          height: '16px',
          verticalAlign: 'middle',
          opacity: '0.9',
          background: 'url('+ SaveFrom_Utils.svg.getSrc('download', '#ffffff') +') center no-repeat'
        }
      });
      node.appendChild(icon);

      var info = document.createTextNode(audio.cache[trackId].info);

      if(node.nextSibling)
        node.parentNode.insertBefore(info, node.nextSibling);
      else
        node.parentNode.appendChild(info);

      return true;
    },


    setLink: function(trackId, data, clientHash)
    {
      if(!trackId)
        return;

      window.clearTimeout(audio.ajaxTimer[trackId]);

      var node = document.getElementById(audio.downloadIdPrefix + trackId);
      if(!node)
        return;

      if(audio.setLinkFromCache(trackId, node))
        return;

      if(!data || !data.play)
      {
        audio.deleteLink(trackId, node);
        node.textContent = '?';
        return;
      }

      if(clientHash === undefined)
      {
        var md5 = data.play.match(/(?:\?|&)md5=([\da-f]{32})/i);
        if(md5 && md5.length > 1) {
          md5 = md5[1];
          try {
            md5 = SaveFrom_Utils.md5(md5 + 'secret');
            audio.setLink(trackId, data, audio.getHash(md5));
            return;
          } catch(err) {}
        }

        audio.deleteLink(trackId, node);
        return;
      }

      var size = SaveFrom_Utils.getMatchFirst(data.play, /(?:\?|&)size=(\d+)/i);
      if(!size)
        return;

      audio.cache[trackId] = {};
      audio.cache[trackId].url = data.play + (clientHash ? '&clientHash=' + clientHash : '');

      var info = ' (' + SaveFrom_Utils.sizeHuman(size, 2);

      var duration = node.getAttribute('data-savefrom-helper-duration');
      if(data.track)
      {
        if(data.track.duration)
          duration = data.track.duration;

        if(data.track.ensemble && data.track.name)
        {
          var title = data.track.ensemble + ' - ' + data.track.name;
          audio.cache[trackId].title = title;
          audio.cache[trackId].downloadAttr = mono.fileName.modify(title + '.mp3');
        }
      }

      if(size && duration)
      {
        duration = parseInt(duration);
        if(isNaN(duration))
        {
          delete audio.cache[trackId];
          return;
        }

        var bitrate = Math.floor((size / duration) / 125) + ' ' + language.kbps;
        info += ' ~ ' + bitrate;
      }

      info += ')';
      audio.cache[trackId].info = info;

      audio.setLinkFromCache(trackId, node);
    },


    getTitle: function(id, row)
    {
      if(!id || !row)
        return '';

      var name = '';

      var performer = row.querySelector('.m_c_artist, .mus-tr_artist, .m_portal_c_artist');
      var title = row.querySelector('.m_track_source, .mus-tr_song, .m_portla_track_name');

      if(performer)
      {
        performer = performer.textContent;
        if(performer)
          name += performer.trim();
      }

      if(title)
      {
        title = title.textContent;
        if(title)
        {
          if(name)
            name += ' - ';

          name += title.trim();
        }
      }

      if(name)
        return name.replace(/\<a\s+[^\>]+\>/ig, '').replace(/\<\/a\>/ig, '');

      return '';
    },


    secondsFromDurationNode: function(node)
    {
      if(!node)
        return 0;

      var text = node.textContent;
      if(!text)
        return 0;

      var m = text.match(/^(?:\s*(\d+)\s*\:)?\s*(\d+)\s*\:\s*(\d+)/);
      if(m && m.length > 3)
      {
        if(!m[1])
          m[1] = 0;

        return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]);
      }

      return 0;
    },

    getPlaylistName: function(container) {
      if (container === document) return;

      var title = container.querySelector('.mus_h2_tx');
      if (!title) return;
      return mono.fileName.modify(title.textContent) || undefined;
    },

    elIsHidden: function isHidden(el) {
      return (el.offsetParent === null)
    },

    getLayer: function() {
      var layer = document.getElementById('mmpcw');
      if (!layer) {
        return;
      }
      if (layer.classList.contains('__hidden')) {
        return;
      }
      layer = layer.querySelector('div.m_c_s[aria-hidden="false"]');
      if (!layer || audio.elIsHidden(layer)) {
        return;
      }
      return layer;
    },

    getPopup: function(title, type, onClose) {
      var template = SaveFrom_Utils.playlist.getInfoPopupTemplate();

      var progressEl;
      mono.create(template.textContainer, {
        append: [
          !title ? undefined : mono.create('p', {
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

    getAudioLinksViaAPI: function(trackIdList, onProgress, cb) {
      var abort = false;
      var trackList = [];
      var len = trackIdList.length;
      var next = function() {
        if (abort) {
          return;
        }
        var trackIdArr = trackIdList.splice(0, 10);
        if (trackIdArr.length === 0) {
          return cb(trackList);
        }

        mono.sendMessage({
          action: 'getOkAudioListLinks',
          trackIdArr: trackIdArr,
          jsessionId: audio.jsessionId
        }, function(responseList){
          if (Array.isArray(responseList)) {
            for (var i = 0, item; item = responseList[i]; i++) {
              if (typeof item.play !== 'string' || typeof item.track !== 'object') continue;

              var url = item.play;
              var md5 = url.match(/(?:\?|&)md5=([\da-f]{32})/i);
              if (!md5) continue;

              var title;
              if (item.track.name) {
                title = item.track.name;
              }
              if (item.track.ensemble) {
                title = item.track.ensemble + (title ? ' - ' + title : '');
              }
              if (!title) {
                title = 'noname';
              }

              md5 = md5[1];
              try {
                md5 = SaveFrom_Utils.md5(md5 + 'secret');
                var hash = audio.getHash(md5);

                url += '&clientHash=' + hash;

                trackList.push({
                  url: url,
                  duration: item.track.duration || 0,
                  title: title,
                  filename: mono.fileName.modify(title) + '.mp3'
                });
              } catch(err) {}
            }
          }
          onProgress(len - trackIdList.length, len);
          next();
        });
      };
      next();

      return {
        abort: function() {
          abort = true;
        }
      }
    },

    getAudioListLinksPopup: function(trackIdList, title, cb) {
      var process;
      var popup = this.getPopup(title, 'audio', function onClose() {
        if (process) {
          process.abort();
        }
      });
      var _cb = function(links) {
        if (links.length === 0) {
          popup.onError(language.vkMp3LinksNotFound);
          return;
        }
        popup.onReady();

        cb(links);
      }.bind(this);

      popup.onPrepare(language.download+' ...');

      process = this.getAudioLinksViaAPI(trackIdList, popup.onProgress, _cb);
    },

    getAudioLinks: function(container, title, cb) {
      var rowList = container.querySelectorAll(['.m_portal_track', '.m_c_tr', '.mus-tr_i']);
      var trackIdList = [];
      for (var i = 0, row; row = rowList[i]; i++) {
        var trackIdObj = audio.getTrackId(row);
        for (var trackId in trackIdObj) {
          trackIdList.push(trackId);
        }
      }
      this.getAudioListLinksPopup(trackIdList, title, cb);
    },

    downloadMP3Files: function() {
      var container = audio.getLayer() || document;
      var title = audio.getPlaylistName(container);
      audio.getAudioLinks(container, title, function(trackList) {
        SaveFrom_Utils.downloadList.showBeforeDownloadPopup(trackList, {
          type: 'audio',
          folderName: title
        });
      });
    },

    showListOfAudioFiles: function(showPlaylist) {
      var container = audio.getLayer() || document;
      var title = audio.getPlaylistName(container);
      audio.getAudioLinks(container, title, function(trackList) {
        if(trackList.length) {
          if(showPlaylist) {
            SaveFrom_Utils.playlist.popupPlaylist(trackList, title, true);
          } else {
            SaveFrom_Utils.playlist.popupFilelist(trackList);
          }
          return;
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
    requestMobileToken: function(response, cb) {
      var host = null;
      response.links.some(function(item) {
        var hostname = item.url.match(/\/\/([^/]+)/);
        hostname = hostname && hostname[1];
        if (hostname) {
          host = hostname;
          return true;
        }
      });
      SaveFrom_Utils.bridge({
        timeout: 3000,
        args: [host],
        func: function(host, cb) {
          var cookie = document.cookie;
          var vdsig = cookie && cookie.match(/vdsig=([^;]+);/);
          vdsig = vdsig && vdsig[1];
          if (vdsig) {
            return cb({vtkn: vdsig});
          }

          host = host || 'vd4.mycdn.me';
          var xhr = new XMLHttpRequest();
          xhr.open('POST', location.protocol + '//'+host+'/usr_login', true);
          xhr.withCredentials = true;
          xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
          xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
              var data = null;
              try {
                data = JSON.parse(xhr.responseText);
              } catch(e){}

              return cb(data);
            }
          };
          xhr.send();
        },
        cb: function(data) {
          if (!data || !data.vtkn) {
            return cb();
          }

          if (data.ttl) {
            data.expire = Date.now() + data.ttl * 1000;
            odnoklassniki.videoToken = data;
          }

          response.vtkn = data.vtkn;

          cb(response);
        }
      });
    },
    getMobileToken: function(response, cb) {
      if (response.vtkn) {
        return cb(response);
      }

      var videoToken = odnoklassniki.videoToken;
      if (videoToken && videoToken.expire > Date.now()) {
        response.vtkn = videoToken.vtkn;
        return cb(response);
      }

      return video.requestMobileToken(response, cb);
    },
    wrapMobileLinks: function(response, cb) {
      video.getMobileToken(response, function(response) {
        if (!response || !response.vtkn) {
          return cb();
        }

        response.action = 'getOkViaMobileWrapped';
        response.links.forEach(function(link) {
          var sep = !/\?/.test(link.url) ? '?' : '&';
          link.url += sep + 'vdsig=' + response.vtkn;
        });
        cb(response);
      });
    },
    prepareResponse: function(response, cb) {
      var abort = function() {
        cb(language.noLinksFound);
      };
      if (!response || !response.links) {
        return abort();
      }

      if (!preference.showUmmyItem && response.action === 'getRutubeLinks') {
        return abort();
      }

      if (response.action === 'getOkViaMobile') {
        return video.wrapMobileLinks(response, function(response) {
          if (!response) {
            return abort();
          }

          video.prepareResponse(response, cb);
        });
      }

      var prepareLinkType = null;
      if (response.action === 'getYoutubeLinks') {
        prepareLinkType = 'youtube';
      } else
      if (response.action === 'getVimeoLinks') {
        prepareLinkType = 'vimeo';
      } else
      if (response.action === 'getDailymotionLinks') {
        prepareLinkType = 'dailymotion';
      } else
      if (response.action === 'getRutubeLinks') {
        prepareLinkType = 'rutube';
      }

      var menuLinks = null;

      if (prepareLinkType) {
        menuLinks = SaveFrom_Utils.popupMenu.prepareLinks[prepareLinkType](response.links, response.title);
      } else {
        menuLinks = videoFeed.prepareLinks(response.links, response.title);
      }

      return cb(menuLinks);
    },

    matchOpenGraph: function(metadata) {
      if (!metadata || !metadata.movie || !metadata.movie.contentId) {
        return;
      }

      var url = metadata.movie.contentId;

      if (url.indexOf('rutube.') !== -1 && preference.showUmmyItem) {
        return {
          action: 'getRutubeLinks',
          links: [url]
        }
      }

      if (url.indexOf('pladform') !== -1) {
        var urlArgs = mono.parseUrlParams(url);
        return {
          action: 'getPladformVideo',
          extVideoId: {
            playerId: urlArgs.pl,
            videoId: urlArgs.videoid
          }
        };
      }

      var request = SaveFrom_Utils.embedDownloader.checkUrl(url);
      if (request) {
        return request;
      }

      var poster = metadata.movie.poster;
      if (poster) {
        var ytId = poster.match(/ytimg\.com\/vi\/([^\/]+)\//);
        ytId = ytId && ytId[1];
        if (ytId) {
          return {
            action: 'getYoutubeLinks',
            extVideoId: ytId
          }
        }
      }
    },

    switchMetadataProvider: function(metadata) {
      "use strict";
      if (!metadata || !metadata.provider || !metadata.movie) {
        return;
      }

      switch(metadata.provider) {
        case 'USER_YOUTUBE':
          if (metadata.movie.contentId) {
            return {
              request: {
                action: 'getYoutubeLinks',
                extVideoId: metadata.movie.contentId
              }
            };
          }
          break;
        case 'OPEN_GRAPH':
          var request = this.matchOpenGraph(metadata);
          if (request) {
            return {
              request: request
            }
          }
          break;
        case 'LIVE_TV_ODKL':
        case 'UPLOADED_ODKL':
        case 'UPLOADED':
        case 'PARTNER':
        case 'YKL':
          if (metadata.videos && metadata.movie.title) {
            return {
              request: {
                action: 'wrapMobileLinks',
                title: metadata.movie.title,
                links: metadata.videos
              }
            };
          }

          /* via mobile
           return {
           request: {
           action: 'okDirectOrMobile',
           mvId: metadata.movie.id,
           metadata: metadata,
           title: metadata.movie.title,
           links: null
           }
           };
           */

          /* odirect only
           if (metadata.videos && metadata.movie.title) {
           return {
           links: videoFeed.prepareLinks(metadata.videos, metadata.movie.title)
           };
           }*/
          break;
      }
    },

    getPlayerMetadata: function(movieId, sid, cb, withSid) {
      var params = {
        cmd: 'videoPlayerMetadata',
        mid: movieId,
        rnd: Date.now()
      };

      if (withSid) {
        params.mtId = sid;
      }

      mono.request({
        url: location.protocol + '//' + location.host + '/dk?' + mono.param(params),
        json: true,
        localXHR: true
      }, function(err, resp, metadata) {
        if (err) {
          if (!withSid && sid) {
            video.getPlayerMetadata(movieId, sid, cb, 1);
            return;
          }

          return cb();
        }

        return cb(metadata);
      });
    },

    getEmbed: function(contentId, cb) {
      var params = mono.parseUrlParams(contentId);
      if (!params.id || !params.sig) {
        return cb();
      }

      var url = 'http://cdn-ok.com/video/get/?' + mono.param({
          id: params.id,
          format: 1,
          sig: params.sig,
          sig2: 'oldRotator'
        });

      mono.sendMessage({action: 'getData', url: url}, function(data) {
        if (!data) {
          return cb();
        }

        var jsonList = mono.findJson(data, [/"sourceType":/, /"sourceId":/]);

        var isFound = jsonList.some(function(json) {
          if (json.sourceType === 'youtube' && json.sourceId) {
            cb({
              request: {
                action: 'getYoutubeLinks',
                extVideoId: json.sourceId
              }
            });
            return true;
          }
        });

        if (!isFound) {
          return cb();
        }
      });
    },

    readMetadata: function(metadata, cb, skipPlayerMeta) {
      if (metadata.movie) {
        if (/cdn-ok\.com\/embed\//.test(metadata.movie.contentId)) {
          return this.getEmbed(metadata.movie.contentId, function(info) {
            if (!info || !info.request) {
              return cb();
            }

            mono.sendMessage(info.request, function (response) {
              video.prepareResponse(response, cb);
            });
          });
        }
      }

      if (!skipPlayerMeta && metadata.movie && metadata.movie.movieId) {
        var sid = metadata.movie.link && mono.parseUrlParams(decodeURIComponent(metadata.movie.link))['st.vpl.sid'];
        return this.getPlayerMetadata(metadata.movie.movieId, sid, function(_metadata) {
          video.readMetadata(_metadata || metadata, cb, 1);
        });
      }

      var info = this.switchMetadataProvider(metadata);
      if (!info) {
        return cb();
      }

      if (info.links) {
        return cb(info.links);
      }

      if (info.request) {
        if (info.request.action === 'getRutubeLinks') {
          video.prepareResponse(info.request, cb);
        } else
        if (info.request.action === 'wrapMobileLinks') {
          video.wrapMobileLinks(info.request, function(response) {
            video.prepareResponse(response, function(menuLinks) {
              cb(menuLinks, 1);
            });
          });
        } else {
          mono.sendMessage(info.request, function (response) {
            video.prepareResponse(response, cb);
          });
        }
      } else {
        cb();
      }
    },

    loadLinks: function(info, menu) {
      var linkCache = odnoklassniki.linkCache;
      var cacheKey = JSON.stringify(info);
      var cache = linkCache[cacheKey];
      if (cache) {
        return menu.update(cache);
      }

      var onGetMeta = function(metadata, skipPlayerMeta) {
        var onFail = function() {
          menu.update(language.noLinksFound);
        };

        if (!metadata) {
          return onFail();
        }

        video.readMetadata(metadata, function(menuLinks, noCache) {
          if (!menuLinks) {
            return onFail();
          }

          if (Array.isArray(menuLinks) && !menuLinks.length) {
            noCache = 1;
          }

          if (!noCache) {
            linkCache[cacheKey] = menuLinks;
          }

          menu.update(menuLinks);
        }, skipPlayerMeta);
      };

      if (info.metadata) {
        onGetMeta(info.metadata);
      } else
      if (info.request) {
        if (info.request.action === 'getOkMetadata') {
          mono.sendMessage(info.request, onGetMeta);
        } else
        if (info.request.action === 'getPlayerMetadata') {
          this.getPlayerMetadata(info.request.extVideoId, info.request.sid, function (metadata) {
            onGetMeta(metadata, 1);
          });
        } else
        if (info.request.action === 'getRutubeLinks') {
          video.prepareResponse(info.request, function(menuLinks) {
            menu.update(menuLinks);
          });
        } else {
          mono.sendMessage(info.request, function (response) {
            video.prepareResponse(response, function(menuLinks) {
              menu.update(menuLinks);
            });
          });
        }
      } else {
        menu.update(language.noLinksFound);
      }
    },

    appendLinkUnderVideo: function(container, info) {
      "use strict";
      var insertContainer = container.querySelector('.vp-layer-info_cnt');
      if (!insertContainer) {
        return;
      }

      var exButton = insertContainer.querySelector('.' + downloadLinkClassName);

      var button = mono.create('span', {
        className: downloadLinkClassName,
        style: {
          marginLeft: '12px'
        },
        on: [
          ['click', function(e) {e.stopPropagation();}],
          ['mousedown', function(e) {e.stopPropagation();}],
          ['keydown', function(e) {e.stopPropagation();}]
        ],
        append: [
          mono.create('a', {
            href: '#',
            text: language.download,
            on: ['click', function(e) {
              e.preventDefault();

              mono.onRemoveEvent(button, odnoklassniki.hideMenu);

              if (odnoklassniki.contextMenu && odnoklassniki.contextMenu.isShow) {
                if (odnoklassniki.contextMenu.button !== this) {
                  odnoklassniki.hideMenu();
                } else {
                  odnoklassniki.hideMenu();
                  return;
                }
              }

              var menu = odnoklassniki.contextMenu = SaveFrom_Utils.popupMenu.quickInsert(this, language.download+'...', 'sf-single-video-menu', {
                parent: container
              });

              if ([1].indexOf(preference.cohortIndex) !== -1) {
                mono.sendMessage({action: 'trackCohort', category: 'ok', event: 'click', label: 'video-under'});
              }

              video.loadLinks(info, menu);
            }]
          })
        ]
      });

      if (exButton && exButton.parentNode) {
        exButton.parentNode.replaceChild(button, exButton);
        exButton = null;
      } else {
        insertContainer.appendChild(button);
      }
    },

    getPlayerOptions: function(node) {
      var optionsNode = mono.getParent(node, '[data-player-element-id][data-options]');

      var options = optionsNode && optionsNode.dataset.options;

      if (!options) {
        return;
      }

      try {
        options = JSON.parse(options);
      }catch(e){}

      var flashvars = options.flashvars;

      if (!flashvars) {
        return;
      }

      if (flashvars.metadata) {
        var metadata = null;

        try {
          metadata = JSON.parse(flashvars.metadata);
        }catch(e){}

        if (metadata) {
          return {
            metadata: metadata
          }
        }
      }

      if (flashvars.metadataUrl) {
        return {
          request: {
            action: 'getOkMetadata',
            url: decodeURIComponent(flashvars.metadataUrl)
          }
        }
      }

      var url = options.url;
      if (url) {
        var request = SaveFrom_Utils.embedDownloader.checkUrl(url);
        if (request) {
          return {
            request: request
          }
        }

        if (url.indexOf('rutube.') !== -1) {
          return {
            request: {
              action: 'getRutubeLinks',
              links: [url]
            }
          }
        }
      }
    },

    catchPopup: function() {
      "use strict";
      var videoContainer = null;
      this.lastWaitEl && this.lastWaitEl.abort();

      this.lastWaitEl = this.waitEl(function() {
        videoContainer = document.querySelector('.vp_video .vid-card_cnt');
        if (!videoContainer) {
          return;
        }

        return videoContainer;
      }, function() {
        var parent = mono.getParent(videoContainer, '.vp_video');
        if (!parent) {
          return;
        }

        var info = video.getPlayerOptions(videoContainer);
        if (info) {
          video.appendLinkUnderVideo(parent.parentNode, info);
        }
      });
    },

    rmBtn: function() {
      var dlBtn = document.querySelectorAll('.'+downloadLinkClassName);
      for (var i = 0, item; item = dlBtn[i]; i++) {
        item.parentNode.removeChild(item);
      }
    },

    lastWaitEl: null,
    waitEl: function(func, cb, options) {
      var out;
      var capsule = mono.extend({
        abort: function() {
          clearInterval(capsule.timeout);
          capsule.isAborted = true;
        }
      }, {
        delay: 500,
        repeat: 12,
        isAborted: false,
        timeout: null
      }, options);

      if (out = func()) {
        cb(out);
        return capsule;
      }

      (function wait() {
        capsule.repeat--;
        capsule.timeout = setTimeout(function() {
          if (capsule.isAborted) {
            return;
          }

          if (out = func()) {
            return cb(out);
          }

          if (!capsule.isAborted && capsule.repeat) {
            wait();
          }
        }, capsule.delay);
      })();

      return capsule;
    }
  };

  var videoFeed = {
    btnClassName: 'sf-feed-dl-btn',
    style: undefined,
    thumbClassName: 'vid-card_img',
    prepareLinks: function(links, title) {
      if (!links || !links.length) {
        return language.noLinksFound;
      }

      if (typeof links === 'string') {
        return links;
      }

      title = title || '';

      var menuLinks = [];
      var popupLink;
      var quality;
      var format;
      var url;
      for (var i = 0, len = links.length; i < len; i++) {
        var link = links[i];
        if(typeof(link) === 'object' && link.url) {
          url = link.url;
          var ext = link.ext;

          if(!ext) {
            ext = 'MP4';
            if(link.url.indexOf('.mp4') !== -1) {
              ext = 'MP4';
            }
            if(url.indexOf('.flv') !== -1) {
              ext = 'FLV';
            }
            if (link.url.indexOf('.mov') !== -1) {
              ext = 'MOV';
            }
            if (link.url.indexOf('.mpg') !== -1) {
              ext = 'MPG';
            }
          }

          ext = ext.toLowerCase();
          format = ext.toUpperCase();
          quality = link.subname || link.quality || link.name || ext;
        } else {
          url = link;
          ext = 'MP4';
          if(url.indexOf('.mp4') !== -1) {
            ext = 'MP4';
          }
          if(url.indexOf('.flv') !== -1) {
            ext = 'FLV';
          }
          if (url.indexOf('.mov') !== -1) {
            ext = 'MOV';
          }
          if (url.indexOf('.mpg') !== -1) {
            ext = 'MPG';
          }

          ext = ext.toLowerCase();
          format = ext.toUpperCase();

          quality = ext;
          var qualityMath = SaveFrom_Utils.getMatchFirst(links[i], /\.(\d+)\.mp4/i);
          if(qualityMath) {
            quality = qualityMath;
          }
        }

        var trueName = [144,240,360,480,720,1080,1440,'4K'];
        var origName = ['mobile','lowest','low','sd','hd','full','quad','ultra'];
        var pos = origName.indexOf(quality);
        if (pos !== -1) {
          quality = trueName[pos];
        }

        popupLink = { href: url, title: link.title? link.title : title, ext: ext, format: format, quality: quality, forceDownload: true };
        menuLinks.push(popupLink);
      }
      return menuLinks;
    },
    getPosterData: function(node) {
      var infoNode = mono.getParent(node, '[hrefattrs]');

      var info = infoNode && infoNode.getAttribute('hrefattrs');

      if (!info) {
        return;
      }

      var params = mono.parseUrlParams(info, {argsOnly: 1, forceSep: '&', useDecode: 1});

      var sid = params['st.vpl.sid'];
      var vid = params['st.vpl.id'];
      if (!vid) {
        var vidNode = mono.getParent(node, '[data-id]');
        vid = vidNode && vidNode.dataset.id;

        if (vid && vid[0] === 'c') {
          return;
        }
      }

      if (vid && vid.substr(0, 3) === 'OK_') {
        vid = SaveFrom_Utils.getMatchFirst(vid, /OK_\d+_(\d+)/);
      }

      if (!vid) {
        return;
      }

      return {
        request: {
          sid: sid,
          action: 'getPlayerMetadata',
          extVideoId: vid
        }
      };
    },
    onBtnClick: function(info, e) {
      e.preventDefault();
      e.stopPropagation();

      mono.onRemoveEvent(this, odnoklassniki.hideMenu);

      if (odnoklassniki.contextMenu && odnoklassniki.contextMenu.isShow) {
        if (odnoklassniki.contextMenu.button !== this) {
          odnoklassniki.hideMenu();
        } else {
          odnoklassniki.hideMenu();
          return;
        }
      }

      if ([1].indexOf(preference.cohortIndex) !== -1) {
        if (info.isChat) {
          mono.sendMessage({action: 'trackCohort', category: 'ok', event: 'click', label: 'video-message'});
        } else {
          mono.sendMessage({action: 'trackCohort', category: 'ok', event: 'click', label: 'video-feed-on-video'});
        }
      }

      // post in popup
      var menuParent = document.querySelector('#mtLayer.__active #mtLayerMain > div');
      if (!menuParent) {
        // video gaallery
        menuParent = document.getElementById('vv_content');
      }
      if (!menuParent) {
        // pm msgs
        menuParent = document.getElementById('__messagesList__');
        if (menuParent && !menuParent.offsetParent) {
          menuParent = null;
        }
      }
      var menu = odnoklassniki.contextMenu = SaveFrom_Utils.popupMenu.quickInsert(this, language.download + ' ...', 'sf-popupMenu', {
        parent: menuParent||undefined
      });

      video.loadLinks(info, menu);
    },
    onImgOver: function(e, retry) {
      retry = retry === undefined ? 0 : retry;
      if (this.dataset.sfSkip2 === '1') {
        return;
      }
      var _this = this;
      var isChat = mono.matches(this, '.mdialog_chat_window .d_comment_text_w ' + this.tagName);

      var container = null;
      if (isChat) {
        container = mono.getParentByClass(this, 'd_comment_text_w');
      } else
      if (mono.matches(this, '.video-card > .video-card_img-w ' + this.tagName)) {
        container = mono.getParentByClass(this, 'video-card_img-w');
      } else
      if (mono.matches(this, '.vid-card_cnt ' + this.tagName)) {
        container = mono.getParentByClass(this, 'vid-card_cnt');
      }

      if (!container) {
        this.dataset.sfSkip2 = '1';
        return;
      }

      if (container.getElementsByClassName(videoFeed.btnClassName).length) {
        return;
      }

      var isVideoVitrina = mono.matches(this, '.vid-card_img__link ' + this.tagName);

      var btnData = video.getPlayerOptions(this);
      if (!btnData) {
        btnData = videoFeed.getPosterData(this);
      }
      if (!btnData) {
        if (isVideoVitrina && retry < 1) {
          return setTimeout(function() {
            videoFeed.onImgOver.call(_this, null, 1);
          }, 1000);
        }
        this.dataset.sfSkip2 = '1';
        return;
      }

      btnData.isChat = isChat;

      var customStyle = {};

      if (isChat) {
        mono.extend(customStyle, {
          left: '15px',
          top: '15px'
        });
      }

      if (isVideoVitrina) {
        mono.extend(customStyle, {
          backgroundColor: '#454648',
          borderColor: 'rgb(53, 53, 53)'
        });
      }

      var btn = mono.create('i', {
        class: videoFeed.btnClassName,
        style: customStyle,
        on: [
          ['mousedown', function(e) {e.stopPropagation();}],
          ['keydown', function(e) {e.stopPropagation();}]
        ]
      });

      btn.addEventListener('click', videoFeed.onBtnClick.bind(btn, btnData));

      if (mono.isOpera) {
        btn.appendChild(mono.create('img', {
          src: SaveFrom_Utils.svg.getSrc('download', '#eb722e'),
          style: {
            width: '12px',
            height: '12px',
            margin: '4px',
            backgroundColor: 'transition'
          }
        }));
      }

      container.appendChild(btn);
    },
    onOver: function(e) {
      var node = e.target;
      if (node.nodeType !== 1) {
        return;
      }
      if (node.tagName !== 'IMG') {
        if (!mono.isSafari && !mono.isOpera && node.id === 'photo-layer_photo') {
          photo.addCurrentDlBtn(node);
        }
        return;
      }
      videoFeed.onImgOver.call(node, e);
    },
    injectStyle: function() {
      if (this.style) {
        if (!this.style.parentNode) {
          document.head.appendChild(this.style);
        }
        return;
      }

      this.style = mono.create('style', {
        text: "div > .sf-feed-dl-btn {" +
        'display: none;' +
        'border: 1px solid #F8F8F8;' +
        'width: 20px;' +
        'height: 20px;' +
        'padding: 0;' +
        'position: absolute;' +
        'background: url('+SaveFrom_Utils.svg.getSrc('download', '#eb722e')+') center no-repeat #F8F8F8;' +
        'background-size: 12px;' +
        'top: 5px;' +
        'left: 5px;' +
        'z-index: 1;' +
        'cursor: pointer;' +
        "}" +
        "div > .sf-feed-dl-btn:hover {" +
        'background: url('+SaveFrom_Utils.svg.getSrc('download', '#00B75A')+') center no-repeat #F8F8F8;' +
        'background-size: 12px;' +
        "}" +
        "div > .sf-feed-dl-btn:active {" +
        "outline: 0;" +
        "box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.125);" +
        "}" +
        "div:hover > .sf-feed-dl-btn {display: block;}"
      });

      document.head.appendChild(this.style);
    },
    enable: function() {
      mono.off(document, 'mouseenter', this.onOver, true);
      mono.on(document, 'mouseenter', this.onOver, true);
    },
    disable: function() {
      mono.off(document, 'mouseenter', this.onOver, true);

      if (this.style) {
        this.style.parentNode && this.style.parentNode.removeChild(this.style);
      }
    },
    rmBtn: function() {
      var btnList = document.querySelectorAll('.sf-feed-dl-btn');
      for (var i = 0, item; item = btnList[i]; i++) {
        item.parentNode.removeChild(item);
      }
      var dataAttr = mono.dataAttr2Selector('sfSkip2');
      var dataAttrList = document.querySelectorAll('['+dataAttr+']');
      for (i = 0, item; item = dataAttrList[i]; i++) {
        item.removeAttribute(dataAttr);
      }
    }
  };

  //  /VIDEO
  ///////////////////////////////////////////////////////////////////


  //  PHOTO
  ///////////////////////////////////////////////////////////////////

  var photo = {
    style: null,
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
    addDlCurrentPhotoBtn: function(container) {
      var exBtn = this.rmCurrentPhotoBtn(container);
      if (exBtn) {
        return;
      }

      var _this = odnoklassniki;

      container.appendChild(mono.create('a', {
        class: 'sf-dl-current-photo-btn',
        href: '#',
        title: language.download,
        on: ['click', function(e) {
          e.stopPropagation();
          e.preventDefault();

          if (_this.contextMenu && _this.contextMenu.isShow && _this.contextMenu.button === this) {
            if (_this.contextMenu.button !== this) {
              _this.hideMenu();
            } else {
              _this.hideMenu();
              return;
            }
          }

          var onKeyDown = function(e) {
            if (e.keyCode === 18 || e.keyCode === 17) return;
            menu.hide();
            document.removeEventListener('keydown', onKeyDown);
          };

          var menu = _this.contextMenu = SaveFrom_Utils.popupMenu.quickInsert(this, language.download + ' ...', "photoDlMenu", {
            parent: container,
            onShow: function() {
              document.addEventListener('keydown', onKeyDown);
            },
            onHide: function() {
              document.removeEventListener('keydown', onKeyDown);
            }
          });

          var linkList = [];

          var img = container.querySelector('img.photo-layer_img');
          if (img) {
            var url = img.dataset.fsSrc || img.dataset.nfsSrc || img.src;
            if (url) {
              linkList.push({
                href: url,
                title: 'photo_' + parseInt(Date.now() / 1000),
                quality: language.download,
                format: ' ',
                ext: 'jpg',
                forceDownload: true,
                isBlank: true,
                func: function () {
                  menu.hide();
                }
              });
            }
          }

          if (!img) {
            img = container.querySelector('div.gif[data-gifsrc]');
          }

          if (img) {
            var map = {
              webmsrc: 'webm',
              mp4src: 'mp4',
              gifsrc: 'gif'
            };
            Object.keys(map).forEach(function(type) {
              var url = img.dataset[type];
              if (!url) {
                return;
              }

              var ext = map[type];

              linkList.push({
                href: url,
                title: 'gif_' + parseInt(Date.now() / 1000),
                quality: language.download,
                format: ext.toUpperCase(),
                ext: ext,
                forceDownload: true,
                isBlank: true,
                func: function () {
                  menu.hide();
                }
              });
            });
          }

          if (linkList.length === 0) {
            menu.update(language.noLinksFound);
            return;
          }

          menu.update(linkList);
        }],
        append: [
          !mono.isOpera ? undefined : mono.create('img', {
            src: SaveFrom_Utils.svg.getSrc('download', '#eb722e'),
            style: {
              width: '12px',
              height: '12px',
              margin: '4px'
            }
          })
        ]
      }));
    },
    injectStyle: function() {
      if (photo.style) {
        if (!photo.style.parentNode) {
          document.head.appendChild(photo.style);
        }
        return;
      }

      photo.style = mono.create('style', {
        text: "div > .sf-dl-current-photo-btn {" +
        'display: none;' +
        'border: 1px solid #F8F8F8;' +
        'width: 20px;' +
        'height: 20px;' +
        'padding: 0;' +
        'position: absolute;' +
        'background: url('+SaveFrom_Utils.svg.getSrc('download', '#eb722e')+') center no-repeat #F8F8F8;' +
        'background-size: 12px;' +
        'top: 73px;' +
        'left: 90px;' +
        'z-index: 100;' +
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

      document.head.appendChild(photo.style);
    },
    addCurrentDlBtn: function(container) {
      if (container.dataset.sfSkip2 === '1') {
        return;
      }
      container.dataset.sfSkip2 = '1';

      var img = container.querySelector('img.photo-layer_img');
      if (img) {
        var url = img.dataset.fsSrc || img.dataset.nfsSrc || img.src;
        if (!url) {
          img = null;
        }
      }

      if (!img) {
        img = container.querySelector('div.gif[data-gifsrc]');
      }

      if (!img) {
        return;
      }

      this.addDlCurrentPhotoBtn(container);
    }
  };

  //  /PHOTO
  //////////////////////////////////////////////////////////////////
}, null, function syncIsActive() {
  "use strict";
  if (mono.isSafari || mono.isGM) {
    if (!mono.checkUrl(document.URL, [
        'http://odnoklassniki.ru/*',
        'http://*.odnoklassniki.ru/*',
        'https://odnoklassniki.ru/*',
        'https://*.odnoklassniki.ru/*',
        'http://ok.ru/*',
        'http://*.ok.ru/*',
        'https://ok.ru/*',
        'https://*.ok.ru/*'
      ])) {
      return false;
    }
  }

  if (mono.isIframe()) {
    return false;
  }

  return true;
});