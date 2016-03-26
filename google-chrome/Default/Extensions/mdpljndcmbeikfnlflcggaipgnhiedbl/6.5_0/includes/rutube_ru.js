// ==UserScript==
// @name        rutube.ru downloader
//
// @include     http://rutube.ru/*
// @include     http://*.rutube.ru/*
// @include     https://rutube.ru/*
// @include     https://*.rutube.ru/*
//
// ==/UserScript==

(typeof mono === 'undefined') && (mono = {loadModule: function() {this.loadModuleStack.push(arguments);},loadModuleStack: []});

mono.loadModule('rutube', function(moduleName, initData) {
  "use strict";
  var language = initData.getLanguage;
  var preference = initData.getPreference;
  var moduleState = preference.moduleRutube ? 1 : 0;
  var className = 'sf-dl-btn';

  var frame = mono.isIframe();

  mono.onMessage(function(message, cb){
    if (message.action === 'getModuleInfo') {
      if (message.url !== location.href) return;
      return cb({state: moduleState, moduleName: moduleName});
    }
    if (message.action === 'changeState') {
      if (moduleName !== message.moduleName) {
        return;
      }
      return rutube.changeState(message.state);
    }
    if (!moduleState) {
      return;
    }
    if (message.action === 'updateLinks') {
      return rutube.updateLinks();
    }
  });

  if (moduleState) {
    mono.asyncCall(function() {
      rutube.run();
    });
  }

  var rutube = {
    contextMenu: null,
    lastWaitEl: null,
    videoR: /\/\/[^\/]+\/video\//,
    run: function() {
      moduleState = 1;

      if (frame) {
        return rutube.frame();
      }

      if (SaveFrom_Utils.mutationWatcher.isAvailable()) {
        rutube.mutationMode.enable();
      } else {
        mono.onUrlChange(function (url) {
          if (!this.videoR.test(url)) {
            return;
          }

          this.lastWaitEl && this.lastWaitEl.abort();
          this.lastWaitEl = this.waitEl(function () {
            var container = document.querySelector('.b-video');
            if (container.offsetParent === null) {
              return;
            }
            container = container.querySelector('.b-author .data');
            if (!container) {
              return;
            }
            return container;
          }, function (container) {
            this.insertDlLink(container, url);
          }.bind(this));
        }.bind(this), 1);
      }
    },
    changeState: function(state) {
      moduleState = state;
      this.hideMenu();
      mono.clearUrlChange();
      this.rmDlLinks();
      this.mutationMode.stop();
      if (state) {
        this.run();
      }
    },
    hideMenu: function() {
      if (rutube.contextMenu) {
        rutube.contextMenu.hide();
        rutube.contextMenu = null;
      }
    },
    updateLinks: function() {
      this.changeState(0);
      this.changeState(1);
    },
    rmDlLinks: function() {
      var links = document.querySelectorAll('.' + className);
      for (var i = 0, node; node = links[i]; i++) {
        node.parentNode.removeChild(node);
      }
    },
    insertDlLink: function(container, url) {
      var oldBtnList = container.querySelectorAll('.' + className);
      for (var i = 0, node; node = oldBtnList[i]; i++) {
        node.parentNode.removeChild(node);
      }
      oldBtnList = null;

      url = 'ummy' + url.substr(url.indexOf('://'));
      container.appendChild(mono.create('a', {
        text: language.download,
        href: url,
        class: [className, 'g-solid-link'],
        style: {
          marginLeft: '5px'
        },
        target: '_blank',
        on: ['click', function(e) {
          e.preventDefault();
          e.stopPropagation();

          if (rutube.contextMenu && rutube.contextMenu.isShow) {
            rutube.hideMenu();
            return;
          }

          var links = SaveFrom_Utils.popupMenu.prepareLinks.rutube(this.getAttribute('href'));
          rutube.contextMenu = SaveFrom_Utils.popupMenu.quickInsert(this, links, 'sf-popupMenu');
        }]
      }));
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
    linkPanelShow: null,
    frameBtn: null,
    framePanel: null,
    onFrameOver: function() {
      if (!rutube.frameBtn) {
        return;
      }
      rutube.frameBtn.style.display = 'inline-block';
      if (rutube.linkPanelShow) {
        rutube.framePanel.style.display = 'block';
      }
    },
    onFrameLeave: function() {
      if (!rutube.frameBtn) {
        return;
      }
      rutube.frameBtn.style.display = 'none';
      rutube.framePanel.style.display = 'none';
    },
    frame: function() {
      var linkPanel, hasLinks;
      document.body.appendChild(mono.create(document.createDocumentFragment(), {
        append: [
          rutube.frameBtn = mono.create('a', {
            class: className,
            text: language.download,
            title: language.download,
            href: '#',
            style: {
              position: 'absolute',
              display: 'none',
              right: '50px',
              top: '12px',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              lineHeight: 'normal',
              zIndex: 9999,
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '5px 10px',
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.9)',
              textDecoration: 'none !important'
            },
            on: [
              ['mouseenter', function(e) {
                this.style.background = 'rgba(0, 0, 0, 0.4)';
              }],
              ['mouseleave', function(e) {
                this.style.background = 'rgba(0, 0, 0, 0.3)';
              }],
              ['click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                if (!rutube.linkPanelShow) {
                  linkPanel.style.display = 'block';
                } else {
                  linkPanel.style.display = 'none';
                }
                rutube.linkPanelShow = !rutube.linkPanelShow;

                if (hasLinks) {
                  return;
                }
                hasLinks = !hasLinks;

                linkPanel.appendChild(mono.create('span', {
                  text: language.download + '...'
                }));

                linkPanel.textContent = '';
                var linkList = SaveFrom_Utils.popupMenu.prepareLinks.rutube(location.href);
                mono.create(linkPanel, {
                  class: 'sf-link-panel',
                  append: (function() {
                    var linkElList = [];
                    var linkEl;
                    for (var i = 0, listItem; listItem = linkList[i]; i++) {
                      linkElList.push(linkEl = mono.create('a', {
                        href: listItem.href,
                        style: {
                          marginRight: '15px',
                          marginLeft: '15px'
                        },
                        append: mono.parseTemplate(language.ummyMenuItem)
                      }));
                      var uSpan = linkEl.querySelector('span');
                      var badge = SaveFrom_Utils.popupMenu.createBadge(listItem.uQuality);
                      badge.style.paddingLeft = '1px';
                      badge.style.paddingRight = '1px';
                      badge.style.backgroundColor = 'rgb(115, 115, 115)';
                      linkEl.replaceChild(badge, uSpan);
                      linkEl.appendChild(SaveFrom_Utils.popupMenu.createBadge('ummy'));
                      SaveFrom_Utils.bindFrameUmmyInfo(linkEl, {
                        video: listItem.videoId,
                        vid: 114
                      });
                    }
                    return linkElList;
                  })()
                });
              }]
            ],
            onCreate: function(el) {
              var style = el.getAttribute('style');
              el.setAttribute('style', style + ';' +
                'border-radius: 2px !important;' +
                'border-width: 1px !important;' +
                'border-style: solid !important;' +
                'border-color: rgba(255, 255, 255, 0.35) !important;');
            }
          }),
          rutube.framePanel = linkPanel = mono.create('div', {
            style: {
              position: 'absolute',
              display: 'none',
              top: 0,
              left: 0,
              width: '100%',
              boxSizing: 'border-box',
              height: '50px',
              lineHeight: '50px',
              zIndex: 9998,
              background: 'rgba(0, 0, 0, 0.3)',
              textAlign: 'center',
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.9)',
              textDecoration: 'none !important'
            }
          })
        ]
      }));

      mono.off(document, 'mouseenter', rutube.onFrameOver);
      mono.on(document, 'mouseenter', rutube.onFrameOver);
      mono.off(document, 'mouseleave', rutube.onFrameLeave);
      mono.on(document, 'mouseleave', rutube.onFrameLeave);
    },
    getVideoLink: function(parent) {
      var videoTitle = parent.querySelector('ul.social-likes');
      if (videoTitle && videoTitle.dataset.url) {
        return videoTitle.dataset.url;
      }

      var videoFrame = parent.querySelector('iframe#playlist-frame[src]');
      if (videoFrame && videoFrame.src) {
        var link = videoFrame.src;
        if (link) {
          if (link.substr(0, 2) === '\/\/') {
            link = 'http:' + link;
          }
          return link
        }
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

              var bAuthor = mono.getParentByClass(node, 'b-author');
              var bVideo = mono.getParentByClass(bAuthor, 'b-video');

              var url = rutube.getVideoLink(bVideo);
              var container = bAuthor.querySelector('.data');

              if (container && url) {
                rutube.insertDlLink(container, url);
              }
            }
          },
          queries: [
            {css: '.b-video .b-author div.video-likes-container', is: 'added'}
          ]
        });
      }
    }
  };
}, function isActive(data) {
  "use strict";
  if (!data.getPreference.showUmmyItem) {
    return false;
  }

  return true;
}, function syncIsActive() {
  "use strict";
  if (mono.isSafari || mono.isGM) {
    if (!mono.checkUrl(document.URL, [
        'http://rutube.ru/*',
        'http://*.rutube.ru/*',
        'https://rutube.ru/*',
        'https://*.rutube.ru/*'
      ])) {
      return false;
    }
  }

  if (mono.isIframe()) {
    try {
      if (location.hostname === window.parent.location.hostname) {
        return false;
      }
    } catch(e) {}
  }

  return true;
});