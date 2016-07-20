/**
 * Created by Anton on 20.06.2015.
 */
var utils = {};

utils.matchToArray = function(match, glob) {
  "use strict";
  var item = ['^'];
  for (var i = 0, l; l = match[i]; i++) {
    if (glob && l === '?') {
      item.push('.');
    } else
    if (l === '*') {
      if (match.substr(i + 1, 3) === '://') {
        item.push('[^\/]+');
      } else {
        item.push('.+');
      }
    } else if (l === '/') {
      item.push('\\' + l);
    } else if (l === '.') {
      if (item.slice(-1)[0] === '.+') {
        item.splice(-1);
        item.push('(:?[^\/]+\\.|)');
      } else {
        item.push('\\.');
      }
    } else {
      item.push(l);
    }
  }
  if (item.slice(-2).toString() === '\\\/,.+') {
    item.splice(-2);
    item.push('.*');
  }
  item.push('$');
  return item;
};

utils.getExt = function(slug, cb) {
  "use strict";
  if (utils.getExt.installing) {
    return cb({
      status: 'error',
      text: 'Other install in progress!'
    });
  }
  utils.getExt.installing = true;

  var cDate = (function(){
    var _date = new Date();
    var date = _date.getDate();
    var month = _date.getMonth() + 1;
    var cDate = '';

    cDate += date < 10 ? '0' + date : date;
    cDate += month < 10 ? '0' + month : month;
    cDate += _date.getFullYear();

    return cDate;
  })();

  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'https://addons.opera.com/extensions/download/' + slug + '/' + '?_=' + cDate, true);
  xhr.responseType = 'blob';
  xhr.onload = function() {
    utils.installExt(xhr.response, function(result) {
      utils.getExt.installing = false;
      if (result !== true) {
        cb({
          status: 'error',
          text: 'Can\'t install extension!'
        });
        throw new Error("Can\'t install extension!");
      }

      cb({status: 'installed'});
    });
  };
  xhr.onerror = function() {
    utils.getExt.installing = false;
    cb({
      status: 'error',
      text: xhr.statusText + ' (Code: ' + xhr.status + ')',
      network: true
    });
    throw new Error("Get extension error!");
  };
  xhr.send();
};
utils.getExt.installing = false;

utils.safeRegexp = function(text) {
  "use strict";
  return text.replace(utils.safeRegexp.r, '\\$&');
};
utils.safeRegexp.r = /[\-\[\]{}()*+?.,\\\^$|#\s]/g;

utils.checkAutoUpdate = function() {
  "use strict";
  var storage = engine.storage;
  var now = parseInt(Date.now() / 1000);
  if (storage.lastCheckUpdate > now) {
    return;
  }
  storage.lastCheckUpdate = now + 3 * 60 * 60;
  engine.save();

  utils.checkUpdate(function(data) {
    if (data.status === 'error' && data.network) {
      return;
    }

    storage.lastCheckUpdate = now + 24 * 60 * 60;
    engine.save();
  });
};

utils.checkUpdate = function(cb) {
  "use strict";
  var appId = engine.storage.appId;
  if (!appId) {
    cb({
      status: 'error',
      text: 'App id is not defined!'
    });
    throw new Error("App id is not defined!");
  }

  var version = engine.ext.manifest && engine.ext.manifest.version;

  var xhr = new XMLHttpRequest();
  var page = 'https://addons.opera.com/extensions/details/app_id/' + appId + '/';
  xhr.open('GET', page, true);
  xhr.onload = function() {
    var text = xhr.responseText;
    var r = new RegExp(utils.safeRegexp('<dd>'+version+'</dd>'));
    if (r.test(text)) {
      return cb({
        text: 'Last version is ' + version
      });
    }

    var slug = text.match(/"aoc:slug"\s+content="([^"]+)"/);
    slug = slug && slug[1];
    if (!slug) {
      cb({
        status: 'error',
        text: 'Extension is not found!'
      });
      throw new Error("Extension is not found!");
    }

    utils.getExt(slug, cb);
  };
  xhr.onerror = function() {
    cb({
      status: 'error',
      text: xhr.statusText + ' (Code: ' + xhr.status + ')',
      network: true
    });
    throw new Error("Store extension page is not found!");
  };
  xhr.send();
};

utils.installExt = function(entrie, onSuccess) {
  "use strict";

  var onLoaded = function() {
    zip.workerScripts = {
      inflater: ['js/z-worker.js', 'js/inflate.js']
    };

    var model = {
      ext2mime: {
        json: 'application/json',
        css: 'text/css',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        svg: 'image/svg+xml',
        js: 'application/javascript',
        html: 'text/html',
        ico: 'image/vnd.microsoft.icon'
      },
      onerror: function (message) {
        console.error(message);
        onSuccess(message);
      },
      getEntries : function(file, onend) {
        zip.createReader(new zip.BlobReader(file), function(zipReader) {
          zipReader.getEntries(function(entries) {
            zipReader.getInfo(function(info) {
              onend(entries, info);
            });
          });
        }, this.onerror);
      },
      getEntryFile : function(entry, onend, onprogress) {
        var writer;
        var filename = entry.filename;
        var fileExt = filename.substr(filename.lastIndexOf('.') + 1);
        var mime = this.ext2mime[fileExt];

        if (!mime) {
          console.log('mime is not defined!', fileExt);
        }

        function getData() {
          entry.getData(writer, function(blob) {
            var reader = new window.FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = function() {
              onend(reader.result);
            };
          }, onprogress);
        }

        writer = new zip.BlobWriter(mime);
        getData();
      },
      success: function(vFs, appId) {
        var next = function() {
          engine.storage.vFs = vFs;
          engine.storage.appId = appId;

          engine.save(function() {
            onSuccess(true);
            setTimeout(function() {
              chrome.runtime.reload();
            }, 250);
          });
        };

        if (appId !== engine.storage.appId) {
          utils.onRemoveExtension(next);
        } else {
          next();
        }
      }
    };

    model.getEntries(entrie, function(entries, info) {
      var vFs = {};
      var n = 0;
      var r = 0;
      entries.forEach(function(entry) {
        n++;
        entry.filename = entry.filename.toLowerCase();
        model.getEntryFile(entry, function(blobURL) {
          r++;
          vFs[entry.filename] = blobURL;
          if (n === r) {
            model.success(vFs, utils.getAppId(info));
          }
        });
      });
    });
  };

  var hasLibs = function() {
    return typeof zip !== 'undefined' && typeof jsSHA !== 'undefined';
  };

  if (hasLibs()) {
    return onLoaded();
  }

  ['js/zip.js', 'js/sha256.js'].forEach(function(src) {
    var script = document.createElement('script');
    script.src = src;
    document.head.appendChild(script);
  });

  (function waitJs() {
    if (waitJs.limit === undefined) {
      waitJs.limit = 40;
    }
    setTimeout(function() {
      if (hasLibs()) {
        return onLoaded();
      }

      waitJs.limit--;
      if (waitJs.limit === 0) {
        console.error('zipJs and jsSHA is not found!');
        return;
      }
      waitJs();
    }, 50);
  })();
};

