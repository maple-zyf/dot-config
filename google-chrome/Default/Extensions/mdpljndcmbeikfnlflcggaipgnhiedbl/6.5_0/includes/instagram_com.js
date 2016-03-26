// ==UserScript==
// @name        Instagram.com downloader
//
// @include     http://instagram.com/*
// @include     http://*.instagram.com/*
// @include     https://instagram.com/*
// @include     https://*.instagram.com/*
//
// ==/UserScript==

(typeof mono === 'undefined') && (mono = {loadModule: function() {this.loadModuleStack.push(arguments);},loadModuleStack: []});

mono.loadModule('instagram', function(moduleName, initData) {
  var language = initData.getLanguage;
  var preference = initData.getPreference;
  var moduleState = preference.moduleInstagram ? 1 : 0;

  mono.onMessage(function(message, cb){
    if (message.action === 'getModuleInfo') {
      if (message.url !== location.href) return;
      return cb({state: moduleState, moduleName: moduleName});
    }
    if (message.action === 'changeState') {
      if (moduleName !== message.moduleName) {
        return;
      }
      return instagram.changeState(message.state);
    }
    if (!moduleState) {
      return;
    }
    if (message.action === 'updateLinks') {
      return instagram.updateLinks();
    }
  });

  if (moduleState) {
    mono.asyncCall(function() {
      instagram.run();
    });
  }

  var instagram = {
    urlR: /\/\/[^\/]+\.[^\/]+\/p\//,
    lastWaitEl: null,
    dlBtnClassName: 'savefrom-helper--btn',
    styleEl: null,
    run: function() {
      moduleState = 1;

      this.insertStyle();

      if (SaveFrom_Utils.mutationWatcher.isAvailable()) {
        this.mutationMode.enable();
      } else {
        mono.onUrlChange(function (url) {
          if (!this.urlR.test(url)) {
            return;
          }

          this.lastWaitEl && this.lastWaitEl.abort();

          this.lastWaitEl = this.waitEl(function () {
            return document.querySelector(['.-cx-PRIVATE-Post__media', '.Embed']);
          }, function (container) {

            var type = container.classList.contains('Embed') ? 1 : 0;
            this.addDlBtn(container, type);

          }.bind(this));

        }.bind(this), 1);

        mono.off(document, 'mouseenter', this.onMouseEnter, true);
        mono.on(document, 'mouseenter', this.onMouseEnter, true);
      }
    },
    rmStyle: function() {
      this.styleEl && this.styleEl.parentNode && this.styleEl.parentNode.removeChild(this.styleEl);
    },
    insertStyle: function() {
      if (this.styleEl) {
        if (!this.styleEl.parentNode) {
          document.head.appendChild(this.styleEl);
        }
        return;
      }

      var pngDlBtn = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAEZ0FNQQAAsY58+1GTAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAG9JREFUeNpjZEAD5eXl/xnwgM7OTkZkPhMDhWDUgMFgAGNFRUXD////68nSzMjYyHzkyJEDtra2oMThQKrmjo6OBmYQh1RDYJpBbGaYILGGIGtGMYAYQ9A1YxiAzxBsmrEagM0QXJoJAlAUgzA+NQBB9DWbHiRTOAAAAABJRU5ErkJggg==';

      this.styleEl = mono.create('style', {
        text: '.' + this.dlBtnClassName + '{' +
        '  display: none;' +
        '  border: 1px solid #F8F8F8;' +
        '  width: 20px;' +
        '  height: 20px;' +
        '  top: 8px;' +
        '  left: 8px;' +
        '  padding: 0;' +
        '  position: absolute;' +
        '  background: url('+(mono.isOpera ? pngDlBtn : SaveFrom_Utils.svg.getSrc('download', '#777777'))+') center no-repeat #F8F8F8;' +
        '  background-size: 16px;' +
        '  cursor: pointer;' +
        '}' +
        '.Embed .' + this.dlBtnClassName + '{' +
        '  border: 1px solid #B5B5B5;' +
        '  border-radius: 4px;' +
        '  padding: 3px;' +
        '}' +
        '.' + this.dlBtnClassName + ':hover{' +
        '  background: url('+(mono.isOpera ? pngDlBtn : SaveFrom_Utils.svg.getSrc('download', '#3f729b'))+') center no-repeat #F8F8F8;' +
        '  background-size: 16px;' +
        '}' +
        '.' + this.dlBtnClassName + ':active{' +
        '  outline: 0;' +
        '  box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.125);' +
        '}' +
        '*:hover > .' + this.dlBtnClassName + '{' +
        '  display: block;' +
        '}'
      });

      document.head.appendChild(this.styleEl);
    },
    updateLinks: function() {
      this.changeState(0);
      this.changeState(1);
    },
    changeState: function(state) {
      moduleState = state;
      mono.clearUrlChange();
      this.rmDlBtn();
      this.rmStyle();
      this.rmMouseEnterData();
      this.mutationMode.stop();
      if (state) {
        this.run();
      }
    },
    rmDlBtn: function() {
      var btnList = document.querySelectorAll('.' + this.dlBtnClassName);
      for (var i = 0, el; el = btnList[i]; i++) {
        el.parentNode.removeChild(el);
      }
    },
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
    },
    getVideoInfo: function(video) {
      // var poster = video.getAttribute('poster');
      var src = video.getAttribute('src');
      if (typeof src !== 'string') {
        return;
      }

      var ext = 'mp4';
      if (src.indexOf('.flv') !== -1) {
        ext = 'flv';
      }

      var filename = src.match(/\/([^\/?]+)(?:$|\?)/);
      filename = filename && filename[1];
      if (!filename) {
        filename = 'noname.' + ext;
      }
      return {
        filename: filename,
        url: src
      }
    },
    getImageInfo: function(image, isEmbed) {
      var src = null;
      if (isEmbed) {
        src = image.getAttribute('style') || '';
        src = src.match(/'(http[^\']+)/);
        src = src && src[1];
      } else {
        src = image.getAttribute('src');
      }

      if (typeof src !== 'string') {
        return;
      }
      var ext = 'jpg';
      if (src.indexOf('.png') !== -1) {
        ext = 'png';
      }

      var filename = src.match(/\/([^\/?]+)(?:$|\?)/);
      filename = filename && filename[1];
      if (!filename) {
        filename = 'noname.' + ext;
      }
      return {
        filename: filename,
        url: src
      }
    },
    getDbBtnEl: function(videoInfo) {
      return mono.create('a', {
        class: [this.dlBtnClassName],
        href: videoInfo.url,
        download: videoInfo.filename,
        title: language.download,
        style: {
          position: 'absolute',
          zIndex: 100,
          textAlign: 'center'
        },
        on: ['click', function(e) {
          e.stopPropagation();
          SaveFrom_Utils.downloadOnClick(e, undefined, {
            el: this
          });
        }]
      });
    },
    addDlBtn: function(container, type) {
      "use strict";
      var isEmbed = type === 1;

      var oldBtn = container.querySelector('.' + this.dlBtnClassName);
      oldBtn && oldBtn.parentNode.removeChild(oldBtn);
      oldBtn = null;

      var iMedia = container;

      var mediaInfo = null;

      var video = container.querySelector(['div > div > video[src]']);
      if (video) {
        mediaInfo = this.getVideoInfo(video);
      }

      if (!mediaInfo) {
        var image = null;
        if (isEmbed) {
          image = iMedia.querySelector('.EmbedFrame .efImage[style]');
          if (image) {
            mediaInfo = this.getImageInfo(image, 1);
          }
        } else {
          var imageList = [].slice.call(iMedia.querySelectorAll(['div > img[src][data-reactid]']));
          imageList = imageList.filter(function(node) {
            return /^pImage/.test(node.id)
          });
          if (imageList.length) {
            mediaInfo = this.getImageInfo(imageList[0]);
          }
        }
      }

      if (!mediaInfo) {
        return;
      }

      var dlBtn = this.getDbBtnEl(mediaInfo);

      if (isEmbed) {
        var embedFollowButton = document.querySelector('.EmbedFollowButton');
        if (embedFollowButton) {
          var embedFollowButtonSize = SaveFrom_Utils.getSize(embedFollowButton);
          var embedFollowButtonPosition = SaveFrom_Utils.getPosition(embedFollowButton);
          dlBtn.style.right = (embedFollowButtonSize.width + 12) + 'px';
          dlBtn.style.left = 'auto';
          dlBtn.style.top = embedFollowButtonPosition.top + 'px';
          dlBtn.style.display = 'block';
        }
      }

      iMedia.appendChild(dlBtn);
    },
    onMouseEnter: function(e) {
      var el = e.target;
      if (el.nodeType !== 1) {
        return;
      }

      if (!el.classList.contains('-cx-PRIVATE-Post__media') && !el.classList.contains('mediaPhoto')) {
        return;
      }

      if (el.dataset.hasSfBtn === '1') {
        return;
      }
      el.dataset.hasSfBtn = '1';

      instagram.addDlBtn(el, 2);
    },
    rmMouseEnterData: function() {
      var elList = document.querySelectorAll('*[data-has-sf-btn="1"]');
      for (var i = 0, el; el = elList[i]; i++) {
        el.dataset.hasSfBtn = 0;
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

              instagram.addDlBtn(node, 0);
            }

            summary = summaryList[1];
            for (n = 0; node = summary.added[n]; n++) {
              if (node.dataset.sfSkip > 0) {
                continue;
              }
              node.dataset.sfSkip = '1';

              instagram.addDlBtn(node, 1);
            }
          },
          queries: [
            {css: 'div > div > article > header + div', is: 'added'},
            {css: '.Embed', is: 'added'}
          ]
        });
      }
    }
  };
}, null, function syncIsActive() {
  "use strict";
  if (mono.isSafari || mono.isGM) {
    if (!mono.checkUrl(document.URL, [
        'http://instagram.com/*',
        'http://*.instagram.com/*',
        'https://instagram.com/*',
        'https://*.instagram.com/*'
      ])) {
      return false;
    }
  }

  if (mono.isIframe() && !/\/\/[^\/]+\.[^\/]+\/p\//.test(document.URL)) {
    return;
  }

  return true;
});