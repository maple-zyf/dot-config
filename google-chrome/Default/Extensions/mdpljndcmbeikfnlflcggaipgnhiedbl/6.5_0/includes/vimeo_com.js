// ==UserScript==
// @name        Vimeo.com downloader
//
// @include     http://vimeo.com/*
// @include     http://*.vimeo.com/*
// @include     https://vimeo.com/*
// @include     https://*.vimeo.com/*
// ==/UserScript==

(typeof mono === 'undefined') && (mono = {loadModule: function() {this.loadModuleStack.push(arguments);},loadModuleStack: []});

mono.loadModule('vimeo', function(moduleName, initData) {
  "use strict";

  var language = initData.getLanguage;
  var preference = initData.getPreference;
  var moduleState = preference.moduleVimeo ? 1 : 0;
  var iframe = mono.isIframe();

  mono.onMessage(function(message, cb){
    if (message.action === 'getModuleInfo') {
      if (message.url !== location.href) return;
      return cb({state: moduleState, moduleName: moduleName});
    }
    if (message.action === 'changeState') {
      if (moduleName !== message.moduleName) {
        return;
      }
      return vimeo.changeState(message.state);
    }
  });

  if (moduleState) {
    mono.asyncCall(function() {
      vimeo.run();
    });
  }

  var vimeo = {
    panelId: 'savefrom__vimeo_links',
    btnBox: null,
    clipId: null,
    timer: null,
    btnPrefix: 'sd_ld_bnt_',
    popupIsShow: false,
    dlBtnClassName: 'sf-dl-btn',
    currentMenu: null,
    linkCache: {},

    run: function() {
      moduleState = 1;
      if (iframe) {
        vimeo.clipId = vimeo.getFrameClipId();
        if (vimeo.clipId) {
          return vimeo.appendIframeButtons();
        } else {
          iframe = false;
        }
      }

      this.videoFeed.injectStyle();

      if (SaveFrom_Utils.mutationWatcher.isAvailable()) {
        this.mutationMode.enable();
      } else {
        mono.onUrlChange(function onUrlChange(url, oldUrl, force) {
          clearInterval(vimeo.checkBtnExist.interval);
          if (document.body.classList.contains('progress')) {
            if (!force) {
              onUrlChange.limit = 10;
            }
            onUrlChange.limit--;
            if (onUrlChange.limit > 0) {
              clearTimeout(onUrlChange.progressTimer);
              onUrlChange.progressTimer = setTimeout(function () {
                onUrlChange(url, url, 1);
              }, 500);
              return;
            }
          }

          var videoContainer = vimeo.getMainVideoData();
          if (videoContainer) {
            vimeo.appendBtn(videoContainer);
            vimeo.checkBtnExist();
          }
          videoContainer = null;

          var browseItems;
          // https://vimeo.com/home
          var browseContent = document.getElementById('browse_content');
          if (!browseContent) {
            // https://vimeo.com/channels/documentaryfilm
            browseContent = document.getElementById('clips');
            if (browseContent && !browseContent.querySelector('#channel_clip_container')) {
              browseContent = null;
            }
          }
          if (browseContent) {
            browseItems = browseContent.querySelectorAll('ol > li');
            if (browseItems.length === 0) {
              clearInterval(onUrlChange.browserTimer);
              onUrlChange.browserLimit = 5;
              onUrlChange.browserTimer = setInterval(function () {
                onUrlChange.browserLimit--;
                browseItems = browseContent.querySelectorAll(['ol > li', '.empty']);
                var find = false;
                if (browseItems.length === 1 && browseItems[0].classList.contains('empty')) {
                  find = true;
                  browseItems = [];
                }
                if (browseItems.length > 0) {
                  vimeo.addBtnInBrowser(browseItems);
                  find = true;
                }
                if (find || !onUrlChange.browserLimit) {
                  clearInterval(onUrlChange.browserTimer);
                }
              }, 500);
            } else {
              vimeo.addBtnInBrowser(browseItems);
            }
          }

          // https://vimeo.com/home/discover/filter:videos/format:thumbnail
          // https://vimeo.com/96823376
          // https://vimeo.com/categories/animation
          // https://vimeo.com/groups/animation
          // https://vimeo.com/channels/mbmagazine/94367486
          // https://vimeo.com/couchmode/inbox/sort:date/108792063
          vimeo.videoFeed.checkUrl(url);
        }, 1);
      }
    },

    changeState: function(state) {
      if (iframe) {
        return;
      }

      moduleState = state;

      mono.clearUrlChange();

      vimeo.videoFeed.disable();

      vimeo.rmAllBtn();

      vimeo.mutationMode.stop();

      if (state) {
        vimeo.run();
      }
    },

    hideMenu: function() {
      if (vimeo.currentMenu) {
        vimeo.currentMenu.hide();
        vimeo.currentMenu = null;
      }
    },

    addBtnInBrowser: function(browseContent) {
      for (var n = 0, el; el = browseContent[n]; n++) {
        if (el.id.indexOf('clip') !== 0) {
          continue;
        }
        var videoContainer = vimeo.getBrowserVideoData(el, el.id);
        if (videoContainer === null) {
          return;
        }
        if (videoContainer) {
          vimeo.appendBtn(videoContainer);
        }
      }
    },

    getFrameClipId: function() {
      var frameClipId = document.location.href.match(/player\.vimeo\.com\/video\/([\w\-]+)/i);
      frameClipId = frameClipId && frameClipId[1];
      if(frameClipId) {
        return frameClipId;
      }
    },

    getBrowserVideoData: function(container, id) {
      var btnParent = container.querySelector('.uploaded_on');
      if (!btnParent) {
        btnParent = container.querySelector('#info .meta .stats');
      }
      if (!btnParent) {
        return null;
      }
      if (id) {
        id = id.match(/([0-9]+)$/);
        id = id && id[1];
      }
      if (!id) {
        var firstLink = container.querySelector('a.js-title') || container.querySelector('a');
        if (!firstLink) {
          return;
        }
        var url = firstLink.getAttribute('href');
        if (!url) {
          return;
        }
        id = url.match(/\/([0-9]+)$/);
        id = id && id[1];
      }
      if (!id) {
        return;
      }
      return {id: id, parent: btnParent, style: 1};
    },

    getMainVideoData: function() {
      var parentContainer = document;
      var btnStyle = undefined;
      var id = undefined;
      var btnParent = undefined;
      var container = undefined;

      container = parentContainer.querySelector('#main .clip_main');
      if (container && (id = vimeo.getVideoId(container))) {
        btnStyle = 3;
        // https://vimeo.com/46353153
        // cookie clip_test2=2
        btnParent = container.querySelector('.clip_info-wrapper .clip_info-actions');
        if (btnParent) {
          return {id: id, parent: btnParent, style: btnStyle};
        }
      }

      container = parentContainer.querySelectorAll('#clip');
      if ( container && container.length === 1
        && (container = container[0]) && (id = vimeo.getVideoId(container)) ) {
        btnStyle = 2;
        // http://vimeo.com/96823376
        btnParent = container.querySelector('#info #tools');
        if (btnParent) {
          return {id: id, parent: btnParent, style: btnStyle};
        }
      }

      container = parentContainer.querySelectorAll('#channel_clip_container');
      if (container && container.length === 2) {
        if (container[0].hasChildNodes(container[1])) {
          container = [container[1]];
        }
      }
      if ( container && container.length === 1
        && (container = container[0]) && (id = vimeo.getVideoId(container)) ) {
        // http://vimeo.com/channels/staffpicks
        btnStyle = 1;
        btnParent = container.querySelector('#info .meta .stats');
        if (btnParent) {
          if (vimeo.getMainVideoData.hasExternalBtn) {
            // https://vimeo.com/channels/mbmagazine/92235056
            var exBtn = vimeo.getMainVideoData.hasExternalBtn.querySelector('.'+vimeo.dlBtnClassName);
            if (exBtn) {
              exBtn.parentNode.removeChild(exBtn);
            }
            vimeo.getMainVideoData.hasExternalBtn = undefined;
          }
          return {id: id, parent: btnParent, style: btnStyle};
        }
        btnStyle = 2;
        btnParent = document.querySelector('div.col_small section.block > div.tools') ||
          document.querySelector('div.col_small section.block > div.intro');
        if (btnParent) {
          vimeo.getMainVideoData.hasExternalBtn = btnParent;
          return {id: id, parent: btnParent, style: btnStyle};
        }
      }
    },

    getVideoId: function(container) {
      container = container || document;
      var id = null;
      var player;

      player = container.querySelector('.player[data-clip-id]');
      if (player) {
        return player.dataset.clipId;
      }

      player = container.querySelector('.player[data-fallback-url]');
      if (player) {
        var fallbackUrl = player.dataset.fallbackUrl || '';
        fallbackUrl = fallbackUrl.match(/video\/([0-9]+)\//);
        if (fallbackUrl) {
          return fallbackUrl[1];
        }
      }

      player = container.querySelector('div.player_wrapper > div.faux_player[data-clip_id]');
      if (player) {
        id = player.dataset.clip_id;
        if (id) {
          return id;
        }
      }
    },

    onBtnClick: function(videoData, e) {
      e.stopPropagation();
      e.preventDefault();
      var id = videoData.id;

      if (!id) {
        var container = null;
        if (videoData.playerContainer) {
          container = mono.getParent(videoData.parent, videoData.playerContainer);
        }
        id = vimeo.getVideoId(container);
      }

      if ([1].indexOf(preference.cohortIndex) !== -1) {
        var isBrowseContent = document.getElementById('browse_content');
        if (isBrowseContent && isBrowseContent.contains(this)) {
          mono.sendMessage({action: 'trackCohort', category: 'vimeo', event: 'click', label: 'video-list'});
        } else {
          mono.sendMessage({action: 'trackCohort', category: 'vimeo', event: 'click', label: 'video-single'});
        }
        isBrowseContent = null;
      }

      if (vimeo.currentMenu && vimeo.currentMenu.isShow) {
        vimeo.hideMenu();
        return;
      }

      var fromCache = vimeo.linkCache[id];
      var links = language.download + ' ...';
      if (fromCache) {
        links = SaveFrom_Utils.popupMenu.prepareLinks.vimeo(fromCache.links, fromCache.title);
      }

      var details = {};
      if (videoData.style === 4) {
        details.offsetTop = 20;
      }

      var menu = vimeo.currentMenu = SaveFrom_Utils.popupMenu.quickInsert(this, links, 'sf-popupMenu', details);

      if (fromCache) {
        return;
      }

      mono.sendMessage({action: 'getVimeoLinks', extVideoId: id, url: location.href}, function(response) {
        if(response.links) {
          vimeo.linkCache[id] = response;
          var menuLinks = SaveFrom_Utils.popupMenu.prepareLinks.vimeo(response.links, response.title);
          menu.update(menuLinks);
          return;
        }
        menu.update(language.noLinksFound);
      });
    },

    rmAllBtn: function() {
      ['sfSkip'].forEach(function(attr) {
        var dataAttr = mono.dataAttr2Selector(attr);
        var dataAttrList = document.querySelectorAll('['+dataAttr+']');
        for (var i = 0, item; item = dataAttrList[i]; i++) {
          item.removeAttribute(dataAttr);
        }
      });

      clearInterval(vimeo.checkBtnExist.interval);
      var btnList = document.querySelectorAll('.'+vimeo.dlBtnClassName);
      for (var i = 0, item; item = btnList[i]; i++) {
        if (item.dataset.sfType === '1' || item.dataset.sfType === '3') {
          item = item.parentNode;
        }
        item.parentNode.removeChild(item);
      }
      vimeo.videoFeed.rmBtn();

      vimeo.hideMenu();
    },

    appendBtn: function(videoData) {
      var box = videoData.parent;

      var exBtn = box.querySelector('.'+vimeo.dlBtnClassName);
      if (exBtn) {
        if (!exBtn.dataset.sfId) {
          return;
        }
        exBtn.parentNode.removeChild(exBtn);
        exBtn = null;
      }

      var btn;
      if (videoData.style === 1) {
        btn = mono.create('a', {
          text: language.download,
          class: [vimeo.dlBtnClassName, 'sf-style-1'],
          style: {
            display: 'inline'
          },
          data: {
            sfId: videoData.id,
            sfType: videoData.style
          },
          href: '#' + videoData.id
        });
      } else
      if (videoData.style === 2) {
        btn = mono.create('button', {
          text: language.download,
          class: [vimeo.dlBtnClassName, 'btn', 'iconify_down_b'],
          data: {
            sfId: videoData.id,
            sfType: videoData.style
          }
        });
      } else
      if (videoData.style === 3) {
        btn = mono.create('button', {
          class: [vimeo.dlBtnClassName, 'iris_btn', 'iris_btn-switch'],
          data: {
            sfId: videoData.id,
            sfType: videoData.style
          },
          append: [
            mono.create('span', {
              class: 'iris_btn-content',
              style: {
                marginLeft: 0
              },
              text: language.download
            })
          ]
        });
      } else
      if (videoData.style === 4) {
        btn = mono.create('i', {
          class: [vimeo.dlBtnClassName, 'sf-style-4'],
          data: {
            sfId: videoData.id,
            sfType: videoData.style
          },
          style: {
            display: 'inline-block',
            border: '1px solid #F8F8F8',
            width: '20px',
            height: '20px',
            lineHeight: 0,
            cursor: 'pointer',
            marginLeft: '10px',
            verticalAlign: 'middle'
          },
          append: mono.create('style', {
            text: mono.style2Text([
              {
                selector: '.' + vimeo.dlBtnClassName + '.sf-style-4',
                style: {
                  background: 'url(' + SaveFrom_Utils.svg.getSrc('download', '#777777') + ') center no-repeat #F8F8F8',
                  backgroundSize: '12px'
                }
              },
              {
                selector: '.' + vimeo.dlBtnClassName + '.sf-style-4:hover',
                style: {
                  background: 'url(' + SaveFrom_Utils.svg.getSrc('download', '#00B75A') + ') center no-repeat #F8F8F8',
                  backgroundSize: '12px'
                }
              },
              {
                selector: '.' + vimeo.dlBtnClassName + '.sf-style-4:active',
                style: {
                  outline: 0,
                  boxShadow: 'inset 0 3px 5px rgba(0, 0, 0, 0.125)'
                }
              }
            ])
          })
        });

        if (mono.isOpera) {
          btn.style.background = '#F8F8F8';
          btn.appendChild(mono.create('img', {
            src: SaveFrom_Utils.svg.getSrc('download', '#777777'),
            style: {
              width: '12px',
              height: '12px',
              margin: '4px',
              backgroundColor: '#F8F8F8'
            }
          }));
        }
      }

      btn.addEventListener('click', vimeo.onBtnClick.bind(btn, videoData));

      if (videoData.style === 1) {
        btn = mono.create('span', {
          append: [
            btn,
            ' / '
          ]
        });
      }

      if (videoData.style === 3) {
        btn = mono.create('div', {
          class: 'clip_info-user_actions',
          append: [
            btn
          ]
        });
      }

      if (videoData.style === 1 || videoData.style === 2) {
        var firstChild = box.firstChild;
        if (firstChild) {
          box.insertBefore(btn, firstChild);
        } else {
          box.appendChild(btn);
        }
      } else {
        box.appendChild(btn);
      }
    },

    checkBtnExist: function() {
      var count = 2;
      clearInterval(vimeo.checkBtnExist.interval);
      vimeo.checkBtnExist.interval = setInterval(function() {
        count--;
        var videoContainer = vimeo.getMainVideoData();
        if (videoContainer) {
          vimeo.appendBtn(videoContainer);
        }
        if (!count) {
          clearInterval(vimeo.checkBtnExist.interval);
        }
      }, 1000);
    },

    showLinks: function(links, title, customFsIconStyle)
    {
      var box = document.getElementById(vimeo.panelId);
      if(!box)
        return;

      while(box.firstChild)
        box.removeChild(box.firstChild);

      if(links && links.length > 0)
      {
        box.appendChild(document.createTextNode(language.download + ': '));

        var aStyle = {margin: '0 0 0 15px'},
          fsIconStyle = {},
          fsTextStyle = {
            position: 'relative',
            top: '-1px'
          };

        if(iframe)
        {
          aStyle = {
            color: '#fff',
            borderBottom: '1px solid #808080',
            whiteSpace: 'nowrap',
            textDecoration: 'none',
            margin: '0 0 0 10px'
          };

          fsIconStyle = {color: '#ffffff', opacity: '.5'};
          fsTextStyle = {color: '#d0d0d0'};
        }

        if (customFsIconStyle !== undefined) {
          fsIconStyle = customFsIconStyle;
        }

        var success = false, color = '';
        for(var i = 0; i < links.length; i++)
        {
          var a = document.createElement('a');
          if(links[i].url && links[i].name)
          {
            success = true;

            var ext = links[i].ext;
            if(!ext)
            {
              ext = 'MP4';
              if(links[i].url.search(/\.flv($|\?)/i) != -1)
                ext = 'FLV';
            }

            var name = links[i].name ? links[i].name : ext;

            a.href = links[i].url;
            a.title = language.downloadTitle;
            a.appendChild(document.createTextNode(name));
            SaveFrom_Utils.setStyle(a, aStyle);

            box.appendChild(a);

            SaveFrom_Utils.appendFileSizeIcon(a, fsIconStyle, fsTextStyle);

            if(title && !links[i].noTitle)
            {
              a.setAttribute('download', mono.fileName.modify(
                title + '.' + ext.toLowerCase()));

              a.addEventListener('click', function(event){
                SaveFrom_Utils.downloadOnClick(event, null, {
                  useFrame: true
                });
              }, false);
            }

            if(!color)
              color = SaveFrom_Utils.getStyle(a, 'color');
          }
        }

        if(success)
        {
          if(!color)
            color = '#2786c2';

          if(preference.moduleShowDownloadInfo === 1)
          {
            box.appendChild(document.createElement('br'));
            SaveFrom_Utils.appendDownloadInfo(box, color);
          }

          return;
        }
      }

      box.appendChild(document.createTextNode(language.noLinksFound));
    },

    appendIframeButtons: function()
    {
      var p = document.getElementsByTagName('div')[0],
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

      panel.id = vimeo.panelId;
      SaveFrom_Utils.setStyle(panel, {
        color: '#fff',
        background: 'rgba(0,0,0,0.7)',
        textAlign: 'center',
        border: 0,
        display: 'none',
        fontFamily: 'Arial,Helvetica,sans-serif',
        fontSize: '13px',
        fontWeight: 'normal',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        margin: 0,
        padding: '3px',
        zIndex: 99990,
        lineHeight: '31px'
      });

      if(document.body.scrollWidth <= 400)
      {
        panel.style.paddingTop = '28px';
      }

      vimeo.btnBox = document.createElement('div');
      vimeo.btnBox.style.display = 'none';
      vimeo.btnBox.appendChild(b);
      vimeo.btnBox.appendChild(panel);

      mono.off(document, 'mouseenter', vimeo.onExtPlayerOver, false);
      mono.off(document, 'mouseleave', vimeo.onExtPlayerOver, false);
      mono.on(document, 'mouseenter', vimeo.onExtPlayerOver, false);
      mono.on(document, 'mouseleave', vimeo.onExtPlayerOver, false);

      a.addEventListener('click', vimeo.fetchIframeLinks, false);
      a.addEventListener('click', vimeo.toggleIframePanel, false);

      document.body.appendChild(vimeo.btnBox);
    },

    getLinksFromPage: function(cb) {
      var reList = [
        /"video":{/,
        /"request":{/,
        /"files":/
      ];
      var scriptList = mono.getPageScript(document.body.innerHTML, reList);

      var config = null;
      scriptList.some(function(script) {
        var jsonList = mono.findJson(script, reList);
        return jsonList.some(function(json) {
          if (json.video && json.request && json.request.files) {
            config = json;
            return true;
          }
        });
      });
      var request = null;
      var links = null;
      var title = null;

      var onResponse = function(response) {
        if (response) {
          links = response.links || null;
          title = response.title || null;
        }

        return cb(links, title);
      };

      if(config) {
        request = {
          action: 'getVimeoLinksFromConfig',
          config: config
        };

        return mono.sendMessage(request, onResponse);
      } else {
        request = {
          action: 'getVimeoLinks',
          extVideoId: vimeo.clipId
        };

        return mono.sendMessage(request, onResponse);
      }
    },

    fetchIframeLinks: function(e)
    {
      e.preventDefault();
      e.stopPropagation();

      var button = e.target;

      vimeo.appendIframeLinks(language.download + ' ...', button);

      vimeo.getLinksFromPage(function(links, title) {
        vimeo.appendIframeLinks(links, title, button);
      });
    },


    appendIframeLinks: function(links, title, button)
    {
      var panel = document.getElementById(vimeo.panelId);

      if(typeof(links) == 'object')
      {
        vimeo.showLinks(links, title);
        button.removeEventListener('click', vimeo.fetchIframeLinks, false);
      }
      else if(typeof(links) == 'string')
      {
        panel.textContent = links;
      }
    },


    toggleIframePanel: function(e)
    {
      e.preventDefault();
      e.stopPropagation();

      var panel = document.getElementById(vimeo.panelId);
      if(panel)
      {
        var isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? '' : 'none';

        if (isHidden && [1].indexOf(preference.cohortIndex) !== -1) {
          mono.sendMessage({action: 'trackCohort', category: 'vimeo', event: 'click', label: 'video-iframe'});
        }
      }
    },


    onExtPlayerOver: function(event)
    {
      if(vimeo.btnBox)
      {
        if(event.type == 'mouseenter')
        {
          if(vimeo.btnBox.style.display == 'none')
            vimeo.btnBox.style.display = 'block';
        }
        else if(event.type == 'mouseleave')
        {
          vimeo.btnBox.style.display = 'none';
        }
      }
    },

    videoFeed: {
      btnClassName: 'sf-feed-dl-btn',
      style: null,
      checkUrl: function(url) {
        this.enable();
      },
      onClick: function(e) {
        e.preventDefault();
        e.stopPropagation();

        var id = this.dataset.sfId;
        var isCouchMode = this.dataset.sfCouchMode > 0;

        if ([1].indexOf(preference.cohortIndex) !== -1) {
          var isBrozar = document.getElementById('brozar');
          var isBrowseContent = document.getElementById('browse_content');
          if (isCouchMode) {
            mono.sendMessage({action: 'trackCohort', category: 'vimeo', event: 'click', label: 'video-player'});
          } else
          if (isBrozar && isBrozar.contains(this)) {
            mono.sendMessage({action: 'trackCohort', category: 'vimeo', event: 'click', label: 'video-discover'});
          } else
          if (isBrowseContent && isBrowseContent.contains(this)) {
            mono.sendMessage({action: 'trackCohort', category: 'vimeo', event: 'click', label: 'video-list'});
          } else {
            mono.sendMessage({action: 'trackCohort', category: 'vimeo', event: 'click', label: 'video-other'});
          }
        }

        if (vimeo.currentMenu && vimeo.currentMenu.isShow) {
          vimeo.hideMenu();
          return;
        }

        var fromCache = vimeo.linkCache[id];
        var links = language.download + ' ...';
        if (fromCache) {
          links = SaveFrom_Utils.popupMenu.prepareLinks.vimeo(fromCache.links, fromCache.title);
        }

        var menu = vimeo.currentMenu = SaveFrom_Utils.popupMenu.quickInsert(this, links, 'sf-popupMenu');

        if (fromCache) {
          return;
        }

        mono.sendMessage({action: 'getVimeoLinks', extVideoId: id}, function(response) {
          if (response.links) {
            vimeo.linkCache[id] = response;
            var menuLinks = SaveFrom_Utils.popupMenu.prepareLinks.vimeo(response.links, response.title);
            menu.update(menuLinks);
            return;
          }
          menu.update(language.noLinksFound);
        });
      },
      getBtn: function(details) {
         var btn = mono.create('i', {
          class: details.classList,
          data: {
            sfId: details.id,
            sfCouchMode: details.isCouchMode ? 1 : 0
          },
          on: ['click', this.onClick]
        });

        if (mono.isOpera) {
          btn.style.background = '#F8F8F8';
          btn.appendChild(mono.create('img', {
            src: SaveFrom_Utils.svg.getSrc('download', '#777777'),
            style: {
              width: '12px',
              height: '12px',
              margin: '4px',
              backgroundColor: '#F8F8F8'
            }
          }));
        }

        return btn;
      },
      onImgOver2: function(e) {
        var link = this.parentNode;

        var parent;
        var id;

        if (link.tagName !== 'A') {
          return;
        }

        var href = link.getAttribute('href');
        if (!href) {
          return;
        }

        id = href.match(/^\/(\d+)$/);
        id = id && id[1];

        if (!id) {
          return;
        }

        parent = link.parentNode;
        if (!parent || !parent.classList.contains('contextclip-img')) {
          return;
        }

        if (parent.dataset.sfBtn > 0) {
          return;
        }
        parent.dataset.sfBtn = '1';

        var _this = vimeo.videoFeed;

        var classList = [_this.btnClassName, 'sf-type1-btn'];

        link.appendChild(vimeo.videoFeed.getBtn({
          id: id,
          classList: classList
        }));

        link = null;
        parent = null;
      },
      onImgOver: function(e) {
        var link = this.parentNode;

        var parent;
        var id;

        if (link.tagName == 'LI') {
          id = link.dataset.resultId;
          if (id && id.substr(0, 5) === 'clip_') {
            id = id.substr(5);
            parent = link;
            link = this.querySelector('.thumbnail_wrapper');
          } else {
            return;
          }
        }

        if (!id) {
          if (link.tagName !== 'A') {
            return;
          }
          id = link.dataset.clipId;

          parent = link.parentNode;
          if (!parent) {
            return;
          }
        }

        var isCouchMode = false;
        if (!id) {
          id = parent.id;
          isCouchMode = id.substr(0, 7) === 'item_id' && parent.classList.contains('clip');
          if (!isCouchMode && id.substr(0, 4) !== 'clip') {
            id = undefined;
          }
          if (!id && parent.tagName === 'ARTICLE' && parent.classList.contains('clip_item')) {
            id = link.getAttribute('href');
          }
          if (!id) {
            return;
          }

          id = id.match(/([0-9]+)$/);
          if (id) {
            id = id[1];
          }
        }

        var hasBtn = parent.dataset.sfBtn;
        if (hasBtn) {
          return;
        }
        parent.dataset.sfBtn = '1';

        var _this = vimeo.videoFeed;

        var classList = [_this.btnClassName];
        if (this.classList.contains('thumbnail_lg_wide')) {
          classList.push('sf-type1-btn');
        }

        if (this.classList.contains('clip_thumbnail')) {
          classList.push('sf-type3-btn');
        }

        var ol = parent.parentNode;
        if (ol && ol.id === 'clips') {
          classList.push('sf-type1-btn');
          // classList.push('sf-type2-btn');
        }
        ol = null;

        if (isCouchMode) {
          classList.push('sf-type1-btn');
        }

        if (parent.classList.contains('promo_clip') && classList.length === 1) {
          classList.push('sf-type1-btn');
          // classList.push('sf-type2-btn');
        }

        link.appendChild(vimeo.videoFeed.getBtn({
          id: id,
          classList: classList,
          isCouchMode: isCouchMode
        }));

        link = null;
        parent = null;
      },
      onOver: function(e) {
        var el = e.target;
        if (el.nodeType !== 1) {
          return;
        }
        var isClipWrapper = el.classList.contains('clip_thumbnail');

        if (el.tagName !== 'IMG' && !isClipWrapper) {
          return;
        }

        if (el.parentNode.classList.contains('contextclip-img-thumb')) {
          return vimeo.videoFeed.onImgOver2.call(el, e);
        }

        if (el.classList.contains('thumbnail') || isClipWrapper) {
          vimeo.videoFeed.onImgOver.call(el, e);
        }
      },
      injectStyle: function() {
        if (this.style) {
          !this.style.parentNode && document.head.appendChild(this.style);
          return;
        }

        this.style = mono.create('style', {
          text: "a > .sf-feed-dl-btn," +
          "a .sf-feed-dl-btn.sf-type3-btn {" +
          'display: none;' +
          'border: 1px solid #F8F8F8;' +
          'width: 20px;' +
          'height: 20px;' +
          'padding: 0;' +
          'position: absolute;' +
          'background: url(' + SaveFrom_Utils.svg.getSrc('download', '#777777') + ') center no-repeat #F8F8F8;' +
          'background-size: 12px;' +
          'top: auto;' +
          'left: auto;' +
          'line-height: 0;' +
          "}" +
          "a > .sf-feed-dl-btn.sf-type1-btn," +
          "a > div > .sf-feed-dl-btn.sf-type3-btn {" +
          'top: 0;' +
          "}" +
          "a > .sf-feed-dl-btn.sf-type2-btn {" +
          'opacity: 0.5;' +
          "}" +
          "a > div > .sf-feed-dl-btn.sf-type3-btn {" +
          "z-index: 10;" +
          "}" +
          "a > .sf-feed-dl-btn:hover," +
          "a > div > .sf-feed-dl-btn.sf-type3-btn:hover {" +
          'background: url(' + SaveFrom_Utils.svg.getSrc('download', '#00B75A') + ') center no-repeat #F8F8F8;' +
          'background-size: 12px;' +
          "}" +
          "a > .sf-feed-dl-btn.sf-type2-btn:hover {" +
          'opacity: 0.8;' +
          "}" +
          "a > .sf-feed-dl-btn:active," +
          "a > div > .sf-feed-dl-btn.sf-type3-btn:active {" +
          "outline: 0;" +
          "box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.125);" +
          "}" +
          "a:hover > .sf-feed-dl-btn," +
          "a:hover > div > .sf-feed-dl-btn.sf-type3-btn" +
          "{display: block;}"
        });

        document.head.appendChild(this.style);
      },
      enable: function() {
        if (iframe) {
          return;
        }

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

        var dataAttr = mono.dataAttr2Selector('sfBtn');
        var dataAttrList = document.querySelectorAll('['+dataAttr+']');
        for (i = 0, item; item = dataAttrList[i]; i++) {
          item.removeAttribute(dataAttr);
        }
      }
    },
    mutationMode: {
      observer: null,
      stop: function() {
        if (this.observer) {
          this.observer.stop();
        }
      },
      wrapOnImgOver: function() {
        mono.off(this, 'mouseenter', vimeo.mutationMode.wrapOnImgOver);
        if (!moduleState) {
          return;
        }
        vimeo.videoFeed.onImgOver.apply(this, arguments);
      },
      wrapOnImgOver2: function() {
        mono.off(this, 'mouseenter', vimeo.mutationMode.wrapOnImgOver2);
        if (!moduleState) {
          return;
        }
        vimeo.videoFeed.onImgOver2.apply(this, arguments);
      },
      enable: function() {
        if (this.observer) {
          return this.observer.start();
        }

        this.observer = SaveFrom_Utils.mutationWatcher.run({
          callback: function(summaryList) {
            var summary, n, i, node, styleIndex, videoId;

            summary = summaryList[0];
            for (n = 0; node = summary.added[n]; n++) {
              vimeo.hideMenu();
              if (node.dataset.sfSkip > 0) {
                continue;
              }
              node.dataset.sfSkip = '1';

              styleIndex = 2;
              vimeo.appendBtn({id: '', parent: node, style: styleIndex, playerContainer: '#clip'});
            }

            summary = summaryList[1];
            for (n = 0; node = summary.added[n]; n++) {
              vimeo.hideMenu();
              if (node.dataset.sfSkip > 0) {
                continue;
              }
              node.dataset.sfSkip = '1';

              styleIndex = 1;
              vimeo.appendBtn({id: '', parent: node, style: styleIndex, playerContainer: '#channel_clip_container'});
            }

            summary = summaryList[2];
            for (n = 0; node = summary.added[n]; n++) {
              if (node.dataset.sfSkip > 0) {
                continue;
              }
              node.dataset.sfSkip = '1';

              if (node.id.substr(0, 5) !== 'clip_') {
                continue;
              }

              var videoData = vimeo.getBrowserVideoData(node, node.id);
              if (!videoData) {
                continue;
              }

              vimeo.appendBtn(videoData);
            }

            summary = summaryList[3];
            for (n = 0; node = summary.added[n]; n++) {
              if (node.dataset.sfSkip > 0) {
                continue;
              }
              node.dataset.sfSkip = '1';

              mono.on(node, 'mouseenter', vimeo.mutationMode.wrapOnImgOver);
            }

            summary = summaryList[4];
            for (n = 0; node = summary.added[n]; n++) {
              if (node.dataset.sfSkip > 0) {
                continue;
              }
              node.dataset.sfSkip = '1';

              var parent = mono.getParentByClass(node, 'clip_thumbnail');

              mono.on(parent, 'mouseenter', vimeo.mutationMode.wrapOnImgOver);
            }

            summary = summaryList[5];
            for (n = 0; node = summary.added[n]; n++) {
              if (node.dataset.sfSkip > 0) {
                continue;
              }
              node.dataset.sfSkip = '1';

              vimeo.hideMenu();

              var wrapper = mono.getParent(node, '.clip_info-wrapper');
              if (!wrapper) {
                continue;
              }

              var clipInfoActions = wrapper.querySelector('.clip_info-actions');
              if (!clipInfoActions) {
                continue;
              }

              styleIndex = 3;
              vimeo.appendBtn({id: '', parent: clipInfoActions, style: styleIndex, playerContainer: '.clip_main'});
            }

            summary = summaryList[6];
            for (n = 0; node = summary.added[n]; n++) {
              if (node.dataset.sfSkip > 0) {
                continue;
              }
              node.dataset.sfSkip = '1';

              mono.on(node, 'mouseenter', vimeo.mutationMode.wrapOnImgOver2);
            }

            summary = summaryList[7];
            for (n = 0; node = summary.added[n]; n++) {
              if (node.dataset.sfSkip > 0) {
                continue;
              }
              node.dataset.sfSkip = '1';

              styleIndex = 4;
              vimeo.appendBtn({id: '', parent: node, style: styleIndex, playerContainer: '.clip'});
            }
          },
          queries: [
            {css: '#clip #info #tools', is: 'added'},
            {css: '#channel_clip_container #info .meta .stats', is: 'added'},
            {css: '#browse_content ol.browse_videos_videos > li', is: 'added'},
            {css: 'img.thumbnail', is: 'added'},
            {css: '.clip_thumbnail img', is: 'added'},
            {css: '.clip_main .clip_info a.js-user_link.iris_link-header', is: 'added'},
            {css: '.contextclip-img img', is: 'added'},
            {css: '.client_wrapper .clip header h1', is: 'added'}
          ]
        });
      }
    }
  };

}, null, function syncIsActive() {
  "use strict";

  if (mono.isSafari || mono.isGM) {
    if ( !mono.checkUrl(document.URL, [
        'http://vimeo.com/*',
        'http://*.vimeo.com/*',
        'https://vimeo.com/*',
        'https://*.vimeo.com/*'
      ]) ) {
      return false;
    }
  }

  return true;
});