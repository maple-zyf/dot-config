// ==UserScript==
// @name        Mono
//
// @exclude     file://*
// @exclude     http://google.*/*
// @exclude     http://*.google.*/*
// @exclude     https://google.*/*
// @exclude     https://*.google.*/*
//
// ==/UserScript==

/**
 *
 * Created by Anton on 21.06.2014.
 *
 * Mono cross-browser engine.
 *
 **/

var mono = (typeof mono !== 'undefined') ? mono : undefined;

(function(window, base, factory) {
  "use strict";
  if (mono && mono.isLoaded) {
    return;
  }

  if (typeof window !== "undefined") {
    return mono = base(factory.bind(null, null, factory), mono);
  }

}(
typeof window !== "undefined" ? window : undefined,
function base(factory, _mono) {
  if (['interactive', 'complete'].indexOf(document.readyState) !== -1) {
    return factory(null, _mono);
  }

  var objCreate = function(o) {
    if (typeof Object.create === 'function') {
      return Object.create(o);
    }
    var a = function(){};a.prototype = o;return new a();
  };

  var base = objCreate({
    isLoaded: true,
    onReadyStack: [],
    onReady: function() {
      base.onReadyStack.push([this, arguments]);
    },
    loadModuleStack: [],
    loadModule: function() {
      base.loadModuleStack.push([this, arguments]);
    }
  });

  var onLoad = function() {
    document.removeEventListener('DOMContentLoaded', onLoad, false);
    window.removeEventListener('load', onLoad, false);

    mono = factory(null, _mono);

    for (var key in base) {
      if (base.hasOwnProperty(key)) {
        mono[key] = base[key];
      }
    }

    var item;
    while (item = base.onReadyStack.shift()) {
      mono.onReady.apply(item[0], item[1]);
    }

    while (item = base.loadModuleStack.shift()) {
      mono.loadModule.apply(item[0], item[1]);
    }
  };

  document.addEventListener('DOMContentLoaded', onLoad, false);
  window.addEventListener('load', onLoad, false);

  return base;
},
function initMono(_addon, _mono) {
  var require;

  /*@if isVkOnly=0>*/
  var checkCompatibility = function() {
    if (typeof navigator === 'undfiend') {
      return;
    }
    var userAgent = navigator.userAgent;
    var version;
    if (mono.isTM || mono.isChrome || mono.isVM) {
      version = userAgent.match(/Chrome\/(\d+)/i);
      version = version && parseInt(version[1]);

      if (isNaN(version)) {
        return;
      }

      mono.isChromeVersion = version;
      if (version < 31) {
        mono.noMouseEnter = true;
        mono.noXhrJson = true;
      }
    } else
    if (mono.isSafari) {
      version = userAgent.match(/Version\/(\d+).+Safari/i);
      version = version && parseInt(version[1]);

      if (isNaN(version)) {
        return;
      }

      mono.isSafariVersion = version;
      if (version < 7) {
        mono.noMouseEnter = true;
        mono.noXhrJson = true;
        mono.badXhrHeadRedirect = true;
      }
    }
  };
  /*@if isVkOnly=0<*/

  var mono = {
    isLoaded: true,
    emptyFunc: function() {},
    msgType: undefined,
    storageType: undefined,
    msgList: {},
    storageList: {},
    onReady: function(cb) {
      cb();
    }
  };

  (function browserDefine() {

      mono.isChrome = true;
      mono.isChromeInject = !chrome.hasOwnProperty('tabs');
      mono.msgType = 'chrome';

      if (!(chrome.hasOwnProperty('runtime') && chrome.runtime.onMessage)) {
        mono.msgType = 'oldChrome';
      }

      /*@if isVkOnly=0>*/
      checkCompatibility();

      if (mono.isChromeVersion > 24 && mono.isChromeVersion < 32) {
        mono.msgType = 'oldChrome';
      }

      /*@if isVkOnly=0<*/
      return;

  })();

  mono.cloneObj = function(obj) {
    return JSON.parse(JSON.stringify(obj));
  };

  var msgTools = {
    cbObj: {},
    cbStack: [],
    id: 0,
    idPrefix: Math.floor(Math.random() * 1000) + '_',
    aliveTime: 120 * 1000,
    addCb: function(message, cb) {
      mono.onMessage.count === 0 && mono.onMessage(mono.emptyFunc);

      if (this.cbStack.length > mono.messageStack) {
        this.clean();
      }
      var id = message.callbackId = this.idPrefix + (++this.id);
      this.cbObj[id] = {
        fn: cb,
        time: Date.now()
      };
      this.cbStack.push(id);
    },
    callCb: function(message) {
      var cb = this.cbObj[message.responseId];
      if (cb === undefined) return;
      delete this.cbObj[message.responseId];
      this.cbStack.splice(this.cbStack.indexOf(message.responseId), 1);
      cb.fn(message.data);
    },
    mkResponse: function(response, callbackId, responseMessage) {
      responseMessage = {
        data: responseMessage,
        responseId: callbackId
      };
      response(responseMessage);
    },
    clearCbStack: function() {
      for (var item in this.cbObj) {
        delete this.cbObj[item];
      }
      this.cbStack.splice(0);
    },
    removeCb: function(cbId) {
      var cb = this.cbObj[cbId];
      if (cb === undefined) return;
      delete this.cbObj[cbId];
      this.cbStack.splice(this.cbStack.indexOf(cbId), 1);
    },
    clean: function(aliveTime) {
      var now = Date.now();
      aliveTime = aliveTime || this.aliveTime;
      for (var item in this.cbObj) {
        if (this.cbObj[item].time + aliveTime < now) {
          delete this.cbObj[item];
          this.cbStack.splice(this.cbStack.indexOf(item), 1);
        }
      }
    }
  };

  mono.messageStack = 50;
  mono.msgClearStack = msgTools.clearCbStack.bind(msgTools);
  mono.msgRemoveCbById = msgTools.removeCb.bind(msgTools);
  mono.msgClean = msgTools.clean.bind(msgTools);

  mono.sendMessage = function(message, cb, hook) {
    message = {
      data: message,
      hook: hook
    };
    if (cb) {
      msgTools.addCb(message, cb.bind(this));
    }
    mono.sendMessage.send.call(this, message);

    return message.callbackId;
  };

  mono.sendMessageToActiveTab = function(message, cb, hook) {
    message = {
      data: message,
      hook: hook
    };
    if (cb) {
      msgTools.addCb(message, cb.bind(this));
    }
    mono.sendMessage.sendToActiveTab.call(this, message);

    return message.callbackId;
  };

  mono.sendHook = {};

  mono.onMessage = function(cb) {
    var index = mono.onMessage.count++;
    var func = mono.onMessage.wrapFunc.bind(this, cb, index);
    cb.monoCbId = index;
    mono.onMessage.on.call(this, mono.onMessage.wrapper[index] = func);
  };
  mono.onMessage.count = 0;
  mono.onMessage.wrapper = {};
  mono.onMessage.wrapFunc = function(cb, index, message, response) {
    if (message.responseId !== undefined) {
      return msgTools.callCb(message);
    }
    if (message.data === undefined) {
      return;
    }
    var mResponse;
    if (message.callbackId === undefined) {
      mResponse = mono.emptyFunc;
    } else {
      mResponse = msgTools.mkResponse.bind(msgTools, response.bind(this), message.callbackId);
    }
    if (message.hook !== undefined) {
      var hookFunc = mono.sendHook[message.hook];
      if (hookFunc) {
        return index === 0 && hookFunc(message.data, mResponse);
      }
    }
    cb.call(this, message.data, mResponse);
  };

  mono.offMessage = function(cb) {
    var func = mono.onMessage.wrapper[cb.monoCbId];
    if (func === undefined) {
      return;
    }
    delete mono.onMessage.wrapper[cb.monoCbId];
    delete cb.monoCbId;
    mono.onMessage.off(func);
  };

  mono.msgList.chrome = function() {
    var lowLevelHook = {};

    var chromeMsg = {
      cbList: [],
      mkResponse: function(sender) {
        if (sender.tab) {
          return function(message) {
            chromeMsg.sendTo(message, sender.tab.id);
          }
        }

        return function(message) {
          chromeMsg.send(message);
        }
      },
      sendTo: function(message, tabId) {
        chrome.tabs.sendMessage(tabId, message);
      },
      onMessage: function(message, sender, _response) {
        if (mono.isChromeBgPage) {
          if (message.fromBgPage === 1) {
            return;
          }
        } else if (message.toBgPage === 1) {
          return;
        }

        if (message.hook !== undefined) {
          var hookFunc = lowLevelHook[message.hook];
          if (hookFunc !== undefined) {
            return hookFunc(message, sender, _response);
          }
        }

        var response = chromeMsg.mkResponse(sender);
        for (var i = 0, cb; cb = chromeMsg.cbList[i]; i++) {
          cb(message, response);
        }
      },
      on: function(cb) {
        chromeMsg.cbList.push(cb);
        if (chromeMsg.cbList.length !== 1) {
          return;
        }
        chrome.runtime.onMessage.addListener(chromeMsg.onMessage);
      },
      off: function(cb) {
        var cbList = chromeMsg.cbList;
        var pos = cbList.indexOf(cb);
        if (pos === -1) {
          return;
        }
        cbList.splice(pos, 1);
        if (cbList.length !== 0) {
          return;
        }
        chrome.runtime.onMessage.removeListener(chromeMsg.onMessage);
      },
      sendToActiveTab: function(message) {
        chrome.tabs.query({
          active: true,
          currentWindow: true
        }, function(tabs) {
          if (tabs[0] === undefined || tabs[0].id < 0) {
            return;
          }
          chromeMsg.sendTo(message, tabs[0].id);
        });
      },
      send: function(message) {
        if (mono.isChromeBgPage) {
          message.fromBgPage = 1;
        } else {
          message.toBgPage = 1;
        }
        chrome.runtime.sendMessage(message);
      }
    };

    chromeMsg.on.lowLevelHook = lowLevelHook;

    if (chrome.runtime.hasOwnProperty('getBackgroundPage')) {
      mono.isChromeBgPage = location.href.indexOf('_generated_background_page.html') !== -1;

      chrome.runtime.getBackgroundPage(function(bgWin) {
        if (bgWin !== window) {
          delete mono.isChromeBgPage;
        } else {
          mono.isChromeBgPage = true;
        }

      });

    }

    mono.onMessage.on = chromeMsg.on;
    mono.onMessage.off = chromeMsg.off;
    mono.sendMessage.send = chromeMsg.send;
    mono.sendMessage.sendToActiveTab = chromeMsg.sendToActiveTab;
  };

  mono.msgList.oldChrome = function() {
    var lowLevelHook = {};

    var chromeMsg = {
      cbList: [],
      mkResponse: function(sender, _response) {
        if (sender.tab && sender.tab.id > -1) {
          return function(message) {
            chromeMsg.sendTo(message, sender.tab.id);
          }
        }

        return function(message) {
          _response(message);
        }
      },
      sendTo: function(message, tabId) {
        chrome.tabs.sendRequest(tabId, message, function(message) {
          if (message && message.responseId !== undefined) {
            return msgTools.callCb(message);
          }
        });
      },
      onMessage: function(message, sender, _response) {
        if (mono.isChromeBgPage) {
          if (message.fromBgPage === 1) {
            return;
          }
        } else if (message.toBgPage === 1) {
          return;
        }

        if (message.hook !== undefined) {
          var hookFunc = lowLevelHook[message.hook];
          if (hookFunc !== undefined) {
            return hookFunc(message, sender, _response);
          }
        }

        var response = chromeMsg.mkResponse(sender, _response);
        for (var i = 0, cb; cb = chromeMsg.cbList[i]; i++) {
          cb(message, response);
        }
      },
      on: function(cb) {
        chromeMsg.cbList.push(cb);
        if (chromeMsg.cbList.length !== 1) {
          return;
        }
        chrome.extension.onRequest.addListener(chromeMsg.onMessage);
      },
      off: function(cb) {
        var cbList = chromeMsg.cbList;
        var pos = cbList.indexOf(cb);
        if (pos === -1) {
          return;
        }
        cbList.splice(pos, 1);
        if (cbList.length !== 0) {
          return;
        }
        chrome.extension.onRequest.removeListener(chromeMsg.onMessage);
      },
      sendToActiveTab: function(message) {
        chrome.tabs.query({
          active: true,
          currentWindow: true
        }, function(tabs) {
          if (tabs[0] === undefined || tabs[0].id < 0) {
            return;
          }
          chromeMsg.sendTo(message, tabs[0].id);
        });
      },
      send: function(message) {
        if (mono.isChromeBgPage) {
          message.fromBgPage = 1;
        } else {
          message.toBgPage = 1;
        }
        chrome.extension.sendRequest(message, function(message) {
          if (message && message.responseId !== undefined) {
            return msgTools.callCb(message);
          }
        });
      }
    };

    chromeMsg.on.lowLevelHook = lowLevelHook;

    try {
      if (chrome.runtime.getBackgroundPage !== undefined) {
        mono.isChromeBgPage = location.href.indexOf('_generated_background_page.html') !== -1;

        chrome.runtime.getBackgroundPage(function(bgWin) {
          if (bgWin !== window) {
            delete mono.isChromeBgPage;
          } else {
            mono.isChromeBgPage = true;
          }
        });

      }
    } catch (e) {
    }

    mono.onMessage.on = chromeMsg.on;
    mono.onMessage.off = chromeMsg.off;
    mono.sendMessage.send = chromeMsg.send;
    mono.sendMessage.sendToActiveTab = chromeMsg.sendToActiveTab;
  };

  var initFunc = mono.msgList[mono.msgType];
  if (initFunc !== undefined) {
    initFunc();
  } else {
    console.error('Msg transport is not defined!');
  }
  initFunc = undefined;
  mono.msgList = undefined;

  (function storageDefine() {

    /*
      chrome 24-31 fix
      chrome.storage !== undefined
     */
    if (mono.isChrome && chrome.hasOwnProperty('storage') && chrome.storage !== undefined) {
      mono.storageType = 'chrome';
      return;
    }

    mono.storageType = 'localStorage';

  })();

  mono.storageList.chrome = function() {
    mono.storage = chrome.storage.local;
    mono.storage.local = mono.storage;
    mono.storage.sync = chrome.storage.sync;
  };

  mono.storageList.localStorage = mono.storageList.operaPreferences = function() {
    var getLocalStorage = function(localStorage) {
      var localStorageMode = {
        getObj: function(key) {
          var index = 0;
          var keyPrefix = localStorageMode.chunkPrefix + key;
          var chunk = localStorage[keyPrefix + index];
          var data = '';
          while (chunk !== undefined) {
            data += chunk;
            index++;
            chunk = localStorage[keyPrefix + index];
          }
          var value = undefined;
          try {
            value = JSON.parse(data);
          } catch (e) {
          }
          return value;
        },
        setObj: function(key, value) {
          value = JSON.stringify(value);
          var keyPrefix = localStorageMode.chunkPrefix + key;
          var chunkLen = 1024 - keyPrefix.length - 3;
          if (localStorageMode.regexp === undefined) {
            localStorageMode.regexp = new RegExp('.{1,' + chunkLen + '}', 'g');
          }
          var valueLen = value.length;
          var number_of_part = Math.floor(valueLen / chunkLen);
          if (number_of_part >= 512) {
            console.error('monoLog:', 'localStorage', 'Can\'t save item', key, ', very big!');
            return;
          }
          var dataList = value.match(localStorageMode.regexp);
          var dataListLen = dataList.length;
          for (var i = 0, item; i < dataListLen; i++) {
            item = dataList[i];
            localStorage[keyPrefix + i] = item;
          }
          localStorage[key] = localStorageMode.chunkItem;

          localStorageMode.rmObj(key, dataListLen);
        },
        rmObj: function(key, index) {
          var keyPrefix = localStorageMode.chunkPrefix + key;
          if (index === undefined) {
            index = 0;
          }
          var data = localStorage[keyPrefix + index];
          while (data !== undefined) {
            delete localStorage[keyPrefix + index];
            index++;
            data = localStorage[keyPrefix + index];
          }
        },
        readValue: function(key, value) {
          if (value === localStorageMode.chunkItem) {
            value = localStorageMode.getObj(key)
          } else if (value !== undefined) {
            var type = localStorage['_keyType_' + key];
            if (type === 'boolean') {
              value = value === 'true';
            } else if (type !== 'string') {
              value = parseFloat(value);
            }
          }
          return value;
        },
        get: function(src, cb) {
          var key, obj = {};
          if (src === undefined || src === null) {
            for (key in localStorage) {
              if (!localStorage.hasOwnProperty(key) || key === 'length') {
                continue;
              }
              if (key.substr(0, localStorageMode.chunkLen) === localStorageMode.chunkPrefix) {
                continue;
              }
              if (key.substr(0, 9) === '_keyType_') {
                continue;
              }
              obj[key] = localStorageMode.readValue(key, localStorage[key]);
            }
            return cb(obj);
          }
          if (Array.isArray(src) === false) {
            src = [src];
          }
          for (var i = 0, len = src.length; i < len; i++) {
            key = src[i];
            if (!localStorage.hasOwnProperty(key)) {
              continue;
            }
            obj[key] = localStorageMode.readValue(key, localStorage[key]);
          }
          cb(obj);
        },
        set: function(obj, cb) {
          for (var key in obj) {
            var value = obj[key];
            if (value === undefined) {
              localStorageMode.remove(key);
              continue;
            }
            var type = typeof value;
            if (type === 'object') {
              localStorageMode.setObj(key, value);
              continue;
            }
            if (type === 'boolean') {
              localStorage['_keyType_' + key] = 'boolean';
            } else if (type !== 'number') {
              localStorage['_keyType_' + key] = 'string';
            } else {
              delete localStorage['_keyType_' + key];
            }
            localStorage[key] = value;
          }
          cb && cb();
        },
        remove: function(arr, cb) {
          if (Array.isArray(arr) === false) {
            arr = [arr];
          }
          for (var i = 0, len = arr.length; i < len; i++) {
            var key = arr[i];
            if (!localStorage.hasOwnProperty(key)) {
              continue;
            }
            if (localStorage[key] === localStorageMode.chunkItem) {
              localStorageMode.rmObj(key);
            }
            delete localStorage[key];
            delete localStorage['_keyType_' + key];
          }
          cb && cb();
        },
        clear: function(cb) {
          localStorage.clear();
          cb && cb();
        }
      };
      localStorageMode.chunkPrefix = 'mCh_';
      localStorageMode.chunkLen = localStorageMode.chunkPrefix.length;
      localStorageMode.chunkItem = 'monoChunk';
      return localStorageMode;
    };

    var externalStorage = {
      get: function(obj, cb) {
        mono.sendMessage({
          action: 'get',
          data: obj
        }, cb, 'monoStorage');
      },
      set: function(obj, cb) {
        mono.sendMessage({
          action: 'set',
          data: obj,
          keys: Object.keys(obj)
        }, cb, 'monoStorage');
      },
      remove: function(obj, cb) {
        mono.sendMessage({
          action: 'remove',
          data: obj
        }, cb, 'monoStorage');
      },
      clear: function(cb) {
        mono.sendMessage({
          action: 'clear'
        }, cb, 'monoStorage');
      }
    };

    var externalStorageHook = function(message, response) {
      if (message.action === 'get') {
        return mono.storage.get(message.data, response);
      } else if (message.action === 'set') {
        for (var i = 0, len = message.keys.length; i < len; i++) {
          var key = message.keys[i];
          if (!message.data.hasOwnProperty(key)) {
            message.data[key] = undefined;
          }
        }
        return mono.storage.set(message.data, response);
      } else if (message.action === 'remove') {
        return mono.storage.remove(message.data, response);
      } else if (message.action === 'clear') {
        return mono.storage.clear(response);
      }
    };

    if (mono.storageType === 'operaPreferences') {
      mono.storage = getLocalStorage(widget.preferences);
      mono.storage.local = mono.storage.sync = mono.storage;
      return;
    }

    if (mono.isChromeInject || mono.isOperaInject || mono.isSafariInject) {
      mono.storage = externalStorage;
      mono.storage.local = mono.storage.sync = mono.storage;
      return;
    }

    var _localStorage;
    try {
      if (typeof localStorage !== 'undefined') {
        _localStorage = localStorage;
      } else if (window.localStorage) {
        _localStorage = window.localStorage;
      }
    } catch (e) {
    }

    if (_localStorage) {
      mono.storage = getLocalStorage(_localStorage);
      mono.storage.local = mono.storage.sync = mono.storage;
      if (mono.isChrome || mono.isSafari || mono.isOpera) {
        mono.sendHook.monoStorage = externalStorageHook;
      }
      return;
    }

    console.error('Can\'t detect localStorage!');
  };

  initFunc = mono.storageList[mono.storageType];
  if (initFunc !== undefined) {
    initFunc();
  } else {
    console.error('Storage is not defined!');
  }
  initFunc = undefined;
  mono.storageList = undefined;

  //> utils
  if (mono.isChrome) {
    mono.onMessage.on.lowLevelHook.hasInject = function(message, sender, response) {
      if (location.href !== message.url) {
        return setTimeout(function() {
          response(null);
        }, 1000);
      }
      response(1);
    }
  }

  /*@if isVkOnly=0>*/
  mono.parseXhrHeader = function(head) {
    head = head.split(/\r?\n/);
    var headers = {};
    head.forEach(function(line) {
      "use strict";
      var sep = line.indexOf(':');
      if (sep === -1) {
        return;
      }
      var key = line.substr(0, sep).trim().toLowerCase();
      var value = line.substr(sep + 1).trim();
      headers[key] = value;
    });
    return headers;
  };
  /*@if isVkOnly=0<*/

  mono.setTimeout = function(cb, delay) {
    "use strict";
    if (mono.isModule) {
      return require("sdk/timers").setTimeout(cb, delay);
    } else {
      return setTimeout(cb, delay);
    }
  };

  mono.clearTimeout = function(timeout) {
    "use strict";
    if (mono.isModule) {
      return require("sdk/timers").clearTimeout(timeout);
    } else {
      return clearTimeout(timeout);
    }
  };

  mono.request = function(obj, origCb) {
    "use strict";
    var result = {};
    var cb = function(e, response, body) {
      cb = null;
      if (request.timeoutTimer) {
        mono.clearTimeout(request.timeoutTimer);
      }

      var err = null;
      if (e) {
        err = String(e.message || e) || 'ERROR';
      }
      origCb && origCb(err, response, body);
    };

    var getResponse = function(body) {
      var response = {};

      response.statusCode = xhr.status;
      response.statusText = xhr.statusText;

      var headers = null;
      var allHeaders = xhr.getAllResponseHeaders();
      if (typeof allHeaders === 'string') {
        headers = mono.parseXhrHeader(allHeaders);
      }
      response.headers = headers || {};

      response.body = body;

      return response;
    };

    if (typeof obj !== 'object') {
      obj = {url: obj};
    }

    var url = obj.url;

    var method = obj.method || obj.type || 'GET';
    method = method.toUpperCase();

    var data = obj.data;
    if (typeof data !== "string") {
      data = mono.param(data);
    }

    if (data && method === 'GET') {
      url += (/\?/.test(url) ? '&' : '?') + data;
      data = undefined;
    }

    if (obj.cache === false && ['GET','HEAD'].indexOf(method) !== -1) {
      url += (/\?/.test(url) ? '&' : '?') + '_=' + Date.now();
    }

    obj.headers = obj.headers || {};

    if (data) {
      obj.headers["Content-Type"] = obj.contentType || obj.headers["Content-Type"] || 'application/x-www-form-urlencoded; charset=UTF-8';
    }

    var request = {};
    request.url = url;
    request.method = method;

    data && (request.data = data);
    obj.json && (request.json = true);
    obj.xml && (request.xml = true);
    obj.timeout && (request.timeout = obj.timeout);
    obj.mimeType && (request.mimeType = obj.mimeType);
    obj.withCredentials && (request.withCredentials = true);
    Object.keys(obj.headers).length && (request.headers = obj.headers);

    if (request.timeout > 0) {
      request.timeoutTimer = mono.setTimeout(function() {
        cb && cb(new Error('ETIMEDOUT'));
        xhr.abort();
      }, request.timeout);
    }

    var xhrSuccessStatus = {
      0: 200,
      1223: 204
    };

    var xhr = mono.request.getTransport(obj.localXHR);
    xhr.open(request.method, request.url, true);

    if (mono.isModule && request.xml) {
      request.mimeType = 'text/xml';
    }
    if (request.mimeType) {
      xhr.overrideMimeType(request.mimeType);
    }
    if (request.withCredentials) {
      xhr.withCredentials = true;
    }
    for (var key in request.headers) {
      xhr.setRequestHeader(key, request.headers[key]);
    }

    var readyCallback = xhr.onload = function() {
      var status = xhrSuccessStatus[xhr.status] || xhr.status;
      try {
        if (status >= 200 && status < 300 || status === 304) {
          var body = xhr.responseText;
          if (request.json) {
            body = JSON.parse(body);
          } else
          if (request.xml) {
            if (mono.isModule) {
              body = xhr.responseXML;
            } else {
              body = (new DOMParser()).parseFromString(body, "text/xml");
            }
          } else
          if (typeof body !== 'string') {
            console.error('Response is not string!', body);
            throw new Error('Response is not string!');
          }
          return cb && cb(null, getResponse(body), body);
        }
        throw new Error(xhr.status + ' ' + xhr.statusText);
      } catch (e) {
        return cb && cb(e);
      }
    };

    var errorCallback = xhr.onerror = function() {
      cb && cb(new Error(xhr.status + ' ' + xhr.statusText));
    };

    var stateChange = null;
    if (xhr.onabort !== undefined) {
      xhr.onabort = errorCallback;
    } else {
      stateChange = function () {
        if (xhr.readyState === 4) {
          cb && mono.setTimeout(function () {
            return errorCallback();
          });
        }
      };
    }

    if (mono.isSafari && mono.badXhrHeadRedirect && request.method === 'HEAD') {
      stateChange = (function(cb) {
        if (xhr.readyState > 1) {
          // Safari 5 on HEAD 302 redirect fix
          mono.setTimeout(function() {
            xhr.abort();
          });
          return readyCallback();
        }

        return cb && cb();
      }).bind(null, stateChange);
    }

    if (mono.isOpera && mono.badXhrRedirect) {
      stateChange = (function(cb) {
        if (xhr.readyState > 1 && (xhr.status === 302 || xhr.status === 0)) {
          // Opera 12 XHR redirect
          if (!obj._redirectCount) {
            obj._redirectCount = 0;
          }
          var location = xhr.getResponseHeader('Location');
          if (location && obj._redirectCount < 5) {
            obj._redirectCount++;
            var redirectObj = mono.extend({}, obj);
            redirectObj.url = location;

            cb = null;
            xhr.abort();
            var redirectRequest = mono.request(redirectObj, origCb);
            mono.extend(result, redirectRequest);
            return;
          }
        }

        return cb && cb();
      }).bind(null, stateChange);
    }

    if (stateChange) {
      xhr.onreadystatechange = stateChange;
    }

    try {
      xhr.send(request.data || null);
    } catch (e) {
      mono.setTimeout(function() {
        cb && cb(e);
      });
    }

    result.abort = function() {
      cb = null;
      xhr.abort();
    };

    return result;
  };

  mono.request.getTransport = function(localXHR) {
    if (mono.isModule) {
      return new (require('sdk/net/xhr').XMLHttpRequest)();
    }

    if (mono.isGM && !localXHR) {
      return new mono.request.gmTransport();
    }

    return new XMLHttpRequest();
  };

  mono.request.gmTransport = function() {
    "use strict";
    var _this = this;
    var gmXhr = null;

    var sync = function(type, gmResponse) {
      _this.readyState = gmResponse.readyState;
      _this.status = gmResponse.status;
      _this.statusText = gmResponse.statusText;
      if (typeof gmResponse.response === 'string') {
        _this.responseText = gmResponse.response;
      }
      if (gmResponse.responseText) {
        _this.responseText = gmResponse.responseText;
      }
      _this._responseHeaders = gmResponse.responseHeaders;

      _this.onreadystatechange && _this.onreadystatechange();

      _this[type] && _this[type]();
    };

    var gmDetails = {
      headers: {},
      responseType: 'text',
      onload: sync.bind(null, 'onload'),
      onerror: sync.bind(null, 'onerror'),
      onabort: sync.bind(null, 'onabort'),
      ontimeout: sync.bind(null, 'ontimeout')
    };

    this._responseHeaders = null;
    this.readyState = 0;
    this.status = 0;
    this.statusText = '';
    this.responseText = '';
    this.response = '';
    this.responseType = '';
    this.responseURL = '';
    this.open = function(method, url) {
      gmDetails.method = method;
      gmDetails.url = url;
    };
    this.overrideMimeType = function(mimeType) {
      gmDetails.overrideMimeType = mimeType;
    };
    this.setRequestHeader = function(key, value) {
      gmDetails.headers[key] = value;
    };
    this.getResponseHeader = function(name) {
      if (!this._responseHeaders) {
        return null;
      }

      name = name.toLowerCase();
      if (!this.headers) {
        this.headers = mono.parseXhrHeader(this._responseHeaders);
      }
      if (!this.headers.hasOwnProperty(name)) {
        return null;
      }
      return this.headers[name];
    };
    this.getAllResponseHeaders = function() {
      return this._responseHeaders;
    };
    this.abort = function() {
      gmXhr && gmXhr.abort();
    };
    this.send = function(data) {
      gmDetails.data = data;
      gmXhr = GM_xmlhttpRequest(gmDetails);
    };
    this.onabort = null;
    this.onerror = null;
    this.onload = null;
    this.onreadystatechange = null;
    this.ontimeout = null;
  };

  mono.extend = function() {
    var obj = arguments[0];
    for (var i = 1, len = arguments.length; i < len; i++) {
      var item = arguments[i];
      for (var key in item) {
        obj[key] = item[key];
      }
    }
    return obj;
  };

  mono.extendPos = function() {
    var obj = arguments[0];
    for (var i = 1, len = arguments.length; i < len; i++) {
      var item = arguments[i];
      for (var key in item) {
        delete obj[key];
        obj[key] = item[key];
      }
    }
    return obj;
  };

  mono.param = function(obj) {
    if (typeof obj === 'string') {
      return obj;
    }
    var itemsList = [];
    for (var key in obj) {
      if (!obj.hasOwnProperty(key)) {
        continue;
      }
      if (obj[key] === undefined || obj[key] === null) {
        obj[key] = '';
      }
      itemsList.push(encodeURIComponent(key)+'='+encodeURIComponent(obj[key]));
    }
    return itemsList.join('&');
  };

  mono.capitalize = function(word) {
    "use strict";
    return word.charAt(0).toUpperCase() + word.substr(1);
  };

  mono.create = function(tagName, obj) {
    "use strict";
    var el;
    var func;
    if (typeof tagName !== 'object') {
      el = document.createElement(tagName);
    } else {
      el = tagName;
    }
    for (var attr in obj) {
      var value = obj[attr];
      if (func = mono.create.hook[attr]) {
        func(el, value);
        continue;
      }
      el[attr] = value;
    }
    return el;
  };
  mono.create.hook = {
    text: function(el, value) {
      "use strict";
      el.textContent = value;
    },
    data: function(el, value) {
      "use strict";
      for (var item in value) {
        el.dataset[item] = value[item];
      }
    },
    class: function(el, value) {
      "use strict";
      if (Array.isArray(value)) {
        for (var i = 0, len = value.length; i < len; i++) {
          el.classList.add(value[i]);
        }
      } else {
        el.setAttribute('class', value);
      }
    },
    style: function(el, value) {
      "use strict";
      if (typeof value === 'object') {
        for (var item in value) {
          var key = item;
          if (key === 'float') {
            key = 'cssFloat';
          }
          el.style[key] = value[item];
        }
      } else {
        el.setAttribute('style', value);
      }
    },
    append: function(el, value) {
      "use strict";
      if (!Array.isArray(value)) {
        value = [value];
      }
      for (var i = 0, len = value.length; i < len; i++) {
        var node = value[i];
        if (!node && node !== 0) {
          continue;
        }
        if (typeof node !== 'object') {
          node = document.createTextNode(node);
        }
        el.appendChild(node);
      }
    },
    on: function(el, eventList) {
      "use strict";
      if (typeof eventList[0] !== 'object') {
        eventList = [eventList];
      }
      for (var i = 0, len = eventList.length; i < len; i++) {
        var args = eventList[i];
        if (!Array.isArray(args)) {
          continue;
        }
        mono.on(el, args[0], args[1], args[2]);
      }
    },
    onCreate: function(el, value) {
      "use strict";
      value.call(el, el);
    }
  };

  mono.parseTemplate = function(list, details) {
    details = details || {};

    if (typeof list === "string") {
      if (list[0] !== '[') {
        return document.createTextNode(list);
      }
      try {
        list = list.replace(/"/g, '\\u0022').replace(/\\'/g, '\\u0027').replace(/'/g, '"').replace(/([{,])\s*([a-zA-Z0-9]+):/g, '$1"$2":');
        list = JSON.parse(list);
      } catch (e) {
        return document.createTextNode(list);
      }
    }
    if (!Array.isArray(list)) {
      return document.createTextNode(list);
    }
    var fragment = details.fragment || document.createDocumentFragment();
    for (var i = 0, len = list.length; i < len; i++) {
      var item = list[i];
      if (typeof item === 'object') {
        for (var tagName in item) {
          var el = item[tagName];
          var append = el.append;
          delete el.append;
          var dEl;
          fragment.appendChild(dEl = mono.create(tagName, el));
          if (append !== undefined) {
            mono.parseTemplate(append, {
              fragment: dEl
            });
          }
        }
      } else {
        fragment.appendChild(document.createTextNode(item));
      }
    }
    return fragment;
  };

  mono.trigger = function(el, type, data) {
    if (data === undefined) {
      data = {};
    }
    if (data.bubbles === undefined) {
      data.bubbles = false;
    }
    if (data.cancelable === undefined) {
      data.cancelable = false;
    }
    var event = new CustomEvent(type, data);
    el.dispatchEvent(event);
  };

  mono.urlPatternToStrRe = function(value) {
    "use strict";
    if (value === '<all_urls>') {
      return '^https?:\\/\\/.+$';
    }

    var m = value.match(/(\*|http|https|file|ftp):\/\/([^\/]+)(?:\/(.*))?/);
    if (!m) {
      throw new Error("Invalid url-pattern");
    }

    var scheme = m[1];
    if (scheme === '*') {
      scheme = 'https?';
    }

    var host = m[2];
    if (host === '*') {
      host = '.+';
    } else {
      host = mono.escapeRegex(host);
      host = host.replace(/^\\\*\\\./, '(?:[^\/]+\\.)?');
      host = host.replace(/\\\.\\\*$/g, '\\.[a-z\\.]{2,}');
    }

    var pattern = ['^', scheme, ':\\/\\/', host];

    var path = m[3];
    if (!path) {
      pattern.push('$');
    } else
    if (path === '*') {
      path = '(?:|\/.*)';
      pattern.push(path);
      pattern.push('$');
    } else
    if (path) {
      path = '\/' + path;
      path = mono.escapeRegex(path);
      path = path.replace(/\\\*/g, '.*');
      pattern.push(path);
      pattern.push('$');
    }

    return pattern.join('');
  };

  mono.str2regexp = function(s) {
    return new RegExp('^' + s.replace(/\./g, '\\.').replace(/\*/g, '.*?') + '$');
  };

  mono.checkUrl = function(url, rules) {
    return rules.some(function(rule){
      if (typeof rule === 'string') {
        rule = mono.str2regexp(rule);
      }
      return rule.test(url)
    });
  };

  mono.isIframe = function() {
    /*@if isVkOnly=0>*/
    if (mono.isFF) {
      return window.parent !== window;
    }
    /*@if isVkOnly=0<*/
    return window.top !== window.self;
  };

  /*@if isVkOnly=0>*/
  mono.uniFix = function() {
    if (mono.uniFix.fired) {
      return;
    }
    mono.uniFix.fired = true;

    if (mono.isOpera) {
      if (typeof location === 'undefined') {
        location = document.location;
      }
      if (typeof navigator === 'undefined') {
        navigator = window.navigator;
      }
      if (typeof localStorage === 'undefined') {
        localStorage = window.localStorage;
      }
      if (typeof CustomEvent === 'undefined') {
        CustomEvent = window.CustomEvent;
      }
      if (typeof XMLHttpRequest === 'undefined') {
        XMLHttpRequest = window.XMLHttpRequest;
      }
      if (typeof btoa === 'undefined') {
        btoa = window.btoa.bind(window);
      }
      if (typeof atob === 'undefined') {
        atob = window.atob.bind(window);
      }
    }
    if (mono.isSafari && typeof CustomEvent === 'undefined') {
      CustomEvent = function (event, params) {
        params = params || { bubbles: false, cancelable: false };
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return evt;
      };
      CustomEvent.prototype = window.Event.prototype;
    }
  };
  /*@if isVkOnly=0<*/

  mono.userJsCheck = function() {
    "use strict";
    /*@if isVkOnly=0>*/
    if (mono.isGM) {
      return;
    }

    if (!mono.hasPageScript()) {
      return;
    }

    try {
      if(window.sessionStorage['savefrom-helper-userjs'] === '1') {
        mono.sendMessage({action: 'userjsDetected'});
      }
    } catch (e) {}
    /*@if isVkOnly=0<*/
  };

  mono.hasPageScript = function() {
    "use strict";
    var moduleLoadedList = mono.loadModule.moduleLoadedList;
    return moduleLoadedList.some(function(moduleName) {
      if (['sovetnik', 'dealply', 'aviaBar', 'cbBar'].indexOf(moduleName) === -1) {
        return true;
      }
    });
  };

  mono.setExtensionSession = function() {
    "use strict";
    /*@if isVkOnly=0>*/
    try {
      if (!mono.hasPageScript()) {
        delete window.sessionStorage['savefrom-helper-extension'];
      } else {
        window.sessionStorage['savefrom-helper-extension'] = '1';
      }
    } catch (e) {}
    /*@if isVkOnly=0<*/
  };

  mono.loadModule = function(moduleName, cb, isAvailable, syncIsAvailable) {
    var moduleNameList = mono.loadModule.moduleNameList;
    if (moduleNameList.indexOf(moduleName) !== -1) {
      return;
    }
    moduleNameList.push(moduleName);

    /*@if isVkOnly=0>*/
    mono.uniFix();
    /*@if isVkOnly=0<*/

    if (syncIsAvailable && !syncIsAvailable()) {
      return;
    }

    var moduleList = mono.loadModule.moduleList;
    moduleList.push(arguments);
    if (moduleList.length > 1) {
      return;
    }

    if (mono.loadModule.initData) {
      mono.loadModule.moduleLoad(mono.loadModule.initData);
    } else {
      mono.loadModule.getData();
    }
  };
  mono.loadModule.getData = function() {
    "use strict";
    var hasData = false;
    var limit = 20;
    (function getData() {
      if (hasData) {
        return;
      }
      mono.sendMessage(['getPreference', 'getLanguage'], function(data) {
        if (hasData) {
          return;
        }
        hasData = true;

        mono.global.language = data.getLanguage;
        mono.global.preference = data.getPreference;

        mono.loadModule.initData = data;
        mono.loadModule.moduleLoad(mono.loadModule.initData);
      });

      limit--;
      if (limit < 0 || mono.isGM) {
        return;
      }
      setTimeout(function() {
        getData();
      }, 250);
    })();
  };
  mono.loadModule.initData = null;
  mono.loadModule.moduleNameList = [];
  mono.loadModule.moduleList = [];
  mono.loadModule.moduleLoadedList = [];
  mono.loadModule.moduleLoad = function(data) {
    var hasActiveModule = false;

    var moduleList = mono.loadModule.moduleList;
    var item, isAvailable, moduleName, cb;
    while (item = moduleList.shift()) {
      isAvailable = item[2];
      moduleName = item[0];
      cb = item[1];
      if (!isAvailable || isAvailable(data)) {
        mono.loadModule.moduleLoadedList.push(moduleName);
        cb(moduleName, data);
        hasActiveModule = true;
      }
    }
    mono.loadModule.initData = null;

    if (hasActiveModule && !mono.isGM) {
      mono.setExtensionSession();
      mono.userJsCheck();
    }
  };

  mono.openTab = function(url, select, active) {
    select = (select === undefined)?true:!!select;
    if (mono.isChrome) {
      var options = {url: url, selected: select};
      if (active) {
        options.active = !!active;
      }
      chrome.tabs.create(options);
      return;
    }
    /*@if isVkOnly=0>*/
    if (mono.isFF) {
      var tabs = require("sdk/tabs");
      tabs.open(url);
    } else
    if (mono.isSafari) {
      var tab;
      var window = safari.application.activeBrowserWindow;
      if (window) {
        tab = window.openTab();
      } else {
        tab = safari.application.openBrowserWindow().activeTab;
      }
      tab.url = url;
      if (select) {
        tab.activate();
      }
    } else
    if (mono.isOpera) {
      opera.extension.tabs.create({ url: url, focused: select });
    } else
    if (mono.isGM) {
      if (typeof GM_openInTab === 'undefined') {
        return;
      }
      GM_openInTab(url, {
        active: select,
        insert: true
      });
    }
    /*@if isVkOnly=0<*/
  };
  mono.getCurrentPageUrl = function(cb) {
    if (mono.isChrome) {
      return chrome.tabs.getSelected(null, function (tab) {
        cb(tab.url);
      });
    }
    /*@if isVkOnly=0>*/
    if (mono.isFF) {
      var activeWindow = require("sdk/windows").browserWindows.activeWindow;
      var activeTab = activeWindow && activeWindow.tabs.activeTab;
      cb(activeTab && activeTab.url || '');
    } else
    if (mono.isSafari) {
      var url = safari.application.activeBrowserWindow &&
        safari.application.activeBrowserWindow.activeTab &&
        safari.application.activeBrowserWindow.activeTab.url || '';
      cb(url);
    } else
    if (mono.isOpera) {
      var tab = opera.extension.tabs.getFocused();
      cb(tab.url);
    } else
    if (mono.isGM) {
      cb(location.href);
    }
    /*@if isVkOnly=0<*/
  };
  mono.contains = function() {
    var rnative = /^[^{]+\{\s*\[native \w/;
    if (rnative.test(document.compareDocumentPosition) || rnative.test(document.contains)) {
      mono.contains = function(a, b) {
        // from Sizzle
        var adown = a.nodeType === 9 ? a.documentElement : a,
          bup = b && b.parentNode;
        return a === bup || !!( bup && bup.nodeType === 1 && (
            adown.contains ?
              adown.contains( bup ) :
            a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
          ));
      };
    } else {
      mono.contains = function(a, b) {
        if (b) {
          while (b = b.parentNode) {
            if (b === a) {
              return true;
            }
          }
        }
        return false;
      };
    }
    return mono.contains.apply(this, arguments);
  };
  (function() {
    "use strict";
    var getTwoElParent = function(a, b, parentList) {
      parentList.unshift(b);
      while (b = b.parentNode) {
        if (mono.contains(b, a)) {
          return b;
        }
        parentList.unshift(b);
      }
      return null;
    };
    var wrapEvent = function (origType, fixType, origEvent, capture) {
      return !capture ? function (event) {
        var related = event.relatedTarget;
        var target = this;
        if (!related || (related !== target && !mono.contains(target, related))) {
          origEvent.call(this, {
            type: origType,
            target: target,
            preventDefault: event.preventDefault,
            stopPropagation: event.stopPropagation
          });
        }
      } : function (event) {
        var related = event.relatedTarget;
        var target = event.target;
        var parentList = [];
        if (!related || mono.contains(related, target) || (related = getTwoElParent(related, target, parentList))) {
          if (parentList.length === 0) {
            while (target !== related) {
              parentList.unshift(target);
              target = target.parentNode;
            }
          }
          while (target = parentList.shift()) {
            origEvent.call(this, {
              type: origType,
              target: target,
              preventDefault: event.preventDefault,
              stopPropagation: event.stopPropagation
            });
          }
        }
      };
    };

    var functionMap = {
      key: 'fixEvent-',
      eventId: 0,
      replaceList: {},
      bindCount: {}
    };
    mono.on = function(el, type, onEvent, capture) {
      /*@if isVkOnly=0>*/
      if (type === 'mouseenter' || type === 'mouseleave') {
        if ((mono.isFF || (mono.isGM && !mono.isTM && !mono.isVM) || mono.isSafari) && el === document && !capture) {
          el = document.body;
        }

        if (mono.noMouseEnter) {
          var cacheEventKey = functionMap.key;
          var origEvent = onEvent;
          var origType = type;
          var origCapture = capture;

          if (type === 'mouseenter') {
            type = 'mouseover';
          } else
          if (type === 'mouseleave') {
            type = 'mouseout';
          }
          cacheEventKey += type;
          if (capture) {
            cacheEventKey += '-1';
            capture = false;
          }

          var eventId = origEvent[cacheEventKey];
          if (eventId === undefined) {
            eventId = functionMap.eventId++;
            origEvent[cacheEventKey] = eventId;

            onEvent = wrapEvent(origType, type, origEvent, origCapture);

            functionMap.replaceList[eventId] = onEvent;

            if (functionMap.bindCount[eventId] === undefined) {
              functionMap.bindCount[eventId] = 0;
            }
          } else {
            onEvent = functionMap.replaceList[eventId];
          }

          functionMap.bindCount[eventId]++;
        }
      }
      /*@if isVkOnly=0<*/

      el.addEventListener(type, onEvent, capture);
    };

    mono.off = function(el, type, onEvent, capture) {
      /*@if isVkOnly=0>*/
      if (type === 'mouseenter' || type === 'mouseleave') {
        if ((mono.isFF || (mono.isGM && !mono.isTM && !mono.isVM) || mono.isSafari) && el === document && !capture) {
          el = document.body;
        }

        if (mono.noMouseEnter) {
          var cacheEventKey = functionMap.key;
          if (type === 'mouseenter') {
            type = 'mouseover';
          } else
          if (type === 'mouseleave') {
            type = 'mouseout';
          }
          cacheEventKey += type;
          if (capture) {
            cacheEventKey += '-1';
            capture = false;
          }

          var eventId = onEvent[cacheEventKey];
          if (eventId !== undefined) {
            var origEvent = onEvent;
            onEvent = functionMap.replaceList[eventId];
            functionMap.bindCount[eventId]--;

            if (functionMap.bindCount[eventId] === 0) {
              delete origEvent[cacheEventKey];
              delete functionMap.replaceList[eventId];
              delete functionMap.bindCount[eventId];
            }
          }
        }
      }
      /*@if isVkOnly=0<*/

      el.removeEventListener(type, onEvent, capture);
    };
  }());

  (function() {
    var vars = {
      lastUrl: undefined,
      timer: undefined,
      eventList: []
    };

    var checkUrlChange = function() {
      var url = document.location.href;

      if (vars.lastUrl === url) {
        return;
      }

      var oldUrl = vars.lastUrl;
      vars.lastUrl = url;

      for (var i = 0, len = vars.eventList.length; i < len; i++) {
        vars.eventList[i](vars.lastUrl, oldUrl);
      }
    };

    mono.onUrlChange = function(cb, now) {
      if (vars.eventList.indexOf(cb) !== -1) {
        return;
      }

      var currentUrl = window.location.href;

      vars.eventList.push(cb);

      now && cb(currentUrl);

      if (vars.eventList.length > 1) {
        return;
      }

      vars.lastUrl = currentUrl;

      vars.timer = setInterval(checkUrlChange, 1000);

      // window.addEventListener('popstate', onUrlChangeListener);
    };

    mono.offUrlChange = function(cb) {
      var pos = vars.eventList.indexOf(cb);
      if (pos === -1) {
        return;
      }
      vars.eventList.splice(pos, 1);

      if (vars.eventList.length === 0) {
        clearInterval(vars.timer);
        // window.removeEventListener('popstate', onUrlChangeListener);
      }
    };

    mono.clearUrlChange = function() {
      vars.eventList.splice(0);
      clearInterval(vars.timer);
    };
  }());

  mono.global = {};

  mono.initGlobal = function(cb) {
    if (mono.global.language && mono.global.preference) {
      return cb({getLanguage: mono.global.language, getPreference: mono.global.preference});
    }
    mono.sendMessage(['getLanguage', 'getPreference'], function(response) {
      mono.global.language = response.getLanguage;
      mono.global.preference = response.getPreference;
      cb(response);
    });
  };

  mono.getParentByClass = function(el, classList) {
    if (!Array.isArray(classList)) {
      classList = [classList];
    }

    for(var parent = el; parent; parent = parent.parentNode) {
      if (parent.nodeType !== 1) {
        return null;
      }
      for (var i = 0, className; className = classList[i]; i++) {
        if (parent.classList.contains(className)) {
          return parent;
        }
      }
    }

    return null;
  };

  mono.parseUrlParams = function(url, options) {
    // deprecated
    options = options || {};
    var startFrom = url.indexOf('?');
    var query = url;
    if (!options.argsOnly && startFrom !== -1) {
      query = url.substr(startFrom + 1);
    }
    var sep = options.forceSep || '&';
    if (!options.forceSep && query.indexOf('&amp;') !== -1) {
      sep = '&amp;';
    }
    var dblParamList = query.split(sep);
    var params = {};
    for (var i = 0, len = dblParamList.length; i < len; i++) {
      var item = dblParamList[i];
      var ab = item.split('=');
      if (options.useDecode) {
        try {
          params[ab[0]] = decodeURIComponent(ab[1] || '');
        } catch (err) {
          params[ab[0]] = unescape(ab[1] || '');
        }
      } else {
        params[ab[0]] = ab[1] || '';
      }

    }
    return params;
  };

  mono.parseUrl= function(url, details) {
    details = details || {};
    var query = null;
    if (!details.params && /\?/.test(url)) {
      query = url.match(/[^\?]+\?(.+)/)[1];
    } else {
      query = url;
    }
    var separator = details.sep || '&';
    var dblParamList = query.split(separator);
    var params = {};
    for (var i = 0, len = dblParamList.length; i < len; i++) {
      var item = dblParamList[i];
      var keyValue = item.split('=');
      var key = keyValue[0];
      var value = keyValue[1] || '';
      if (!details.noDecode) {
        try {
          key = decodeURIComponent(key);
        } catch (err) {
          key = unescape(key);
        }
        try {
          params[key] = decodeURIComponent(value);
        } catch (err) {
          params[key] = unescape(value);
        }
      } else {
        params[key] = value;
      }
    }
    return params;
  };

  mono.throttle = function(fn, threshhold, scope) {
    threshhold = threshhold || 250;
    var last;
    var deferTimer;
    return function () {
      var context = scope || this;

      var now = Date.now();
      var args = arguments;
      if (last && now < last + threshhold) {
        // hold on to it
        clearTimeout(deferTimer);
        deferTimer = setTimeout(function () {
          last = now;
          fn.apply(context, args);
        }, threshhold);
      } else {
        last = now;
        fn.apply(context, args);
      }
    };
  };

  mono.debounce = function(fn, delay) {
    var timer = null;
    return function () {
      var context = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, delay);
    };
  };

  mono.getDomain = function(url, strip) {
    if (typeof url !== 'string') {
      return null;
    }

    var m = url.match(/:\/\/(?:[^\/?#]*@)?([^:\/?#]+)/);
    m = m && m[1];
    if (m) {
      if (strip) {
        m = m.replace(/^www\./, '');
      }
      return m;
    }
  };

  // legacy

  mono.getQueryString = function(query, key_prefix, key_suffix) {
    if(!query || typeof(query) != 'object')
      return '';

    if(key_prefix === undefined)
      key_prefix = '';

    if(key_suffix === undefined)
      key_suffix = '';

    var str = '';
    for(var key in query)
    {
      if(str.length)
        str += '&';

      if(query[key] instanceof Object)
      {
        if(!key_prefix)
          key_prefix = '';

        if(!key_suffix)
          key_suffix = '';

        str += mono.getQueryString(query[key], key_prefix + key + "[", "]" + key_suffix);
      }
      else
        str += key_prefix + escape(key) + key_suffix + '=' + escape(query[key]);
    }

    return str;
  };

  mono.decodeUnicodeEscapeSequence = function(text) {
    try {
      return JSON.parse(JSON.stringify(text)
        .replace(mono.decodeUnicodeEscapeSequence.re, '$1'));
    } catch (e) {
      return text;
    }
  };
  mono.decodeUnicodeEscapeSequence.re = /\\(\\u[0-9a-f]{4})/g;

  mono.fileName = {
    maxLength: 80,

    rtrim: /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,

    illegalRe: /[\/\?<>\\:\*\|"]/g,

    controlRe: /[\x00-\x1f\x80-\x9f]/g,

    reservedRe: /^\.+/,

    trim: function(text) {
      return text.replace(this.rtrim);
    },

    partsRe: /^(.+)\.([a-z0-9]{1,4})$/i,

    getParts: function (name) {
      return name.match(this.partsRe);
    },

    specialChars: ('nbsp,iexcl,cent,pound,curren,yen,brvbar,sect,uml,copy,ordf,laquo,not,shy,reg,macr,deg,plusmn,sup2' +
    ',sup3,acute,micro,para,middot,cedil,sup1,ordm,raquo,frac14,frac12,frac34,iquest,Agrave,Aacute,Acirc,Atilde,Auml' +
    ',Aring,AElig,Ccedil,Egrave,Eacute,Ecirc,Euml,Igrave,Iacute,Icirc,Iuml,ETH,Ntilde,Ograve,Oacute,Ocirc,Otilde,Ouml' +
    ',times,Oslash,Ugrave,Uacute,Ucirc,Uuml,Yacute,THORN,szlig,agrave,aacute,acirc,atilde,auml,aring,aelig,ccedil' +
    ',egrave,eacute,ecirc,euml,igrave,iacute,icirc,iuml,eth,ntilde,ograve,oacute,ocirc,otilde,ouml,divide,oslash' +
    ',ugrave,uacute,ucirc,uuml,yacute,thorn,yuml').split(','),
    specialCharsList: [['amp','quot','lt','gt'], [38,34,60,62]],

    specialCharsRe: /&([^;]{2,6});/g,

    decodeSpecialChars: function(text) {
      var _this = this;
      return text.replace(this.specialCharsRe, function(text, word) {
        var code = null;
        if (word[0] === '#') {
          code = parseInt(word.substr(1));
          if (isNaN(code)) {
            return '';
          }
          return String.fromCharCode(code);
        }

        var pos = _this.specialCharsList[0].indexOf(word);
        if (pos !== -1) {
          code = _this.specialCharsList[1][pos];
          return String.fromCharCode(code);
        }

        pos = _this.specialChars.indexOf(word);
        if (pos !== -1) {
          code = pos + 160;
          return String.fromCharCode(code);
        }

        return '';
      });
    },

    rnRe: /\r?\n/g,

    re1: /[\*\?"]/g,

    re2: /</g,

    re3: />/g,

    spaceRe: /[\s\t\uFEFF\xA0]+/g,

    dblRe: /(\.|!|\?|_|,|\-|:|\+){2,}/g,

    re4: /[\.,:;\/\-_\+=']$/g,

    modify: function (name) {
      if (!name) {
        return '';
      }

      name = mono.decodeUnicodeEscapeSequence(name);

      try {
        name = decodeURIComponent(name);
      } catch (err) {
        name = unescape(name);
      }

      name = this.decodeSpecialChars(name);

      name = name.replace(this.rnRe, ' ');

      name = this.trim(name);

      name = name.replace(this.re1, '')
        .replace(this.re2, '(')
        .replace(this.re3, ')')
        .replace(this.spaceRe, ' ')
        .replace(this.dblRe, '$1')
        .replace(this.illegalRe, '_')
        .replace(this.controlRe, '')
        .replace(this.reservedRe, '')
        .replace(this.re4, '');

      if (name.length <= this.maxLength) {
        return name;
      }

      var parts = this.getParts(name);
      if (parts && parts.length == 3) {
        parts[1] = parts[1].substr(0, this.maxLength);
        return parts[1] + '.' + parts[2];
      }

      return name;
    }
  };
  mono.getRandomInt = function (min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  };
  mono.dataAttr2Selector = function(dataName) {
    return 'data-'+dataName.replace(/[A-Z]/g, function(lit) {
        return '-'+lit.toLowerCase();
      });
  };
  mono.isEmptyObject = function(obj) {
    for (var item in obj) {
      return false;
    }
    return true;
  };

  mono.asyncCall = function(cb) {
    "use strict";
    var _setTimeout;
    if (mono.isModule) {
      _setTimeout = require("sdk/timers").setTimeout;
    } else {
      _setTimeout = setTimeout;
    }
    _setTimeout(function() {
      cb();
    });
  };

  mono.getPageScript = function(html, match) {
    "use strict";
    if (match && !Array.isArray(match)) {
      match = [match];
    }
    var scriptList = [];
    html.replace(/<script(?:|\s[^>]+[^\/])>/g, function(text, offset) {
      offset += text.length;
      var endPos = html.indexOf('<\/script>', offset);
      if (endPos !== -1) {
        var content = html.substr(offset, endPos - offset);
        if (match) {
          match.every(function(r) {
            return r.test(content);
          }) && scriptList.push(content);
        } else {
          scriptList.push(content);
        }
      }
    });
    return scriptList;
  };
  mono.findJson = function(html, match) {
    "use strict";
    if (match && !Array.isArray(match)) {
      match = [match];
    }
    var rawJson = [];
    var obj = {
      '{': 0,
      '[': 0
    };
    var map = {'}': '{', ']': '['};
    var jsonSymbols = /[{}\]\[":0-9.,]/;
    var whiteSpace = /[\r\n\s\t]/;
    var jsonText = '';
    for (var i = 0, symbol; symbol = html[i]; i++) {
      if (symbol === '"') {
        var end = i;
        while (end !== -1 && (end === i || html[end - 1] === '\\')) {
          end = html.indexOf('"', end + 1);
        }
        if (end === -1) {
          end = html.length - 1;
        }
        jsonText += html.substr(i, end - i + 1);
        i = end;
        continue;
      }

      if (!jsonSymbols.test(symbol)) {
        if (symbol === 't' && html.substr(i, 4) === 'true') {
          jsonText += 'true';
          i+=3;
        } else
        if (symbol === 'f' && html.substr(i, 5) === 'false') {
          jsonText += 'false';
          i+=4;
        } else
        if (symbol === 'n' && html.substr(i, 4) === 'null') {
          jsonText += 'null';
          i+=3;
        } else
        if (!whiteSpace.test(symbol)) {
          obj['{'] = 0;
          obj['['] = 0;
          jsonText = '';
        }
        continue;
      }

      jsonText += symbol;

      if (symbol === '{' || symbol === '[') {
        if (!obj['{'] && !obj['[']) {
          jsonText = symbol;
        }
        obj[symbol]++;
      } else
      if (symbol === '}' || symbol === ']') {
        obj[map[symbol]]--;
        if (!obj['{'] && !obj['[']) {
          rawJson.push(jsonText);
        }
      }
    }
    var jsonList = [];
    for (var i = 0, item; item = rawJson[i]; i++) {
      if (item === '{}' || item === '[]') {
        continue;
      }
      try {
        if (match) {
          match.every(function(r) {
            return r.test(item);
          }) && jsonList.push(JSON.parse(item));
        } else {
          jsonList.push(JSON.parse(item));
        }
      } catch(e) {
        // console.log('bad json', item);
      }
    }
    return jsonList;
  };

  mono.styleObjToText = function(insertStyle, btnId){
    btnId = btnId || '';

    var itemToText = function(styleList) {
      var content = [];
      for (var item in styleList) {
        var key = item.replace(/([A-Z])/g, function(text, letter) {
          return '-' + letter.toLowerCase();
        });
        content.push(key + ':' + styleList[item]);
      }
      return content.join(';');
    };

    var styleText = [];
    for (var selector in insertStyle) {
      var item = insertStyle[selector];
      var selectorList = selector.split(',');
      var cssSelector = '';
      for (var i = 0, len = selectorList.length; i < len; i++) {
        var selectorItem = selectorList[i];
        var sep = ' ';
        if (!selectorItem || [':', '\\'].indexOf(selectorItem[0]) !== -1) {
          sep = '';
          if (selectorItem[0] === '\\') {
            selectorItem = selectorItem.substr(1);
          }
        }
        if (i > 0) {
          cssSelector += ',';
        }
        cssSelector += btnId + sep + selectorItem;
      }
      styleText.push(cssSelector + '{' + itemToText(item) + '}');

    }

    return styleText.join('');
  };

  mono.style2Text = function(cssStyleObj, parentSelector) {
    "use strict";
    var list = [];

    if (!Array.isArray(cssStyleObj)) {
      cssStyleObj = [cssStyleObj];
    }

    if (parentSelector && !Array.isArray(parentSelector)) {
      parentSelector = [parentSelector];
    }

    var styleToText = function(selectorArr, styleObj) {
      "use strict";
      var content = [];

      for (var item in styleObj) {
        var value = styleObj[item];

        var key = item.replace(/([A-Z])/g, function(text, letter) {
          return '-' + letter.toLowerCase();
        });

        content.push(key + ':' + value);
      }

      return [selectorArr.join(','),'{',content.join(';'),'}'].join('');
    };

    var selectorAndStyle = function(section, selector, style) {
      if (!Array.isArray(selector)) {
        selector = [selector];
      }

      if (parentSelector) {
        var _selector = [];
        parentSelector.forEach(function(parentSelector) {
          selector.forEach(function(selector) {
            _selector.push(parentSelector + (section.join || ' ') + selector);
          });
        });
        selector = _selector;
      }

      list.push(styleToText(selector, style));
    };

    cssStyleObj.forEach(function(section) {
      var selector = section.selector;
      var style = section.style;
      var append = section.append;

      if (!selector && !style) {
        for (var key in section) {
          if (['append', 'join'].indexOf(key) !== -1) {
            continue;
          }
          selector = key;
          style = section[key];

          append = style.append;
          if (append) {
            delete style.append;
          }

          selectorAndStyle(section, selector, style);

          if (append) {
            list.push(mono.style2Text(append, selector));
          }
        }
      } else {
        selectorAndStyle(section, selector, style);

        if (append) {
          list.push(mono.style2Text(append, selector));
        }
      }
    });

    return list.join('');
  };

  mono.styleReset = {
    animation: "none 0s ease 0s 1 normal none running",
    backfaceVisibility: "visible",
    background: "transparent none repeat 0 0 / auto auto padding-box border-box scroll",
    border: "medium none currentColor",
    borderCollapse: "separate",
    borderImage: "none",
    borderRadius: "0",
    borderSpacing: "0",
    bottom: "auto",
    boxShadow: "none",
    boxSizing: "content-box",
    captionSide: "top",
    clear: "none",
    clip: "auto",
    color: "inherit",
    columns: "auto",
    columnCount: "auto",
    columnFill: "balance",
    columnGap: "normal",
    columnRule: "medium none currentColor",
    columnSpan: "1",
    columnWidth: "auto",
    content: "normal",
    counterIncrement: "none",
    counterReset: "none",
    cursor: "auto",
    direction: "ltr",
    display: "inline",
    emptyCells: "show",
    float: "none",
    font: "normal normal normal normal medium/normal inherit",
    height: "auto",
    hyphens: "none",
    left: "auto",
    letterSpacing: "normal",
    listStyle: "disc outside none",
    margin: "0",
    maxHeight: "none",
    maxWidth: "none",
    minHeight: "0",
    minWidth: "0",
    opacity: "1",
    orphans: "0",
    outline: "medium none invert",
    overflow: "visible",
    overflowX: "visible",
    overflowY: "visible",
    padding: "0",
    pageBreakAfter: "auto",
    pageBreakBefore: "auto",
    pageBreakInside: "auto",
    perspective: "none",
    perspectiveOrigin: "50% 50%",
    position: "static",
    right: "auto",
    tabSize: "8",
    tableLayout: "auto",
    textAlign: "inherit",
    textAlignLast: "auto",
    textDecoration: "none solid currentColor",
    textIndent: "0",
    textShadow: "none",
    textTransform: "none",
    top: "auto",
    transform: "none",
    transformOrigin: "50% 50% 0",
    transformStyle: "flat",
    transition: "none 0s ease 0s",
    unicodeBidi: "normal",
    verticalAlign: "baseline",
    visibility: "visible",
    whiteSpace: "normal",
    widows: "0",
    width: "auto",
    wordSpacing: "normal",
    zIndex: "auto",
    all: "initial"
  };

  mono.matchHost = function(host, hostList) {
    "use strict";
    var dotPos;
    while ((dotPos = host.indexOf('.')) !== -1) {
      if (hostList.indexOf(host) !== -1) {
        return true;
      }
      host = host.substr(dotPos + 1);
    }

    return false;
  };

  mono.storage.getExpire = function(arr, cb, noRemove) {
    "use strict";
    var prefix = mono.storage.getExpire.prefix;
    var now = parseInt(Date.now() / 1000);
    if (!Array.isArray(arr)) {
      arr = [arr];
    }
    var getArr = [];
    for (var i = 0, key, len = arr.length; i < len; i++) {
      key = arr[i];
      getArr.push.apply(getArr, [key, key + prefix]);
    }
    mono.storage.get(getArr, function(storage) {
      var obj = {};
      var rmList = [];
      var r = new RegExp(prefix + '$');
      for (var key in storage) {
        if (r.test(key)) {
          continue;
        }
        if (storage[key + prefix] > now) {
          obj[key] = storage[key];
        } else {
          rmList.push(key);
        }
      }
      !noRemove && rmList.length && mono.storage.removeExpire(rmList);
      return cb(obj, storage);
    });
  };

  mono.storage.getExpire.prefix = '_expire_';

  mono.storage.setExpire = function(obj, sec, cb) {
    "use strict";
    var prefix = mono.storage.getExpire.prefix;
    var now = parseInt(Date.now() / 1000);
    var setObj = {};
    for (var key in obj) {
      setObj[key] = obj[key];
      setObj[key + prefix] = now + sec;
    }
    mono.storage.set(setObj, function() {
      cb && cb();
    });
  };

  mono.storage.removeExpire = function(arr, cb) {
    "use strict";
    var prefix = mono.storage.getExpire.prefix;
    if (!Array.isArray(arr)) {
      arr = [arr];
    }
    var rmList = [];
    for (var i = 0, key, len = arr.length; i < len; i++) {
      key = arr[i];
      rmList.push.apply(rmList, [key, key + prefix]);
    }
    mono.storage.remove(rmList, function() {
      cb && cb();
    });
  };

  mono.onRemoveClassName = 'sf-notify-on-remove';
  mono.onRemoveEvent = function(node, event) {
    "use strict";
    node.classList.add(mono.onRemoveClassName);
    node.addEventListener('sf-removed', event);
  };
  mono.onRemoveListener = function(node) {
    "use strict";
    mono.trigger(node, 'sf-removed');
  };
  mono.offRemoveEvent = function(node, event) {
    "use strict";
    node.removeEventListener('sf-removed', event);
  };

  /**
   * @param {Node|Element} node
   * @param {String} selector
   * @returns {boolean}
   */
  mono.matches = function(node, selector) {
    "use strict";
    var el = document.createElement('div');
    if (typeof el.matches === 'function') {
      mono.matches = function(node, selector){
        return node.matches(selector);
      };
    } else
    if (typeof el.matchesSelector === 'function') {
      mono.matches = function(node, selector){
        return node.matchesSelector(selector);
      };
    } else
    if (typeof el.webkitMatchesSelector === 'function') {
      mono.matches = function(node, selector){
        return node.webkitMatchesSelector(selector);
      };
    } else
    if (typeof el.mozMatchesSelector === 'function') {
      mono.matches = function(node, selector){
        return node.mozMatchesSelector(selector);
      };
    } else
    if (typeof el.oMatchesSelector === 'function') {
      mono.matches = function(node, selector){
        return node.oMatchesSelector(selector);
      };
    } else
    if (typeof el.msMatchesSelector === 'function') {
      mono.matches = function(node, selector){
        return node.msMatchesSelector(selector);
      };
    } else {
      mono.matches = function (node, selector) {
        return false;
      };
    }
    el = null;

    return mono.matches.call(this, node, selector);
  };

  mono.getParent = function(node, selector) {
    if (!node || node.nodeType !== 1) {
      return null;
    }

    if (mono.matches(node, selector)) {
      return node;
    }

    if (!mono.matches(node, selector + ' ' + node.tagName)) {
      return null;
    }

    node = node.parentNode;
    for(var parent = node; parent; parent = parent.parentNode) {
      if (parent.nodeType !== 1) {
        return null;
      }

      if(mono.matches(parent, selector)) {
        return parent;
      }
    }

    return null;
  };

  mono.escapeRegex = function(value) {
    "use strict";
    return value.replace( /[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&" );
  };

  _mono && (function(tmpMono) {
    "use strict";
    _mono = null;
    var args, list;
    if (!(list = tmpMono['loadModuleStack'])) {
      return;
    }

    while (args = list.shift()) {
      mono.asyncCall(function(args) {
        mono.loadModule.apply(mono, args);
      }.bind(null, args));
    }
  })(_mono);
  //<utils

  //@insert

  return mono;
}
));
