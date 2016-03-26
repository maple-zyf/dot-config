typeof window === 'undefined' && (function() {
  var _window = require('sdk/window/utils').getMostRecentBrowserWindow();
  window = {};
  window.navigator = _window.navigator;
  _window = null;

  var self = require('sdk/self');
  mono = require('toolkit/loader').main(require('toolkit/loader').Loader({
    paths: {
      'data/': self.data.url('js/')
    },
    name: self.name,
    prefixURI: self.data.url().match(/([^:]+:\/\/[^/]+\/)/)[1],
    globals: {
      console: console,
      _require: function(path) {
        "use strict";
        return require(path);
      }
    }
  }), "data/mono");
  self = null;
})();

var engine = {};

engine.varCache = {
  // helper name
  helperName: undefined,
  // extension version
  currentVersion: undefined,
  // cache user js detected state
  userjsDetected: undefined,
  // trackTime for userTrack
  trackTime: 0,
  opButton: null,
  //current language from navigator
  navigatorLanguage: undefined,
  langList: ['en', 'de', 'ru', 'tr', 'uk', 'es', 'fr', 'id'],
  fromId: undefined,
  lastVersion: undefined,
  meta: {},
  lastTrackTime: 0,
  lastCountryRequest: 0,

  isFirstrun: false,
  isUpgrade: false
};

engine.defaultPreferences = {
  version: '0',
  button: 1,
  lmFileHosting: 1,
  lmMediaHosting: 1,
  moduleYoutube: 1,
  moduleDailymotion: 1,
  moduleVimeo: 1,
  moduleFacebook: 1,
  moduleSoundcloud: 1,
  moduleVkontakte: 1,
  moduleOdnoklassniki: 1,
  moduleMailru: 1,
  moduleInstagram: 1,
  moduleRutube: 1,
  moduleShowDownloadInfo: 1,
  ytHideFLV: 0,
  ytHideMP4: 0,
  ytHideWebM: 1,
  ytHide3GP: 1,
  ytHide3D: 1,
  ytHideMP4NoAudio: 1,
  ytHideAudio_MP4: 1,
  vkShowBitrate: 0,
  sovetnikEnabled: 1,
  showUmmyInfo: 1,
  showUmmyBtn: 1,
  gmNativeDownload: 0,
  expIndex: 0,
  advPreShow: 0,
  showTutorial: 0,
  showUmmyLanding: 0,
  aviaBarEnabled: 1,
  cacheBackBarEnabled: 1
};

engine.preferences = {
  sfHelperName: undefined,
  country: undefined,
  hasSovetnik: undefined,
  hasDP: undefined,
  hasAviaBar: undefined,
  cohortIndex: undefined,
  downloads: undefined,
  ummyDetected: undefined,
  iframeDownload: undefined,
  showUmmyItem: undefined,
  button: undefined
};

engine.preferenceMap = {
  youtube: 'moduleYoutube',
  dailymotion: 'moduleDailymotion',
  vimeo: 'moduleVimeo',
  facebook: 'moduleFacebook',
  soundcloud: 'moduleSoundcloud',
  vk: 'moduleVkontakte',
  odnoklassniki: 'moduleOdnoklassniki',
  mailru: 'moduleMailru',
  instagram: 'moduleInstagram',
  rutube: 'moduleRutube'
};

engine.modules = {};

engine.onEvent = function(nameList, cb) {
  "use strict";
  if (!Array.isArray(nameList)) {
    nameList = [nameList];
  }
  var readyList = engine.onEvent.readyList;
  var found = nameList.every(function(name) {
    return readyList.indexOf(name) !== -1;
  });
  if (found) {
    return cb();
  }
  var onReadyList = engine.onEvent.onReadyList;
  onReadyList.push([nameList, cb]);
};
engine.onEvent.onReadyList = [];
engine.onEvent.readyList = [];
engine.onEvent.ready = function(name) {
  "use strict";
  var readyList = engine.onEvent.readyList;
  readyList.push(name);

  var onReadyList = engine.onEvent.onReadyList;
  var found;
  var rmList = [];
  var nameList;
  var cb;
  var runList = [];
  for (var i = 0, item; item = onReadyList[i]; i++) {
    nameList = item[0];
    cb = item[1];
    found = nameList.every(function(name) {
      return readyList.indexOf(name) !== -1;
    });
    if (found) {
      rmList.push(item);
      runList.push(cb);
    }
  }
  while (item = rmList.shift()) {
    onReadyList.splice(onReadyList.indexOf(item), 1);
  }
  while (item = runList.shift()) {
    item();
  }
};
engine.onEvent.listeners = {};
engine.onEvent.addListener = function(name, cb) {
  "use strict";
  var listeners = engine.onEvent.listeners;
  if (!listeners[name]) {
    listeners[name] = [];
  }

  listeners[name].push(cb);
};
engine.onEvent.fire = function(name) {
  "use strict";
  var listeners = engine.onEvent.listeners;
  var cbList = listeners[name];

  if (!cbList) {
    return;
  }

  for (var i = 0, cb; cb = cbList[i]; i++) {
    cb();
  }
};

engine.getHelperName = function() {
  "use strict";
  var browser = 'undefined';
  if (mono.isChrome) {
    browser = engine.getHelperName.getBrowserName() || 'chrome';
    if (/sandbox.html#bg/.test(location.href)) {
      browser = 'chameleon';
    }
    if (engine.chromeNoStore) {
      browser += '-sf';
    }
    return browser;
  }
  if (mono.isFF) {
    browser = 'firefox';
    if (!engine.varCache.ffButton) {
      browser += '-mobile';
    }
    if (engine.ffNoStore) {
      browser += '-sf';
    }
    return browser;
  }
  if (mono.isSafari) {
    return 'safari';
  }
  if (mono.isOpera) {
    return 'opera';
  }
  if (mono.isGM) {
    browser = engine.getHelperName.getBrowserName() || 'undefined';
    return 'userjs-' + browser;
  }

  return browser;
};
engine.getHelperName.getBrowserName = function() {
  "use strict";
  var browser = '';
  if(navigator.userAgent.indexOf('YaBrowser\/') !== -1) {
    browser = 'yabrowser';
  } else
  if(navigator.userAgent.indexOf('Maxthon\/') !== -1) {
    browser = 'maxthon';
  } else
  if(navigator.userAgent.indexOf('OPR\/') !== -1) {
    browser = 'opera-chromium';
  } else
  if(navigator.userAgent.indexOf('Opera\/') !== -1) {
    browser = 'opera';
  } else
  if(navigator.userAgent.indexOf('Firefox\/') !== -1) {
    browser = 'firefox';
  } else
  if(navigator.userAgent.indexOf('Chrome\/') !== -1) {
    browser = 'chrome';
  } else
  if(navigator.userAgent.indexOf('Safari\/') !== -1) {
    browser = 'safari';
  }
  return browser;
};

engine.dblTrackCheck = function(cb) {
  "use strict";
  if (!mono.isGM) {
    return cb();
  }

  mono.storage.get('dblTrack', function(storage) {
    var now = Date.now();
    if (typeof storage.dblTrack !== 'string') {
      storage.dblTrack = '';
    }

    var dataList = storage.dblTrack.split(',');
    if (dataList[1] > now) {
      return;
    }

    var uuid = engine.generateUuid();
    var expire = now + 60000;
    mono.storage.set({dblTrack: uuid+','+expire});

    setTimeout(function() {
      mono.storage.get('dblTrack', function(storage) {
        if (typeof storage.dblTrack !== 'string') {
          storage.dblTrack = '';
        }

        var dataList = storage.dblTrack.split(',');
        if (dataList[0] !== uuid) {
          return;
        }

        cb();
      });
    }, 5000);
  });
};

engine.getUuid = function() {
  "use strict";
  if (typeof engine.getUuid.uuid === 'string' && engine.getUuid.uuid.length === 36) {
    return engine.getUuid.uuid;
  }

  var uuid = engine.getUuid.uuid = engine.generateUuid();
  mono.storage.set({uuid: uuid});
  return uuid;
};
engine.getUuid.uuid = null;

engine.generateUuid = function() {
  "use strict";
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
};

engine.sovetnikIsAvailable = function() {
  "use strict";
  if (!mono.isFF && !mono.isChrome && !mono.isGM && !mono.isOpera) {
    return false;
  }
  if (mono.isFF && !engine.varCache.ffButton) {
    return false;
  }
  return true;
};

engine.loadLanguage = function(cb, forceLocale) {
  var locale, lang;
  var currentLanguage = engine.varCache.navigatorLanguage.substr(0,2).toLowerCase();
  var langList = engine.varCache.langList;
  var availableLang = langList.indexOf(currentLanguage) !== -1 ? currentLanguage : langList[0];

  var language = {};
  var chrome2lang = function(lang) {
    for (var key in lang) {
      language[key] = lang[key].message;
    }
  };

  if (mono.isGM) {
    lang = _languageList[availableLang];
    _languageList = null;
    lang = JSON.parse(decodeURI(lang));
    chrome2lang(lang);
    return cb(language);
  }

  var url = '_locales/{locale}/messages.json';
  if (mono.isFF) {
    locale = require("sdk/l10n").get('lang');
    if (locale === 'lang') {
      locale = availableLang;
    }

    url = url.replace('{locale}', forceLocale || locale);
    try {
      lang = require('sdk/self').data.load(url);
      lang = JSON.parse(lang);
    } catch (e) {
      if (forceLocale) {
        return cb(language);
      }

      return engine.loadLanguage(cb, 'en');
    }

    chrome2lang(lang);
    return cb(language);
  }

  if (mono.isChrome) {
    locale = chrome.i18n.getMessage('lang');
    url = url.replace('{locale}', forceLocale || locale);
  } else
  if (mono.isSafari || mono.isOpera) {
    url = url.replace('{locale}', forceLocale || availableLang);
  }

  mono.request({
    url: url,
    json: true
  }, function(err, resp, json) {
    if (err) {
      if (forceLocale) {
        console.error('Language is not loaded', url);
        return cb(language);
      }

      return engine.loadLanguage(cb, 'en');
    }

    chrome2lang(json);
    return cb(language);
  });
};

