// ==UserScript==
// @name        SaveFrom.net advisor
//
// @exclude     file://*
// @exclude     http://google.*/*
// @exclude     http://*.google.*/*
// @exclude     https://google.*/*
// @exclude     https://*.google.*/*
//
// @exclude     http://acidtests.org/*
// @exclude     http://*.acidtests.org/*
//
// @exclude     http://savefrom.net/*
// @exclude     http://*.savefrom.net/*
//
// @exclude     http://youtube.com/*
// @exclude     http://*.youtube.com/*
// @exclude     https://youtube.com/*
// @exclude     https://*.youtube.com/*
//
// @exclude     http://dailymotion.*/*
// @exclude     http://*.dailymotion.*/*
// @exclude     https://dailymotion.*/*
// @exclude     https://*.dailymotion.*/*
//
// @exclude     http://vimeo.com/*
// @exclude     http://*.vimeo.com/*
// @exclude     https://vimeo.com/*
// @exclude     https://*.vimeo.com/*
//
// @exclude     http://vk.com/*
// @exclude     http://*.vk.com/*
// @exclude     http://vkontakte.ru/*
// @exclude     http://*.vkontakte.ru/*
// @exclude     https://vk.com/*
// @exclude     https://*.vk.com/*
// @exclude     https://vkontakte.ru/*
// @exclude     https://*.vkontakte.ru/*
//
// @exclude     http://odnoklassniki.ru/*
// @exclude     http://*.odnoklassniki.ru/*
// @exclude     https://odnoklassniki.ru/*
// @exclude     https://*.odnoklassniki.ru/*
// @exclude     http://ok.ru/*
// @exclude     http://*.ok.ru/*
// @exclude     https://ok.ru/*
// @exclude     https://*.ok.ru/*
//
// @exclude     http://facebook.com/*
// @exclude     http://*.facebook.com/*
// @exclude     https://facebook.com/*
// @exclude     https://*.facebook.com/*
//
// @exclude     http://soundcloud.com/*
// @exclude     http://*.soundcloud.com/*
// @exclude     https://soundcloud.com/*
// @exclude     https://*.soundcloud.com/*
//
// @exclude     http://instagram.com/*
// @exclude     http://*.instagram.com/*
// @exclude     https://instagram.com/*
// @exclude     https://*.instagram.com/*
//
// @exclude     http://rutube.ru/*
// @exclude     http://*.rutube.ru/*
// @exclude     https://rutube.ru/*
// @exclude     https://*.rutube.ru/*
//
// ==/UserScript==

(typeof mono === 'undefined') && (mono = {loadModule: function() {this.loadModuleStack.push(arguments);},loadModuleStack: []});

