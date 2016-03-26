// ==UserScript==
// @name        Dailymotion downloader
//
// @include     http://dailymotion.*/*
// @include     http://*.dailymotion.*/*
// @include     https://dailymotion.*/*
// @include     https://*.dailymotion.*/*
// ==/UserScript==

(typeof mono === 'undefined') && (mono = {loadModule: function() {this.loadModuleStack.push(arguments);},loadModuleStack: []});

mono.loadModule('dailymotion', function(moduleName, initData) {
  "use strict";

  var language = initData.getLanguage;
  var preference = initData.getPreference;
  var moduleState = preference.moduleDailymotion ? 1 : 0;

  var iframe = mono.isIframe() && /\/embed\/([\w\-]+)/i.test(document.location.href);

  mono.onMessage(function(message, cb){
    if (message.action === 'getModuleInfo') {
      if (message.url !== location.href) return;
      return cb({state: moduleState, moduleName: moduleName});
    }
    if (message.action === 'changeState') {
      if (moduleName !== message.moduleName) {
        return;
      }
      return dailymotion.changeState(message.state);
    }
    if (!moduleState) {
      return;
    }
    if (message.action === 'updateLinks') {
      dailymotion.updateLinks();
    }
  });

  if (moduleState) {
    mono.asyncCall(function() {
      dailymotion.run();
    });
  }

  var dailymotion = {
    contextMenu: null,
    linkCache: {},
    embed: null,
    title: '',
    styleIndex: 0,
    btnId: 'sf__download_btn',
    panelId: 'sf__download_panel',
    result: null,
    popupIsShow: false,

    run: function()
    {
      moduleState = 1;
      if (iframe) {
        dailymotion.appendIframeButtons();
        return;
      }

      if (SaveFrom_Utils.mutationWatcher.isAvailable()) {
        return dailymotion.mutationMode.enable();
      }

      var btnBox = dailymotion.insertButton();
      if (!btnBox) {
        var count = 0;
        var timer = setInterval(function(){
          count++;
          btnBox = dailymotion.insertButton();

          if(count > 5 || btnBox) {
            clearInterval(timer);
          }
        }, 1000);
      }

      mono.onUrlChange(function() {
        var exBtn = document.getElementById(dailymotion.btnId);
        if (!exBtn) {
          return dailymotion.insertButton();
        }

        setTimeout(function () {
          var exBtn = document.getElementById(dailymotion.btnId);
          if (!exBtn) {
            dailymotion.insertButton();
          }
        }, 1500);
      });
    },
    changeState: function(state) {
      if (iframe) return;
      moduleState = state;
      mono.clearUrlChange();
      dailymotion.rmBtn();
      dailymotion.mutationMode.stop();
      if (state) {
        dailymotion.run();
      }
    },

    hideMenu: function() {
      if (dailymotion.contextMenu && dailymotion.contextMenu.isShow) {
        dailymotion.contextMenu.hide();
        dailymotion.contextMenu = null;
      }
    },

    updateLinks: function() {
      dailymotion.result = null;
      dailymotion.insertButton();
    },

    appendIframeButtons: function()
    {
      var p = undefined,
        b = document.createElement('div'),
        a = document.createElement('a'),
        panel = document.createElement('div');

      a.href = '#';
      a.textContent = language.download.toLowerCase();
      SaveFrom_Utils.setStyle(a, {
        display: 'inline-block',
        color: 'rgba(255,255,255,.9)',
        textDecoration: 'none',
        padding: '5px 10px'
      });
      b.appendChild(a);

      SaveFrom_Utils.setStyle(b, {
        background: 'rgba(0, 0, 0, .4)',
        border: '1px solid rgba(255,255,255,.5)',
        borderRadius: '4px',
        fontFamily: 'Arial,Helvetica,sans-serif',
        fontSize: '13px',
        lineHeight: 'normal',
        position: 'absolute',
        top: '5px',
        left: '5px',
        padding: 0,
        margin: 0,
        zIndex: 99999
      });

      panel.id = dailymotion.panelId;
      SaveFrom_Utils.setStyle(panel, {
        color: '#fff',
        background: 'rgba(0,0,0,0.7)',
        textAlign: 'center',
        border: 0,
        display: 'none',
        fontFamily: 'Arial,Helvetica,sans-serif',
        fontSize: '13px',
        fontWeight: 'normal',
        lineHeight: 'normal',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        margin: 0,
        padding: '3px',
        zIndex: 99990
      });


      dailymotion.btnBox = document.createElement('div');
      dailymotion.btnBox.style.display = 'none';
      dailymotion.btnBox.appendChild(b);
      dailymotion.btnBox.appendChild(panel);

      mono.off(document, 'mouseenter', dailymotion.onExtPlayerOver);
      mono.off(document, 'mouseleave', dailymotion.onExtPlayerOver);
      mono.on(document, 'mouseenter', dailymotion.onExtPlayerOver);
      mono.on(document, 'mouseleave', dailymotion.onExtPlayerOver);

      a.addEventListener('click', dailymotion.fetchIframeLinks);
      a.addEventListener('click', dailymotion.toggleIframePanel);

      document.body.appendChild(dailymotion.btnBox);
    },

    onExtPlayerOver: function(event) {
      if(event.type == 'mouseenter') {
        dailymotion.btnBox.style.display = 'block';
      } else
      if(event.type == 'mouseleave') {
        dailymotion.btnBox.style.display = 'none';
      }
    },

    fetchIframeLinks: function(e) {
      var a = this;
      var button = e.target;

      if(!dailymotion.result)
      {
        dailymotion.getLinks(document.body.innerHTML, function(links) {
          if (links && links.length > 0) {
            dailymotion.result = dailymotion.handleLinks(links);
            dailymotion.fillIframePanelInfo(dailymotion.result);
            return;
          }
          dailymotion.getEmbedVideoInfo(function(links){
            if(links && links.length > 0) {
              dailymotion.result = dailymotion.handleLinks(links);
              dailymotion.fillIframePanelInfo(dailymotion.result);
            } else {
              dailymotion.result = true;
              dailymotion.fillIframePanelInfo(null);
            }
          });
        });
      }

      button.removeEventListener('click', dailymotion.fetchIframeLinks, false);
      e.preventDefault();
      e.stopPropagation();
      return false;
    },

    toggleIframePanel: function(e)
    {
      e.preventDefault();
      e.stopPropagation();

      var panel = document.getElementById(dailymotion.panelId);
      if(panel)
      {
        var isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? '' : 'none';

        if (isHidden && [1].indexOf(preference.cohortIndex) !== -1) {
          mono.sendMessage({action: 'trackCohort', category: 'dailymotion', event: 'click', label: 'video-iframe'});
        }
      }
    },

    insertButton: function()
    {
      var btnContainer = null;

      btnContainer = document.querySelector('.fluid-container .pl_video_infos .row .sd_user_subscribe');
      if (btnContainer) {
        return dailymotion.appendBtn({
          btnContainer: btnContainer.parentNode,
          styleIndex: 5
        });
      }

      btnContainer = document.querySelector('.pl_videos_listwithplayer .pl_videos_listswitcher');
      if (btnContainer) {
        return dailymotion.appendBtn({
          btnContainer: btnContainer,
          styleIndex: 4
        });
      }

      btnContainer = document.querySelector('#content .pl_user_featured .col-4 ul li');
      if (btnContainer) {
        return dailymotion.appendBtn({
          btnContainer: btnContainer,
          styleIndex: 3
        });
      }

      return null;
    },

    getVideoId: function(details) {
      if (details.styleIndex === 4) {
        // playlist
        var playerV5Frame = document.querySelector('.pl_videos_listwithplayer #player_container #playerv5-iframe');
        var src = playerV5Frame.getAttribute('src') || '';
        var videoId = src.match(/\/embed\/video\/([a-z0-9]+)/);
        videoId = videoId && videoId[1];
        if (videoId) {
          return videoId;
        }
      }

      var playerNode = document.querySelector('#player embed');
      if (playerNode) {
        var falshvars = playerNode.getAttribute('flashvars');
        if (falshvars) {
          var params = mono.parseUrlParams(falshvars, {forceSep: '&', useDecode: 1, argsOnly: 1});
          if (params.config) {
            try {
              params = JSON.parse(params.config);
              return params.metadata.id;
            } catch (e) {
            }
          }
        }
      }

      // channel, video page
      var playerTitleLink = document.querySelector('#player a.dmp_StartView-logo');
      if (playerTitleLink) {
        var request = SaveFrom_Utils.embedDownloader.checkUrl(playerTitleLink.href);
        if (request) {
          return request.extVideoId;
        }
      }

      return null;
    },

    appendBtn: function(details) {
      var btnContainer = details.btnContainer;

      if (!btnContainer) {
        return;
      }

      var styleIndex = details.styleIndex;

      var oldBtn = btnContainer.querySelector('#' + dailymotion.btnId);

      var customStyle = {};

      if (styleIndex === 3 || styleIndex === 4) {
        mono.extend(customStyle, {
          display: 'inline-block',
          height: '25px',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '12px',
          backgroundImage: 'url('+SaveFrom_Utils.svg.getSrc('download', '#808080')+')'
        });

        if (styleIndex === 3) {
          mono.extend(customStyle, {
            cssFloat: 'left',
            marginTop: '4px',
            marginRight: '10px'
          });
        }

        if (styleIndex === 4) {
          mono.extend(customStyle, {
            marginLeft: '6px',
            height: '22px'
          });
        }
      }

      if (styleIndex === 5) {
        mono.extend(customStyle, {
          padding: '0 5px',
          cssFloat: 'left',
          marginLeft: '10px'
        });
      }

      var tagName = 'a';

      if (styleIndex === 5) {
        tagName = 'button';
      }

      var classList = [];

      if (styleIndex === 3 || styleIndex === 4) {
        classList.push('btn');
      }

      if (styleIndex === 5) {
        classList.push('button');
      }

      var buttonNode = mono.create(tagName, {
        id: dailymotion.btnId,
        href: '#',
        class: classList,
        title: language.download,
        style: customStyle,
        on: ['click', function(e) {
          e.preventDefault();
          e.stopPropagation();

          if (dailymotion.contextMenu && dailymotion.contextMenu.isShow) {
            dailymotion.hideMenu();
            return;
          }

          var id = dailymotion.getVideoId(details);

          var links = language.download + ' ...';
          var fromCache = dailymotion.linkCache[id];
          if (fromCache) {
            links = SaveFrom_Utils.popupMenu.prepareLinks.dailymotion(fromCache.links, fromCache.title);
          }

          var menu = dailymotion.contextMenu = SaveFrom_Utils.popupMenu.quickInsert(this, links, 'sf-popupMenu');

          if (fromCache) {
            return;
          }

          var metadata = null;
          var scriptList = mono.getPageScript(document.body.innerHTML, /playerV5/);
          scriptList.some(function(script) {
            "use strict";
            var jsonList = mono.findJson(script);
            return jsonList.some(function(json) {
              if (json && json.metadata && json.metadata.id === id) {
                metadata = json.metadata;
                return true;
              }
            });
          });

          mono.sendMessage({
            action: 'getDailymotionLinks',
            extVideoId: id,
            metadata: metadata
          }, function(response) {
            if(response.links) {
              dailymotion.linkCache[id] = response;
              var menuLinks = SaveFrom_Utils.popupMenu.prepareLinks.dailymotion(response.links, response.title);
              menu.update(menuLinks);
              return;
            }
            menu.update(language.noLinksFound);
          });

          if ([1].indexOf(preference.cohortIndex) !== -1) {
            if (styleIndex === 4) {
              mono.sendMessage({action: 'trackCohort', category: 'dailymotion', event: 'click', label: 'video-playlist'});
            } else
            if (styleIndex === 5) {
              mono.sendMessage({action: 'trackCohort', category: 'dailymotion', event: 'click', label: 'video-single'});
            } else
            if (styleIndex === 3) {
              mono.sendMessage({action: 'trackCohort', category: 'dailymotion', event: 'click', label: 'video-chennal'});
            }
          }
        }]
      });

      if (styleIndex === 5) {
        mono.create(buttonNode, {
          append: [
            mono.create('img', {
              title: language.download,
              src: SaveFrom_Utils.svg.getSrc('download', '#808080'),
              style: {
                width: '12px',
                height: '12px',
                verticalAlign: 'middle',
                opacity: '0.9'
              }
            }),
            ' ',
            language.download
          ]
        });
      }

      if (mono.isOpera && (styleIndex === 3 || styleIndex === 4)) {
        buttonNode.appendChild(mono.create('img', {
          src: SaveFrom_Utils.svg.getSrc('download', '#808080'),
          style: {
            width: '12px',
            height: '12px',
            marginBottom: '4px'
          }
        }));
      }

      if (oldBtn && oldBtn.parentNode) {
        oldBtn.parentNode.replaceChild(buttonNode, oldBtn);
        oldBtn = null;
      } else
      if(styleIndex === 3) {
        btnContainer.insertBefore(buttonNode, btnContainer.firstChild);
      } else {
        btnContainer.appendChild(buttonNode);
      }

      return buttonNode;
    },

    rmBtn: function() {
      var btnList = document.querySelectorAll(['#'+dailymotion.btnId, '#'+dailymotion.panelId]);
      for (var i = 0, item; item = btnList[i]; i++) {
        item.parentNode.removeChild(item);
      }
      dailymotion.result = null;
      dailymotion.popupIsShow = false;
    },

    fillIframePanelInfo: function(result)
    {
      var p = document.getElementById(dailymotion.panelId);
      if(!p)
        return;

      SaveFrom_Utils.emptyNode(p);

      if(!result || !result.length)
      {
        p.appendChild(document.createTextNode(language.noLinksFound));
        p.style.paddingTop = '11px';
        p.style.paddingBottom = '11px';
        return;
      }

      var sStyle = {
        fontSize: '75%',
        fontWeight: 'normal',
        marginLeft: '3px',
        whiteSpace: 'nowrap',
        color: '#fff'
      };

      var fsIconStyle = {
        color: '#fff',
        opacity: 0.5
      };

      var fsTextStyle = {
        position: 'relative',
        top: '-1px'
      };

      var item = document.createElement('div');
      item.style.marginTop = '8px';
      item.style.marginBottom = '8px';
      item.style.paddingLeft = '70px';
      item.style.paddingRight = '70px';
      p.appendChild(item);
      var color = '', sep = false;
      for(var i = 0; i < result.length; i++)
      {
        if(sep)
          item.appendChild(document.createTextNode(' '));

        var a = document.createElement('a');
        a.href = result[i][0];
        a.title = language.downloadTitle;

        if(dailymotion.title)
        {
          a.setAttribute('download', mono.fileName.modify(
            dailymotion.title + '.' + result[i][2].toLowerCase()));

          a.addEventListener('click', SaveFrom_Utils.downloadOnClick, false);
        }

        a.textContent = result[i][2];
        a.style.margin = '0 0 0 10px';
        a.style.color = '#fff';

        if(result[i][1])
        {
          var s = document.createElement('span');
          s.textContent = result[i][1];
          SaveFrom_Utils.setStyle(s, sStyle);
          a.appendChild(s);
        }

        item.appendChild(a);
        sep = true;

        SaveFrom_Utils.appendFileSizeIcon(a, fsIconStyle, fsTextStyle);

        if(!color)
          color = SaveFrom_Utils.getStyle(a, 'color');
      }

      if(result.length > 0)
      {
        if(preference.moduleShowDownloadInfo === 1)
        {
          if(!color)
            color = 'blue';

          SaveFrom_Utils.appendDownloadInfo(p, color, null, {
            width: '16px',
            height: '16px',
            fontSize: '16px',
            lineHeight: '16px'
          });
        }
      }
    },


    handleLinks: function(video)
    {
      var result = [];
      var links = null;

      if(typeof(video) == 'object')
        links = video;
      else
        links = video.split('||');

      if(links && links.length > 0)
      {
        for(var i = 0; i < links.length; i++)
        {
          links[i] = links[i].replace(/\\\//g, '/');
          links[i] = links[i].replace(/@@[\w\-]+$/, '');
          var size = '';
          var t = links[i].match(/\/cdn\/\w+\-(\d+x\d+)\//i);
          if(t && t.length > 1)
          {
            size = t[1];
          }
          else
          {
            t = links[i].match(/\D(\d+x\d+)\D/i);
            if(t && t.length > 1)
            {
              size = t[1];
            }
          }

          var ext = 'FLV';
          var t = links[i].match(/\.(\w{1,6})(?:$|\?)/);
          if(t && t.length > 1)
          {
            ext = t[1].toUpperCase();
          }

          if(size !== '80x60')
          {
            var height = parseInt(size.split('x').slice(-1)[0]);
            result.push([links[i], height, ext]);
          }
        }
      }

      if(!result)
      {
        return null;
      }

      var sort = function(a, b){
        a = parseInt(a[1]);
        a = isNaN(a) ? 0 : a;
        b = parseInt(b[1]);
        b = isNaN(b) ? 0 : b;
        return a - b;
      };

      result.sort(sort);
      return result;
    },


    getLinks: function(text, cb)
    {
      var links = [];
      var info = SaveFrom_Utils.getMatchFirst(text,
        /(?:var|,)\s*info\s*=\s*\{(.*?)}\s*(?:;|,\s*\w+\s*=)/i);

      if(!info) {
        return cb();
      }
      try
      {
        info = JSON.parse('{' + info + '}');
        if(info)
        {
          dailymotion.title = info.title;
          for(var i in info)
          {
            if (!info.hasOwnProperty(i)) {
              continue;
            }
            if (typeof info[i] !== 'string') {
              continue;
            }
            if(info[i].search(/^https?:\/\/[^\s"]+\.(mp4|flv)(\?|$)/) > -1)
            {
              links.push(info[i]);
            }
          }
        }
      }
      catch(e){}
      cb(links);
    },

    getEmbedVideoInfo: function(callback)
    {
      if(!location.pathname) {
        return callback();
      }

      var url = location.pathname;
      if (!iframe) {
        url = "/embed" + url;
      }
      url =  location.protocol + '//' +  location.host + url;
      mono.sendMessage({action: 'getDailymotionEmbedVideoInfoMsg', url: url}, function(data) {
        if (data === undefined) {
          return callback();
        }
        dailymotion.title = data.title;
        data = data.links;
        callback(data);
      });
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
      enable: function() {
        if (this.observer) {
          return this.observer.start();
        }

        this.observer = SaveFrom_Utils.mutationWatcher.run({
          callback: function(summaryList) {
            var summary, n, i, node;

            summary = summaryList[0];
            for (n = 0; node = summary.added[n]; n++) {
              if (node.dataset.sfSkip > 0) {
                continue;
              }
              node.dataset.sfSkip = '1';

              dailymotion.appendBtn({
                btnContainer: node.parentNode,
                styleIndex: 5
              });
            }

            summary = summaryList[1];
            for (n = 0; node = summary.added[n]; n++) {
              if (node.dataset.sfSkip > 0) {
                continue;
              }
              node.dataset.sfSkip = '1';

              dailymotion.appendBtn({
                btnContainer: node,
                styleIndex: 4
              });
            }

            summary = summaryList[2];
            for (n = 0; node = summary.added[n]; n++) {
              var parent = node.parentNode;
              if (parent.dataset.sfSkip > 0) {
                continue;
              }
              parent.dataset.sfSkip = '1';

              dailymotion.appendBtn({
                btnContainer: node,
                styleIndex: 3
              });
            }
          },
          queries: [
            {css: '.fluid-container .pl_video_infos .row .sd_user_subscribe', is: 'added'},
            {css: '.pl_videos_listwithplayer .pl_videos_listswitcher'},
            {css: '#content .pl_user_featured .col-sm-4 ul li'}
          ]
        });
      }
    }
  };
}, null, function syncIsActive() {
  "use strict";
  if (mono.isSafari || mono.isGM) {
    if ( !mono.checkUrl(document.URL, [
        'http://dailymotion.*/*',
        'http://*.dailymotion.*/*',
        'https://dailymotion.*/*',
        'https://*.dailymotion.*/*'
      ]) ) {
      return false;
    }
  }

  if (mono.isIframe()) {
    if(!/\/embed\/([\w\-]+)/i.test(document.location.href)) {
      return false;
    }

    try {
      if (location.hostname === window.parent.location.hostname) {
        return false;
      }
    } catch(e) {}
  }

  return true;
});