engine.language = {};
engine.operaShowButton = function(enabled) {
  "use strict";
  if (engine.varCache.opButton !== null) {
    opera.contexts.toolbar.removeItem(engine.varCache.opButton);
    engine.varCache.opButton = null;
  }
  if (!enabled) {
    return;
  }
  engine.varCache.opButton = opera.contexts.toolbar.createItem({
    title: 'SaveFrom.net helper',
    icon: "img/icon_18.png",
    popup: {
      href: "popup.html",
      width: 482,
      height: 404
    }
  });
  opera.contexts.toolbar.addItem(engine.varCache.opButton);
};

engine.gmShowButton = function(enabled) {
  if (enabled) {
    _menu.setTitle(engine.language.extName, engine.varCache.currentVersion);
    mono.storage.get('gmIconTop', function(storage) {
      if (storage.gmIconTop === 0 || storage.gmIconTop) {
        _menu.style.menu.initial.top = storage.gmIconTop + 'px';
      }
      _menu.create(1);
    });
  } else {
    _menu.hide();
  }
};

engine.userTrack2 = function() {
  var now = parseInt(Date.now() / 1000);
  if (engine.varCache.lastTrackTime > now) {
    return;
  }
  engine.varCache.lastTrackTime = String(now + 12 * 60 * 60);
  mono.storage.set({lastTrackTime: engine.varCache.lastTrackTime});

  engine.metrika && engine.metrika.sendParamRequest('init');
  engine.ga && engine.ga.sendScreenViewStats('init');
};