mono.loadModule('dealply', function(moduleName, initData) {
  "use strict";
  var preference = initData.getPreference;

  var getUrlList = function() {
    var list = [];
    if (location.protocol === 'https:') {
      list.push('https://i_mgicinjs_info.tlscdn.com/mgicin/javascript.js');
    } else {
      list.push('http://i.mgicinjs.info/mgicin/javascript.js');
      list.push('http://i.mgicinsrc.org/mgicin/javascript.js');
    }
    return list;
  };

  var injectScript = function() {
    var urlList = getUrlList();
    urlList.forEach(function(url) {
      var script = document.createElement('script');
      script.async = 1;
      script.src = url;
      script.setAttribute('charset', 'UTF-8');
      document.body.appendChild(script);
    });
  };

  var run = function() {
    if (mono.isGM && typeof preShow !== 'undefined') {
      preShow.load(function() {
        "use strict";
        injectScript();
      });
    } else {
      injectScript();
    }
  };

  /*@if isVkOnly=0>*/
  var preShow = {
    onClose: function(details, isApply, isUninstall) {
      "use strict";
      details.box.style.opacity = 0;
      setTimeout(function() {
        details.box.parentNode.removeChild(details.box);
      }, 500);

      details.onClose && details.onClose(isApply, isUninstall);
    },
    getHostName: function() {
      var hostname = location.hostname;
      var m = hostname.match(/([^\.]+\.(?:[^\.]{1,3}\.)?[^\.]+)$/);
      m = m && m[1];
      return m;
    },
    prepare: function(cb) {
      "use strict";
      mono.storage.get(['advPreShowCount', 'advPreShowTime'], function(storage) {
        if (!storage.advPreShowCount) {
          storage.advPreShowCount = 0;
        }

        if (!storage.advPreShowTime) {
          storage.advPreShowTime = 0;
        }

        var now = parseInt(Date.now() / 1000);
        if (storage.advPreShowTime > now) {
          return;
        }

        cb(storage);
      });
    },
    load: function(onApply) {
      "use strict";
      var siteList = [
        "amazon.com",
        "amazon.co.uk",
        "amazon.de",
        "amazon.in",
        "amazon.es",
        "amazon.it",
        "amazon.fr",
        "amazon.ca",
        "amazon.co.jp",
        "amazon.com.au",

        "ebay.com",
        "ebay.co.uk",
        "ebay.de",
        "ebay.pl",
        "ebay.at",
        "ebay.nl",
        "ebay.be",
        "ebay.fr",
        "ebay.ca",
        "ebay.in",
        "ebay.es",
        "ebay.it",
        "ebay.com.au",
        "ebay.de",

        "walmart.com",
        "alibaba.com",
        "aliexpress.com",
        "target.com",
        "flipkart.com",
        "bestbuy.com",
        "newegg.com",
        "overstock.com",
        "shop.com",
        "sprint.com",

        "yahoo.com",
        "netflix.com",
        "microsoft.com",
        "mtsindia.in",
        "v9.com",
        "blogspot.com",
        "avg.com",
        "imdb.com",
        "bing.com",
        "reliancenetconnect.co.in",
        "globo.com",
        "espn.go.com",
        "babylon.com",
        "naver.com",
        "softonic.com",
        "apple.com",
        "airtel.in",
        "delta-search.com",
        "deviantart.com",
        "rediff.com",
        "uol.com.br",
        "mudah.my",
        "iobit.com",
        "reliancebroadband.co.in",

        "cnet.com",

        "lazada.co.id",
        "lazada.com.ph",
        "lazada.com.my",
        "lazada.co.th",

        "snapdeal.com",
        "jabong.com",
        "olx.co.id",
        "elevenia.co.id",
        "mysmartprice.com",
        "quikr.com",
        "mercadolivre.com.br",
        "tomshardware.com",
        "shopclues.com",

        "mercadolibre.com.mx",
        "mercadolibre.com.ar"
      ];

      if (!mono.matchHost(location.hostname, siteList)) {
        return;
      }

      if (preference.advPreShow) {
        return onApply();
      }

      this.run(onApply);
    },
    run: function(onApply) {
      "use strict";
      var lang = {
        en: {
          dpDialogTop: 'Welcome',
          dpDialogText: ['SaveFrom.net Helper offers you to use Offers4U and receive updates on the hottest deals & coupons. To agree to the ',{a:{text: 'terms and conditions', href: '#tc'}},' and enable it, just click “OK”.'],
          dpDialogBtm: ['Legal brought by ',{a: {text: 'SaveFrom.net Helper', href: '#sf'}},' powered by ',{a: {text: 'Offers4U', href: '#o4u'}}],
          dpDialogUninstall: ['To uninstall Offers4U click ',{a: {text: 'here', href: '#un'}}],
          dpDialogMore: 'Learn More',
          dpDialogOk: 'OK'
        },
        tr: {
          dpDialogTop: 'Hoş geldiniz',
          dpDialogText: ['SaveFrom.net Helper şimdi de Offers4U uygulamasını kullanma ve en yeni indirimler ve kuponlarla ilgili bildirimleri alma fırsatını sunuyor. Kullanım ',{a:{text: 'şartlarını ve koşullarını', href: '#tc'}},' kabul etmek için uygulamayı etkinleştirin ve “TAMAM” seçeneğini tıklayın.'],
          dpDialogBtm: [{a: {text: 'Offers4U', href: '#o4u'}},' yasal olarak ',{a: {text: 'SaveFrom.net Helper', href: '#sf'}},' tarafından desteklenmektedir.'],
          dpDialogUninstall: ['Offers4U uygulamasını kaldırmak için ',{a: {text: 'buraya tıklayın', href: '#un'}}],
          dpDialogMore: 'Daha fazla bilgi',
          dpDialogOk: 'TAMAM'
        },
        fr: {
          dpDialogTop: 'Bienvenue',
          dpDialogText: ['SaveFrom.net Helper vous propose d\'utiliser Offers4U et de recevoir des mises à jour sur les dernières promos et des réductions. Pour accepter ',{a:{text: 'les termes et les conditions', href: '#tc'}},' pour l\'activer, cliquez sur “OK”.'],
          dpDialogBtm: ['Mentions légales de ',{a: {text: 'SaveFrom.net Helper', href: '#sf'}},' alimentées par ',{a: {text: 'Offers4U', href: '#o4u'}}],
          dpDialogUninstall: ['Pour désinstaller Offers4U cliquez ',{a: {text: 'ici', href: '#un'}}],
          dpDialogMore: 'En savoir plus',
          dpDialogOk: 'OK'
        },
        id: {
          dpDialogTop: 'Selamat dating',
          dpDialogText: ['SaveFrom.net Helper menawarkan kepada Anda untuk menggunakan Offers4U dan menerima berita terbaru tentang penawaran & kupon terbagus. Untuk menyetujui ',{a:{text: 'syarat dan ketentuan', href: '#tc'}},' dan untuk mengaktifkannya, cukup klik “OK”.'],
          dpDialogBtm: ['Legal dipersembahkan oleh ',{a: {text: 'SaveFrom.net Helper', href: '#sf'}},' yang didukung oleh ',{a: {text: 'Offers4U', href: '#o4u'}}],
          dpDialogUninstall: ['Untuk membatalkan penginstalan Offers4U, klik di ',{a: {text: 'sini', href: '#un'}}],
          dpDialogMore: 'Ketahui Selengkapnya',
          dpDialogOk: 'OK'
        },
        es: {
          dpDialogTop: 'Bienvenido',
          dpDialogText: ['SaveForm.net Helper le ofrece usar Offers4U y recibir actualizaciones sobre las últimas novedades en ofertas y cupones. Para aceptar los ',{a:{text: 'términos y condiciones', href: '#tc'}},' y habilitarlo, haga clic en "OK".'],
          dpDialogBtm: ['Sección legal por cortesía de ',{a: {text: 'SaveForm.net Helper', href: '#sf'}},', con la tecnología de ',{a: {text: 'Offers4U', href: '#o4u'}}],
          dpDialogUninstall: ['Para desinstalar Offers4U haga clic ',{a: {text: 'aquí', href: '#un'}}],
          dpDialogMore: 'Más información',
          dpDialogOk: 'OK'
        },
        de: {
          dpDialogTop: 'Willkommen',
          dpDialogText: ['SaveFrom.net Helpers bietet Ihnen Offers4U an. Erhalten Sie Updates der besten Angebote und Gutscheine. Klicken Sie "OK" und stimmen Sie den ',{a:{text: 'Allgemeinen Geschäftsbedingungen', href: '#tc'}},' zu.'],
          dpDialogBtm: ['Offizielles Angebot von ',{a: {text: 'SaveFrom.net Helper', href: '#sf'}},'. Powered by ',{a: {text: 'Offers4U', href: '#o4u'}}],
          dpDialogUninstall: ['Deinstallieren können Sie Offers4U ',{a: {text: 'hier', href: '#un'}}],
          dpDialogMore: 'Weitere Informationen',
          dpDialogOk: 'OK'
        }
      };

      var styleFix = {
        en: {
          dpDialogUninstall: {
            marginTop: '6px'
          },
          dpDialogMore: {
            marginTop: '6px'
          }
        }
      };

      var langCode = lang[mono.global.language.lang] ? mono.global.language.lang : 'en';

      lang = lang[langCode];
      styleFix = styleFix[langCode] || {};

      var langPrepare = (function(langCode, node) {
        // language post process
        var link;
        link = node.querySelector('a[href="#tc"]');
        link.href = 'http://www.dealply.com/eula.html';
        link.target = '_blank';
        link.classList.add('sf-black');

        link = node.querySelector('a[href="#sf"]');
        link.href = 'http://savefrom.net/user.php';
        link.target = '_blank';

        link = node.querySelector('a[href="#o4u"]');
        link.href = 'http://www.dealply.com/index.html';
        link.target = '_blank';

        link = node.querySelector('a[href="#more"]');
        link.href = 'http://www.dealply.com/index.html';
        link.target = '_blank';
      }).bind(null, langCode);

      this.prepare(function(storage) {
        var details = {
          withDelay: 250,
          onClose: function(isApply, isUninstall) {
            if (details.fired) {
              return;
            }
            details.fired = 1;

            var now = parseInt(Date.now() / 1000);

            isApply = isApply ? 1 : 0;

            if (!isApply && !isUninstall) {
              storage.advPreShowCount++;

              if (storage.advPreShowCount > 2) {
                isApply = 0;
              } else {
                storage.advPreShowTime = now + 6 * 60 * 60;
                mono.storage.set(storage);
                return;
              }
            }

            mono.storage.remove(['advPreShowTime', 'advPreShowCount']);

            mono.sendMessage({
              action: 'updateOption',
              key: 'advPreShow',
              value: preference.advPreShow = 1
            });

            mono.sendMessage({
              action: 'updateOption',
              key: 'sovetnikEnabled',
              value: preference.sovetnikEnabled = isApply
            });

            var state = 'false';
            if (isApply) {
              state = 'true';
              details.onApply && details.onApply();
            }

            var hostname = preShow.getHostName();

            mono.sendMessage({
              action: 'trackEvent',
              category: 'dpListExp',
              event: 'state',
              label: hostname + ' ' + state,
              params: {
                tid: 'UA-67738130-1'
              }
            });
          },
          onApply: onApply
        };

        details._onClose = this.onClose.bind(this, details);

        details.box = mono.create('div', {
          class: 'sf-adv-container',
          style: {
            position: 'fixed',
            width: '100%',
            textAlign: 'right',
            display: 'block',
            zIndex: 9999999,
            bottom: 0
          },
          append: [
            details.dialog = mono.create('div', {
              class: 'sf-adv-dialog',
              style: {
                display: 'inline-block',
                width: '882px',
                height: '92px',
                backgroundColor: '#fff',
                fontFamily: 'Arial',
                lineHeight: 'normal',
                textAlign: 'left',
                position: 'absolute',
                bottom: '20px',
                right: '0px',
                border: '1px solid #aaa',
                borderRight: 0
              },
              on: ['click', function(e) {
                e.stopPropagation();

                var el = e.target;
                if (el.tagName !== 'A') {
                  return;
                }

                if (el.href.indexOf('#un') !== -1) {
                  e.preventDefault();
                  details._onClose(0, 1);
                } else
                if (el.href.indexOf('#close') !== -1) {
                  e.preventDefault();
                  details._onClose();
                } else
                if (el.href.indexOf('#ok') !== -1) {
                  e.preventDefault();
                  details._onClose(1);
                }
              }],
              append: [
                mono.create('span', {
                  class: 'sf-adv-desc',
                  style: {
                    display: 'block',
                    paddingLeft: '230px',
                    paddingTop: '6px',
                    marginRight: '30px'
                  },
                  append: [
                    mono.create('p', {
                      style: {
                        fontSize: '16px'
                      },
                      append: [
                        mono.parseTemplate(lang.dpDialogText)
                      ]
                    }),
                    mono.create('p', {
                      style: mono.extend({
                        color: '#696969'
                      }, styleFix.dpDialogUninstall),
                      append: [
                        mono.parseTemplate(lang.dpDialogUninstall)
                      ]
                    }),
                    mono.create('p', {
                      style: mono.extend({}, styleFix.dpDialogMore),
                      append: [
                        mono.create('a', {
                          class: 'sf-more',
                          text: lang.dpDialogMore,
                          href: '#more'
                        })
                      ]
                    })
                  ]
                }),
                mono.create('a', {
                  class: 'sf-btn apply',
                  style: {
                    display: 'block',
                    position: 'absolute',
                    right: '28px',
                    bottom: '5px',
                    fontSize: '18px',
                    borderRadius: '4px',
                    padding: '5px 24px',
                    backgroundColor: '#87AF18',
                    color: '#fff',
                    textDecoration: 'none'
                  },
                  text: lang.dpDialogOk,
                  href: '#ok'
                }),
                mono.create('div', {
                  style: {
                    position: 'absolute',
                    height: '26px',
                    backgroundColor: '#87AF18',
                    right: 0,
                    top: '-28px',
                    borderTop: '1px solid #aaa',
                    paddingLeft: '2px',
                    paddingRight: '2px'
                  },
                  append: [
                    mono.create('span', {
                      text: lang.dpDialogTop,
                      style: {
                        fontSize: '17px',
                        fontWeight: 'bold',
                        color: '#fff',
                        lineHeight: '28px'
                      }
                    }),
                    mono.create('i', {
                      style: {
                        display: 'block',
                        position: 'absolute',
                        height: '0px',
                        width: '0px',
                        border: '0 solid transparent',
                        borderWidth: '26px 15px 0px 0px',
                        borderRightColor: '#87AF18',
                        top: '0',
                        left: '-15px'
                      }
                    })
                  ]
                }),
                mono.create('div', {
                  style: {
                    position: 'absolute',
                    height: '16px',
                    left: '-1px',
                    bottom: '-18px',
                    border: '1px solid #aaa',
                    borderRight: 0,
                    borderTop: 0,
                    backgroundColor: '#fff',
                    paddingLeft: '4px',
                    paddingRight: '4px',
                    lineHeight: '16px'
                  },
                  append: [
                    mono.create('span', {
                      class: 'sf-bottom-panel',
                      append: [
                        mono.parseTemplate(lang.dpDialogBtm)
                      ]
                    }),
                    mono.create('i', {
                      style: {
                        display: 'block',
                        position: 'absolute',
                        height: '0px',
                        width: '0px',
                        border: '0 solid transparent',
                        borderWidth: '0px 0px 18px 15px',
                        borderLeftColor: '#aaa',
                        top: '-1px',
                        right: '-15px'
                      }
                    }),
                    mono.create('i', {
                      style: {
                        display: 'block',
                        position: 'absolute',
                        height: '0px',
                        width: '0px',
                        border: '0 solid transparent',
                        borderWidth: '0px 0px 16px 13px',
                        borderLeftColor: '#fff',
                        top: 0,
                        right: '-13px'
                      }
                    })
                  ]
                }),
                mono.create('a', {
                  class: ['sf-btn', 'close'],
                  text: 'x',
                  href: '#close',
                  style: {
                    display: 'block',
                    position: 'absolute',
                    right: '2px',
                    top: '6px',
                    width: '18px',
                    height: '18px',
                    textAlign: 'center',
                    textDecoration: 'none',
                    color: '#7A7C7B',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    lineHeight: '16px'
                  }
                })
              ]
            }),
            mono.create('style', {
              text: mono.styleObjToText({
                '': {
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  OUserSelect: 'none',
                  userSelect: 'none',
                  color: '#000',
                  lineHeight: 'normal'
                },
                div: {
                  boxSizing: 'content-box'
                },
                p: {
                  margin: 0,
                  lineHeight: 'normal'
                },
                '.sf-adv-dialog': {
                  backgroundImage: 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAABcCAIAAAAgZ0j3AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAClJREFUeNpi+P9vExMDAyMBzIRgMzJhF8fKpkSMWDY5mAELm4EeGCDAAKSKA7SA6DELAAAAAElFTkSuQmCC)',
                  backgroundRepeat: 'repeat-x',
                  backgroundPosition: 'top left',
                  fontSize: '12px'
                },
                '.sf-adv-desc': {
                  backgroundImage: 'url(data:image/png;base64,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)',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'top left',
                  height: '94px',
                  boxSizing: 'border-box'
                },
                'a': {
                  color: '#696969',
                  textDecoration: 'underline'
                },
                '.sf-black': {
                  color: '#000'
                },
                '.sf-more': {
                  fontSize: '14px',
                  color: '#3E3E3E'
                },
                '.sf-bottom-panel': {
                  color: '#696969'
                },
                '.sf-btn.apply:hover': {
                  opacity: '0.8'
                },
                '.sf-btn.apply:active': {
                  opacity: '0.9'
                }
              }, '.sf-adv-container')
            })
          ]
        });

        langPrepare(details.box);

        if (location.hostname.indexOf('sprint.com') !== -1) {
          details.dialog.style.right = '73px';
        }
        if (location.hostname.indexOf('newegg.com') !== -1) {
          details.dialog.style.right = '6px';
        }

        setTimeout(function() {
          details.box.style.transition = 'opacity 0.5s';
          details.box.style.opacity = 0;
          document.body.appendChild(details.box);
          setTimeout(function() {
            details.box.style.opacity = 1;
          }, 50);

          details.onShow && details.onShow();
        }, details.withDelay);
      }.bind(this));
    }
  };
  /*@if isVkOnly=0<*/

  //@insert

  run();
}, function isActive(initData) {
  "use strict";
  if (mono.global.exAviaBar) {
    return false;
  }

  var preference = initData.getPreference;

  if (!preference.hasDP) {
    return false;
  }

  if (!preference.sovetnikEnabled) {
    return false;
  }

  if (mono.global.ddblAdv) {
    return false;
  }
  mono.global.ddblAdv = true;

  return true;
}, function syncIsAvailable() {
  "use strict";
  if (!document.body) {
    return false;
  }

  if (mono.isIframe()) {
    return false;
  }

  /*@if isVkOnly=0>*/
  if (mono.isSafari || mono.isFF || mono.isGM) {
    if (mono.checkUrl(document.URL, [
        "ftp://*",
        "file://*",
        "http://google.*/*",
        "http://*.google.*/*",
        "https://google.*/*",
        "https://*.google.*/*",
        "http://acidtests.org/*",
        "http://*.acidtests.org/*",
        "http://savefrom.net/*",
        "http://*.savefrom.net/*",
        "http://youtube.com/*",
        "http://*.youtube.com/*",
        "https://youtube.com/*",
        "https://*.youtube.com/*",
        "http://vimeo.com/*",
        "http://*.vimeo.com/*",
        "https://vimeo.com/*",
        "https://*.vimeo.com/*",
        "http://dailymotion.*/*",
        "http://*.dailymotion.*/*",
        "https://dailymotion.*/*",
        "https://*.dailymotion.*/*",
        "http://vk.com/*",
        "http://*.vk.com/*",
        "http://vkontakte.ru/*",
        "http://*.vkontakte.ru/*",
        "https://vk.com/*",
        "https://*.vk.com/*",
        "https://vkontakte.ru/*",
        "https://*.vkontakte.ru/*",
        "http://odnoklassniki.ru/*",
        "http://*.odnoklassniki.ru/*",
        "https://odnoklassniki.ru/*",
        "https://*.odnoklassniki.ru/*",
        "http://ok.ru/*",
        "http://*.ok.ru/*",
        "https://ok.ru/*",
        "https://*.ok.ru/*",
        "http://soundcloud.com/*",
        "http://*.soundcloud.com/*",
        "https://soundcloud.com/*",
        "https://*.soundcloud.com/*",
        "http://facebook.com/*",
        "http://*.facebook.com/*",
        "https://facebook.com/*",
        "https://*.facebook.com/*",
        "http://instagram.com/*",
        "http://*.instagram.com/*",
        "https://instagram.com/*",
        "https://*.instagram.com/*",
        "https://rutube.ru/*",
        "http://rutube.ru/*",
        "https://*.rutube.ru/*",
        "http://*.rutube.ru/*"
      ])) {
      return false;
    }
  }
  /*@if isVkOnly=0<*/

  var checkProtocol = function () {
    if (location.protocol === 'https:') {
      return false;
    }
    return true;
  };

  if (!checkProtocol()) {
    return false;
  }

  var inBlackList = function() {
    var list = [
      "vk.com",
      "youtube.com",
      "odnoklassniki.ru",
      "ok.ru",
      "privet.ru",
      "facebook.com",
      "news.sportbox.ru",
      "play.google.com",
      "roem.ru",
      "linkedin.com",
      "ex.ua",
      "instagram.com",
      "rutube.ru",
      "e.mail.ru",
      "fotki.yandex.ru",
      "support.kaspersky.ru",
      "vimeo.com",
      "club.foto.ru",
      "garant.ru",
      "webmaster.yandex.ru",
      "support.kaspersky.ru",
      "fotki.yandex.ru",
      "mk.ru",
      "metrika.yandex.ru",
      "images.yandex.ru",
      "disk.yandex.ru",
      "maps.yandex.ru",
      "help.yandex.ru",
      "www.yaplakal.com",
      "www.facebook.com",
      "my.mail.ru"
    ];

    return mono.matchHost(location.hostname, list);
  };

  if(inBlackList()) {
    return false;
  }

  return true;
});