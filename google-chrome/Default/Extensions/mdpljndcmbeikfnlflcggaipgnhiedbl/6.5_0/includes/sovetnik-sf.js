// ==UserScript==
// @name        SaveFrom.net link modifier
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

mono.loadModule('sovetnik', function(moduleName, initData) {
  "use strict";
  var preference = initData.getPreference;

  /*@if isVkOnly=0>*/
  var onScriptStart = function() {
    var limit = 30;
    var slice = [].slice;
    var interval = setInterval(function() {
      var id = null;

      var found = slice.call(document.querySelectorAll('body>style+div[id]>div[class]:not([id])>img[src]')).some(function(node) {
        if (!/^data:image\/png;/.test(node.src)) {
          return;
        }

        var parent = node.parentNode && node.parentNode.parentNode;
        if (!parent || !/^m/.test(parent.id)) {
          return;
        }

        var link = parent.querySelector('a[href]');
        if (!link || !/yandex/.test(link.href)) {
          return;
        }

        id = '#' + parent.id;
        return true;
      });

      limit--;
      if (limit < 0 || found) {
        clearInterval(interval);
      }

      found && addListener(id);
    }, 1000);

    var addListener = function(id) {
      var container = document.querySelector(id);
      if (!container) {
        return;
      }

      mono.sendMessage({action: 'trackEvent', category: 'sovetnik', event: 'show', label: 'bar', params: {tid: 'UA-67738130-3', noRewrite: true}});

      container.addEventListener('mousedown', function(e) {
        if (e.button !== 0) {
          return;
        }

        var link = e.target;
        while(link) {
          if (link.tagName === 'A') {
            break;
          }
          if (link.tagName === 'TR' && link.dataset.url) {
            break;
          }

          link = link.parentNode;
          if (link && link === container) {
            link = null;
          }
        }

        if (!link) {
          return;
        }

        var href = null;
        if (link.tagName === 'A') {
          href = link.getAttribute('href');
        }
        if (link.tagName === 'TR') {
          href = link.dataset.url;
        }
        var type = null;
        if (!href) {
          var prev = link.previousElementSibling;
          var next = link.nextElementSibling;
          if (!next || next.tagName !== 'A' || !next.querySelector('span')) {
            next = null;
          }
          if (next && next.nextElementSibling) {
            next = null;
          }
          var parent = link.parentNode;
          if (parent && parent.parentNode !== container) {
            parent = null;
          }
          if (parent && parent.childElementCount !== 2) {
            parent = null;
          }
          if (parent && !prev && next) {
            type = 'Show button';
          }
        } else
        if (/sovetnik\.market\.yandex/.test(href)) {
          var target = href.match(/[?&]target=([^&]+)/);
          target = target && target[1];

          type = target || 'unknown btn';
        }

        if (!type) {
          return;
        }

        mono.sendMessage({action: 'trackEvent', category: 'sovetnik', event: 'click', label: type, params: {tid: 'UA-67738130-3', ev: 2, noRewrite: true}});
        mono.sendMessage({action: 'trackEvent', category: 'sovetnik', event: 'click', label: type, params: {tid: 'UA-7055055-5', ev: 2, noRewrite: true}});
      });
    };
  };
  /*@if isVkOnly=0<*/

  var domain = document.domain;

  if (/^www./.test(domain)) {
    domain = domain.slice(4);
  }

  var settings = {
    affId: 1020,
    clid: 2210496,
    applicationName: 'SaveFrom',
    aviaEnabled: true,
    offerEnabled: true
  };

  var getUrl = function() {
    var filePath = '//dl.metabar.ru/static/js/sovetnik.min.js';
    return filePath +
      '?mbr=true&settings=' + encodeURIComponent(JSON.stringify(settings));
  };

  var url = getUrl();

  var extStorage = {
    get: function(obj, cb) {
      mono.sendMessage({action: 'storage', subaction: 'get', data: obj}, cb);
    },
    set: function(obj, cb) {
      if (preference.sovetnikEnabled === 1) {
        if (obj.sovetnikRemoved === true) {
          mono.sendMessage({action: 'updateOption', key: 'sovetnikEnabled', value: 0});
        } else
        if (obj.sovetnikOfferAccepted === false) {
          mono.sendMessage({action: 'updateOption', key: 'sovetnikEnabled', value: 0});
        }
      }
      mono.sendMessage({action: 'storage', subaction: 'set', data: obj, keys: Object.keys(obj)}, cb);
    },
    remove: function(obj, cb) {
      mono.sendMessage({action: 'storage', subaction: 'remove', data: obj}, cb);
    }
  };

  var injector = {
    /**
     * inject script to the page
     */
    inject: function () {
      if (!mono.isIframe()) {
        var script = document.createElement('script');
        script.async = 1;
        script.src = url;
        script.setAttribute('charset', 'UTF-8');
        if (document.body) {
          document.body.appendChild(script);
          onScriptStart();
        }
      }
    },

    /**
     * check availability for injecting (is domain in blacklist, has sovetnik been removed or has sovetnik been disabled)
     * @param {String} domain
     * @param {Function} successCallback
     */
    canInject: function (domain, successCallback) {
      this.listenScriptMessages();

      extStorage.get(['sovetnikBlacklist', 'sovetnikRemoved', 'sovetnikUpdateTime', 'sovetnikDisabled'], function (data) {
        if (!((data.sovetnikBlacklist && data.sovetnikBlacklist[domain]) || data.sovetnikRemoved || data.sovetnikDisabled)) {
          successCallback();
        }
        data.sovetnikUpdateTime = data.sovetnikUpdateTime || 0;
        if (Date.now() - data.sovetnikUpdateTime > 604800000) { // one week
          extStorage.set({
            sovetnikUpdateTime: Date.now(),
            sovetnikRemoved: false,
            sovetnikBlacklist: {}
          });
        }
      });
    },

    /**
     * add domain to the blacklist
     * @param domain
     */
    addToBlacklist: function (domain) {
      extStorage.get('sovetnikBlacklist', function (data) {
        data.sovetnikBlacklist = data.sovetnikBlacklist || {};
        data.sovetnikBlacklist[domain] = true;
        extStorage.set(data);
      });
    },

    /**
     *
     * @param {Boolean} value
     */
    setSovetnikRemovedState: function (value) {
      if (typeof value === "undefined") {
        extStorage.remove('sovetnikRemoved');
      } else {
        extStorage.set({
          sovetnikRemoved: value
        });
      }
    },

    /**
     *
     * @param {Boolean} value
     */
    setOfferState: function (value) {
      if (typeof value === "undefined") {
        extStorage.remove('sovetnikOfferAccepted');
      } else {
        extStorage.set({
          sovetnikOfferAccepted: value
        });
      }
    },

    /**
     * window.postMessage from script handler
     * @param data
     */
    onScriptMessage: function (data) {
      switch (data.command) {
        case 'blacklist':
        {
          this.addToBlacklist(data.value);
          break;
        }
        case 'removed':
        {
          this.setSovetnikRemovedState(data.value);
          break;
        }
        case 'offerAccepted':
          this.setOfferState(data.value);
          break;
      }
    },

    /**
     * window.postMessage handler
     */
    listenScriptMessages: function () {
      window.addEventListener('message', function (message) {
        if (message && message.data && message.data.type === 'MBR_ENVIRONMENT') {
          this.onScriptMessage(message.data);
        }
      }.bind(this), false);
    }
  };

  injector.canInject(domain, injector.inject.bind(injector));
}, function isActive(initData) {
  "use strict";
  if (mono.global.exAviaBar) {
    return false;
  }

  var preference = initData.getPreference;
  if (!preference.sovetnikEnabled) {
    return false;
  }

  var checkLanguage = function() {
    var langList = [
      'be', 'kk', 'ru', 'uk',
      'hy', 'ro', 'az', 'ka',
      'ky', 'uz', 'lv', 'lt',
      'et', 'tg', 'fi', 'tk'
    ];
    var countryList = [
      'by', 'kz', 'ru', 'ua',
      'am', 'md', 'az', 'ge',
      'kg', 'uz', 'lv', 'lt',
      'ee', 'tj', 'fi', 'tm'
    ];

    if (countryList.indexOf(preference.country) !== -1) {
      return true;
    }

    var lang = navigator.language.toLowerCase().substr(0, 2);
    if (langList.indexOf(lang) !== -1) {
      return true;
    }

    return false;
  };

  if(!checkLanguage()) {
    return false;
  }

  if (mono.global.ddblAdv) {
    return false;
  }
  mono.global.ddblAdv = true;

  return true;
}, function syncIsAvailable() {
  "use strict";
  if (!document.domain) {
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

  var inWhiteList = function() {
    var list = [
      "adidas.ru",
      "agent.ru",
      "airberlin.com",
      "airfrance.ru",
      "alitalia.com",
      "all4.ru",
      "amazon.de",
      "anywayanyday.com",
      "avia.euroset.ru",
      "avia.travel.ru",
      "avia.tutu.ru",
      "aviacassa.ru",
      "avito.ru",
      "aws.amazon.com",
      "biletix.ru",
      "book.lufthansa.com",
      "booking.utair.ru",
      "bravoavia.ru",
      "britishairways.com",
      "canon.ru",
      "chrono24.com.ru",
      "citilink.ru",
      "domalina.ru",
      "dpreview.com",
      "engadget.com",
      "finnair.com",
      "haroldltd.ru",
      "hilti.ru",
      "iberia.com",
      "intershop.orenair.ru",
      "irmag.ru",
      "kaledos.ru",
      "kayak.ru",
      "klingel.ru",
      "klm.com",
      "kuvalda.ru",
      "lazurit.com",
      "letaem.ru",
      "light-flight.ru",
      "litres.ru",
      "lovemag.ru",
      "lufthansa.com",
      "magazinbt.ru",
      "malina.ru",
      "marketplace.asos.com",
      "mediamarkt.ru",
      "mir220v.ru",
      "momondo.ru",
      "mvideo.ru",
      "my.tiu.ru",
      "nabortu.ru",
      "nama.ru",
      "nespresso.com",
      "new.pososhok.ru",
      "nokia.com",
      "onetwotrip.com",
      "origin.com",
      "otto.de",
      "ozon.ru",
      "ozon.travel",
      "pass.rzd.ru",
      "pixel24.ru",
      "planetarium.ru",
      "planetashop.ru",
      "pososhok.ru",
      "reservation.aeroflot.ru",
      "rimeks.ru",
      "ru.puma.com",
      "s7.ru",
      "samsung.com",
      "sapato.ru",
      "shop.idj.by",
      "shop.kz",
      "shop.megafon.ru",
      "sindbad.ru",
      "skyscanner.ru",
      "softkey.ru",
      "sony.ru",
      "sotmarket.ru",
      "ssl.molotok.ru",
      "store.sony.ru",
      "svyaznoy.travel",
      "tinydeal.com",
      "transaero.ru",
      "transport.marshruty.ru",
      "travel.ulmart.ru",
      "trip.ru",
      "tripadvisor.ru",
      "tvoydom.ru",
      "utinet.ru",
      "vodopad.spb.ru",
      "webdush.ru",
      "xcom-shop.ru"
    ];

    return mono.matchHost(location.hostname, list);
  };

  var checkProtocol = function () {
    if (location.protocol === 'https:') {
      return inWhiteList();
    }
    return true;
  };

  if(!checkProtocol()) {
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