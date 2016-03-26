/**
 * Created by Anton on 20.06.2015.
 */
var tools = {};
tools.sandbox = null;
tools.engine = null;
tools.b64toBlob = function (content) {
  "use strict";
  var m = content.match(/^[^:]+:([^;]+);[^,]+,(.+)$/);
  if (!m) {
    m = ['', '', ''];
  }
  var contentType = m[1];
  var b64Data = m[2];
  m = null;
  content = null;

  var sliceSize = 256;
  var byteCharacters = atob(b64Data);
  var byteCharacters_len = byteCharacters.length;
  var byteArrays = new Array(Math.ceil(byteCharacters_len / sliceSize));
  var n = 0;
  for (var offset = 0; offset < byteCharacters_len; offset += sliceSize) {
    var slice = byteCharacters.slice(offset, offset + sliceSize);
    var slice_len = slice.length;
    var byteNumbers = new Array(slice_len);
    for (var i = 0; i < slice_len; i++) {
      byteNumbers[i] = slice.charCodeAt(i) & 0xff;
    }
    byteArrays[n] = new Uint8Array(byteNumbers);
    n++;
  }
  return new Blob(byteArrays, {type: contentType});
};

tools.b64toUrl = function(content) {
  "use strict";
  var blob = tools.b64toBlob(content);
  return URL.createObjectURL(blob);
};

tools.wrapMsgTools = function(sb) {
  "use strict";
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
};
tools.initSandboxMsg = function(frameEl) {
  "use strict";
  var sb = {};

  tools.wrapMsgTools(sb);

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
      frameEl.contentWindow.postMessage(msg, '*');
    }
  };

  sb.onMessage.on = frame.on;
  sb.sendMessage.send = frame.send;

  return sb;
};
tools.initSandbox = function(engine, cacheName, onReady) {
  "use strict";
  this.engine = engine;

  var frame = document.createElement('iframe');
  var hash = window.location.pathname === '/_generated_background_page.html' ? '#bg' : '';
  frame.src = 'sandbox.html' + hash;
  document.body.appendChild(frame);

  var sandbox = tools.sandbox = tools.initSandboxMsg(frame);

  var isFired = false;
  var _onReady = function() {
    if (isFired) {
      return;
    }
    isFired = true;

    engine.ext.setSandboxApi(sandbox, cacheName, tools);

    onReady(sandbox);
  };

  frame.contentWindow.addEventListener('DOMContentLoaded', _onReady);

  return sandbox;
};
tools.getPath = function(filename) {
  "use strict";
  var pos = filename.lastIndexOf('/');
  if (pos !== -1) {
    filename = filename.substr(0, pos + 1);
  } else {
    filename = '';
  }
  return filename;
};

