// ==UserScript==
// @name        Facebook.com downloader
//
// @include     http://facebook.com/*
// @include     http://*.facebook.com/*
// @include     https://facebook.com/*
// @include     https://*.facebook.com/*
// ==/UserScript==

(typeof mono === 'undefined') && (mono = {loadModule: function() {this.loadModuleStack.push(arguments);},loadModuleStack: []});

mono.loadModule('facebook', function(moduleName, initData) {
  "use strict";

  var language = initData.getLanguage;
  var preference = initData.getPreference;
  var moduleState = preference.moduleFacebook ? 1 : 0;

  mono.onMessage(function(message, cb){
    if (message.action === 'getModuleInfo') {
      if (message.url !== location.href) return;
      return cb({state: moduleState, moduleName: moduleName});
    }
    if (message.action === 'changeState') {
      if (moduleName !== message.moduleName) {
        return;
      }
      return fb.changeState(message.state);
    }
    if (!moduleState) {
      return;
    }
    if (message.action === 'updateLinks') {
      fb.changeState(0);
      fb.changeState(1);
    }
  });

  if (moduleState) {
    mono.asyncCall(function() {
      fb.run();
    });
  }

  var fb = {
    contextMenu: null,
    className: 'savefrom_fb_download',
    isMutation: false,
    run: function()
    {
      moduleState = 1;

      videoFeed.addStyle();
      photo.injectStyle();

      if (SaveFrom_Utils.mutationWatcher.isAvailable()) {
        this.isMutation = true;
        this.initEmbedDownloader();
        this.mutationMode.enable();
        return;
      }

      var photoContainer = document.getElementById('imagestage');
      if ( photoContainer ) {
        var img = photoContainer.querySelector('img.fbPhotoImage');
        if (img) {
          photo.addCurrentDlBtn(img);
        }
        img = null;
      }
      photoContainer = null;

      var _this = this;
      mono.onUrlChange(function() {
        _this.updateLinks();
      }, 1);
    },

    changeState: function(state) {
      fb.hideMenu();
      moduleState = state;
      mono.clearUrlChange();
      externalMedia.disable();
      photo.rmCurrentPhotoBtn();
      photo.rmDataAttrs();
      videoFeed.rmBtn();
      video.rmBtn();
      fb.mutationMode.stop();
      if (state) {
        fb.run();
      }
    },

    initEmbedDownloader: function() {
      SaveFrom_Utils.addStyleRules('.' + SaveFrom_Utils.embedDownloader.linkClass + ' img', {
        opacity: '.5'
      });

      SaveFrom_Utils.embedDownloader.init();
    },

    updateLinks: function()
    {
      this.removeDownloadLinks();
      video.showLinks();

      externalMedia.run();

      this.initEmbedDownloader();
    },


    removeDownloadLinks: function()
    {
      var selector = 'a.' + this.className +
        ',div.' + this.className +
        ',span.' + this.className;

      var e = document.querySelectorAll(selector);
      for(var i = e.length-1; i >= 0; i--)
        e[i].parentNode.removeChild(e[i]);
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
      wrapVideoGetLinks: function(player) {
        switch (player.tagName) {
          case 'EMBED':
            video.getLinksFromEmbed(player, function(links) {
              video.appendLinks(links);
            });
            break;
          case 'VIDEO':
            video.getLinksFromVideo(player, function(links) {
              video.appendLinks(links);
            });
            break;
        }
      },
      wrapVideoFeedOnLinkHover: function() {
        mono.off(this, 'mouseenter', fb.mutationMode.wrapVideoFeedOnLinkHover);
        if (!moduleState) {
          return;
        }
        videoFeed.onLinkHover.apply(this, arguments);
      },
      wrapPhotoOnHover: function() {
        mono.off(this, 'mouseenter', fb.mutationMode.wrapPhotoOnHover);
        if (!moduleState) {
          return;
        }
        photo.addCurrentDlBtn(this);
      },
      wrapExternalMediaMouseEnter: function() {
        if (!moduleState) {
          return;
        }
        var link = this;
        var attr = link.dataset[externalMedia.linkDataAttr];

        if (attr) {
          clearTimeout(externalMedia.timer);
          return;
        }

        if (externalMedia.handle(link)) {
          if(externalMedia.lastLink && externalMedia.lastLink !== link) {
            externalMedia.removeBtn(externalMedia.lastLink);
          }

          SaveFrom_Utils.embedDownloader.hidePanel();
          externalMedia.lastLink = link;
        } else {
          mono.off(this, 'mouseenter', fb.mutationMode.wrapExternalMediaMouseEnter);
          mono.off(this, 'mouseleave', fb.mutationMode.wrapExternalMediaMouseLeave);
        }
      },
      wrapExternalMediaMouseLeave: function() {
        if (!moduleState) {
          return;
        }
        var link = this;
        var attr = link.dataset[externalMedia.linkDataAttr];

        if (attr) {
          clearTimeout(externalMedia.timer);
          externalMedia.timer = setTimeout(function(){
            externalMedia.removeBtn(link);
          }, 1500);
        }
      },
      wrapExternalMedia: function(node) {
        mono.on(node, 'mouseenter', fb.mutationMode.wrapExternalMediaMouseEnter);
        mono.on(node, 'mouseleave', fb.mutationMode.wrapExternalMediaMouseLeave);
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
                var isInsert = false;

                if (mono.matches(node, '#fbxPhotoContentContainer .videoStage ' + node.tagName)) {
                  isInsert = true;
                }

                if (isInsert) {
                  _this.wrapVideoGetLinks(node);
                } else {
                  mono.on(node, 'mouseenter', _this.wrapVideoFeedOnLinkHover);
                }
              }
            }

            summary = summaryList[2];
            for (n = 0; node = summary.added[n]; n++) {
              if (node.getAttribute('aria-describedby') !== 'fbPhotosSnowliftCaption') {
                continue;
              }
              fb.hideMenu();

              if (node.dataset.sfSkip > 0) {
                continue;
              }
              node.dataset.sfSkip = '1';

              mono.on(node, 'mouseenter', _this.wrapPhotoOnHover);
            }

            summary = summaryList[3];
            for (n = 0; node = summary.added[n]; n++) {
              if (node.sfSkip > 0) {
                continue;
              }
              node.sfSkip = '1';

              _this.wrapExternalMedia(node);
            }

            summary = summaryList[4];
            for (n = 0; node = summary.removed[n]; n++) {
              mono.onRemoveListener(node);
            }

          },
          queries: [
            {css: 'embed', is: 'added'},
            {css: 'video', is: 'added'},
            {css: '.stage img.spotlight', is: 'added'},
            {css: 'a', is: 'added'},
            {css: '.' + mono.onRemoveClassName, is: 'removed'}
          ]
        });
      }
    },
    hideMenu: function() {
      if (fb.contextMenu) {
        fb.contextMenu.hide();
        fb.contextMenu = null;
      }
    }
  };

  var externalMedia = {
    linkDataAttr: 'savefromEd',
    timer: 0,
    lastLink: null,

    re: [
      /https?:\/\/(?:[a-z]+\.)?youtube\.com\/(?:#!?\/)?watch\?[^\s\"\'\<\>]*v=([\w\-]+)/i,
      /https?:\/\/(?:[a-z0-9]+\.)?youtube\.com\/(?:embed|v)\/([\w\-]+)/i,
      /https?:\/\/(?:[a-z]+\.)?youtu\.be\/([\w\-]+)/i,
      /https?:\/\/(?:[\w\-]+\.)?vimeo\.com\/(\d+)(?:\?|$)/i
    ],

    thumbnail: {
      youtube: {
        re: [/ytimg\.com(?:\/|%2F)vi(?:\/|%2F)([\w\-]+)(?:\/|%2F)/i],
        url: 'http://www.youtube.com/watch?v={vid}'
      }
    },

    disable: function() {
      mono.off(document, 'mouseenter', this.onLinkHover, true);
      mono.off(document, 'mouseleave', this.onLinkHover, true);

      var panel = SaveFrom_Utils.embedDownloader.panel;
      if (panel) {
        panel.style.display = 'none';
      }
    },

    run: function() {
      mono.off(document, 'mouseenter', this.onLinkHover, true);
      mono.off(document, 'mouseleave', this.onLinkHover, true);

      mono.on(document, 'mouseenter', this.onLinkHover, true);
      mono.on(document, 'mouseleave', this.onLinkHover, true);
    },


    onLinkHover: function(event) {
      var link = event.target;

      if (mono.isOpera) {
        if (link.id === 'fbPhotoSnowliftTagBoxes') {
          link = link.previousElementSibling;
        }
      }
      if (link.tagName === 'IMG') {
        if (link.classList.contains('spotlight') && link.getAttribute('aria-describedby') === 'fbPhotosSnowliftCaption') {
          return photo.addCurrentDlBtn(link);
        }
      }

      if (['EMBED', 'VIDEO'].indexOf(link.tagName) !== -1) {
        videoFeed.onLinkHover.call(link, event);
        return;
      }

      if(link.tagName !== 'A') {
        link = link.parentNode;
        if(!link || link.tagName !== 'A') {
          return;
        }
      }

      var attr = link.dataset[externalMedia.linkDataAttr];

      if (event.type === 'mouseenter') {
        if (attr) {
          clearTimeout(externalMedia.timer);
          return;
        }

        if (externalMedia.handle(link)) {
          if(externalMedia.lastLink && externalMedia.lastLink != link)
            externalMedia.removeBtn(externalMedia.lastLink);

          SaveFrom_Utils.embedDownloader.hidePanel();
          externalMedia.lastLink = link;
        }

        return;
      }

      if (attr) {
        clearTimeout(externalMedia.timer);
        externalMedia.timer = setTimeout(function(){
          externalMedia.removeBtn(link);
        }, 1500);
      }
    },

    removeBtn: function(link)
    {
      if(!link || typeof(link) != 'object')
        return;

      var btn = link.querySelector('.' + fb.className);
      if(btn)
      {
        btn.parentNode.removeAttribute(mono.dataAttr2Selector(externalMedia.linkDataAttr));
        btn.parentNode.removeChild(btn);
      }

      link.removeAttribute(mono.dataAttr2Selector(externalMedia.linkDataAttr));

      if(link == this.lastLink)
        this.lastLink = null;
    },


    checkUrl: function(url, retry)
    {
      if(!retry && url.search(/https?:\/\/([\w\-]+\.)?facebook\.com\/l\.php/i) > -1)
      {
        return this.checkUrl(decodeURIComponent(url), true);
      }

      for(var i = 0, l = this.re.length; i < l; i++)
      {
        var m = url.match(this.re[i]);
        if(m && m.length > 0)
          return m[0];
      }
    },


    handle: function(link)
    {
      var img = link.querySelector('img');
      if(img)
      {
        var parent = img.parentNode;
        if(img.src && SaveFrom_Utils.getStyle(parent, 'position') == 'relative')
        {
          var ajaxify = link.getAttribute('ajaxify');

          if(ajaxify && ajaxify.search(/\/flash\/expand_inline/i) > -1)
          {
            var url = this.getThumbnailUrl(img.src);
            if(url)
            {
              return this.createButton(url, parent, link, {
                display: 'block',
                position: 'absolute',
                bottom: '3px',
                right: '3px',
                zIndex: 9999,
                margin: 0,
                width: '16px',
                height: '16px'
              }, {
                display: 'block'
              });
            }
          }
          else if(this.checkUrl(link.href))
          {
            return this.createButton(link.href, parent, link, {
              display: 'block',
              position: 'absolute',
              bottom: '3px',
              right: '3px',
              zIndex: 9999,
              margin: 0,
              width: '16px',
              height: '16px'
            }, {
              display: 'block'
            });
          }
        }

        return false;
      }

      return this.createButton(link.href, link, link);
    },


    getThumbnailUrl: function(url)
    {
      for(var i in this.thumbnail)
      {
        for(var j = 0; j < this.thumbnail[i].re.length; j++)
        {
          var vid = SaveFrom_Utils.getMatchFirst(url, this.thumbnail[i].re[j]);
          if(vid)
            return this.thumbnail[i].url.replace(/\{vid\}/ig, vid);
        }
      }

      return '';
    },


    createButton: function(url, parent, link, styleParent, styleIcon)
    {
      url = this.checkUrl(url);
      if(!url)
        return false;

      var btn = document.createElement('a');
      btn.className = fb.className;
      btn.href = 'http://savefrom.net/?url=' + encodeURIComponent(url);
      btn.setAttribute(SaveFrom_Utils.embedDownloader.dataAttr, url);
      btn.title = language.download;

      btn.addEventListener('mousedown', function() {
        if ([1].indexOf(preference.cohortIndex) !== -1) {
          mono.sendMessage({action: 'trackCohort', category: 'facebook', event: 'click', label: 'video-feed'});
        }
      });

      SaveFrom_Utils.setStyle(btn, {
        marginLeft: '7px',
        verticalAlign: 'middle'
      });

      if(styleParent)
        SaveFrom_Utils.setStyle(btn, styleParent);

      var icon = document.createElement('img');
      icon.className = 'icon';
      icon.src = SaveFrom_Utils.svg.getSrc('download', '#a2db16');
      SaveFrom_Utils.setStyle(icon, {
        display: 'inline-block',
        width: '16px',
        height: '16px',
        verticalAlign: 'middle',
        //opacity: '0.9',
        cursor: 'pointer'
      });

      if(styleIcon)
        SaveFrom_Utils.setStyle(icon, styleIcon);

      btn.appendChild(icon);

      link.dataset[this.linkDataAttr] = 1;
      parent.appendChild(btn);

      return true;
    }
  };


  var video = {
    getLinks: function(parent, callback) {
      "use strict";
      var count = 0, _this = this;

      var func = function() {
        var embed = parent.querySelector('embed');
        if(embed) {
          return _this.getLinksFromEmbed(embed, callback.bind(this));
        }

        var video = parent.querySelector('video');
        if(video) {
          return _this.getLinksFromVideo(video, function(links) {
            callback.call(this, links);
          });
        }

        embed = null;
        video = null;

        count++;
        if(count > 10) {
          callback.call(_this, null);
        }

        setTimeout(func, 1000);
      };

      setTimeout(func, 1000);
    },


    getLinksFromEmbed: function(embed, cb) {
      if(!embed) {
        return cb(null);
      }

      var fv = embed.getAttribute('flashvars');
      if(fv === null) {
        return cb(null);
      }

      var params = mono.parseUrlParams(fv).params;
      if (params === undefined) {
        return cb(null);
      }

      var videoData = null;
      try {
        videoData = JSON.parse(decodeURIComponent(params)).video_data;
      } catch (e) {}

      if(!videoData) {
        return cb(null);
      }

      if (videoData.progressive) {
        videoData = videoData.progressive;
      }

      var links = {};
      var typeMap = {
        sd_src: 'SD',
        hd_src: 'HD'
      };
      for (var i = 0, item; item = videoData[i]; i++) {
        ['sd_src', 'hd_src'].forEach(function(type) {
          if (!item[type]) {
            return;
          }

          links[item[type]] = typeMap[type];
        });
      }

      return cb(links);
    },

    requestVideoLinks: function(videoid, cb) {
      "use strict";
      mono.sendMessage({
        action: 'getFacebookLinks',
        extVideoId: videoid
      }, function(response) {
        if (!response) {
          cb();
        } else {
          cb(response.links, response.title);
        }
      });
    },

    getLinksFromVideo: function(video, cb) {
      "use strict";
      if(!video) {
        return cb(null);
      }

      var links = {};

      var url = document.URL;
      var id;
      SaveFrom_Utils.embedDownloader.hostings.facebook.re.some(function(reg) {
        var _id;
        if (_id = url.match(reg)) {
          id = _id && _id[1];
          return true;
        }
      });
      if (!id) {
        var parent = mono.getParentByClass(video, 'userContentWrapper');
        parent = parent && parent.querySelectorAll('a.profileLink, a[rel="theater"]');
        if (parent && parent.length > 0) {
          parent = [].slice.call(parent);
          parent.some(function(item) {
            item = (item.href || '').match(/\/videos\/(\d+)/);
            item = item && item[1];
            if (item) {
              id = item;
              return true;
            }
          });
        }
      }
      id && (links.id = id);

      if(video.src) {
        var ext = SaveFrom_Utils.getFileExtension(video.src, 'mp4');
        links[video.src] = ext.toUpperCase();
      }

      var src = video.querySelectorAll('source');
      if(src && src.length > 0) {
        for(var i = 0; i < src.length; i++)
        {
          var ext = SaveFrom_Utils.getFileExtension(src[i].src, 'mp4');
          links[src[i].src] = ext.toUpperCase();
        }
      }

      return cb(links);
    },


    showLinks: function() {
      "use strict";
      var parent = document.querySelector('.videoStage');
      if(!parent)
        return;

      var _this = this;
      this.getLinks(parent, function(links){
        _this.appendLinks(links);
      });
    },


    getFileName: function(url) {
      var name = SaveFrom_Utils.getFileName(url);
      if(name)
        return name;

      var d = SaveFrom_Utils.dateToObj();
      var dateStr = d.year + '-' + d.month + '-' + d.day + '_' +
        d.hour + '-' + d.min;

      return 'facebook_' + dateStr + '.' +
        SaveFrom_Utils.getFileExtension(url, 'mp4');
    },

    prepareLinks: function(links, _title) {
      var menuLinks = [];
      for (var url in links) {
        var title = this.getFileName(url);
        var extPos = title.lastIndexOf('.');
        var ext = title.substr(extPos+1);
        title = _title || title.substr(0, extPos);
        var format = ext.toUpperCase();

        var quality = links[url];
        var popupLink = { href: url, title: title, format: format, quality: quality, forceDownload: true };
        menuLinks.push(popupLink);
      }
      if (menuLinks.length === 0) {
        menuLinks = language.noLinksFound;
      }
      return menuLinks;
    },

    appendLinks: function(links) {
      if(!links) {
        return;
      }

      var box = document.getElementById('fbPhotoPageMediaInfo');

      if (box === null) {
        return;
      }

      var title = document.querySelector('h2.uiHeaderTitle');
        if (title) {
          title = title.textContent;
        }

      if(!box || box.querySelector('.' + fb.className)) {
        return;
      }

      var panel = document.createElement('div');
      panel.className = fb.className;

      var button = mono.create('div', {
        title: language.download,
        style: {
          display: 'inline-block',
          width: '16px',
          height: '16px',
          backgroundImage: 'url('+SaveFrom_Utils.svg.getSrc('download', '#a2db16')+')',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          verticalAlign: 'middle',
          cursor: 'pointer'
        }
      });

      panel.appendChild(button);


      var popupMenuLinks = null;

      button.addEventListener('click', function() {
        if (fb.contextMenu && fb.contextMenu.isShow) {
          fb.hideMenu();
          return;
        }

        var menu = fb.contextMenu = SaveFrom_Utils.popupMenu.quickInsert(this, language.download + ' ...', fb.className + '_popup');

        if (popupMenuLinks) {
          menu.update(popupMenuLinks);
        } else
        if (links.id) {
          var id = links.id;
          delete links.id;
          video.requestVideoLinks(id, function(_links, title) {
            if (_links) {
              popupMenuLinks = SaveFrom_Utils.popupMenu.prepareLinks.facebook(_links, title);
            } else {
              popupMenuLinks = video.prepareLinks(links);
            }
            menu.update(popupMenuLinks);
          });
        } else {
          popupMenuLinks = video.prepareLinks(links, title);
          menu.update(popupMenuLinks);
        }

        if ([1].indexOf(preference.cohortIndex) !== -1) {
          mono.sendMessage({action: 'trackCohort', category: 'facebook', event: 'click', label: 'video-single'});
        }
      });

      box.appendChild(panel);

      box = null;
      panel = null;
      button = null;
    },
    rmBtn: function() {
      var btnList = document.querySelectorAll('.'+fb.className);
      for (var i = 0, item; item = btnList[i]; i++) {
        item.parentNode.removeChild(item);
      }
    }
  };

  var photo = {
    style: null,
    getFilenameFromUrl: function(url) {
      return SaveFrom_Utils.getMatchFirst(url, /\/([^\/]+\.[a-z0-9]{3,4})(?:\?|$)/i);
    },
    getPhotoId: function() {
      var params = mono.parseUrlParams(location.href);
      return params.fbid;
    },
    onGetPhotoUrl: function(url, container, onGetUrl) {
      if (!url) {
        var img = container.querySelector('img.spotlight') || container.querySelector('img.fbPhotoImage');
        if (!img) {
          return onGetUrl();
        }
        url = img.src;
      }
      if (!url) {
        return onGetUrl();
      }

      if (url.indexOf('dl=1') === -1) {
        if (url.indexOf('?') === -1) {
          url += '?dl=1'
        } else {
          url += '&dl=1'
        }
      }
      onGetUrl(url);
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
        'left: 20px;' +
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
        "body:not(.fullScreen) div:hover > .sf-dl-current-photo-btn {display: block;}"
      });

      document.head.appendChild(this.style);
    },
    addDlCurrentPhotoBtn: function(container) {
      var exBtn = this.rmCurrentPhotoBtn(container);
      if (exBtn) {
        return;
      }
      var _this = this;

      container.appendChild(mono.create('a', {
        class: 'sf-dl-current-photo-btn',
        href: '#',
        title: language.download,
        on: ['click', function(e) {
          e.stopPropagation();
          e.preventDefault();

          if (fb.contextMenu && fb.contextMenu.isShow) {
            fb.hideMenu();
            return;
          }

          var onKeyDown = function(e) {
            if (e.keyCode === 18 || e.keyCode === 17) return;
            menu.hide();
            document.removeEventListener('keydown', onKeyDown);
          };

          var menu = fb.contextMenu = SaveFrom_Utils.popupMenu.quickInsert(this, language.download + ' ...', "photoDlMenu", {
            parent: container,
            onShow: function() {
              if (fb.isMutation) {
                return;
              }
              document.addEventListener('keydown', onKeyDown);
            },
            onHide: function() {
              if (fb.isMutation) {
                return;
              }
              document.removeEventListener('keydown', onKeyDown);
            }
          });

          var onGetUrl = function(link) {
            if (!link) {
              return menu.update(language.noLinksFound);
            }
            var photoFileName = mono.fileName.modify(photo.getFilenameFromUrl(link));
            var dotPos = photoFileName.lastIndexOf('.');
            var photoExt = photoFileName.substr(dotPos+1);
            var photoTitle = photoFileName.substr(0, dotPos);
            menu.update([{href: link, title: photoTitle, quality: language.download,
              format: ' ', ext: photoExt, isBlank: true, func: function() {
                menu.hide();
              }}]);
          };

          var fbid = photo.getPhotoId();
          if (!fbid) {
            return photo.onGetPhotoUrl(undefined, container, onGetUrl);
          }
          mono.sendMessage({action: 'getFacebookPhotoUrl', fbid: fbid}, function(url) {
            photo.onGetPhotoUrl(url, container, onGetUrl);
          });
        }]
      }));
    },
    addCurrentDlBtn: function(img) {
      var contaier = img.parentNode;
      if (contaier.dataset.sfSkip > 0) {
        return;
      }
      contaier.dataset.sfSkip = '1';

      var url = img.src;
      if (!url) {
        return;
      }

      this.addDlCurrentPhotoBtn(contaier);
    },
    rmDataAttrs: function() {
      var dataAttr = mono.dataAttr2Selector('sfSkip');
      var dataAttrList = document.querySelectorAll('*['+dataAttr+']');
      for (var i = 0, item; item = dataAttrList[i]; i++) {
        item.removeAttribute(dataAttr);
      }
    }
  };

  var videoFeed = {
    style: null,
    addStyle: function() {
      if (this.style) {
        if  (!this.style.parentNode) {
          document.head.appendChild(this.style);
        }
        return;
      }

      this.style = mono.create('style', {
        class: 'sfFeedStyle',
        text: '' +
        '.'+fb.className+'-feed'+'.sf-feed {' +
        'display: none;' +
        'width: 20px;' +
        'height: 20px;' +
        'padding: 0;' +
        'position: absolute;' +
        'background: url('+SaveFrom_Utils.svg.getSrc('download', '#a2db16')+') center no-repeat transparent;' +
        'background-size: 16px;' +
        'top: 5px;' +
        'left: 5px;' +
        'z-index: 1;' +
        'cursor: pointer;' +
        '}' +
        'body:not(.fullScreen) div:hover > .'+fb.className+'-feed'+'.sf-feed {' +
        'display: block;' +
        '}' +
        '.'+fb.className+'-feed'+'.sf-feed:active {' +
        'outline: 0;' +
        '}'
      });

      document.head.appendChild(this.style);
    },
    onDlBtnClick: function(e) {
      e.preventDefault();
      e.stopPropagation();

      if (fb.contextMenu && fb.contextMenu.isShow) {
        fb.hideMenu();
        return;
      }

      try {
        var links = JSON.parse(this.dataset.sfDlLinks);
      } catch (e) {
        return;
      }

      var menu = fb.contextMenu = SaveFrom_Utils.popupMenu.quickInsert(this, language.download + ' ...', fb.className+'_popup');

      if (links.id) {
        var id = links.id;
        delete links.id;
        video.requestVideoLinks(id, function(_links, title) {
          var popupMenuLinks;
          if (_links) {
            popupMenuLinks = SaveFrom_Utils.popupMenu.prepareLinks.facebook(_links, title);
          } else {
            popupMenuLinks = video.prepareLinks(links);
          }
          menu.update(popupMenuLinks);
        });
      } else {
        var popupMenuLinks = video.prepareLinks(links);
        menu.update(popupMenuLinks);
      }

      if ([1].indexOf(preference.cohortIndex) !== -1) {
        mono.sendMessage({action: 'trackCohort', category: 'facebook', event: 'click', label: 'video-feed'});
      }
    },
    addDownloadBtn: function(container, links) {
      container.appendChild(mono.create('a', {
        data: {
          sfDlLinks: JSON.stringify(links)
        },
        title: language.download,
        class: [fb.className+'-feed', 'sf-feed'],
        href: '#',
        on: ['click', videoFeed.onDlBtnClick]
      }));
    },
    onLinkHover: function() {
      if (this.dataset.hasSfFeedBtn > 1) {
        return;
      }
      this.dataset.hasSfFeedBtn = '1';

      var onReady = function(links) {
        "use strict";
        if (!links) {
          return;
        }

        if (mono.matches(this, '.uiStreamStory ' + this.tagName) ||
          mono.matches(this, '.fbPhotoSnowliftContainer ' + this.tagName)
        ) {
          videoFeed.addDownloadBtn(this.parentNode, links);
          return;
        }

        var timeLineMainColumn = document.getElementById('pagelet_timeline_main_column')
          || document.getElementById('stream_pagelet')
          || document.getElementById('mainContainer');

        if (timeLineMainColumn && timeLineMainColumn.contains(this)) {
          videoFeed.addDownloadBtn(this.parentNode, links);
          return;
        }
      };

      var videoEl = this;
      if (videoEl.tagName === 'VIDEO') {
        videoEl = videoEl.querySelector('embed') || this;
      }

      if (videoEl.tagName === 'EMBED') {
        video.getLinksFromEmbed(videoEl, onReady.bind(this));
      } else
      if (videoEl.tagName === 'VIDEO') {
        video.getLinksFromVideo(videoEl, onReady.bind(this));
      }
    },
    rmBtn: function() {
      var dataAttr = mono.dataAttr2Selector('hasSfFeedBtn');
      var dataAttrList = document.querySelectorAll('*['+dataAttr+']');
      for (var i = 0, item; item = dataAttrList[i]; i++) {
        item.removeAttribute(dataAttr);
      }
      var btnList = document.querySelectorAll('.'+fb.className+'-feed');
      for (var i = 0, item; item = btnList[i]; i++) {
        item.parentNode.removeChild(item);
      }
    }
  };
}, null, function syncIsActive() {
  "use strict";
  if (mono.isSafari || mono.isGM) {
    if (!mono.checkUrl(document.URL, [
        'http://facebook.com/*',
        'http://*.facebook.com/*',
        'https://facebook.com/*',
        'https://*.facebook.com/*'
      ])) {
      return false;
    }
  }

  if (mono.isIframe()) {
    return false;
  }

  return true;
});