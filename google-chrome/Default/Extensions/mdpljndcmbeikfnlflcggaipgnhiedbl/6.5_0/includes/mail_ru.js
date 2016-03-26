// ==UserScript==
// @name        my.mail.ru downloader
//
// @include     http://my.mail.ru/*
// @include     https://my.mail.ru/*
// ==/UserScript==

(typeof mono === 'undefined') && (mono = {loadModule: function() {this.loadModuleStack.push(arguments);},loadModuleStack: []});

mono.loadModule('mailru', function(moduleName, initData) {
  "use strict";

  var language = initData.getLanguage;
  var preference = initData.getPreference;
  var moduleState = preference.moduleMailru ? 1 : 0;

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
      return mailru.changeState(message.state);
    }
    if (!moduleState) {
      return;
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
      mailru.run();
    });
  }

  var mailru = {
    contextMenu: null,
    run: function() {
      moduleState = 1;

      audio.injectStyle();
      if (SaveFrom_Utils.mutationWatcher.isAvailable()) {
        this.mutationMode.enable();
      }
    },
    changeState: function(state) {
      moduleState = state;
      audio.rmBtn();
      video.rmBtn();
      this.mutationMode.stop();
      this.hideMenu();
      if (state) {
        this.run();
      }
    },
    hideMenu: function() {
      if (mailru.contextMenu) {
        mailru.contextMenu.hide();
        mailru.contextMenu = null;
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
      wrapAudioOnMouseOver: function(context) {
        mono.off(this, 'mouseenter', context.event);
        if (!moduleState) {
          return;
        }

        if (this.dataset.sfSkip > 0) {
          return;
        }
        this.dataset.sfSkip = '1';

        audio.onTrackOver(this, context.type);
      },
      enable: function() {
        if (this.observer) {
          return this.observer.start();
        }

        this.observer = SaveFrom_Utils.mutationWatcher.run({
          callback: function(summaryList) {
            var summary, n, i, node, context;

            summary = summaryList[0];
            for (n = 0; node = summary.added[n]; n++) {
              context = {};
              context.type = 0;
              context.event = mailru.mutationMode.wrapAudioOnMouseOver.bind(node, context);

              mono.on(node, 'mouseenter', context.event);
            }

            summary = summaryList[1];
            for (n = 0; node = summary.added[n]; n++) {
              context = {};
              context.type = 1;
              context.event = mailru.mutationMode.wrapAudioOnMouseOver.bind(node, context);

              mono.on(node, 'mouseenter', context.event);
            }

            var videoInfo, parent, info;

            for (i = 2; i < 4; i++) {
              summary = summaryList[i];
              for (n = 0; node = summary.added[n]; n++) {
                if (node.dataset.sfSkip > 0) {
                  continue;
                }
                node.dataset.sfSkip = '1';

                videoInfo = video.getVideoId(node);
                if (!videoInfo) {
                  continue;
                }

                parent = mono.getParentByClass(node, 'b-video__left');
                if (!parent) {
                  continue;
                }

                info = parent.querySelector('.b-video__info-time');
                if (!info) {
                  continue;
                }

                video.insertBtnInPopup(videoInfo, info);
              }
            }

            for (i = 4; i < 6; i++) {
              summary = summaryList[i];
              for (n = 0; node = summary.added[n]; n++) {
                if (node.dataset.sfSkip > 0) {
                  continue;
                }
                node.dataset.sfSkip = '1';

                videoInfo = video.getVideoId(node);
                if (!videoInfo) {
                  continue;
                }

                parent = mono.getParentByClass(node, 'sp-video__item-page');
                if (!parent) {
                  continue;
                }

                info = parent.querySelector('.sp-video__item-page__info__additional');
                if (!info) {
                  continue;
                }

                video.insertBtnInPage(videoInfo, info);
              }
            }

            summary = summaryList[6];
            for (n = 0; node = summary.removed[n]; n++) {
              mono.onRemoveListener(node);
            }
          },
          queries: [
            {css: '.jp__track', is: 'added'},
            {css: '.song-item', is: 'added'},
            {css: '.b-video__left .b-video__container object', is: 'added'},
            {css: '.b-video__left .b-video__container video', is: 'added'},
            {css: '.sp-video__item-page .sp-video__item-page__video-wrapper object', is: 'added'},
            {css: '.sp-video__item-page .sp-video__item-page__video-wrapper video', is: 'added'},
            {css: '.' + mono.onRemoveClassName, is: 'removed'}
          ]
        });
      }
    }
  };

  var tooltip = {
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
            whiteSpace: 'nowrap',
            fontSize: '12px',
            color: '#111',
            fontFamily: 'arial, verdana, sans-serif, Lucida Sans'
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
  };

  var getFolderName = function () {
    var folderName = document.title;
    var sep = folderName.indexOf('-');
    if (sep !== -1) {
      folderName = folderName.substr(0, sep -1);
    }

    return mono.fileName.modify(folderName);
  };

  var audio = {
    className: 'sf-audio-panel',
    lastRow: null,
    style: undefined,
    secondsFromDuration: function(time) {
      var minSec = time.split(':').map(function(item) {
        return parseInt(item);
      });
      return minSec[0] * 60 + minSec[1];
    },
    getTitle: function(row) {
      var title = row.querySelector('.jp__track-fullname');
      var artist = row.querySelector('.jp__track-performer');
      if (artist === null) {
        artist = row.querySelector('.jp__track-name-text');
        if (artist !== null) {
          artist = artist.querySelector('a:not(.jp__track-fullname)');
          if (artist !== null) {
            var tmp = title;
            title = artist;
            artist = tmp;
          }
        }
      }
      if (artist !== null) {
        artist = artist.textContent.trim();
        if (!artist) {
          artist = 'noname';
        }
      } else {
        artist = '';
      }
      if (artist) {
        artist = artist + ' - ';
      } else {
        artist = '';
      }
      if (title === null) {
        return;
      }
      title = title.textContent;
      var fullName =  artist + title;
      fullName = fullName.replace(/[\r\n\t\s]+/img, ' ').replace(/\s+/g, ' ').trim();
      return fullName;
    },
    getTitle2: function(row) {
      var title = row.querySelector('.title');
      var name = row.querySelector('.name');
      var author = row.querySelector('.author');
      if (name) {
        name = name.textContent;
        if (!name.length) {
          name = 'noname';
        }
      }
      if (author) {
        author = author.textContent;
      }
      var fullName = '';
      if (name && author) {
        fullName = author + ' - ' + name;
      } else {
        fullName = title.textContent;
      }
      fullName = fullName.replace(/[\r\n\t\s]+/img, ' ').replace(/\s+/g, ' ').trim();
      return fullName;
    },
    getMp3UrlList: function(cb) {
      var type = 1;
      var rowList = document.querySelectorAll('.song-item');
      if (rowList.length === 0) {
        rowList = document.querySelectorAll('.jp__track');
        type = 0;
      }
      var waitCount = rowList.length;
      var readyCount = 0;
      var urlList = [];
      var dblList = {};
      var isReady = function() {
        if (waitCount === readyCount) {
          cb(urlList);
        }
      };
      if (waitCount === readyCount) {
        return isReady();
      }
      for (var i = 0, row; row = rowList[i]; i++) {
        audio.getUrl(row, type, function(url) {
          readyCount++;
          if (!url) {
            return isReady();
          }
          if (dblList[url]) {
            return isReady();
          }
          dblList[url] = 1;

          var durationNode;
          var fullTitle;
          if(type === 0) {
            durationNode = row.querySelector('.jp__track-duration-total');
            fullTitle = audio.getTitle(row);
            if (!fullTitle) {
              return isReady();
            }
          } else {
            durationNode = row.querySelector('.time');
            fullTitle = audio.getTitle2(row);
            if (!fullTitle) {
              return isReady();
            }
          }
          var filename = mono.fileName.modify(fullTitle) + '.mp3';
          var duration = durationNode && audio.secondsFromDuration(durationNode.textContent);
          urlList.push({url: url, filename: filename, title: fullTitle, duration: duration});
          isReady();
        });
      }
    },
    showListOfAudioFiles: function(isPlaylist) {
      audio.getMp3UrlList(function(list) {
        if(list.length === 0) {
          return;
        }
        if (isPlaylist) {
          SaveFrom_Utils.playlist.popupPlaylist(list, getFolderName(), true);
        } else {
          SaveFrom_Utils.playlist.popupFilelist(list);
        }
      });
    },
    downloadMP3Files: function() {
      audio.getMp3UrlList(function(list) {
        if(list.length === 0) {
          return;
        }
        SaveFrom_Utils.downloadList.showBeforeDownloadPopup(list, {
          type: 'audio',
          folderName: getFolderName()
        });
      });
    },
    onDlBtnOver: function(e) {
      if (mono.isOpera || mono.isSafari) {
        return;
      }
      var duration = this.dataset.duration;
      if (e.type === 'mouseenter') {
        var _this = this;
        var options = undefined;
        var ttp = tooltip.show(_this, options = {
          top: -14,
          width: 16,
          style: {
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            color: 'rgb(48, 48, 48)'
          }
        });

        if (_this.dataset.bitrate) {
          ttp.style.padding = '2px 5px 3px';
          ttp.textContent = ' (' + _this.dataset.size + ' ~ ' + _this.dataset.bitrate + ')';
          return;
        }

        if (_this.dataset.size) {
          ttp.style.padding = '2px 5px 3px';
          ttp.textContent = ' (' + _this.dataset.size + ')';
          return;
        }

        ttp.style.padding = '2px 2px 0 2px';
        ttp.textContent = '';
        ttp.appendChild(mono.create('img', {
          src: '//my9.imgsmail.ru/r/my/preloader_circle_16.gif',
          height: 16,
          width: 16
        }));

        mono.sendMessage({action: 'getFileSize', url: _this.href}, function(response) {
          ttp.style.padding = '2px 5px 3px';
          if (!response.fileSize) {
            ttp.textContent = language.getFileSizeFailTitle;
            tooltip.updatePos(_this, options);
            return;
          }
          var size = SaveFrom_Utils.sizeHuman(response.fileSize, 2);

          if (duration) {
            var bitrate = Math.floor((response.fileSize / duration) / 125) + ' ' + language.kbps;

            _this.dataset.bitrate = bitrate;
            _this.dataset.size = size;

            ttp.textContent = ' (' + size + ' ~ ' + bitrate + ')';
          } else {
            _this.dataset.size = size;

            ttp.textContent = ' (' + size + ')';
          }

          tooltip.updatePos(_this, options);
        });
        return;
      }
      // mouseleave
      tooltip.hide();
    },
    getUrlViaBridge: function(row, cb) {
      if (audio.getUrlViaBridge.index === undefined) {
        audio.getUrlViaBridge.index = 0;
      }

      var className = 'sf-bridge-item-'+audio.getUrlViaBridge.index;
      audio.getUrlViaBridge.index++;
      row.classList.add(className);

      SaveFrom_Utils.bridge({
        args: [{
          className: className
        }],
        func: function(data, cb) {
          var className = data.className;
          var el = document.getElementsByClassName(className)[0];
          el.classList.remove(className);

          var $data = jQuery(el).data();
          if ($data && $data.item) {
            cb($data.item.url);
          }
        },
        cb: function(data) {
          cb(data);
        },
        timeout: 300
      });
    },
    getUrl: function(row, rowType, cb) {
      var url = row.dataset.url;
      if (url) {
        return cb(url);
      }
      if (rowType === 0) {
        var urlLink = row.querySelector('a.jp__track-fullname-link');
        if (urlLink === null) {
          return cb();
        }
        urlLink = urlLink.href;
        var params = mono.parseUrlParams(urlLink);
        if (params.file === undefined || params.uid === undefined) {
          return audio.getUrlViaBridge(row, function(url) {
            if (url) {
              row.dataset.url = url;
            }
            cb(url);
          });
        }
        return cb('http://music.my.mail.ru/file/' + params.file + '.mp3?u=' + params.uid);
      } else
      if (rowType === 1) {
        if (row.dataset.file) {
          return cb('http://music.my.mail.ru/file/' + row.dataset.file + '.mp3');
        }
        return cb();
      }
    },
    onDlBtnClick: function(e) {
      e.stopPropagation();
      SaveFrom_Utils.downloadOnClick(e);

      if ([1].indexOf(preference.cohortIndex) !== -1) {
        mono.sendMessage({action: 'trackCohort', category: 'my.mail.ru', event: 'click', label: 'music-audio'});
      }
    },
    getDlLink: function(url, duration, fullTitle) {
      return mono.create('a', {
        data: {
          duration: duration || ''
        },
        href: url,
        style: {
          position: 'relative',
          display: 'inline-block',
          width: '16px',
          height: '16px',
          verticalAlign: 'middle'
        },
        download: mono.fileName.modify(fullTitle + '.mp3'),
        on: [
          ['mouseenter', audio.onDlBtnOver],
          ['mouseleave', audio.onDlBtnOver],
          ['click', this.onDlBtnClick]
        ]
      });
    },
    addDownloadPanelNew: function(row, url) {
      if (!url) {
        return;
      }
      var fullTitle = audio.getTitle2(row);
      if (!fullTitle) {
        return;
      }
      var timeEl = row.querySelector('.time');
      var duration = timeEl && audio.secondsFromDuration(timeEl.textContent);

      var dlPanel = mono.create('div', {
        class: [audio.className, 'type-2'],
        append: [
          this.getDlLink(url, duration, fullTitle)
        ]
      });

      var iconsEl = row.querySelector('.icons');
      if (iconsEl) {
        iconsEl.appendChild(dlPanel);
      }
    },
    addDownloadPanel: function(row, url) {
      var duration = row.querySelector('.jp__track-duration-total');
      if (duration === null || url === undefined) {
        return;
      }
      var fullTitle = audio.getTitle(row);
      if (!fullTitle) {
        return;
      }
      duration = audio.secondsFromDuration(duration.textContent);

      var dlPanel = mono.create('div', {
        class: [audio.className, 'type-0'],
        append: [
          this.getDlLink(url, duration, fullTitle)
        ]
      });

      var container = row.querySelector('.jp__track-management');
      if (!container) {
        return;
      }

      if (container.firstChild) {
        container.insertBefore(dlPanel, container.firstChild);
      } else {
        container.appendChild(dlPanel);
      }
    },
    onTrackOver: function(row, rowType) {
      if (row.getElementsByClassName(audio.className).length !== 0) {
        return;
      }

      audio.getUrl(row, rowType, function(url) {
        if (rowType === 1) {
          audio.addDownloadPanelNew(row, url);
        } else {
          audio.addDownloadPanel(row, url);
        }
      });
    },
    onMouseOver: function(e) {
      var node = e.target;
      if (node.nodeType !== 1) {
        return;
      }
      var rowType = 0;
      var row = null;

      if (node.classList.contains('jp__track')) {
        row = node;
      } else
      if (node.classList.contains('song')) {
        if (!node.parentNode.classList.contains('b-music-songs')) {
          node = null;
        }
        rowType = 1;
        row = node;
      }

      if (row === null) {
        return;
      }

      audio.onTrackOver(row, rowType);
    },
    injectStyle: function() {
      if (this.style) {
        if (!this.style.parentNode) {
          document.head.appendChild(this.style);
        }
        return;
      }

      this.style = mono.create('style', {
        text: '' +
        '.' + this.className + '{' +
        'display: none;' +
        'left: 22px;' +
        'background-image: url(' + SaveFrom_Utils.svg.getSrc('download', '#168DE2') + ');' +
        'background-repeat: no-repeat;' +
        'background-position: center;' +
        'background-size: 16px;' +
        '}' +
        '.jp__track:hover .' + this.className + '{' +
        'display: block;' +
        'opacity: 0.5;' +
        '}' +
        '.jp__track:hover .' + this.className + '.type-0 {' +
        'display: inline-block;' +
        'margin-left: -16px;' +
        'position: relative;' +
        'left: -2px;' +
        '}' +
        '.jp__track.jp__track-plays .' + this.className + '{' +
        'left: -18px;' +
        '}' +
        '.' + this.className + ':hover {' +
        'opacity: 1 !important;' +
        '}' +
        '.' + this.className + '.type-2' + '{' +
        'margin-right: 5px;' +
        'margin-left: 5px;' +
        '}' +
        '.song-item:hover .' + this.className + '.type-2' + '{' +
        'display: inline-block;' +
        'opacity: 0.5;' +
        '}' +
        ''
      });

      document.head.appendChild(this.style);
    },
    rmBtn: function() {
      if (audio.style) {
        audio.style.parentNode.removeChild(audio.style);
        audio.style = undefined;
      }
      var btnList = document.querySelectorAll('.'+audio.className);
      for (var i = 0, item; item = btnList[i]; i++) {
        item.parentNode.removeChild(item);
      }
    }
  };

  var video = {
    btnIndex: 0,
    domCache: {},
    className: 'sf-video-btn',

    prepareLinks: function(links) {
      var menuLinks = [];
      for (var i = 0, link; link = links[i]; i++) {
        var url = link.url;
        var format = 'FLV';
        if (url.indexOf('.mp4') !== -1) {
          format = 'MP4';
        }
        if (url.indexOf('.mov') !== -1) {
          format = 'MOV';
        }
        if (url.indexOf('.mpg') !== -1) {
          format = 'MPG';
        }
        if (!link.quality) {
          link.quality = '-?-';
        }
        var quality = link.quality.toUpperCase();

        var qList = ['1080P', '720P', '480P', '360P', '272P'];
        var tList = ['1080', '720', '480', '360', '272'];

        var qPos = qList.indexOf(quality);
        if (qPos !== -1) {
          quality = tList[qPos];
        }

        var ext = format.toLowerCase();
        var popupLink = { href: url, title: link.title, ext: ext, format: format, quality: quality, forceDownload: true, noSize: true };
        menuLinks.push(popupLink);
      }
      if (menuLinks.length === 0) {
        return;
      }
      return menuLinks;
    },

    showLinkList: function(links, button, isUpdate) {
      if (!links) {
        links = language.noLinksFound;
      }

      if (isUpdate) {
        if (!mailru.contextMenu) {
          return;
        }
        mailru.contextMenu.update(links);
        return;
      }

      if (mailru.contextMenu && mailru.contextMenu.isShow) {
        mailru.hideMenu();
        return;
      }
      mailru.contextMenu = SaveFrom_Utils.popupMenu.quickInsert(button, links, 'video-links-popup', {
        parent: mono.getParentByClass(button, 'b-video__main')
      });
    },

    appendPageBtn: function(container, btnIndex) {
      var exBtn = container.querySelector('.'+video.className);
      if (exBtn !== null) {
        return;
      }

      var child = container.lastChild;
      var style = {};
      style.marginLeft = '15px';

      var  btn = mono.create('span', {
        class: video.className,
        append: [
          mono.create('a', {
            data: {
              index: btnIndex
            },
            text: language.download,
            href: '#',
            on: ['click', function(e) {
              e.preventDefault();

              mono.onRemoveEvent(this, mailru.hideMenu);

              video.readDomCache(this.dataset.index, this);

              if ([1].indexOf(preference.cohortIndex) !== -1) {
                mono.sendMessage({action: 'trackCohort', category: 'my.mail.ru', event: 'click', label: 'video'});
              }
            }],
            style: style
          })
        ]
      });

      container.insertBefore(btn, child);

      child = null;
    },

    appendBtn: function(container, btnIndex) {
      var exBtn = container.querySelector('.'+video.className);
      if (exBtn !== null) {
        return;
      }

      var child = undefined;
      var style = {};
      if (container.childNodes.length > 1) {
        child = container.childNodes[1];
      } else {
        child = container.lastChild;
        style.marginRight = '5px';
      }

      var btn = mono.create('span', {
        class: container.lastChild.getAttribute('class')+' '+video.className,
        append: [
          mono.create('a', {
            data: {
              index: btnIndex
            },
            text: language.download,
            href: '#',
            on: ['click', function(e) {
              e.preventDefault();

              mono.onRemoveEvent(this, mailru.hideMenu);

              video.readDomCache(this.dataset.index, this);

              if ([1].indexOf(preference.cohortIndex) !== -1) {
                mono.sendMessage({action: 'trackCohort', category: 'my.mail.ru', event: 'click', label: 'video'});
              }
            }],
            style: style
          })
        ]
      });

      container.insertBefore(btn, child);
      child = null;
    },

    readDomCache: function(index, button) {
      video.showLinkList(language.download, button);

      var abort = function() {
        video.showLinkList(undefined, button, 1)
      };

      var showLinks = function(response) {
        if (response.action === 'getRutubeLinks') {
          if (!preference.showUmmyItem) {
            return abort();
          }
          video.showLinkList(SaveFrom_Utils.popupMenu.prepareLinks.rutube(response.links), button, 1);
        } else {
          video.showLinkList(video.prepareLinks(response.links), button, 1);
        }
      };

      var cacheItem = video.domCache[parseInt(index)];
      if (cacheItem.links) {
        showLinks(cacheItem);
        return;
      }
      if (cacheItem.metadataUrl) {
        var metadataUrl = cacheItem.metadataUrl;
        if (/^\/\//.test(metadataUrl)) {
          metadataUrl = 'http:' + metadataUrl;
        }
        var onResponse = function(data) {
          if (!data || typeof data === 'string') {
            return abort();
          }
          video.readMeta(data, function(response) {
            if (!response.links) {
              return abort();
            }
            cacheItem.links = response.links;
            cacheItem.action = response.action;

            showLinks(cacheItem);
          });
        };

        if (mono.isOpera) {
          mono.request({
            url: metadataUrl,
            withCredentials: true,
            json: true,
            localXHR: true
          }, function(err, resp) {
            if (err) {
              return onResponse();
            }

            onResponse(resp.body);
          });
          return;
        }
        mono.sendMessage({action: 'getOkMetadata', url: metadataUrl}, onResponse);
        return;
      }
      abort();
    },

    readMeta: function(metadata, cb) {
      var links = [], title;
      if (metadata.provider === 'UPLOADED') {
        title = metadata.movie?metadata.movie.title:undefined;
        if (!metadata.videos) {
          return cb();
        }
        metadata.videos.forEach(function(item) {
          links.push({
            quality: item.name,
            url: item.url,
            title: title
          });
        });
      }
      if (metadata.provider === 'ugc') {
        title = metadata.meta?metadata.meta.title:undefined;
        if (!metadata.videos) {
          return cb();
        }
        metadata.videos.forEach(function(item) {
          links.push({
            quality: item.key,
            url: item.url,
            title: title
          });
        });
      }
      if (metadata.provider === 'pladform') {
        title = metadata.meta?metadata.meta.title:undefined;
        mono.sendMessage({
          action: 'getPladformVideo',
          extVideoId: {
            playerId: metadata.meta.playerId,
            videoId: metadata.meta.videoId
          }
        }, function(response) {
          if (!response) {
            return cb();
          }

          var links = response.links;
          if (!links) {
            return cb();
          }

          links.forEach(function(item) {
            if (typeof item !== 'object') {
              return;
            }

            if (item.title === undefined) {
              item.title = title
            }
          });

          cb(response);
        });
        return;
      }
      if (links.length === 0) {
        return cb();
      }
      return cb({links: links});
    },

    getFlashVars: function(videoObj) {
      if (!videoObj) {
        return;
      }

      var flashvars = videoObj.querySelector('param[name="flashvars"]');
      if (!flashvars) {
        return;
      }

      var value = flashvars.value;
      var url = mono.parseUrlParams(value, {
        argsOnly: 1,
        forceSep: '&'
      });

      if (url.metadataUrl) {
        return {
          metadataUrl: decodeURIComponent(url.metadataUrl)
        };
      }
    },

    matchUrl: function(url) {
      var linkR = /\/([^\/]+)\/([^\/]+)\/video\/(.+).html/;
      var embedR = /embed\/([^\/]+)\/([^\/]+)\/(.+).html/;

      var r = url.match(linkR);
      if (!r) {
        r = url.match(embedR);
      }

      return r;
    },

    getVideoId: function(player) {
      if (player.tagName !== 'OBJECT') {
        player = player.querySelector('object[name="b-video-player"]');
      }

      var videoObj = this.getFlashVars(player);
      if (videoObj) {
        return videoObj;
      }

      var albumJson = document.querySelector('[data-type="album-json"]');
      if (albumJson) {
        try {
          albumJson = JSON.parse(albumJson.textContent);
          if (albumJson.signVideoUrl) {
            return {
              metadataUrl: albumJson.signVideoUrl
            };
          }
        } catch(e) {}
      }

      var videoId = this.matchUrl(location.pathname);

      if (videoId) {
        return {
          metadataUrl: 'http://api.video.mail.ru/videos/' + videoId[1] + '/' + videoId[2] + '/' + videoId[3] + '.json'
        };
      }
    },

    insertBtnInPage: function(videoInfo, info) {
      if (videoInfo.metadataUrl) {
        videoInfo.metadataUrl = decodeURIComponent(videoInfo.metadataUrl);
        video.domCache[video.btnIndex] = {
          metadataUrl: videoInfo.metadataUrl
        };
      }

      video.appendPageBtn(info, video.btnIndex);

      video.btnIndex++;
    },
    insertBtnInPopup: function(videoInfo, info) {
      if (videoInfo.metadataUrl) {
        videoInfo.metadataUrl = decodeURIComponent(videoInfo.metadataUrl);
        video.domCache[video.btnIndex] = {
          metadataUrl: videoInfo.metadataUrl
        };
      }

      video.appendBtn(info, video.btnIndex);

      video.btnIndex++;
    },
    rmBtn: function() {
      var btnList = document.querySelectorAll('.'+video.className);
      for (var i = 0, item; item = btnList[i]; i++) {
        item.parentNode.removeChild(item);
      }
    }
  };
}, null, function syncIsActive() {
  "use strict";
  if (mono.isSafari || mono.isGM) {
    if (!mono.checkUrl(document.URL, [
        'http://my.mail.ru/*',
        'https://my.mail.ru/*'
      ])) {
      return false;
    }
  }

  if (mono.isIframe()) {
    return false;
  }

  return true;
});