tools.fileNameNormalize = function(filename, path) {
  "use strict";
  if (!filename) {
    return filename;
  }

  path = path || '';

  filename = filename.split(/[?#]/)[0];

  if (filename.substr(0, 19) === 'chrome-extension://') {
    path = '';
    filename = filename.substr(filename.indexOf('/', 20));
  }

  if (filename[0] === '/') {
    path = '';
  }

  var fileNameList = path.split('/').concat(filename.split('/')).filter(function(item) {
    return item && item !== '.';
  });

  var list = [];
  for (var i = 0, len = fileNameList.length; i < len; i++) {
    var item = fileNameList[i];
    if (item === '..') {
      list.splice(-1);
      continue;
    }
    list.push(item);
  }

  return list.join('/').toLowerCase();
};
tools.localUrl2b64 = function(url) {
  "use strict";
  var pos, hasUrl, id = chrome.runtime.id;
  if (url.substr(0, 4) === 'http' || (hasUrl = (url.substr(0, 19) === 'chrome-extension://')) && (pos = url.indexOf(id)) === -1) {
    return url;
  }
  if (hasUrl) {
    url = url.substr(pos + 1 + id.length);
  }
  var localContent = tools.engine.ext.getFile(url);
  if (!localContent) {
    console.log('Local file is not found!', url);
    url = '404';
  } else {
    url = tools.b64toUrl(localContent);
  }
  return url;
};
tools.vXhr = {
  xhrList: {},
  xhr: function(message, response) {
    "use strict";
    var xhrList = this.xhrList;
    var wait = true;
    var getVXhr = function(cbType) {
      if (!wait) {
        return;
      }
      wait = false;

      delete xhrList[id];

      vXhr.status = xhr.status;
      vXhr.statusText = xhr.statusText;
      vXhr.responseURL = xhr.responseURL;
      vXhr.readyState = xhr.readyState;
      vXhr.responseHeaders = xhr.getAllResponseHeaders();

      if (vXhr.responseType) {
        vXhr.response = xhr.response;
      } else {
        vXhr.responseText = xhr.responseText;
      }
      vXhr.cbType = cbType;

      response(vXhr);
    };

    var vXhr = message.data;
    var id = vXhr.id;
    var xhr = xhrList[id] = new XMLHttpRequest();
    if (vXhr.url && vXhr.url.substr(0, 4) !== 'http') {
      vXhr.url = tools.localUrl2b64(vXhr.url);
    }
    if (vXhr.withCredentials) {
      xhr.withCredentials = true;
    }
    xhr.open(vXhr.method, vXhr.url, true);
    vXhr.mimeType && xhr.overrideMimeType(vXhr.mimeType);
    for (var key in vXhr.headers) {
      xhr.setRequestHeader(key, vXhr.headers[key]);
    }
    if (vXhr.timeout) {
      xhr.timeout = vXhr.timeout;
      xhr.ontimeout = getVXhr.bind(null, 'ontimeout')
    }
    if (vXhr.responseType && vXhr.async) {
      xhr.responseType = vXhr.responseType;
    }

    xhr.onload = getVXhr.bind(null, 'onload');

    xhr.onerror = getVXhr.bind(null, 'onerror');

    xhr.onabort = getVXhr.bind(null, 'onabort');

    xhr.send(vXhr.data);
  },
  xhrAbort: function(message) {
    "use strict";
    var xhrList = this.xhrList;
    var id = message.id;
    if (xhrList.hasOwnProperty(id)) {
      xhrList[id].abort();
      delete xhrList[id];
    }
  }
};
tools.tabsOnUpdate = {
  listener: function(tabId, changeInfo, tab) {
    "use strict";
    if (changeInfo.status !== 'loading') { // complete or loading
      return;
    }

    tools.sandbox.sendMessage({action: 'tabOnUpdated', args: [tabId, changeInfo, tab]});
  },
  setState: function(state) {
    "use strict";
    chrome.tabs.onUpdated.removeListener(this.listener);
    if (state) {
      chrome.tabs.onUpdated.addListener(this.listener);
    }
  }
};
tools.deDblFileInclude = function(filename) {
  "use strict";
  var code = tools.engine.ext.getTextFile(filename);
  var func = function() {
    var sbScriptList;
    var filename = '{filename}';
    if (!(sbScriptList = window.sbScriptList)) {
      window.sbScriptList = sbScriptList = [];
    }
    if (sbScriptList.indexOf(filename) === -1) {
      sbScriptList.push(filename);
      //split!
      sbScriptList=1;
    }
  };
  func = func.toString().replace('{filename}', filename);
  var pos = func.indexOf('{') + 1;
  func = func.substr(pos, func.lastIndexOf('}') - pos);
  func = func.split('sbScriptList=1');
  func.splice(1, 0, code);
  return func.join('\n');
};
tools.uniApiWrapper = {
  prefix: Math.floor(Math.random()*1000)+'_',
  index: 0,
  callCache: {},
  funcObj: {},
  keepAlive: 30000,
  debug: false,
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
        arg = {a: id, b: arg.length};
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
    "use strict";
    var args = this.args2list(arguments, 1, argsLen);
    var idList = args.idList;
    args = args.args;

    this.debug && console.debug('>bindRemoteFunc', 'by', caller, id, args);

    tools.sandbox.sendMessage({action: 'callFuncById', id: id, args: args, idList: idList});

    idList.length > 0 && setTimeout(function() {
      this.rmVirtualApiFuncs(idList);
    }.bind(this), this.keepAlive);
  },
  prepareArgs: function(caller, args, isListener) {
    "use strict";
    var argList = [];
    var arg;
    var id;
    var argsLen;
    var func;
    for (var i = 0, len = args.length; i < len; i++) {
      arg = args[i];
      id = arg.a;
      if ((argsLen = arg.b) !== undefined) {
        if ((func = this.funcObj[id]) === undefined) {
          func = this.bindRemoteFunc.bind(this, {caller: caller, id: id, argsLen: argsLen});
          if (isListener) {
            this.funcObj[id] = func;
          }
        }
        argList.push(func);
      } else {
        argList.push(id);
      }
    }
    return argList;
  },
  callFuncById: function(msg) {
    "use strict";
    var func;
    if ((func = this.funcObj[msg.id]) === undefined) {
      console.error('Function is not found', msg.id, [msg]);
      return;
    }

    var args = this.prepareArgs(msg.id, msg.args);

    this.debug && console.debug('>callFuncById', msg.id, args);

    func.apply(null, args);

    this.rmVirtualApiFuncs(msg.idList.concat(msg.id));
  },
  onCallFunc: function(msg) {
    "use strict";
    !msg.isListener && msg.idList.length > 0 && setTimeout(function() {
      this.rmVirtualApiFuncs(msg.idList);
    }.bind(this), this.keepAlive);
  },
  callFunc: function(msg) {
    "use strict";
    var func;
    var details;
    var pos;
    var afterCall;

    var args = this.prepareArgs(msg.sub, msg.args, msg.isListener);

    if (msg.sub === 'tabs.executeScript') {
      details = args[1];
      if (details.file) {
        var filename = details.file;
        delete details.file;
        details.code = details.code || '';
        details.code += tools.deDblFileInclude(filename);
      }
    } else
    if (msg.sub === 'tabs.create') {
      var createProperties = args[0];
      if (createProperties.url.substr(0, 4) !== 'http') {
        createProperties.url = 'options.html#' + createProperties.url;
      }
    } else
    if (msg.sub === 'browserAction.setIcon') {
      details = args[0];
      if (details) {
        var path = details.path;
        if (typeof path === 'string') {
          details.path = tools.localUrl2b64(path);
        } else
        if (typeof path === 'object') {
          for (var key in path) {
            path[key] = tools.localUrl2b64(path[key]);
          }
        }
      }
    } else
    if (['storage.local.set', 'storage.sync.set'].indexOf(msg.sub) !== -1) {
      details = args[0];
      if (details.hasOwnProperty('__chamelionStorage__')) {
        delete details.__chamelionStorage__;
      }
    } else
    if (['storage.local.remove', 'storage.sync.remove'].indexOf(msg.sub) !== -1) {
      details = args[0];
      if (details === '__chamelionStorage__') {
        args[0] = [];
      } else
      if (details instanceof Object) {
        if (Array.isArray(details)) {
          pos = details.indexOf('__chamelionStorage__');
          if (pos !== -1) {
            details.splice(pos, 1);
          }
        } else
        if (details.hasOwnProperty('__chamelionStorage__')) {
          delete details.__chamelionStorage__;
        }
      }
    } else
    if (['storage.local.clear', 'storage.sync.clear'].indexOf(msg.sub) !== -1) {
      afterCall = function() {
        tools.engine.save();
      }
    }

    this.debug && console.debug('>callFunc', msg.sub, args);

    if ((func = this.callCache[msg.sub]) !== undefined) {
      func.apply(null, args);
      this.onCallFunc(msg);
      afterCall && afterCall();
      return;
    }

    var subList = msg.sub.split('.');

    var ctx;
    func = chrome;
    for (var i = 0, item; item = subList[i]; i++) {
      ctx = func;
      if (!(func = func[item])) {
        console.error('[', subList, ']', 'Sub item is not found!', item);
        throw new Error("Sub item is not found!");
      }
    }

    func.apply(ctx, args);

    this.onCallFunc(msg);
    afterCall && afterCall();

    this.callCache[msg.sub] = func.bind(ctx);
  },
  rmVirtualApiFuncs: function(idList, sendMsg) {
    "use strict";
    for (var i = 0, id; id = idList[i]; i++) {
      // console.log('rmVirtualApiFuncs', id);
      delete this.funcObj[id];
    }
  }
};
tools.ls = {
  timeout: null,
  getStorage: function() {
    "use strict";
    return JSON.parse(JSON.stringify(localStorage));
  },
  updateStorage: function(newStorage) {
    "use strict";
    var oldStorage = localStorage;

    var hasChanges = false;
    for (var key in oldStorage) {
      if (newStorage[key] === undefined) {
        delete oldStorage[key];
        hasChanges = true;
      }
    }
    for (var key in newStorage) {
      if (oldStorage[key] !== newStorage[key]) {
        oldStorage[key] = newStorage[key];
        hasChanges = true;
      }
    }
    if (hasChanges) {
      var _this = this;
      clearTimeout(_this.timeout);
      _this.timeout = setTimeout(function() {
        chrome.runtime.sendMessage({action: 'sb', sub: 'localStorageUpdate', storage: _this.getStorage()});
      }, 500);
    }
  }
};
tools.onMessageFromFrame = function(msg, response) {
  "use strict";
  if (msg.action === 'callFunc') {
    tools.uniApiWrapper.callFunc(msg);
  } else
  if (msg.action === 'callFuncById') {
    tools.uniApiWrapper.callFuncById(msg);
  } else
  if (msg.action === 'xhr') {
    tools.vXhr.xhr(msg, response);
  } else
  if (msg.action === 'tabsOnUpdate') {
    tools.tabsOnUpdate.setState(msg.state);
  } else
  if (msg.action === 'xhrAbort') {
    tools.vXhr.xhrAbort(msg);
  } else
  if (msg.action === 'localStorageChange') {
    tools.ls.updateStorage(msg.storage);
  }
};
tools.getApiTemplate = function() {
  "use strict";
  var pathList = [];
  var writeTemplate = function(obj, path) {
    for (var key in obj) {
      var pathKey = (path.length > 0 ? path + '.' : '') + key;
      var item = obj[key];
      var type = typeof item;
      if (type === 'string' || type === 'number' || type === 'boolean') {
        pathList.push([path, key, item]);
      } else
      if (type === 'object' && !Array.isArray(item)) {
        writeTemplate(item, pathKey);
      } else
      if (Array.isArray(item)) {
        pathList.push([path, key, '[Array]']);
      } else
      if (type === 'function') {
        if (['addRules',
            'removeRules',
            'getRules'].indexOf(key) !== -1) {
          // Unsupported functions name
          continue;
        }
        if (['loadTimes', 'csi', 'Event',
            'app.getIsInstalled',
            'app.getDetailsForFrame',
            'app.runningState',
            'app.installState'
          ].indexOf(pathKey) !== -1) {
          // Exists functions
          continue;
        }
        if (['extension.getViews',
            'extension.getExtensionTabs',
            'runtime.getPackageDirectoryEntry',
            'extension.setUpdateUrlData'
          ].indexOf(pathKey) !== -1) {
          // Unsupported api functions
          continue;
        }
        if (['extension.onConnect',
            'runtime.onConnect',
            'extension.onConnectExternal',
            'runtime.onConnectExternal'
          ].indexOf(path) !== -1) {
          // Unsupported api objects
          continue;
        }
        var arr = [path, key, '[Function]'];
        if (['contextMenus.create',
            'contextMenus.update'
          ].indexOf(pathKey) !== -1) {
          arr.push('without **onclick** function, use chrome.contextMenus.**onClicked**');
        }
        if (['runtime.getBackgroundPage',
            'extension.getBackgroundPage'
          ].indexOf(pathKey) !== -1) {
          arr.push('background page only');
        }
        pathList.push(arr);
      } else {
        pathList.push([path, key, '[Other]']);
      }
    }
  };
  writeTemplate(chrome, '');

  return pathList;
};
tools.setFavicon = function() {
  "use strict";
  var icon = tools.engine.ext.getIcon();

  if (!icon) {
    return;
  }

  var favicon = document.createElement('link');
  favicon.rel = 'icon';
  favicon.href = icon;
  document.head.appendChild(favicon);
};
tools.processManifestTemplate = function(text) {
  "use strict";
  var m = text.match(/^__MSG_(.+)__$/);
  m = m && m[1] || text;
  return m;
};