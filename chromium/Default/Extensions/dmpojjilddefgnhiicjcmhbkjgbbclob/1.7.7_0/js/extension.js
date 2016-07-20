/**
 * Created by Anton on 26.06.2015.
 */
var ExtensionLoader = function(vFs, cb) {
  "use strict";
  var env = {};
  var hasFile = function(filename) {
    "use strict";
    filename = tools.fileNameNormalize(filename);
    return !!env.vFs[filename];
  };
  var getFile = function(filename) {
    "use strict";
    filename = tools.fileNameNormalize(filename);
    var base64 = env.vFs[filename];
    if (!base64) {
      console.error('File is not found!', filename);
      return '';
    }
    return base64;
  };
  var getTextFile = function(filename) {
    filename = tools.fileNameNormalize(filename);
    var text = env.vTextFs[filename];
    if (text !== undefined) {
      return text;
    }

    var base64 = vFs[filename];
    if (!base64) {
      console.error('File is not found!', filename);
      return '';
    }
    return atob(base64.substr(base64.indexOf(',') + 1));
  };
  var getLanguage = function(acceptLangs) {
    var langList = {};
    for (var filename in env.vFs) {
      var locale = filename.match(/^_locales\/([^\/]+)\/messages\.json$/);
      if (!locale) {
        continue;
      }
      locale = locale[1].toLowerCase();
      langList[locale] = filename;
    }

    var keys;
    if ((keys = Object.keys(langList)).length === 0) {
      return {};
    }

    if (this.manifest.default_locale) {
      acceptLangs.push(this.manifest.default_locale);
    }

    acceptLangs = acceptLangs.map(function(item) {
      return item.toLowerCase();
    });

    for (var i = 0, lang; lang = acceptLangs[i]; i++) {
      if (langList[lang]) {
        var langContent = getTextFile(langList[lang]);
        try {
          langContent = JSON.parse(langContent);
        } catch(e) {
          langContent = langContent.replace(/\\x[A-F0-9]{2}/g, '?');
          langContent = JSON.parse(langContent);
        }
        return langContent;
      }
    }

    return langList[keys[0]];
  };
  var setPopup = function() {
    if ((this.manifest.browser_action && this.manifest.browser_action.default_popup) ||
      (this.manifest.sidebar_action && this.manifest.sidebar_action.default_panel)) {
      var selfManifest = chrome.runtime.getManifest();
      chrome.browserAction.setPopup({popup: selfManifest.browser_action.default_popup});
    } else {
      chrome.browserAction.setPopup({popup: ''});
    }
  };
  var setBtnIcon = function() {
    var b64;
    var defaultIcon;
    var browserAction = this.manifest.browser_action;

    if (!browserAction || !(defaultIcon = browserAction.default_icon)) {
      if (!(defaultIcon = this.manifest.icons)) {
        throw new Error("manifest.icons is not exists!");
      }
    }

    defaultIcon = JSON.parse(JSON.stringify(defaultIcon));

    if (typeof defaultIcon === 'string') {
      b64 = env.vFs[defaultIcon.toLowerCase()];
      if (!b64) {
        throw new Error("Default icon is not exists in fs: " + defaultIcon);
      }

      return chrome.browserAction.setIcon({path: tools.b64toUrl(b64)});
    }

    var lastKey = 0;
    for (var key in defaultIcon) {
      b64 = env.vFs[defaultIcon[key].toLowerCase()];
      delete defaultIcon[key];
      if (!b64) {
        continue;
      }
      if (lastKey < key && key < 39) {
        lastKey = key;
        key = key < 20 ? 19 : 38;
        defaultIcon[key] = tools.b64toUrl(b64);
      }
    }

    if (Object.keys(defaultIcon).length === 0) {
      throw new Error("DefaultIcon is not found!");
    }

    chrome.browserAction.setIcon({path : defaultIcon});
  };
  var i18nGetMessage = function(messageName) {
    return this.language[messageName] && this.language[messageName].message || '';
  };
  var setBtnTitle = function() {
    chrome.browserAction.setTitle({
      title: this.details.name
    });
  };
  var getBgPageCode = function() {
    var background = this.manifest.background;
    if (!background) {
      return '';
    }

    var bgFunction = [];
    if (background.scripts) {
      background.scripts.forEach(function(filename) {
        bgFunction.push(getTextFile(filename));
      }.bind(this));
    } else
    if (background.page) {
      var content = getTextFile(background.page);
      content.replace(/<script[^>]+src=['"]([^'">]+)['"]/g, function(text, filename) {
        if (filename.slice(-3) === '.js') {
          bgFunction.push(getTextFile(tools.fileNameNormalize(filename,  tools.getPath(background.page))));
        }
      });
    }
    return bgFunction.join('\n');
  };
  var setMatchList = function() {
    this.matchList.splice(0);
    var matchUrl = [];
    var matchFrameUrl = [];
    var contentScripts = this.manifest.content_scripts;
    contentScripts && contentScripts.forEach(function(item) {
      var obj = {};

      obj.frame = !!item.all_frames;

      ['include_globs', 'exclude_globs', 'matches', 'exclude_matches'].forEach(function(type, index) {
        if (!item[type] || !item[type].length) {
          return true;
        }
        obj[type] = [];
        item[type].forEach(function(match) {
          if (match === '<all_urls>') {
            obj[type].push('^https?|file|ftp:\/\/.+$');
          } else {
            var symbolArr = utils.matchToArray(match, index < 2);

            obj[type].push(symbolArr.join(''));
          }
        });
        obj[type] = obj[type].join('|');
      });

      if (!obj.matches || !obj.matches.length) {
        return true;
      }

      if (obj.frame) {
        matchFrameUrl.push(obj.matches);
      }
      matchUrl.push(obj.matches);

      obj.matches = new RegExp(obj.matches);
      obj.exclude_matches && (obj.exclude_matches = new RegExp(obj.exclude_matches));
      obj.include_globs && (obj.include_globs = new RegExp(obj.include_globs));
      obj.exclude_globs && (obj.exclude_globs = new RegExp(obj.exclude_globs));

      var js = [];
      var css = [];

      item.js && item.js.forEach(function(filename) {
        js.push(getTextFile(filename));
      });

      item.css && item.css.forEach(function(filename) {
        css.push(getTextFile(filename));
      });

      if (css.length) {
        obj.css = css.join('\n');
      }

      if (js.length) {
        obj.js = js.join('\n');
      }

      this.matchList.push(obj);
    }.bind(this));

    if (matchUrl.length) {
      matchUrl = matchUrl.join('|');
      matchUrl = new RegExp(matchUrl);
    } else {
      matchUrl = undefined;
    }

    if (matchFrameUrl.length) {
      matchFrameUrl = matchFrameUrl.join('|');
      matchFrameUrl = new RegExp(matchFrameUrl);
    } else {
      matchFrameUrl = undefined;
    }

    this.matchUrl = matchUrl;
    this.matchFrameUrl = matchFrameUrl;
  };
  var prepareCss = function(content, filename) {
    "use strict";
    var path = tools.getPath(filename);

    content = content.replace(/url\(['"]?([^'")]+)['"]?\)/g, function(text, link) {
      if (link.substr(0, 4) === 'http') {
        return text;
      }

      var filePath = tools.fileNameNormalize(link, path);

      if (!hasFile(filePath)) {
        return text;
      }

      return text.replace(link, getFile(filePath));
    });

    content = content.replace(/\@import\s+["']?([^'"\n;]+)["']?/g, function(text, link) {
      if (link.substr(0, 4) === 'http') {
        return text;
      }

      var filePath = tools.fileNameNormalize(link, path);

      if (!hasFile(filePath)) {
        return text;
      }

      if (link.indexOf('.css') !== -1) {
        css.push(prepareCss(getTextFile(filePath), filePath));
      } else {
        return text.replace(link, getFile(filePath));
      }

      return '//' + text;
    });

    return content;
  };
  var prepareHtml = function(content, filename) {
    "use strict";
    var js = [];
    var css = [];
    var path = tools.getPath(filename);

    content = content.replace(/<(script|link|img)[^>]+(src|href)\s*=\s*["']?([^">]+)["']?/g, function(text, tag, attr, link) {
      if (link.substr(0, 4) === 'http') {
        return text;
      }

      var filePath = tools.fileNameNormalize(link, path);

      if (!hasFile(filePath)) {
        return text;
      }

      if (tag === 'script') {
        if (link.indexOf('.js') !== -1) {
          js.push(getTextFile(filePath));
          return text.replace(attr, 'data-' + attr);
        }
      }

      if (tag === 'link') {
        if (link.indexOf('.css') !== -1) {
          css.push(prepareCss(getTextFile(filePath), filePath));
          return text.replace(attr, 'data-'+attr);
        } else {
          return text.replace(link, getFile(filePath));
        }
      }

      if (tag === 'img') {
        return text.replace(link, getFile(filePath));
      }

      return text;
    });

    css = css.join('\n');
    js = js.join('\n');
    return {
      html: content,
      js: js,
      css: css
    }
  };
  var getPage = function(filename) {
    filename = tools.fileNameNormalize(filename);
    return prepareHtml(getTextFile(filename), filename);
  };
  var getPopup = function() {
    var page = (this.manifest.browser_action && this.manifest.browser_action.default_popup)
      || (this.manifest.sidebar_action && this.manifest.sidebar_action.default_panel);

    if (!hasFile(page)) {
      console.error('Popup is not found', page);
      return null;
    }

    return this.getPage(page);
  };
  var getDetails = function() {
    var msgR = /^__MSG_.+__$/;
    var details = (function next(obj) {
      var nObj = {};
      for (var key in obj) {
        var item = obj[key];
        if (typeof item === 'object' && !Array.isArray(item)) {
          nObj[key] = next(item);
        } else {
          if (typeof item === 'string' && msgR.test(item)) {
            item = tools.processManifestTemplate(item) || item;
            item = i18nGetMessage(item);
          }
          nObj[key] = item;
        }
      }
      return nObj;
    })(this.manifest);

    return details;
  };
  var getIcon = function(detail) {
    var icons = this.manifest.icons;
    var sizeList = Object.keys(icons);
    sizeList.sort(function(a, b){return a > b});
    if (!detail) {
      return getFile(icons[sizeList[0]]);
    }

    if (detail.max) {
      sizeList = sizeList.filter(function(i) {
        return i <= detail.max;
      });
    }

    return getFile(icons[sizeList.slice(-1)]);
  };
  var setSandboxApi = function(sandbox, cacheName, tools) {
    !engine.apiCache[cacheName] && (engine.apiCache[cacheName] = tools.getApiTemplate());

    sandbox.sendMessage({action: 'i18n', lang: this.language});
    sandbox.sendMessage({action: 'setManifest', data: this.manifest});
    sandbox.sendMessage({action: 'setDetails', data: this.details});
    sandbox.sendMessage({action: 'setUILanguage', data: chrome.i18n.getUILanguage()});
    sandbox.sendMessage({action: 'setURL', url: chrome.runtime.getURL("")});
    sandbox.sendMessage({action: 'chromeApi', api: engine.apiCache[cacheName]});
    sandbox.sendMessage({action: 'setLocalStorage', storage: tools.ls.getStorage(), time: Date.now()});
  };
  var Extension = function(vFs, vTextFs, acceptLangs) {
    i18nGetMessage = i18nGetMessage.bind(this);

    this.getTextFile = getTextFile = getTextFile.bind(this);
    this.getFile = getFile = getFile.bind(this);
    this.hasFile = hasFile = hasFile.bind(this);

    this.getIcon = getIcon.bind(this);
    this.getPage = getPage.bind(this);
    this.getPopup = getPopup.bind(this);

    this.vFs = env.vFs = vFs;
    this.vTextFs = env.vTextFs = vTextFs;

    this.manifest = JSON.parse(getTextFile('manifest.json'));
    this.language = getLanguage.call(this, acceptLangs);

    this.language['@@extension_id'] = engine.storage.appId || '';
    this.details = getDetails.call(this);
    this.setSandboxApi = setSandboxApi.bind(this);

    setPopup.call(this);
    try {
      setBtnIcon.call(this);
    } catch (e) {
      utils.setDefaultIcon();
    }
    setBtnTitle.call(this);

    tools.initSandbox(engine, 'bg', function(sandbox) {
      sandbox.onMessage(function(msg, cb) {
        tools.onMessageFromFrame(msg, cb);
      });

      sandbox.sendMessage({action: 'exec', script: getBgPageCode.call(this)});
    }.bind(this));

    this.matchFrameUrl = undefined;
    this.matchUrl = undefined;
    this.matchList = [];
    setMatchList.call(this);

    this.checkUpdate = utils.checkUpdate;
    this.checkAutoUpdate = utils.checkAutoUpdate;
  };
  return utils.prepareFiles(vFs, function(vTextFs) {
    chrome.i18n.getAcceptLanguages(function (acceptLangs) {
      setTimeout(function() {
        cb(new Extension(vFs, vTextFs, acceptLangs));
      });
    });
  });
};