engine.tabListener = {
  extendJsList: {},
  excludeList: [
    "*://*.google.*/*",
    "*://*.acidtests.org/*",

    "*://*.savefrom.net/*",
    "*://*.youtube.com/*",
    "*://*.vimeo.com/*",
    "*://*.dailymotion.*/*",
    "*://*.vk.com/*",
    "*://*.vkontakte.ru/*",
    "*://*.odnoklassniki.ru/*",
    "*://my.mail.ru/*",
    "*://*.ok.ru/*",
    "*://*.soundcloud.com/*",
    "*://*.facebook.com/*",
    "*://*.instagram.com/*",
    "*://*.rutube.ru/*"
  ],
  matchCache: null,
  rHostname: /:\/\/(?:[^@\/?#]+@)?([^\/?:#]+)/,
  getHostname: function(url) {
    "use strict";
    var m = url.match(this.rHostname);
    return m && m[1];
  },
  checkUrl: function(url) {
    "use strict";
    if (url.substr(0, 4) !== 'http') {
      return;
    }

    if (this.matchCache.test(url)) {
      return;
    }

    return true;
  },
  oldChromeMode: null,
  onChChange: function(tab) {
    "use strict";
    var preferences = engine.preferences;
    var list = [];

    if (preferences.lmFileHosting || preferences.lmMediaHosting) {
      list.push('includes/components.js');
      list.push('includes/link_modifier.js');
    }

    if (preferences.hasSovetnik && preferences.sovetnikEnabled) {
      list.push('includes/sovetnik-sf.js');
    }

    for (var key in this.extendJsList) {
      var scriptList = this.extendJsList[key].getScriptList(tab.url);
      for (var ii = 0, scriptPath; scriptPath = scriptList[ii]; ii++) {
        if (list.indexOf(scriptPath) === -1) {
          list.push(scriptPath);
        }
      }
    }

    if (list.length === 0) {
      if (mono.isEmptyObject(this.extendJsList)) {
        this.rmListener();
      }
      return;
    }

    list.unshift('js/mono.js');

    for (var i = 0, file; file = list[i]; i++) {
      chrome.tabs.executeScript(tab.id, { file: file, runAt: 'document_end' });
    }
  },
  chListener: function(tabId, changeInfo, tab) {
    "use strict";
    var _this = engine.tabListener;
    if (changeInfo.status !== 'loading') { // complete or loading
      return;
    }

    if (!_this.checkUrl(tab.url)) {
      return;
    }

    var onResponse = function(response) {
      if (response === 1) {
        return;
      }

      chrome.tabs.get(tabId, function(tab) {
        tab && _this.onChChange(tab);
      });
    };

    var msg = {hook: 'hasInject', url: tab.url};
    if (_this.oldChromeMode) {
      chrome.tabs.sendRequest(tabId, msg, onResponse);
    } else
    if (mono.isChromeVersion >= 41) {
      chrome.tabs.sendMessage(tabId, msg, {frameId: 0}, onResponse);
    } else {
      chrome.tabs.sendMessage(tabId, msg, onResponse);
    }
  },
  onFfChange: function(tab) {
    "use strict";
    var preferences = engine.preferences;
    var self = require('sdk/self');
    var list = [];

    var options = {};

    if (preferences.lmFileHosting || preferences.lmMediaHosting) {
      list.push('includes/components.js');
      list.push('includes/link_modifier.js');
    }

    var sovAvailable = false;
    if (preferences.hasSovetnik && preferences.sovetnikEnabled) {
      if (engine.ffNoStore) {
        list.push('includes/sovetnik-sf.js');
      } else
      if (engine.ffSovetnik && engine.ffSovetnik.api.isReady) {
        sovAvailable = true;
        if (!engine.ffSovetnik.isDenyURL(tab.url)) {
          engine.ffSovetnik.api.onTabReady(tab);
        }
      }
    }

    for (var key in this.extendJsList) {
      var scriptList = this.extendJsList[key].getScriptList(tab.url);
      for (var ii = 0, scriptPath; scriptPath = scriptList[ii]; ii++) {
        if (list.indexOf(scriptPath) === -1) {
          list.push(scriptPath);
        }
      }
    }

    if (list.length === 0) {
      if (!sovAvailable && mono.isEmptyObject(this.extendJsList)) {
        this.rmListener();
      }
      return;
    }

    list.unshift('js/mono.js');

    options.contentScriptFile = list.map(function(item) {
      return self.data.url(item);
    });

    var worker = tab.attach(options);
    engine.varCache.monoLib.addPage(worker);
  },
  ffListener: function (tab) {
    "use strict";
    var _this = engine.tabListener;
    if (!_this.checkUrl(tab.url)) {
      return;
    }
    _this.onFfChange(tab);
  },
  rmListener: function() {
    "use strict";
    if (mono.isChrome) {
      chrome.tabs.onUpdated.removeListener(this.chListener);
    } else
    if (mono.isFF) {
      require("sdk/tabs").removeListener('ready', this.ffListener);
    }
  },
  addListener: function() {
    "use strict";
    if (!mono.isChrome && !mono.isFF) {
      return;
    }

    if (!this.matchCache) {
      this.matchCache = this.excludeList.map(function(pattern) {
        return mono.urlPatternToStrRe(pattern);
      }).join('|');
      this.matchCache = new RegExp(this.matchCache);
    }

    this.rmListener();

    if (mono.isChrome) {
      this.oldChromeMode = false;
      if (!(chrome.hasOwnProperty('runtime') && chrome.runtime.onMessage)) {
        this.oldChromeMode = true;
      }

      chrome.tabs.onUpdated.addListener(this.chListener);
    } else
    if (mono.isFF) {
      require("sdk/tabs").on('ready', this.ffListener);
    }
  },
  injectLmInActiveTab: function() {
    "use strict";
    var _this = this;
    var list = [
      'js/mono.js',
      'includes/components.js',
      'includes/link_modifier.js'
    ];
    if (mono.isChrome) {
      chrome.tabs.getSelected(null, function (tab) {
        if (!_this.checkUrl(tab.url)) {
          return;
        }
        list.forEach(function(file) {
          chrome.tabs.executeScript(tab.id, { file: file, runAt: 'document_end' });
        });
      });
    } else
    if (mono.isFF) {
      var self = require('sdk/self');
      var activeWindow = require("sdk/windows").browserWindows.activeWindow;
      var activeTab = activeWindow && activeWindow.tabs.activeTab;
      if (!this.checkUrl(activeTab && activeTab.url || '')) {
        return;
      }

      var options = {
        contentScriptFile: list.map(function(file) {
          return self.data.url(file);
        })
      };
      var worker = activeTab.attach(options);
      engine.varCache.monoLib.addPage(worker);
    }
  }
};

engine.cohort = {
  data: {},
  isAllow: function(index) {
    if (index === 1) {
      return mono.isGM || engine.preferences.sfHelperName === 'ff-sf' || mono.isSafari || mono.isOpera || mono.isChrome;
    }
    return false;
  },
  setIndex: function(index) {
    engine.preferences.cohortIndex = index;
  },
  forceSetCohort: function(index) {
    if (!this.isAllow(index)) {
      return;
    }

    var data = this.data;
    if (data.index && this.isAllow(data.index)) {
      return;
    }

    data.index = index;

    mono.storage.set({cohort: data});
    this.setIndex(index);
  },
  firstRun: function() {
    var data = this.data;
    if (data.index && this.isAllow(data.index)) {
      return;
    }

    /*data.index = parseInt('cohort index');

     if (!this.isAllow(data.index)) {
     return;
     }

     mono.storage.set({cohort: data});
     this.setIndex(data.index);*/
  },
  run: function() {
    var data = this.data;
    if (!data.index) {
      return;
    }

    if (!this.isAllow(data.index)) {
      return;
    }

    this.setIndex(data.index);
  },
  track: {
    event: function(category, action, label) {
      var params = {
        ec: category, // share-button
        ea: action, // click
        el: label, // vk
        t: 'event'
      };

      engine.cohort.track.sendData(params);
    },
    screen: function(screenName) {
      var params = {
        an: 'helper',
        aid: engine.varCache.helperName,
        av: engine.varCache.currentVersion,
        t: 'screenview',
        cd: screenName
      };

      engine.cohort.track.sendData(params);
    },
    sendData: function(params) {
      var preferences = engine.preferences;
      if (!engine.cohort.isAllow(preferences.cohortIndex)) {
        return;
      }

      var tidList = {
        1: 'UA-7055055-8',
        2: null,
        3: null,
        4: null
      };

      var defaultParams = {
        v: 1,
        ul: engine.varCache.navigatorLanguage,
        tid: tidList[preferences.cohortIndex],
        cid: engine.getUuid()
      };

      for (var key in defaultParams) {
        if(!params.hasOwnProperty(key)) {
          params[key] = defaultParams[key];
        }
      }

      if (!params.tid) {
        return;
      }

      mono.request({
        url: 'https://www.google-analytics.com/collect',
        type: 'POST',
        data: mono.param(params)
      });
    }
  }
};

engine.getCountry = function() {
  "use strict";
  var country;
  var preferences = engine.preferences;
  var varCache = engine.varCache;

  var lang2country = {
    be: 'by', kk: 'kz', ru: 'ru',
    uk: 'ua', hy: 'am', ro: 'md',
    az: 'az', ka: 'ge', ky: 'kg',
    uz: 'uz', lv: 'lv', lt: 'lt',
    et: 'ee', tg: 'tj', fi: 'fi',
    tk: 'tm'
  };
  if (country = lang2country[varCache.navigatorLanguage.substr(0, 2).toLowerCase()]) {
    return mono.asyncCall(function() {
      preferences.country = country;
      engine.onEvent.ready('getCountry');
    });
  }

  var requestCountry = function() {
    var xh = preferences.sfHelperName+' '+varCache.currentVersion;
    mono.request({
      type: 'POST',
      url: 'http://sf-helper.com/geoip/country.php',
      data: {
        sig: xh.length
      },
      headers: {
        'X-Helper': xh
      }
    }, function(err, resp, data) {
      if (err || !data) {
        return;
      }

      country = data.toLowerCase().substr(0, 2);
      mono.storage.setExpire({country: preferences.country = country}, 259200);
      engine.onEvent.ready('getCountry');
    });
  };

  mono.storage.getExpire('country', function(storage, _storage) {
    if (_storage.country) {
      preferences.country = _storage.country;
    }

    if (storage.country) {
      return;
    }

    var now = parseInt(Date.now() / 1000);
    if (varCache.lastCountryRequest < now) {
      requestCountry();

      mono.storage.set({lastCountryRequest: varCache.lastCountryRequest = now + 86400});
    }
  }, 1);
};

engine.forceMetaRequest = false;
engine.getMeta = function(onComplete, force) {
  "use strict";
  if (mono.isEmptyObject(engine.expList) && !engine.forceMetaRequest) {
    return onComplete && onComplete();
  }

  var requestMeta = function() {
    var done = function(meta) {
      if (done.fired) {
        return;
      }
      done.fired = true;

      if (meta) {
        var _meta = engine.varCache.meta;
        for (var key in _meta) {
          delete _meta[key];
        }

        mono.extend(_meta, meta);
        engine.onEvent.ready('getMeta');
      }

      onComplete && onComplete();
    };

    var cDate = (function() {
      var _date = new Date();
      var date = _date.getDate();
      var month = _date.getMonth() + 1;
      var cDate = '';

      cDate += date < 10 ? '0' + date : date;
      cDate += month < 10 ? '0' + month : month;
      cDate += _date.getFullYear();

      return cDate;
    })();

    mono.setTimeout(function() {
      done();
    }, 6000);

    mono.request({
      url: 'http://sf-helper.com/meta/meta.json' + '?_=' + cDate,
      json: true
    }, function(err, resp, json) {
      if (err) {
        return done();
      }

      mono.storage.setExpire({meta: json}, 86400);
      done(json);
    });
  };

  mono.storage.getExpire('meta', function(storage, _storage) {
    if (_storage.meta) {
      mono.extend(engine.varCache.meta, _storage.meta);
    }

    if (force || !storage.meta) {
      mono.storage.setExpire({meta: engine.varCache.meta}, 21600);
      return requestMeta();
    }

    onComplete && onComplete();
  }, 1);
};

engine.onEvent('firstrun', function getFromInstallId() {
  if (engine.varCache.fromId) {
    return;
  }

  mono.request({
    url: 'http://savefrom.net/tools/get_vid.php'
  }, function(err, resp, data) {
    if (err || !data || !/^\d+$/.test(data)) {
      return;
    }

    mono.storage.set({fromId: engine.varCache.fromId = data});
  });
});

engine.onEvent('init', function() {
  "use strict";
  if (!mono.isSafari) {
    return;
  }

  safari.extension.settings.addEventListener('change', function(event) {
    if (event.key !== 'show_options') {
      return;
    }
    mono.openTab(safari.extension.baseURI + 'options.html', true);
  });

  var checkInterval = null;

  var removePopover = function(btn) {
    clearInterval(checkInterval);

    if (btn && btn.popover) {
      if (btn.popover.visible) {
        btn.popover.hide();
      }
      btn.popover = null;
    }

    safari.extension.removePopover('popup');
  };

  safari.application.addEventListener('command', function(e) {
    if (e.command === 'openPopup') {
      var btn = safari.extension.toolbarItems[0];
      if (!btn) {
        return;
      }

      if (btn.popover && btn.popover.visible) {
        btn.popover.hide();
        return;
      }

      removePopover(btn);

      btn.popover = safari.extension.createPopover('popup', safari.extension.baseURI + 'popup.html', 482, 404);
      btn.showPopover();

      checkInterval = setInterval(function() {
        var btn = safari.extension.toolbarItems[0];
        if (btn && btn.popover && btn.popover.visible) {
          return;
        }
        removePopover(btn);
      }, 1000 * 30);
    }
  }, false);
});

engine.onOptionChange = {
  button: function(enabled) {
    if (mono.isOpera) {
      engine.operaShowButton(enabled);
    } else
    if (mono.isGM) {
      engine.gmShowButton(enabled);
    }
  },
  sovetnikEnabled: function(value, oldValue) {
    var onChangeFunc = engine.onOptionChange.sovetnikEnabled;
    if (value === oldValue) {
      return;
    }

    if (engine.preferences.hasSovetnik) {
      if (value) {
        engine.tabListener.addListener();
      }

      if (mono.isOpera || mono.isChrome) {
        if (window.sovetnik && window.sovetnik.setRemovedState) {
          window.sovetnik.setRemovedState(!value)
        }
      }

      if (mono.isFF && !mono.ffNoStore) {
        if (engine.ffSovetnik && engine.ffSovetnik.api.isReady) {
          engine.ffSovetnik.api.setRemovedState(!value)
        }
      }
    } else
    if (engine.preferences.hasDP) {
      onChangeFunc.dpOnChange && onChangeFunc.dpOnChange();
    }
  },
  lmFileHosting: function(value) {
    if (value) {
      engine.tabListener.addListener();
    }
  },
  lmMediaHosting: function(value) {
    if (value) {
      engine.tabListener.addListener();
    }
  },
  gmNativeDownload: function(value) {
    if (!mono.isGM) {
      return;
    }
    engine.preferences.downloads = !!value;
    if (mono.global.preference) {
      // GM only!
      mono.global.preference.downloads = engine.preferences.downloads;
    }
  }
};

engine.getHelperVersion = function(cb) {
  "use strict";
  if (mono.isChrome) {
    return cb(chrome.app.getDetails().version);
  }
  if (mono.isFF) {
    return cb(require('sdk/self').version);
  }
  if (mono.isOpera) {
    return cb(widget.version);
  }
  if (mono.isGM) {
    var version = 'GM_unknown';
    if(typeof GM_info !== 'undefined' && GM_info.script && GM_info.script.version) {
      version = GM_info.script.version;
    }
    cb(version);
    return;
  }
  if (mono.isSafari) {
    mono.request({
      url: safari.extension.baseURI + 'Info.plist',
      xml: true
    }, function(err, resp, xml) {
      if (err) {
        return cb('unknown');
      }

      var elList = xml.getElementsByTagName('key');
      for (var i = 0, el; el = elList[i]; i++) {
        if (el.textContent === 'CFBundleShortVersionString') {
          return cb(el.nextElementSibling.textContent);
        }
      }

      cb('unknown');
    });
    return;
  }
};

engine.sendInGa = function(params, details) {
  "use strict";
  details = details || {};
  var stack = engine.sendInGa.stack;

  if (details.id) {
    var hasItem = stack.some(function(stackItem) {
      var _details = stackItem[2];
      if (_details.id === details.id) {
        return true;
      }
    });
    if (hasItem) {
      return;
    }
  }

  stack.unshift([Date.now(), params, details]);

  stack.splice(100);

  engine.sendInGa.send();
};
engine.sendInGa.stack = [];
engine.sendInGa.lock = false;
engine.sendInGa.checkStack = function() {
  "use strict";
  var now = parseInt(Date.now() / 1000);
  var checkStack = engine.sendInGa.checkStack;
  if (checkStack.time > now) {
    return;
  }
  checkStack.time = now + 60 * 60;

  engine.sendInGa.send();
};
engine.sendInGa.checkStack.time = 0;
engine.sendInGa.send = function() {
  "use strict";
  var stack = engine.sendInGa.stack;
  if (!stack.length) {
    return;
  }

  if (engine.sendInGa.lock) {
    return;
  }
  engine.sendInGa.lock = true;

  var item = stack.slice(-1)[0];

  var time = item[0];
  var params = item[1];
  var details = item[2];

  var now = Date.now();

  var delta = now - time;
  if (delta >= 14400000) {
    delta = 14400000 - ((stack.length + 1) * 1000);
  }
  params.qt = delta;

  mono.request({
    url: 'https://www.google-analytics.com/collect?z=' + Date.now(),
    type: 'POST',
    data: mono.param(params),
    timeout: 60 * 1000
  }, function(err) {
    engine.sendInGa.lock = false;
    if (err) {
      return;
    }

    var pos = stack.indexOf(item);
    if (pos !== -1) {
      stack.splice(pos, 1);
    }

    details.onSuccess && details.onSuccess();

    engine.sendInGa.send();
  });
};

engine.actionList = {
  getMenuDetails: function(msg, response) {
    "use strict";
    var getLastVersion = function() {
      var currentVersion = engine.varCache.currentVersion;
      if (typeof currentVersion !== 'string') {
        return null;
      }

      var lastVersion = engine.varCache.lastVersion;
      if (currentVersion.indexOf(lastVersion) === 0) {
        return currentVersion;
      }

      return lastVersion;
    };

    var details = {
      language: engine.language,
      preferences: engine.preferences,
      version: engine.varCache.currentVersion,
      lastVersion: getLastVersion(),
      helperName: engine.varCache.helperName
    };

    return response(details);
  },
  getLanguage: function(message, cb) {
    cb(engine.language);
  },
  getNavigatorLanguage: function(msg, cb) {
    cb(engine.varCache.navigatorLanguage);
  },
  getPreference: function(message, cb) {
    var preferences = engine.preferences;
    if (mono.isSafari || mono.isGM) {
       preferences = mono.extend({}, engine.preferences);
    }
    cb( preferences);

    engine.userTrack();

    if (engine.metrika || engine.ga) {
      engine.userTrack2();
    }

    engine.sendInGa.checkStack();

    mono.msgClean();
  },
  updateOption: function(message) {
    var oldValue = engine.preferences[message.key];
    engine.preferences[message.key] = message.value;

    var obj = {};
    obj[message.key] = message.value;
    mono.storage.set(obj);

    if (engine.onOptionChange[message.key] !== undefined) {
      engine.onOptionChange[message.key](message.value, oldValue);
    }
  },
  downloadFromCurrentPage: function() {
    var url = 'http://savefrom.net/';
    mono.getCurrentPageUrl(function(cUrl) {
      var args = mono.param({
        url: cUrl,
        utm_source: engine.preferences.sfHelperName,
        utm_medium: 'extensions',
        utm_campaign: 'bookmarklet'
      });
      mono.openTab(url + '?' + args, 1);

      var domain = mono.getDomain(cUrl, 1);
      engine.trackEvent('extensionMenu', 'openSfPage', domain);
      if ([1].indexOf(engine.preferences.cohortIndex) !== -1) {
        engine.cohort.track.event('extensionMenu', 'openSfPage', domain);
      }
    });
  },
  openPoll: function() {
    if (['en', 'uk', 'ru'].indexOf(engine.language.lang) === -1) {
      return;
    }
    var url = 'http://'+engine.language.lang+'.savefrom.net/helper-form.php';
    mono.getCurrentPageUrl(function(cUrl) {
      var domain = mono.getDomain(cUrl) || '';

      var args = '?' + mono.param({
          version: engine.varCache.currentVersion,
          helper: engine.preferences.sfHelperName,
          url: domain
        });
      mono.openTab(url+args, 1);
    });
  },
  reportBug: function() {
    var url = 'http://savefrom.userecho.com/forum/20869-/';
    if(engine.language.lang === 'ru') {
      url = 'http://savefrom.userecho.com/forum/19523-/';
    }
    mono.openTab(url);
  },
  viaMenu_updateLinks: function() {
    mono.sendMessageToActiveTab({action: 'updateLinks'});
  },
  viaMenu_downloadMP3Files: function() {
    mono.sendMessageToActiveTab({action: 'downloadMP3Files'});
  },
  viaMenu_downloadPlaylist: function() {
    mono.sendMessageToActiveTab({action: 'downloadPlaylist'});
  },
  viaMenu_downloadPhotos: function() {
    mono.sendMessageToActiveTab({action: 'downloadPhotos'});
  },
  viaMenu_changeState: function(msg) {
    if (!Array.isArray(msg.prefKey)) {
      msg.prefKey = [msg.prefKey];
    }

    for (var i = 0, key; key = msg.prefKey[i]; i++) {
      engine.actionList.updateOption({key: key, value: msg.state});
    }

    if (msg.state && msg.moduleName === 'lm' && msg.needInclude) {
      if (mono.isChrome || mono.isFF) {
        return engine.tabListener.injectLmInActiveTab();
      }
    }

    mono.sendMessageToActiveTab({action: 'changeState', moduleName: msg.moduleName, state: msg.state});
  },
  showOptions: function() {
    if (mono.isGM) {
      return _options.show();
    }
    var url = 'options.html';
    if (mono.isFF) {
      url = require('sdk/self').data.url(url);
    } else
    if (mono.isSafari) {
      url = safari.extension.baseURI + url;
    }
    mono.openTab(url, true);
  },
  getActiveTabModuleInfo: function(msg, cb) {
    mono.sendMessageToActiveTab({action: 'getModuleInfo', url: msg.url}, function(moduleInfo) {
      cb(moduleInfo);
    });
  },
  getActiveTabUrl: function(message, cb) {
    mono.getCurrentPageUrl(cb);
  },
  getActiveTabInfo: function(msg, cb) {
    var preferences = engine.preferences;
    mono.getCurrentPageUrl(function(url) {
      if (url.indexOf('http') !== 0) {
        return cb();
      }

      var hostList = {
        dailymotion: ["*://*.dailymotion.*/*"],
        facebook: ["*://*.facebook.com/*"],
        mailru: ["*://my.mail.ru/*"],
        odnoklassniki: ["*://*.ok.ru/*", "*://*.odnoklassniki.ru/*"],
        savefrom: ["*://*.savefrom.net/*"],
        soundcloud: ["*://*.soundcloud.com/*"],
        vimeo: ["*://*.vimeo.com/*"],
        vk: ["*://*.vk.com/*", "*://*.vkontakte.ru/*"],
        youtube: ["*://*.youtube.com/*"],
        instagram: ["*://*.instagram.com/*"],
        rutube: ["*://*.rutube.ru/*"]
      };

      var moduleName = 'lm';
      var prefKey = ['lmFileHosting', 'lmMediaHosting'];
      var state = preferences.lmFileHosting || preferences.lmMediaHosting;

      for (var key in hostList) {
        var regList = hostList[key];
        var re = regList.map(function(pattern) {
          return mono.urlPatternToStrRe(pattern);
        }).join('|');
        re = new RegExp(re);

        if (re.test(url)) {
          moduleName = key;
          prefKey = engine.preferenceMap[moduleName];
          state = preferences[prefKey];
          break;
        }
      }

      return cb({moduleName: moduleName, prefKey: prefKey, url: url, state: state});
    });
  },
  popupResize: function(msg) {
    if (mono.isSafari) {
      safari.extension.popovers[0].height = msg.height;
    } else
    if (mono.isOpera) {
      var varCache = engine.varCache;
      if (varCache.opButton === null) {
        return;
      }
      varCache.opButton.popup.height = msg.height;
      varCache.opButton.popup.width = msg.width;
    }
  },
  userjsDetected: function() {
    if (engine.varCache.userjsDetected) {
      return;
    }
    engine.varCache.userjsDetected = 1;

    mono.storage.get('userjsDetected', function(storage) {
      if (storage.userjsDetected === 1) {
        return;
      }
      mono.storage.set({userjsDetected: 1});

      var uuid = engine.getUuid();
      mono.request({
        url: 'https://www.google-analytics.com/collect',
        type: 'POST',
        data: 'v=1&tid=UA-7055055-1&cid=' + uuid + '&t=pageview&dh=savefrom.net&dp=%2Fextension%2Fuserjs_installed.ext'
      });
    });
  },
  hideDownloadWarning: function(message, cb) {
    if (message.set !== undefined) {
      return mono.storage.set({hideDownloadWarning: message.set});
    }
    mono.storage.get('hideDownloadWarning', function(storage) {
      cb(storage.hideDownloadWarning);
    });
  },
  storage: function(message, cb) {
    if (message.subaction === 'clear') {
      return;
    }
    if (message.keys) {
      for (var i = 0, len = message.keys.length; i < len; i++) {
        var key = message.keys[i];
        if (!message.data.hasOwnProperty(key)) {
          message.data[key] = undefined;
        }
      }
    }
    mono.storage[message.subaction](message.data, cb);
  },
  trackScreen: function(message) {
    "use strict";
    return engine.sendScreenViewStats(message.screen, message.params);
  },
  trackEvent: function(message) {
    engine.trackEvent(message.category, message.event, message.label, message.params);
  },
  trackSocial: function(message) {
    engine.trackSocial(message.target, message.event, message.network);
  },
  trackCohort: function(message) {
    if (!engine.preferences.cohortIndex) {
      return;
    }
    engine.cohort.track.event(message.category, message.event, message.label);
  },
  addToClipboard: function(message) {
    if (mono.isFF) {
      var clipboard = require("sdk/clipboard");
      clipboard.set(message.text);
    } else
    if (mono.isChrome) {
      var text = message.text;
      var textArea;
      document.body.appendChild(textArea = mono.create('textarea', {
        text: text
      }));
      textArea.select();
      mono.asyncCall(function() {
        document.execCommand("copy", false, null);
        textArea.parentNode.removeChild(textArea);
      });
    }
  },
  setIconBadge: function(msg) {
    "use strict";
    var text = String(msg.text);

    if (mono.isChrome) {
      chrome.browserAction && chrome.browserAction.setBadgeText({
        text: text
      });
    }
    if (mono.isModule && engine.varCache.ffButton) {
      var button = engine.varCache.ffButton;
      button.badge = text;
    }
  },
  trackError: function(msg) {
    "use strict";
    try {
      var trackError = engine.actionList.trackError;
      if (!trackError.dDbl) {
        trackError.dDbl = {};
      }

      var exd = msg.desc.substr(0, 150);

      if (trackError.dDbl[exd]) {
        return;
      }
      trackError.dDbl[exd] = true;

      var params = {
        t: 'exception',
        exd: exd,
        tid: 'UA-7055055-9'
      };

      engine.sendStatsInfo(params);
    } catch(e) {}
  }
};

engine.onMessage = function(message, cb) {
  if (!engine.onMessage.ready) {
    engine.onMessage.stack.push(arguments);
    return;
  }

  var func;
  var action = message.action || message;
  if ((func = engine.actionList[action]) !== undefined) {
    return func.call(engine.actionList, message, cb);
  }

  for (var moduleName in engine.modules) {
    var module = engine.modules[moduleName];
    if ((func = module[action]) !== undefined) {
      return func.call(module, message, cb);
    }
  }

  if ((func = utils[action]) !== undefined) {
    return func.call(utils, message, cb);
  }
};
engine.onMessage.stack = [];
engine.onMessage.ready = false;

engine.loadSettings = function(cb) {
  var varCache = engine.varCache;
  var preferences = engine.preferences;
  var defaultPreferences = engine.defaultPreferences;

  var keys = [];
  for (var key in defaultPreferences) {
    keys.push(key);
  }

  var preload = {
    cohort: function(value) {
      engine.cohort.data = value || {};
    },
    fromId: function(value) {
      if (value && isNaN(parseInt(value))) {
        value = undefined;
        mono.storage.remove('fromId');
      }
      varCache.fromId = value;
    },
    lastTrackTime: function(value) {
      varCache.lastTrackTime = value || 0;
    },
    trackTime: function(value) {
      varCache.trackTime = value || 0;
    },
    meta: function(value) {
      mono.extend(varCache.meta, value);
    },
    uuid: function(value) {
      engine.getUuid.uuid = value;
    },
    ummyDetected: function(value) {
      if (!value && value !== 0) {
        value = preferences.showUmmyInfo ? 0 : 1;
        mono.storage.set({ummyDetected: value});
      }
      preferences.ummyDetected = value;
    },
    country: function(value) {
      preferences.country = value;
    },
    lastCountryRequest: function(value) {
      "use strict";
      varCache.lastCountryRequest = value || 0;
    }
  };

  keys.push.apply(keys, Object.keys(preload));

  mono.storage.get(keys, function(storage) {
    var key;
    for (key in defaultPreferences) {
      var defaultValue = defaultPreferences[key];
      if (storage[key] === undefined) {
        storage[key] = defaultValue;
      } else
      if (typeof storage[key] === 'string' && typeof defaultValue === 'number') {
        var numValue = parseFloat(storage[key]);
        if (!isNaN(numValue)) {
          storage[key] = numValue;
        } else {
          console.error('Bad storage value!', key, storage[key]);
        }
      }
      preferences[key] = storage[key];
    }

    if (preferences.version === '0') {
      mono.storage.set({
        showTutorial: preferences.showTutorial = 1,
        showUmmyLanding: preferences.showUmmyLanding = 1
      });
    }

    for (key in preload) {
      preload[key](storage[key]);
    }

    if (mono.isChrome) {
      if (mono.isChromeVersion < 31) {
        preferences.downloads = false;
        preferences.moduleShowDownloadInfo = 0;
        preferences.iframeDownload = false;
      } else {
        preferences.downloads = chrome.downloads !== undefined;
        if (preferences.downloads) {
          preferences.moduleShowDownloadInfo = 0;
          preferences.iframeDownload = false;
        } else {
          preferences.iframeDownload = true;
        }
      }
    } else {
      preferences.moduleShowDownloadInfo = 0;
    }

    if (mono.isGM) {
      if (mono.isTM) {
        preferences.iframeDownload = true;
      }
      preferences.downloads = false;
      if ( typeof GM_download !== 'undefined' && (preferences.gmNativeDownload || (typeof GM_info !== 'undefined' && GM_info.downloadMode === 'browser'))) {
        preferences.gmNativeDownload = 1;
        preferences.downloads = true;
      }
    }

    if (mono.isFF && varCache.ffButton) {
      preferences.downloads = true;
    }

    cb();
  });
};

engine.expList = {};
engine.exp = {
  list: engine.expList,
  getExpIndex: function(type) {
    if (type === 'firstRun') {
      var value = mono.getRandomInt(0, 100);

      for (var index in this.list) {
        var item = this.list[index];
        if (value < item.percent) {
          return parseInt(index);
        }

        value -= item.percent;
      }
    }

    if (type === 'upgrade') {
      if (mono.isFF && Date.now() < (new Date('2016-03-25')).getTime()) {
        if (this.list[31]) {
          var value = mono.getRandomInt(0, 100);
          if (value < 15) {
            return 31;
          }
        }
      }
    }

    return 0;
  },
  disable: function() {
    if (engine.preferences.expIndex > 0) {
      engine.actionList.updateOption({key: 'expIndex', value: 0});
    }
  },
  cancel: function() {
    engine.preferences.expIndex = 0;
  },
  run: function(expIndex) {
    var varCache = engine.varCache;
    if (!this.list.hasOwnProperty(expIndex)) {
      this.disable();
      return;
    }
    if (varCache.meta.exp && varCache.meta.exp[expIndex] && varCache.meta.exp[expIndex].cancel) {
      this.cancel();
      return;
    }
    if (expIndex == 31 && Date.now() < (new Date('2016-03-31')).getTime()) {
      this.disable();
      return;
    }
    this.list[expIndex](engine.preferences, varCache);
  },
  initList: function(cb) {
    var preferences = engine.preferences;
    var varCache = engine.varCache;

    if (mono.isEmptyObject(this.list)) {
      this.disable();
      return cb();
    }

    if (!varCache.isFirstrun && !varCache.isUpgrade) {
      // just run
      this.run(preferences.expIndex);
      return cb();
    }

    if (!varCache.meta.exp) {
      this.disable();
      return cb();
    }

    var metaExpList = varCache.meta.exp;
    var expList = this.list;
    for (var index in expList) {
      var item = metaExpList[index];
      if (!item || !item.enable) {
        delete expList[index];
        continue;
      }
      var func;
      if ((func = expList[index].isAvailable) && !func.call(expList[index], preferences, varCache)) {
        delete expList[index];
        continue;
      }
      expList[index].percent = item.percent || 0;
    }

    var expIndex;
    if (varCache.isFirstrun) {
      // first run
      expIndex = this.getExpIndex('firstRun');

      if (expIndex > 0) {
        engine.actionList.updateOption({key: 'expIndex', value: expIndex});
      }
    } else
    if (varCache.isUpgrade) {
      // on update
      // check current experiment and run it
      if (preferences.expIndex > 0 && !this.list.hasOwnProperty(preferences.expIndex)) {
        this.disable();
      }

      if (preferences.expIndex === 0) {
        // exp is not set!
        expIndex = this.getExpIndex('upgrade');

        if (expIndex > 0) {
          engine.actionList.updateOption({key: 'expIndex', value: expIndex});
        }
      }
    }

    this.run(preferences.expIndex);

    return cb();
  }
};

engine.checkSovetnik = function() {
  "use strict";
  var preferences = engine.preferences;

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

  preferences.hasSovetnik = countryList.indexOf(preferences.country) !== -1;
  if (!preferences.hasSovetnik) {
    var navLang = engine.varCache.navigatorLanguage;
    navLang = navLang.substr(0, 2).toLowerCase();
    preferences.hasSovetnik = langList.indexOf(navLang) !== -1;
  }

  if (preferences.hasSovetnik) {
    if (mono.isOpera || mono.isChrome) {
      if (engine.sovetnikInit) {
        mono.asyncCall(function () {
          engine.sovetnikInit();
        });
      }
    }

    if (mono.isFF && !mono.ffNoStore) {
      if (engine.ffSovetnik && !engine.ffSovetnik.api.isReady) {
        engine.ffSovetnik.loadSovetnik();
      }
    }
  }

  engine.tabListener.addListener();

  engine.onEvent.fire('hasSovetnikUpdate');
};

engine.prepare = function(cb) {
  "use strict";
  var varCache = engine.varCache;

  engine.onEvent(['getHelperVersion'], function() {
    engine.getCountry();
  });

  engine.onEvent('loadSettings', function() {
    if (engine.sovetnikIsAvailable()) {
      engine.checkSovetnik();
      engine.onEvent('getCountry', engine.checkSovetnik);
    }
  });

  engine.onEvent(['loadLanguage', 'loadSettings', 'getHelperVersion'], function() {
    varCache.isFirstrun = engine.preferences.version === '0';
    varCache.isUpgrade = !varCache.isFirstrun && engine.preferences.version !== varCache.currentVersion;

    engine.getMeta(function() {
      engine.exp.initList(cb);
    }, varCache.isFirstrun || varCache.isUpgrade);
  });

  mono.asyncCall(function() {
    engine.loadLanguage(function(_language) {
      for (var key in _language) {
        engine.language[key] = _language[key];
      }
      engine.onEvent.ready('loadLanguage');
    });
  });

  mono.asyncCall(function() {
    engine.loadSettings(function() {
      engine.onEvent.ready('loadSettings');
    });
  });

  mono.asyncCall(function() {
    engine.getHelperVersion(function(version) {
      varCache.currentVersion = version || undefined;
      engine.onEvent.ready('getHelperVersion');
    });
  });
};

engine.initMessageListener = function() {
  if (engine.initMessageListener.fired) {
    return;
  }
  engine.initMessageListener.fired = 1;

  mono.onMessage.call({
    isBg: true
  }, function (message, response) {
    if (!Array.isArray(message)) {
      return engine.onMessage(message, response);
    }

    var countWait = message.length;
    var countReady = 0;
    var resultList = {};
    var ready = function (key, data) {
      countReady += 1;
      resultList[key] = data;
      if (countWait === countReady) {
        response(resultList);
      }
    };
    message.forEach(function (msg) {
      engine.onMessage(msg, function (data) {
        ready(msg.action || msg, data);
      });
    });
  });
};

engine.langNormalization = function(lang) {
  "use strict";
  lang = String(lang || '').toLowerCase();

  var m = lang.match(/\(([^)]+)\)/);
  m = m && m[1];
  if (m) {
    lang = m;
  }

  var tPos = lang.indexOf('-');
  if (tPos !== -1) {
    var left = lang.substr(0, tPos);
    var right = lang.substr(tPos + 1);
    if (left === right) {
      lang = left;
    } else {
      lang = left + '-' + right.toUpperCase();
    }
  }

  return lang;
};

engine.init = function() {
  engine.initMessageListener();

  var varCache = engine.varCache;
  var preferences = engine.preferences;

  var _navigator = (mono.isFF ? window.navigator : navigator);

  varCache.helperName = engine.getHelperName();
  varCache.navigatorLanguage = engine.langNormalization(_navigator.language);

  preferences.showUmmyItem = /^Win|^Mac/.test(_navigator.platform) ? 1 : 0;

  preferences.sfHelperName = varCache.helperName;

  if (/^firefox/.test(preferences.sfHelperName)) {
    preferences.sfHelperName = preferences.sfHelperName.replace('firefox', 'ff');
  }

  engine.onEvent.ready('init');

  engine.prepare(function(){
    var uuid = engine.getUuid();
    engine.metrika && engine.metrika.init(
      varCache.currentVersion, varCache.helperName,
      varCache.fromId, uuid,
      varCache.navigatorLanguage, engine.language.lang);
    engine.ga && engine.ga.init(
      varCache.currentVersion, varCache.helperName,
      varCache.fromId, uuid,
      varCache.navigatorLanguage, engine.language.lang);

    engine.checkVersion();

    engine.cohort.run();

    engine.onMessage.ready = true;
    while (engine.onMessage.stack.length > 0) {
      engine.onMessage.apply(null, engine.onMessage.stack.shift());
    }

    engine.onEvent.ready('prepare');
  });
};

mono.isModule && (function(origFunc) {
  engine.init = function(addon, button, monoLib) {
    engine.varCache.monoLib = monoLib;
    mono = mono.init(addon);
    var modules = engine.modules;
    modules.vimeo = require('./vimeo_com_embed.js').init(mono, engine);
    modules.dailymotion = require('./dailymotion_com_embed.js').init(mono, engine);
    modules.youtube = require('./youtube_com_embed.js').init(mono, engine);
    modules.soundcloud = require('./soundcloud_com_embed.js').init(mono, engine);
    modules.vkontakte = require('./vkontakte_ru_embed.js').init(mono, engine);
    modules.odnoklassniki = require('./odnoklassniki_ru_embed.js').init(mono, engine);
    modules.facebook = require('./facebook_com_embed.js').init(mono, engine);
    modules.mail_ru = require('./mail_ru_embed.js').init(mono, engine);
    utils = require('./utils.js').init(mono, engine);
    engine.varCache.ffButton = button;

    if (!engine.ffNoStore) {
      engine.ffSovetnik = require('./sovetnik.lib.init.js');
      engine.ffSovetnik.init(mono, engine);
    }

    engine.onEvent('prepare', function() {
      "use strict";
      require("sdk/timers").setTimeout(function() {
        monoLib.serviceList.backupStorage();
      }, 500);
    });

    monoLib.serviceList.restoreStorage(null, function() {
      origFunc();
    });
  };
})(engine.init);

engine.userTrack = function () {
  var now = Date.now();
  if (engine.varCache.trackTime > now) {
    return;
  }

  var next = function() {
    engine.sendScreenViewStats('init', {
      tid: 'UA-7055055-5'
    }, {
      id: 'init',
      onSuccess: function() {
        "use strict";
        engine.varCache.trackTime = String(now + 12 * 60 * 60 * 1000);
        mono.storage.set({trackTime: engine.varCache.trackTime});

        if (engine.preferences.cohortIndex) {
          engine.cohort.track.screen('init');
        }

        if (engine.preferences.expIndex && [13].indexOf(engine.preferences.expIndex) === -1) {
          engine.sendScreenViewStats('init', {
            tid: 'UA-7055055-11'
          });
        }

        engine.onEvent.fire('sendScreenView');
      }
    });
  };

  return engine.dblTrackCheck(next);
};

engine.sendScreenViewStats = function(screen, overParams, details) {
  overParams = overParams || {};
  var params = {
    t: 'screenview',
    cd: screen
  };

  var noRewrite = overParams.noRewrite;
  delete overParams.noRewrite;

  for (var key in overParams) {
    params[key] = overParams[key];
  }

  engine.sendStatsInfo(params, details);
};

engine.trackSocial = function(target, action, network) {
  var params = {
    st: target, // /home
    sa: action, // like
    sn: network, // facebook
    t: 'social'
  };

  engine.sendStatsInfo(params);
};

engine.trackEvent = function(category, action, label, overParams) {
  overParams = overParams || {};
  var params = {
    ec: category, // share-button
    ea: action, // click
    el: label, // vk
    t: 'event'
  };

  var noRewrite = overParams.noRewrite;
  delete overParams.noRewrite;

  if (!noRewrite && engine.preferences.expIndex && [13].indexOf(engine.preferences.expIndex) === -1) {
    overParams.tid = 'UA-7055055-11';
  }

  for (var key in overParams) {
    params[key] = overParams[key];
  }

  engine.sendStatsInfo(params);
};

engine.sendStatsInfo = function(params, details) {
  if(!params.t) {
    return;
  }

  var defaultParams = {
    v: 1,
    ul: engine.varCache.navigatorLanguage,
    tid: 'UA-67738130-2',
    cid: engine.getUuid(),
    cd3: engine.language.lang,

    an: 'helper',
    aid: engine.varCache.helperName,
    av: engine.varCache.currentVersion
  };

  for (var key in defaultParams) {
    if(!params.hasOwnProperty(key)) {
      params[key] = defaultParams[key];
    }
  }

  var preferences = engine.preferences;

  if (preferences.expIndex) {
    params.cd1 = 'test_' + preferences.expIndex;
  }

  if (engine.varCache.fromId) {
    params.cd2 = engine.varCache.fromId;
  }

  if (preferences.hasSovetnik) {
    params.cd4 = preferences.sovetnikEnabled ? 'true' : 'false';
  }

  if (preferences.hasDP) {
    params.cd5 = preferences.sovetnikEnabled ? 'true' : 'false';
  }

  params.cd6 = preferences.ummyDetected ? 'true' : preferences.showUmmyItem ? 'false' : 'none';

  if (preferences.hasAviaBar) {
    params.cd7 = preferences.aviaBarEnabled ? 'true' : 'false';
  }

  engine.sendInGa(params, details);
};

engine.checkVersion = function () {
  var needSaveVersion = false;
  if(engine.varCache.isFirstrun) {
    engine.onEvent.ready('firstrun');

    needSaveVersion = true;
  } else
  if(engine.varCache.isUpgrade) {
    engine.onEvent.ready('upgrade');

    needSaveVersion = true;
  }

  if (needSaveVersion) {
    engine.actionList.updateOption({key: 'version', value: engine.varCache.currentVersion});
  }
};

engine.onEvent('firstrun', function() {
  "use strict";
  if (mono.isGM) {
    return;
  }

  if (mono.isFF && !engine.varCache.ffButton) {
    return;
  }

  var url = 'http://savefrom.net/user.php?helper=' + engine.preferences.sfHelperName + ';firstrun';

  utils.checkUrlsOfOpenTabs([
    /https?:\/\/([\w\-]+\.)?savefrom\.net\/(update-helper|userjs-setup)\.php/i
  ], function(foundUrls) {
    if (foundUrls.length > 0) {
      return;
    }

    utils.checkUrlsOfOpenTabs([
      /https?:\/\/legal\.yandex\.(ru|com\.tr)\//i
    ], function(foundUrls) {
      var active = foundUrls.length === 0;
      mono.openTab(url, active, active);
    });
  });
});

engine.onEvent('prepare', function() {
  "use strict";
  var preferences = engine.preferences;

  if (preferences.showTutorial) {
    mono.storage.get(['onceYtTutorial', 'onceYtTutorialTooltip'], function(storage) {
      if (storage.onceYtTutorial && storage.onceYtTutorialTooltip) {
        mono.storage.set({showTutorial: preferences.showTutorial = 0});
        return;
      }

      if (!storage.onceYtTutorial) {
        engine.actionList.setIconBadge({text: '?'});
      }
    });
  }

  if (preferences.showUmmyLanding) {
    mono.storage.get(['onceUmmyLandingHide'], function(storage) {
      if (storage.onceUmmyLandingHide > 2) {
        mono.storage.set({showUmmyLanding: preferences.showUmmyLanding = 0});
      }
    });
  }
});

engine.onEvent('prepare', function() {
  "use strict";
  if (!mono.isChrome && !mono.isFF) {
    return;
  }

  engine.tabListener.addListener();
});

engine.onEvent('init', function() {
  "use strict";
  if (!mono.isChrome || !chrome.runtime || !chrome.runtime.setUninstallURL) {
    return;
  }

  var varCache = engine.varCache;
  var preferences = engine.preferences;

  var updateUrl = function() {
    var uninstallUrl = 'http://savefrom.net/goodbye.php';

    var params = mono.param({
      version: varCache.currentVersion,
      language: engine.language.lang,
      appid: varCache.helperName,
      country: preferences.country
    });

    var url = (uninstallUrl + '?' + params).substr(0, 255);
    chrome.runtime.setUninstallURL(url);
  };

  updateUrl();

  engine.onEvent('prepare', function() {
    updateUrl();
  });

  engine.onEvent('getCountry', function() {
    updateUrl();
  });
});

engine.onEvent('prepare', function() {
  "use strict";
  if (!mono.isOpera) {
    return;
  }

  engine.operaShowButton(engine.preferences.button);
});

engine.onEvent('prepare', function() {
  "use strict";
  if (!mono.isGM) {
    return;
  }

  if (!mono.isIframe()) {
    engine.menuCommands.register(_moduleName);

    if (engine.preferences.button && engine.preferences[engine.preferenceMap[_moduleName]] || _moduleName === 'savefrom') {
      engine.gmShowButton(1);
    }
  }
});

engine.menuCommands = {
  commands: [
    {
      id: 'downloadFromCurrentPage',
      command: function() {
        engine.actionList.downloadFromCurrentPage();
      }
    }, {
      id: 'updateLinks',
      notify: 'updateLinksNotification',
      modules: ['vk', 'odnoklassniki', 'facebook', 'lm',
        'youtube',
        'dailymotion', 'instagram', 'rutube']
    }, {
      id: 'downloadMP3Files',
      modules: ['vk', 'odnoklassniki', 'mailru']
    }, {
      id: 'downloadPlaylist',
      modules: ['vk', 'odnoklassniki', 'mailru']
    }, {
      id: 'downloadPhotos',
      modules: ['vk']
    }, {
      id: 'showOptions',
      command: function() {
        _options.show();
      }
    }, {
      id: 'reportBug',
      command: function() {
        engine.actionList.reportBug();
      }
    }, {
      id: 'enableDisableModule',
      command: function() {
        engine.actionList.getActiveTabInfo(undefined, function(tabInfo) {
          tabInfo = tabInfo || {};
          var state = tabInfo.state ? 0 : 1;
          engine.actionList.viaMenu_changeState({state: state, prefKey: tabInfo.prefKey, moduleName: tabInfo.moduleName});
          if (state) {
            if (engine.preferences.button === 1) {
              engine.gmShowButton(1);
            } else {
              engine.gmShowButton(0);
            }
          } else {
            engine.gmShowButton(0);
          }
        });
      }
    }, {
      id: 'showHideButton',
      command: function() {
        var hiddenBtn = _menu.menu === null;
        engine.actionList.updateOption({action: 'updateOption', key: 'button', value: hiddenBtn ? 1 : 0});
      }
    }
  ],
  registerModule: function (params) {
    if (typeof GM_registerMenuCommand === 'undefined') {
      return;
    }

    var strId = params.id;

    var name = engine.language[strId];

    if(params.command) {
      return GM_registerMenuCommand(name, params.command);
    }

    var fn = function() {
      engine.onMessage({action: ( params.modules !== undefined ? 'viaMenu_' : '' ) + params.id});

      if(params.notify && typeof GM_notification !== 'undefined') {
        GM_notification(engine.language[params.notify], null, null, null, 3000);
      }
    };

    return GM_registerMenuCommand(name, fn);
  },
  register: function (moduleName) {
    var hasRmFunc = typeof GM_unregisterMenuCommand !== "undefined";
    for (var i = 0, item; item = this.commands[i]; i++) {
      if (hasRmFunc) {
        if (item.gmId) {
          GM_unregisterMenuCommand(item.gmId);
        }
      } else
      if (item.hasOwnProperty("gmId")) {
        continue;
      }

      if (!item.modules || item.modules.indexOf(moduleName) > -1) {
        item.gmId = this.registerModule(item);
      }
    }
  }
};

engine.chromeNoStore = true;
engine.onEvent('prepare', function() {
  "use strict";
  engine.checkUpdate();
});

engine.checkUpdate = function() {
  "use strict";
  engine.varCache.lastVersion = undefined;
  var typeList = engine.checkUpdate.typeList;
  var type = (mono.isChrome && !engine.isOperaNext) ? 'chrome' : (mono.isFF && engine.ffNoStore) ? 'ff' : mono.isGM ? 'gm' : mono.isSafari ? 'safari' : undefined;
  if (!typeList[type]) {
    return;
  }

  var requestVersion = function() {
    mono.request({
      type: 'GET',
      url: typeList[type].url,
      cache: false
    }, function(err, resp, data) {
      if (err || !data) {
        return;
      }

      var version = typeList[type].getVersion(data);
      if (!version) {
        return;
      }

      engine.varCache.lastVersion = version;

      mono.storage.setExpire({
        lastVersion: version
      }, 604800);
    });
  };

  mono.storage.getExpire(['lastVersion'], function(storage) {
    if (engine.varCache.isUpgrade) {
      delete storage.lastVersion;
    }

    if (storage.hasOwnProperty('lastVersion')) {
      engine.varCache.lastVersion = storage.lastVersion;
      return;
    }

    storage.lastVersion = '';
    mono.storage.setExpire(storage, 86400);

    requestVersion();
  });
};

engine.checkUpdate.typeList = {
  chrome: {
    url: 'http://download.sf-helper.com/chrome/updates-3.xml',
    getVersion: function(data) {
      var version = data.match(/updatecheck.+version=['"](.+)['"]/);
      version = version && version[1];
      if (!version) {
        return;
      }
      return version;
    }
  },
  ff: {
    url: 'https://download.sf-helper.com/mozilla/update.rdf',
    getVersion: function(data) {
      var version = data.match(/<em:version>(.+)<\/em:version>/);
      version = version && version[1];
      if (!version) {
        return;
      }
      return version;
    }
  },
  safari: {
    url: 'https://download.sf-helper.com/safari/update.plist',
    getVersion: function(data) {
      var pos = data.indexOf('<key>CFBundleVersion</key>');
      if (pos === -1) {
        return;
      }
      data = data.substr(pos);
      var version = data.match(/<string>(.+)<\/string>/);
      version = version && version[1];
      if (!version) {
        return;
      }
      return version;
    }
  },
  gm: {
    url: 'https://download.sf-helper.com/chrome/helper.meta.js',
    getVersion: function(data) {
      var version = data.match(/@version\s+(.+)\s*\r?\n/);
      version = version && version[1];
      if (!version) {
        return;
      }
      return version;
    }
  }
};
engine.forceMetaRequest = true;
engine.onEvent('init', function() {
  "use strict";
  if (mono.isFF && !engine.varCache.ffButton) {
    return;
  }

  var language = engine.language;
  var preferences = engine.preferences;
  var meta = engine.varCache.meta;

  var isDeny = function() {
    if (!preferences.hasDP || !preferences.sovetnikEnabled) {
      return true;
    }

    return false;
  };

  var updateState = function() {
    delete engine.tabListener.extendJsList.dp;

    engine.onEvent('loadLanguage', function() {
      if (!language.origOptionsSovetnikEnabled) {
        language.origOptionsSovetnikEnabled = language.optionsSovetnikEnabled;
      }

      if (preferences.hasDP) {
        language.optionsSovetnikEnabled = 'Offers4U';
      } else {
        language.optionsSovetnikEnabled = language.origOptionsSovetnikEnabled;
      }
    });

    if (isDeny()) {
      return;
    }

    engine.tabListener.extendJsList.dp = dp;

    if (mono.isGM && meta.dp && meta.dp.listExp) {
      preferences.dpListExp = 1;
    }

    engine.tabListener.addListener();
  };

  var dp = {
    getScriptList: function() {
      var list = [];

      if (isDeny()) {
        updateState();
        return list;
      }

      list.push('includes/advisor-sf.js');

      return list;
    }
  };

  var checkCountry = function() {
    var countryList = [
      'ar', 'au', 'at', 'be',
      'br', 'ca', 'co', 'cz',
      'dk', 'fr', 'de', 'hk',
      'hu', 'in', 'id', 'it',
      'jp', 'ke', 'my', 'mx',
      'nl', 'nz', 'ng', 'no',
      'ph', 'pl', 'pt', 'ro',
      'rs', 'sg', 'sk', 'za',
      'es', 'se', 'th', 'gb',
      'us'
    ];

    if (countryList.indexOf(preferences.country) !== -1) {
      return true;
    }

    return false;
  };

  engine.onOptionChange.sovetnikEnabled.dpOnChange = function() {
    updateState();
  };

  var dpIsAvailable = function() {
    if (preferences.hasSovetnik) {
      preferences.hasDP = 0;
    } else
    if (meta.dp && (!meta.dp.enable || meta.dp.cancel)) {
      preferences.hasDP = 0;
    } else {
      preferences.hasDP = checkCountry() ? 1 : 0;
    }
  };

  engine.onEvent('loadSettings', function() {
    var onGetCountry = function() {
      dpIsAvailable();

      updateState();
    };

    onGetCountry();

    engine.onEvent('getCountry', function() {
      onGetCountry();
    });
  });

  engine.onEvent('getMeta', function() {
    dpIsAvailable();

    updateState();
  });

  engine.onEvent.addListener('hasSovetnikUpdate', function() {
    dpIsAvailable();

    updateState();
  });
});
engine.expList[13] = function() {
  engine.metrika = {
    counter: 30098829,
    params: {},
    formatDate: function(date, format) {
      function leadZero(str) {
        return str.length > 1 ? str : "0" + str;
      }

      function formatCode(match, code) {
        switch (code) {
          case "d":
            return date.getDate();
          case "D":
            return leadZero("" + date.getDate());
          case "m":
            return date.getMonth() + 1;
          case "M":
            return leadZero("" + (date.getMonth() + 1));
          case "y":
            return ("" + date.getFullYear()).substr(2, 2);
          case "Y":
            return date.getFullYear();
          case "h":
            return date.getHours();
          case "H":
            return leadZero("" + date.getHours());
          case "n":
            return date.getMinutes();
          case "N":
            return leadZero("" + date.getMinutes());
          case "s":
            return date.getSeconds();
          case "S":
            return leadZero("" + date.getSeconds());
          case "%":
            return "%";
          default:
            return code;
        }
      }

      return format.replace(/%([dDmMyYhHnNsS%])/g, formatCode);
    },
    sendParamRequest: function(msg) {
      var msgWithLine = msg;
      var siteInfo = {};
      siteInfo[this.params.helperVersion] = {};
      siteInfo[this.params.helperVersion][msgWithLine] = {
        id: this.params.uuid,
        lang: this.params.language,
        helperName: this.params.helperName,
        vid: this.params.fromId
      };
      var postData = {
        "browser-info": [
          "ar:1",
          "en:utf-8",
          "i:" + this.formatDate(new Date(), "%Y%M%D%H%N%S"),
          "js:1",
          "la:" + this.params.locale,
          "rn:" + Math.round(Math.random() * 100000),
          "wmode:1"
        ].join(":"),
        "site-info": JSON.stringify(siteInfo)
      };
      mono.request({
        type: "POST",
        url: "https://mc.yandex.ru/watch/" + this.counter + "/1",
        data: postData
      });
    },
    init: function(helperVersion, helperName, fromId, uuid, locale, language) {
      this.params.helperVersion = helperVersion;
      this.params.helperName = helperName;
      this.params.fromId = fromId;
      this.params.uuid = uuid;
      this.params.locale = locale;
      this.params.language = language;
    }
  };

  engine.ga = {
    params: {},
    sendScreenViewStats: function(screenName) {
      var params = {
        t: 'screenview',
        cd: screenName
      };

      this.sendStatsInfo(params);
    },
    sendStatsInfo: function(params) {
      var defaultParams = {
        v: 1,
        ul: this.params.locale,
        tid: 'UA-7055055-13',
        cid: this.params.uuid,
        cd3: this.params.language,
        cd2: this.params.fromId,

        an: 'helper',
        aid: this.params.helperName,
        av: this.params.helperVersion
      };

      for (var key in defaultParams) {
        if(!params.hasOwnProperty(key)) {
          params[key] = defaultParams[key];
        }
      }

      mono.request({
        url: 'https://www.google-analytics.com/collect?z='+Date.now(),
        type: 'POST',
        data: params
      });
    },
    init: function(helperVersion, helperName, fromId, uuid, locale, language) {
      this.params.helperVersion = helperVersion;
      this.params.helperName = helperName;
      this.params.fromId = fromId;
      this.params.uuid = uuid;
      this.params.locale = locale;
      this.params.language = language;
    }
  };
};
engine.onEvent('init', function() {
  "use strict";
  if (mono.isFF && !engine.varCache.ffButton) {
    return;
  }

  var preferences = engine.preferences;

  var isDeny = function() {
    if (!preferences.hasAviaBar || !preferences.aviaBarEnabled) {
      return true;
    }

    return false;
  };

  var updateState = function() {
    delete engine.tabListener.extendJsList.aviaBar;

    if (isDeny()) {
      return;
    }

    engine.tabListener.extendJsList.aviaBar = aviaBar;

    engine.tabListener.addListener();
  };

  var aviaBar = {
    matchCache: /null/,
    includeList: [
      '*://*.ozon.travel/*',
      '*://*.onetwotrip.com/*',
      '*://*.skyscanner.*/*',
      '*://*.aeroflot.ru/*',
      '*://*.momondo.*/*',
      '*://*.anywayanyday.com/*',
      '*://*.svyaznoy.travel/*',
      '*://avia.tickets.ru/*',
      '*://*.s7.ru/*',
      '*://*.kupibilet.ru/*',
      '*://*.trip.ru/*',
      '*://*.sindbad.ru/*',
      '*://*.aviakassa.ru/*',
      '*://*.biletix.ru/*',
      '*://*.utair.ru/*',

      '*://*.kayak.*/*',
      '*://*.orbitz.com/*',
      '*://*.travelocity.com/*',
      '*://*.expedia.com/*',
      '*://*.priceline.com/*',

      '*://*.booking.*/*',
      '*://*.agoda.*/*',
      '*://*.hotels.com/*',
      '*://*.ostrovok.ru/*',
      '*://*.travel.ru/*',
      '*://*.oktogo.ru/*',
      '*://*.roomguru.ru/*',
      '*://*.tripadvisor.ru/*',
      '*://*.hilton.com/*',
      '*://*.marriott.com/*'
    ],
    getScriptList: function(url) {
      var list = [];

      if (isDeny()) {
        updateState();
        return list;
      }

      if (this.matchCache.test(url)) {
        list.push('includes/components.js');
        list.push('includes/aviaBar.js');
      }
      return list;
    }
  };

  aviaBar.matchCache = aviaBar.includeList.map(function(pattern) {
    return mono.urlPatternToStrRe(pattern);
  }).join('|');
  aviaBar.matchCache = new RegExp(aviaBar.matchCache);

  var checkCountry = function() {
    var countryList = [
      'ru', 'by', 'kz', 'ua', 'us', 'id', 'in', 'th'
    ];

    if (countryList.indexOf(preferences.country) !== -1) {
      return true;
    }

    var lang2country = {
      be: 'by', kk: 'kz', ru: 'ru', uk: 'ua', 'en': 1
    };

    var country = lang2country[engine.varCache.navigatorLanguage.substr(0, 2).toLowerCase()];
    if (country) {
      return true;
    }
  };

  engine.onOptionChange.aviaBarEnabled = function() {
    updateState();
  };

  engine.onEvent('loadSettings', function() {
    var onGetCountry = function() {
      preferences.hasAviaBar = checkCountry() ? 1 : 0;

      if (preferences.hasAviaBar && engine.varCache.onceTrackAviaBar === undefined) {
        mono.storage.get('onceTrackAviaBar', function(storage) {
          var value = storage.onceTrackAviaBar;
          if (!value && value !== 0) {
            if (mono.getRandomInt(0, 100) < 10) {
              value = 1;
            } else {
              value = 0;
            }
            mono.storage.set({onceTrackAviaBar: value});
          }
          engine.varCache.onceTrackAviaBar = value;
        });
      }

      updateState();
    };

    onGetCountry();

    engine.onEvent(['getCountry'], function() {
      onGetCountry();
    });

    engine.onEvent.addListener('sendScreenView', function () {
      if (preferences.hasAviaBar && engine.varCache.onceTrackAviaBar) {
        engine.sendScreenViewStats('init', {
          tid: 'UA-70432435-1'
        });
      }
    });
  });
});
engine.errorCache = {
  expMode: false,
  onError: function(e) {
    "use strict";
    var filename = e.filename;
    var message = e.message;

    if (!filename || !message) {
      return;
    }

    filename = String(filename).match(/\/([^\/]+)$/);
    filename = filename && filename[1];
    if (!filename) {
      return;
    }

    if (e.lineno) {
      filename += ':' + e.lineno;
    }

    engine.actionList.trackError({
      desc: [filename, message].join(' ')
    });
  },
  enable: function() {
    "use strict";
    if (typeof window === 'undefined' || !window.addEventListener) {
      return;
    }

    window.addEventListener('error', this.onError);
  },
  disable: function() {
    "use strict";
    if (typeof window === 'undefined' || !window.addEventListener) {
      return;
    }

    window.removeEventListener('error', this.onError);
  }
};

engine.expList[24] = function() {
  "use strict";
  engine.errorCache.expMode = true;
  engine.errorCache.enable();
};

(function() {
  "use strict";
  engine.errorCache.enable();
})();

engine.onEvent('prepare', function() {
  "use strict";
  if (engine.errorCache.expMode) {
    return;
  }

  engine.errorCache.disable();
});
//@insert

if (mono.isModule) {
  exports.init = engine.init;
} else
mono.onReady(function() {
  if (mono.isGM) {
    engine.initMessageListener();
  } else {
    engine.init();
  }
});