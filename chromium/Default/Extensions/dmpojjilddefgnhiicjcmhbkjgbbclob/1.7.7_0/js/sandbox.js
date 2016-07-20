/**
 * Created by Anton on 17.06.2015.
 */
var chrome = window.chrome || {};
chrome.emptyFunction = function(path) {
  "use strict";
  console.log('[', path, ']', 'Function is not supported!', {
    args: arguments
  });
};
chrome.tabs = {};

chrome.windows = {};

chrome.i18n = {};
chrome.i18n.lang = {};

chrome.i18n.getUILanguage = function() {
  "use strict";
  return chrome.i18n.getUILanguage.data;
};

chrome.i18n.getMessage = function(word, substitutions) {
  "use strict";
  if (typeof word !== 'string' ||
    (substitutions && !Array.isArray(substitutions) && substitutions.length > 9)) {
    return undefined;
  }
  var value = chrome.i18n.lang[word] && chrome.i18n.lang[word].message || '';
  if (substitutions) {
    value = value.replace(/\$(\d+)/g, function(text, index) {
      return substitutions[index - 1] || text;
    });
  }
  return value;
};

chrome.runtime = chrome.runtime || {};
chrome.runtime.onMessage = {};
chrome.runtime.getManifest = function() {
  "use strict";
  return JSON.parse(JSON.stringify(chrome.runtime.getManifest.data || '"{}"'));
};
chrome.runtime.getBackgroundPage = function(cb) {
  "use strict";
  cb(window);
};
chrome.runtime.getURL = function(path) {
  "use strict";
  return chrome.runtime.getURL.url + path;
};
chrome.runtime.getURL.url = '';
chrome.extension = {};
chrome.extension.onMessage = chrome.runtime.onMessage;
chrome.app.getDetails = function() {
  "use strict";
  return JSON.parse(JSON.stringify(chrome.app.getDetails.data || '"{}"'));
};
chrome.extension.getURL = chrome.runtime.getURL;

