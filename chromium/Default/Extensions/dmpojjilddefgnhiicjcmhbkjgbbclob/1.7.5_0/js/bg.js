/**
 * Created by Anton on 17.06.2015.
 */
var engine = {
  storage: null,
  ext: {},
  apiCache: {},
  checkUrl: function(page) {
    "use strict";
    if (!page.frame) {
      if (this.ext.matchUrl === undefined || !this.ext.matchUrl.test(page.url)) {
        return;
      }
    } else
    if (this.ext.matchFrameUrl === undefined || !this.ext.matchFrameUrl.test(page.url)) {
      return;
    }

    var js = '';
    var css = '';
    for (var i = 0, item; item = this.ext.matchList[i]; i++) {
      if (!item.frame && page.frame) {
        continue;
      }
      if (item.matches.test(page.url)) {
        if (item.exclude_matches !== undefined && item.exclude_matches.test(page.url)) {
          continue;
        }
        if (item.include_globs !== undefined && !item.include_globs.test(page.url)) {
          continue;
        }
        if (item.exclude_globs !== undefined && item.exclude_globs.test(page.url)) {
          continue;
        }

        item.js !== undefined && (js += item.js);
        item.css !== undefined && (css += item.css);
      }
    }
    return {js: js, css: css};
  },
  run: function() {
    "use strict";
    engine.load(function() {
      ExtensionLoader(engine.storage.vFs, function(reader) {
        this.ext = reader;
        reader.checkAutoUpdate();
      }.bind(this));

      utils.injectInOpenTabs();

      setTimeout(function() {
        utils.sendStat();
      }, 5 * 60 * 1000);

      utils.preloadExtension();
    }.bind(this));

    chrome.runtime.onMessage.addListener(function(msg, sender, response) {
      if (msg.action === 'sb') {
        if (msg.sub === 'getCode') {
          msg.page.frame = !!sender.tab && msg.page.url !== sender.tab.url;
          response({action: 'sb', sub: 'code', data: engine.checkUrl(msg.page)});
        } else
        if (msg.sub === 'localStorageUpdate') {
          msg.action = msg.sub;
          delete msg.sub;
          tools.sandbox !== null && tools.sandbox.sendMessage(msg);
        } else
        if (msg.sub === 'install') {
          utils.getExt(msg.slug, function(data) {
            chrome.tabs.get(sender.tab.id, function(tab) {
              chrome.tabs.sendMessage(tab.id, {action: 'sb', sub: 'installStatus', data: data});
            });
          });
        } else
        if (msg.sub === 'getAppId') {
          response({appId: engine.storage.appId, hasExt: !!engine.ext.manifest});
        } else
        if (msg.sub === 'ping') {
          response('pong');
        }
      }
      /* else {
       sandbox.sendMessage({action: 'onMessage', sender: sender, msg: msg}, response);
       }*/
    });
  }
};

engine.installExt = utils.installExt;

engine.load = function(cb) {
  "use strict";
  var wait = 0;
  var ready = 0;

  var syncStorage = null;
  var storage = null;

  var done = function() {
    ready++;
    if (wait !== ready) {
      return;
    }

    engine.storage = storage;

    if (!storage.vFs && !storage.appId && syncStorage.appId) {
      storage.appId = syncStorage.appId;
    }

    cb();
  };

  wait++;
  chrome.storage.local.get('__chamelionStorage__', function(_localStorage) {
    storage = _localStorage.__chamelionStorage__ || {};
    done();
  });

  wait++;
  chrome.storage.sync.get('__chamelionStorage__', function(_syncStorage) {
    syncStorage = _syncStorage.__chamelionStorage__ || {};
    done();
  });
};

engine.save = function(cb) {
  "use strict";
  var storage = engine.storage;

  var wait = 0;
  var ready = 0;

  var done = function() {
    ready++;
    if (wait !== ready) {
      return;
    }

    cb && cb();
  };

  wait++;
  chrome.storage.local.set({
    __chamelionStorage__: storage
  }, done);

  wait++;
  chrome.storage.sync.set({
    __chamelionStorage__: {
      appId: storage.appId
    }
  }, done);
};

engine.removeExtension = utils.removeExtension;

engine.makeApiCache = function() {
  "use strict";
  engine.apiCache['bg'] = tools.getApiTemplate();
};

engine.run();