utils.getAppId = function(info) {
  "use strict";
  if (!info) {
    return null;
  }
  var shaObj = new jsSHA("SHA-256", "BYTES");
  shaObj.update(info.publicKey);
  var hash = shaObj.getHash("HEX");
  hash = hash.slice(0, 32);
  hash = hash.replace(/./g, function (x) {
    return (parseInt(x, 16) + 10).toString(26);
  });
  return hash;
};

utils.onRemoveExtension = function(cb) {
  "use strict";
  var storage = engine.storage;

  utils.setDefaultIcon();

  chrome.storage.local.clear(function() {
    chrome.storage.sync.clear(function() {
      localStorage.clear();

      delete storage.vFs;
      delete storage.appId;
      delete storage.lastCheckUpdate;

      cb();
    });
  });
};

utils.removeExtension = function() {
  "use strict";
  utils.onRemoveExtension(function() {
    engine.save(function() {
      chrome.runtime.reload();
    });
  });
};

utils.preloadExtension = function() {
  "use strict";
  var storage = engine.storage;
  var appId = storage.appId;
  if (!appId || storage.vFs) {
    return;
  }

  utils.onRemoveExtension(function() {
    storage.appId = appId;

    utils.checkUpdate(function(data) {
      if (data.status === 'error') {
        console.error("Can't preload extension", appId, data.text);
      }
    });
  });
};

utils.prepareFiles = function(vFs, cb) {
  if (!vFs) {
    return;
  }
  var w = 0;
  var f = 0;
  var textExt = ['json', 'js', 'css', 'html'];
  var vTextFs = {};

  var getData = function(blob, cb) {
    var reader = new window.FileReader();
    reader.readAsText(blob);
    reader.onloadend = function() {
      cb(reader.result);
    };
  };

  for (var filename in vFs) {
    var ext = filename.substr(filename.lastIndexOf('.') + 1).toLowerCase();
    if (textExt.indexOf(ext) === -1) {
      continue;
    }

    w++;
    getData(tools.b64toBlob(vFs[filename]), function(filename, content) {
      vTextFs[filename] = content;
      f++;
      if (f === w) {
        cb(vTextFs);
      }
    }.bind(null, filename));
  }
};

utils.injectInOpenTabs = function() {
  "use strict";
  chrome.tabs.query({
    url: '*://addons.opera.com/*'
  }, function(tabs) {
    for (var i = 0, tab; tab = tabs[i]; i++) {
      if (!/:\/\/addons.opera.com\/.+\/extensions\/details\//.test(tab.url)) {
        continue;
      }
      chrome.tabs.executeScript(tab.id, {
        file: 'includes/operaStore.js',
        runAt: 'document_end'
      });
    }
  });
};

utils.getUuid = function() {
  "use strict";
  var uuid = engine.storage.uuid;
  if (typeof uuid === 'string' && uuid.length === 36) {
    return uuid;
  }

  uuid = engine.storage.uuid = utils.generateUuid();
  engine.save();
  return uuid;
};

utils.generateUuid = function() {
  "use strict";
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
};

utils.sendStat = function() {
  "use strict";
  var storage = engine.storage;
  var now = parseInt(Date.now() / 1000);
  if (storage.statExpire > now) {
    return;
  }
  storage.statExpire = now + 24 * 60 * 60;
  engine.save();


  var xhr = new XMLHttpRequest();

  var url = 'https://www.google-analytics.com/collect?z=' + Date.now();

  var params = {
    v: 1,
    ul: navigator.language,
    tid: 'UA-65944543-1',
    cid: utils.getUuid(),

    an: 'chameleon',
    aid: 'chameleon-chrome',
    av: chrome.runtime.getManifest().version,

    ec: 'extension',
    ea: 'id',
    el: storage.appId || '<no app id>',

    t: 'event'
  };

  var data = [];
  for (var key in params) {
    data.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
  }
  data = data.join('&');

  xhr.open('POST', url);
  xhr.send(data);
  xhr.onerror = function() {
    storage.statExpire = -1;
    engine.save();
  };
};

utils.setDefaultIcon = function() {
  var selfManifest = chrome.runtime.getManifest();
  chrome.browserAction.setIcon({path: selfManifest.browser_action.default_icon});
  chrome.browserAction.setBadgeText({text: ''});
  chrome.browserAction.setBadgeBackgroundColor({color: '#F00'});
};