(function() {
  "use strict";
  var debug = false;
  var debugLocalStorage = false;
  var debugLocalStorageSync = false;
  var debugReadyState = false;

  var env = {
    sb: null,
    wrapMsgTools: function(sb) {
      var msgTools = {
        cbObj: {},
        cbStack: [],
        id: 0,
        idPrefix: Math.floor(Math.random()*1000)+'_',
        addCb: function(message, cb) {
          if (msgTools.cbStack.length > sb.messageStack) {
            msgTools.clean();
          }
          var id = message.callbackId = msgTools.idPrefix+(++msgTools.id);
          msgTools.cbObj[id] = {fn: cb, time: Date.now()};
          msgTools.cbStack.push(id);
        },
        callCb: function(message) {
          var cb = msgTools.cbObj[message.responseId];
          if (cb === undefined) return;
          delete msgTools.cbObj[message.responseId];
          msgTools.cbStack.splice(msgTools.cbStack.indexOf(message.responseId), 1);
          cb.fn(message.data);
        },
        mkResponse: function(response, callbackId, responseMessage) {
          if (callbackId === undefined) return;

          responseMessage = {
            data: responseMessage,
            responseId: callbackId
          };
          response.call(this, responseMessage);
        },
        clearCbStack: function() {
          for (var item in msgTools.cbObj) {
            delete msgTools.cbObj[item];
          }
          msgTools.cbStack.splice(0);
        },
        removeCb: function(cbId) {
          var cb = msgTools.cbObj[cbId];
          if (cb === undefined) return;
          delete msgTools.cbObj[cbId];
          msgTools.cbStack.splice(msgTools.cbStack.indexOf(cbId), 1);
        },
        clean: function(aliveTime) {
          var now = Date.now();
          aliveTime = aliveTime || 120*1000;
          for (var item in msgTools.cbObj) {
            if (msgTools.cbObj[item].time + aliveTime < now) {
              delete msgTools.cbObj[item];
              msgTools.cbStack.splice(msgTools.cbStack.indexOf(item), 1);
            }
          }
        }
      };

      sb.messageStack = 50;
      sb.msgClearStack = msgTools.clearCbStack;
      sb.msgRemoveCbById = msgTools.removeCb;
      sb.msgClean = msgTools.clean;

      sb.sendMessage = function(message, cb, hook) {
        message = {
          data: message,
          hook: hook
        };
        if (cb) {
          msgTools.addCb(message, cb.bind(this));
        }
        sb.sendMessage.send.call(this, message);

        return message.callbackId;
      };

      sb.onMessage = function(cb) {
        var _this = this;
        sb.onMessage.on.call(_this, function(message, response) {
          if (message.responseId !== undefined) {
            return msgTools.callCb(message);
          }
          var mResponse = msgTools.mkResponse.bind(_this, response, message.callbackId);
          cb.call(_this, message.data, mResponse);
        });
      };
    },
    initSandbox: function() {
      var sb = {};

      this.wrapMsgTools(sb);

      var frame = {
        cbList: [],
        mkResponse: function() {
          return function(msg) {
            return frame.send(msg);
          }
        },
        on: function(cb) {
          frame.cbList.push(cb);
          if (frame.cbList.length !== 1) {
            return;
          }
          window.addEventListener("message", function(event) {
            var msg = event.data;
            var response = frame.mkResponse(event.source);
            for (var i = 0, cb; cb = frame.cbList[i]; i++) {
              cb(msg, response);
            }
          });
        },
        send: function(msg) {
          window.parent.postMessage(msg, '*');
        }
      };

      sb.onMessage.on = frame.on;
      sb.sendMessage.send = frame.send;

      return sb;
    },
    wrapXhr: function() {
      var parseXhrHeader = function(head) {
        if (!head) {
          return {};
        }
        head = head.replace(/\r?\n/g, '\n').split('\n');
        var obj = {};
        for (var i = 0, len = head.length; i < len; i++) {
          var keyValue = head[i].split(':');
          if (keyValue.length < 2) {
            continue;
          }
          var key = keyValue[0].trim().toLowerCase();
          obj[key] = keyValue[1].trim();
        }
        return obj;
      };
      window.sbXMLHttpRequest = function () {
        var xhr = {
          id: Date.now() + '_' + Math.floor((Math.random() * 10000) + 1)
        };

        var vXhr = {};
        vXhr.abort = function() {
          if (vXhr.hasOwnProperty('status')) return;
          env.sb.sendMessage({action: 'xhrAbort', id: xhr.id});
        };
        vXhr.open = function(method, url, async) {
          xhr.method = method;
          xhr.url = url;
          xhr.async = async;
        };
        var postProcess = function(a){return a;};
        vXhr.overrideMimeType = function(mimeType) {
          if (mimeType === 'text/xml') {
            postProcess = function(a) {
              var parser=new DOMParser();
              vXhr.responseXML = parser.parseFromString(a, 'text/xml');
              return vXhr.responseXML;
            };
            postProcess.mimeType = mimeType;
            vXhr.responseType = 'text';
          } else {
            xhr.mimeType = mimeType;
          }
        };
        vXhr.setRequestHeader = function(key, value) {
          if (!xhr.headers) {
            xhr.headers = {};
          }
          xhr.headers[key] = value;
        };
        vXhr.send = function(data) {
          xhr.data = data;
          xhr.timeout = vXhr.timeout;
          xhr.responseType = vXhr.responseType;

          env.sb.sendMessage({action: 'xhr', data: xhr}, function(xhr) {
            vXhr.status = xhr.status;
            vXhr.statusText = xhr.statusText;
            vXhr.responseURL = xhr.responseURL;
            vXhr.readyState = xhr.readyState;

            vXhr.getAllResponseHeaders = function() {
              return xhr.responseHeaders;
            };
            vXhr.getResponseHeader = function(name) {
              name = name.toLowerCase();
              if (vXhr.responseHeaders === undefined) {
                vXhr.responseHeaders = parseXhrHeader(xhr.responseHeaders);
              }
              return vXhr.responseHeaders[name];
            };

            if (xhr.responseType) {
              vXhr.response = postProcess(xhr.response);
            } else {
              vXhr.responseText = xhr.responseText;
            }

            vXhr.onreadystatechange && vXhr.onreadystatechange();

            if (vXhr[xhr.cbType]) {
              vXhr[xhr.cbType](vXhr);
            }
          });
        };
        return vXhr;
      };
    },
    debounce: function(func, wait, immediate) {
      var timeout;
      return function() {
        var context = this, args = arguments;
        var later = function() {
          timeout = null;
          if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
      };
    },
    localStorage: {
      syncChangesDebounce: null,
      syncChanges: function() {
        debugLocalStorageSync && console.debug('syncChangesDebounce');

        if (this.syncChangesDebounce) {
          return this.syncChangesDebounce();
        }

        var _this = this;

        this.syncChangesDebounce = env.debounce(function(){
          debugLocalStorageSync && console.debug('sendChanges');

          var time = _this.lastSyncTime = Date.now();
          env.sb.sendMessage({action: 'localStorageChange', storage: _this.storage, time: time});
        }, 50);

        this.syncChangesDebounce();
      },
      storage: Object.create(Object.defineProperties({
        getItem: function(key) {
          debugLocalStorage && console.debug('getItem', key);

          if (arguments.length < 1) {
            throw "1 arguments required, but only 0 present.";
          }

          var value = null;
          if (this.hasOwnProperty(key) && typeof this[key] === 'string') {
            value = this[key];
          }
          return value;
        },
        setItem: function(key, value) {
          debugLocalStorage && console.debug('setItem', key, value);

          if (arguments.length < 2) {
            throw "2 arguments required, but only 1 present.";
          }

          this[key] = String(value);
        },
        removeItem: function(key) {
          debugLocalStorage && console.debug('removeItem', key);

          if (arguments.length < 1) {
            throw "1 arguments required, but only 0 present.";
          }

          if (this.hasOwnProperty(key)) {
            delete this[key];
          }
        },
        clear: function() {
          debugLocalStorage && console.debug('clear');

          for (var key in this) {
            if (this.hasOwnProperty(key)) {
              delete this[key];
            }
          }
        },
        key: function(index) {
          debugLocalStorage && console.debug('key', index);

          if (arguments.length < 1) {
            throw "1 arguments required, but only 0 present.";
          }

          var key = Object.keys(this)[index];

          var value = null;
          if (this.hasOwnProperty(key)) {
            value = key;
          }
          return value;
        }
      }, {
        length: {
          get: function () {
            return Object.keys(this).length;
          },
          set: function() {}
        }
      })),
      onChange: {
        set: function(obj, prop, value) {
          debugLocalStorageSync && console.debug('set', prop, value);

          var _this = env.localStorage;

          var oldValue = obj.getItem(prop);

          obj.setItem(prop, value);
          var currentValue = obj.getItem(prop);

          if (oldValue !== currentValue) {
            _this.syncChanges();
          }

          return true;
        },
        deleteProperty: function(obj, prop) {
          debugLocalStorageSync && console.debug('delete', prop);

          var _this = env.localStorage;

          var oldValue = obj.getItem(prop);

          obj.removeItem(prop);
          var currentValue = obj.getItem(prop);

          if (oldValue !== currentValue) {
            _this.syncChanges();
          }

          return true;
        }
      },
      origStorage: {},
      addWatcher: function() {
        var change, i, hasChanges, origStorage, value;
        var _this = this;
        var storage = this.storage;
        Object.observe(storage, function(changeList) {
          hasChanges = false;
          origStorage = _this.origStorage;
          for (change, i = 0; change = changeList[i]; i++) {
            value = storage.getItem(change.name);
            if (['add', 'update'].indexOf(change.type) !== -1) {
              if (typeof storage[change.name] !== 'string') {
                storage[change.name] = String(storage[change.name]);
                continue;
              }
              if (origStorage[change.name] !== value) {
                debugLocalStorageSync && console.debug('set', change.name, value);

                origStorage[change.name] = value;
                hasChanges = true;
              }
            } else
            if (change.type === 'delete') {
              if (origStorage[change.name] !== undefined) {
                debugLocalStorageSync && console.debug('delete', change.name);

                delete origStorage[change.name];
                hasChanges = true;
              }
            }
          }

          hasChanges && _this.syncChanges();
        });
      },
      create: function(time, origStorage) {
        debugLocalStorageSync && console.debug('create', origStorage);

        this.sync(time, origStorage);

        if (typeof Proxy !== 'undefined') {
          window.sbLocalStorage = new Proxy(this.storage, this.onChange);
        } else {
          window.sbLocalStorage = this.storage;
          this.origStorage = origStorage;
          this.addWatcher();
        }

        try {
          delete window.localStorage;
          window.localStorage = window.sbLocalStorage;
        } catch (e){}
      },
      lastSyncTime: 0,
      sync: function(time, origStorage) {
        debugLocalStorageSync && console.debug('sync', origStorage);

        if (this.lastSyncTime >= time) {
          debugLocalStorageSync && console.debug('syncTimeout');
          return;
        }
        this.lastSyncTime = time;

        var key = null;

        this.origStorage = origStorage;

        for (key in this.storage) {
          if (!this.storage.hasOwnProperty(key)) {
            continue;
          }
          if (!origStorage.hasOwnProperty(key)) {
            this.storage.removeItem(key);
          }
        }

        for (key in origStorage) {
          if (!origStorage.hasOwnProperty(key)) {
            continue;
          }
          if (typeof this.storage[key] === 'function' && !this.storage.hasOwnProperty(key)) {
            continue;
          }
          this.storage.setItem(key, origStorage[key]);
        }
      }
    },
    preloadCode: function() {
      env.wrapXhr();
      var lsFunc = function() {
        var localStorage = window.sbLocalStorage;
        var XMLHttpRequest = window.sbXMLHttpRequest;
      };
      lsFunc = lsFunc.toString();
      var pos = lsFunc.indexOf('{') + 1;
      return lsFunc.substr(pos, lsFunc.lastIndexOf('}') - pos);
    },
    uniApiWrapper: {
      prefix: Math.floor(Math.random()*1000)+'_',
      index: 0,
      funcObj: {},
      keepAlive: 30000,
      bindListener: {
        _listeners: {},
        _slice: [].slice,
        _cbFunc: {},
        _callCbList: function(cbList) {
          var argsList = this._slice.call(arguments, 1);
          for (var i = 0, func; func = cbList[i]; i++) {
            func.apply(null, argsList);
          }
        },
        addListener: function(details, listener) {
          details.isListener = 1;
          var path = details.funcPath;
          var cbList;
          if ((cbList = this._listeners[path]) === undefined) {
            cbList = this._listeners[path] = [];
          }

          if (cbList.indexOf(listener) === -1) {
            cbList.push(listener);
          }

          if (arguments.length !== 2 || listener.length > 3) {
            env.uniApiWrapper.callRemoteFunc.apply(env.uniApiWrapper, arguments);
            return;
          }

          if (this._cbFunc[path] !== undefined) {
            return;
          }

          var cbFunc = this._cbFunc[path] = this._callCbList.bind(this, cbList);
          cbFunc._length = 3;

          env.uniApiWrapper.callRemoteFunc.call(env.uniApiWrapper, details, cbFunc);
        },
        removeListener: function(details, listener) {
          var path = details.funcPath;
          var cbList;

          if (!(cbList = this._listeners[path])) {
            return;
          }

          var pos = cbList.indexOf(listener);
          if (pos !== -1) {
            cbList.splice(pos, 1);
          }

          if (arguments.length !== 2 || listener.length > 3) {
            env.uniApiWrapper.callRemoteFunc.apply(env.uniApiWrapper, arguments);
            return;
          }

          var cbFunc;
          if (cbList.length || !(cbFunc = this._cbFunc[path])) {
            return;
          }

          delete this._cbFunc[path];

          env.uniApiWrapper.callRemoteFunc.call(env.uniApiWrapper, details, cbFunc);
        },
        hasListener: function(details, listener) {
          var path = details.funcPath;
          var cbList;
          if (cbList = this._listeners[path]) {
            return cbList.indexOf(listener) !== -1;
          } else {
            return false;
          }
        },
        hasListeners: function(details) {
          var path = details.funcPath;
          var cbList;
          if (cbList = this._listeners[path]) {
            return cbList.length > 0;
          } else {
            return false;
          }
        },
        dispatch: function(details) {
          var path = details.funcPath;
          var cbList;
          if (cbList = this._listeners[path]) {
            var argsList = this._slice.call(arguments, 1);
            for (var i = 0, func; func = cbList[i]; i++) {
              func.apply(null, argsList);
            }
          }
        },
        dispatchToListener: function() {}
      },
      args2list: function(args, offset, maxLen) {
        var len = maxLen === undefined ? args.length : (maxLen + offset);
        var argList = new Array(len - offset);
        var id;
        var newFuncIdList = [];
        for (var i = offset; i < len; i++) {
          var arg = args[i];
          if (typeof arg === 'function') {
            if ((id = arg.sbIndex) === undefined) {
              id = this.prefix + (++this.index);
              arg.sbIndex = id;
              this.funcObj[id] = arg;
            }
            arg = {a: id, b: arg._length || arg.length};
            newFuncIdList.push(id);
          } else {
            arg = {a: arg};
          }
          argList[i - offset] = arg;
        }
        return {args: argList, idList: newFuncIdList};
      },
      bindRemoteFunc: function(details) {
        var id = details.id;
        var argsLen = details.argsLen;
        var caller = details.caller;
        var args = this.args2list(arguments, 1, argsLen);
        var idList = args.idList;
        args = args.args;

        debug && console.debug('bindRemoteFunc', 'by', caller, id, args);

        sb.sendMessage({action: 'callFuncById', id: id, args: args, idList: idList});

        idList.length > 0 && setTimeout(function() {
          this.rmChromeApiFuncs(idList);
        }.bind(this), this.keepAlive);
      },
      prepareArgs: function(caller, args) {
        var argList = [];
        var arg;
        var id;
        var argsLen;
        for (var i = 0, len = args.length; i < len; i++) {
          arg = args[i];
          id = arg.a;
          if ((argsLen = arg.b) !== undefined) {
            argList.push(this.bindRemoteFunc.bind(this, {caller: caller, id: id, argsLen: argsLen}));
          } else {
            argList.push(id);
          }
        }
        return argList;
      },
      callRemoteFunc: function(details) {
        var sub = details.fullPath;
        var isListener = details.isListener;
        var args = this.args2list(arguments, 1);
        var idList = args.idList;
        args = args.args;

        debug && console.debug('callRemoteFunc', sub, args);

        try {
          args = JSON.parse(JSON.stringify(args));
        } catch(e) {
          chrome.emptyFunction(sub);
          throw new Error("Can't json parse arguments!");
        }
        env.sb.sendMessage({action: 'callFunc', sub: sub, args: args, idList: idList, isListener: !!isListener});

        !isListener && idList.length > 0 && setTimeout(function() {
          this.rmChromeApiFuncs(idList);
        }.bind(this), this.keepAlive);
      },
      callFuncById: function(msg) {
        var func;
        if ((func = this.funcObj[msg.id]) === undefined) {
          console.error('Function is not found', msg.id, [msg]);
          return;
        }
        var argList = this.prepareArgs(msg.id,msg.args);

        debug && console.debug('callFuncById', msg.id, argList);

        func.apply(null, argList);

        msg.idList.length > 0 && setTimeout(function() {
          this.rmChromeApiFuncs(msg.idList);
        }.bind(this), this.keepAlive);
      },
      rmChromeApiFuncs: function(idList, sendMsg) {
        for (var i = 0, id; id = idList[i]; i++) {
          // console.log('rmChromeApiFuncs', id);
          delete this.funcObj[id];
        }
      }
    }
  };

  var sb = env.sb = env.initSandbox(window);
  env.preloadCode = env.preloadCode();

  var pageReady = function(scriptFunc) {
    debugReadyState && console.debug('loading');

    if (document.readyState === 'loading') {
      return scriptFunc();
    }

    // loading, interactive, complete
    var customReadyState = 'loading';
    var setCustomReadyState = function() {
      debugReadyState && console.debug('setCustomReadyState');

      Object.defineProperties(document, {
        readyState: {
          get: function(){
            return customReadyState;
          },
          set: function(){}
        }
      });
    };

    var setReadyState = function(state) {
      debugReadyState && console.debug('setReadyState', state);

      customReadyState = state;

      document.onreadystatechange && document.onreadystatechange();

      if (customReadyState === 'interactive') {
        document.dispatchEvent(new CustomEvent('DOMContentLoaded', {bubbles: true, cancelable: false}));
      }

      if (customReadyState === 'complete') {
        window.dispatchEvent(new CustomEvent('load', {bubbles: false, cancelable: false}));
      }
    };

    var onComplete = function() {
      debugReadyState && console.debug('onComplete');

      setCustomReadyState();

      scriptFunc();

      setReadyState('interactive');

      setTimeout(function () {
        setReadyState('complete');
      }, 0);
    };

    if (document.readyState === 'complete') {
      return onComplete();
    }

    onComplete = (function(origCb) {
      document.removeEventListener('load', onComplete);

      return origCb();
    }).bind(null, onComplete);

    document.addEventListener('load', onComplete);
  };

  var onMessage = {
    cbList: [],
    addListener: function(cb) {
      this.cbList.push(cb);
    },
    removeListener: function(cb) {
      var pos = this.cbList.indexOf(cb);
      if (pos !== -1) {
        this.cbList.splice(pos, 1);
      }
    },
    onMsg: function(msg, response) {
      for (var i = 0, func; func = this.cbList[i]; i++) {
        func(msg.msg, msg.sender, response);
      }
    },
    hasListener: function(func) {
      return this.cbList.indexOf(func) !== -1;
    },
    hasListeners: function() {
      return this.cbList.length > 0;
    },
    dispatch: function(msg) {
      if (msg && msg.action === 'sb') {
        return;
      }
      for (var i = 0, func; func = this.cbList[i]; i++) {
        func.apply(null, arguments);
      }
    },
    dispatchToListener: function() {
      // Empty function
    }
  };
  ['addListener', 'removeListener', 'hasListener', 'hasListeners', 'dispatch', 'dispatchToListener'].forEach(function(item) {
    if (chrome.runtime.onMessage[item] === undefined) {
      chrome.runtime.onMessage[item] = onMessage[item].bind(onMessage);
    }
  });

  var tabOnUpdated = {
    cbList: [],
    onTabUpdate: function(tabId, changeInfo, tab) {
      for (var i = 0, func; func = this.cbList[i]; i++) {
        func(tabId, changeInfo, tab);
      }
    },
    addListener: function(cb) {
      this.cbList.push(cb);
      this.checkListening();
    },
    removeListener: function(cb) {
      this.cbList.splice(this.cbList.indexOf(cb), 1);
      this.checkListening();
    },
    checkListening: function() {
      sb.sendMessage({action: 'tabsOnUpdate', state: !!this.cbList.length});
    }
  };
  chrome.tabs.onUpdated = {};
  chrome.tabs.onUpdated.addListener = tabOnUpdated.addListener.bind(tabOnUpdated);
  chrome.tabs.onUpdated.removeListener = tabOnUpdated.removeListener.bind(tabOnUpdated);

  var popupResizeMonitor = function() {
    var lastWidth = 0;
    var lastHeight = 0;

    var onTimer = function() {
      var width = document.body.offsetWidth || document.body.scrollWidth;
      var height = document.body.offsetHeight || document.body.scrollHeight;

      if (lastWidth === width && lastHeight === height) {
        return;
      }

      env.sb.sendMessage({
        action: 'resizePopup',
        width: width,
        height: height
      }, function(ready) {
        if (ready) {
          lastWidth = width;
          lastHeight = height;
        }
      });
    };

    onTimer();

    setTimeout(function() {
      onTimer();
    }, 150);

    clearInterval(popupResizeMonitor.interval);
    popupResizeMonitor.interval = setInterval(onTimer, 1000);

    window.addEventListener('resize', function() {
      onTimer();
    });
  };

  sb.onMessage(function(msg, response) {
    if (msg.action === 'tabOnUpdated') {
      tabOnUpdated.onTabUpdate.apply(tabOnUpdated, msg.args);
    } else
    if (msg.action === 'callFuncById') {
      env.uniApiWrapper.callFuncById(msg);
    } else
    if (msg.action === 'onMessage') {
      onMessage.onMsg(msg, response);
    } else
    if (msg.action === 'exec') {
      pageReady(function() {
        (new Function('', env.preloadCode + msg.script))();
      });
    } else
    if (msg.action === 'i18n') {
      chrome.i18n.lang = msg.lang;
    } else
    if (msg.action === 'setManifest') {
      chrome.runtime.getManifest.data = msg.data;
    } else
    if (msg.action === 'setDetails') {
      chrome.app.getDetails.data = msg.data;
    } else
    if (msg.action === 'setUILanguage') {
      chrome.i18n.getUILanguage.data = msg.data;
    } else
    if (msg.action === 'setHtmlContent') {
      document.head.parentNode.innerHTML = msg.html;
    } else
    if (msg.action === 'setStyle') {
      var style = document.createElement('style');
      style.textContent = msg.css;
      document.head.appendChild(style);
    } else
    if (msg.action === 'isPopup') {
      window.close = function() {
        sb.sendMessage({action: 'closePopup'});
      };
    } else
    if (msg.action === 'chromeApi') {
      for (var n = 0, item; item = msg.api[n]; n++) {
        var key = item[1];
        var path = (item[0] ? item[0] + '.' : '') + item[1];
        var value = item[2];
        var obj = chrome;
        for (var i = 0, arr = item[0].split('.'), sub; sub = arr[i]; i++) {
          if (!obj.hasOwnProperty(sub)) {
            obj[sub] = {};
          }
          obj = obj[sub];
        }
        if (obj[key] === undefined) {
          if (value === '[Function]') {
            var details = {
              funcName: item[1],
              funcPath: item[0],
              fullPath: path,
              isListener: 0
            };
            var func;
            if (func = env.uniApiWrapper.bindListener[item[1]]) {
              value = func.bind(env.uniApiWrapper.bindListener, details);
            } else {
              value = env.uniApiWrapper.callRemoteFunc.bind(env.uniApiWrapper, details);
            }
          }
          obj[key] = value;
        }
      }
      if (location.hash !== '#bg') {
        delete chrome.runtime.getBackgroundPage;
        delete chrome.extension.getBackgroundPage;
      }
    } else
    if (msg.action === 'getPopupSize') {
      popupResizeMonitor();
    } else
    if (msg.action === 'getPageTitle') {
      response(document.title);
    } else
    if (msg.action === 'setLocalStorage') {
      env.localStorage.create(msg.time, msg.storage);
    } else
    if (msg.action === 'localStorageUpdate') {
      env.localStorage.sync(msg.time, msg.storage);
    } else
    if (msg.action === 'setURL') {
      chrome.runtime.getURL.url = msg.url;
    }
  });
})();
