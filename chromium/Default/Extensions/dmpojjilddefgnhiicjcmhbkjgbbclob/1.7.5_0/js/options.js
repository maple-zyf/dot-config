/**
 * Created by Anton on 17.06.2015.
 */

var writeDoc = function(body, engine) {
  "use strict";
  writeDoc.fired = 1;

  var content = document.getElementById('markdown');
  content = content.textContent;

  var selfManifest = chrome.runtime.getManifest();

  content = content.replace('{permission list}', selfManifest.permissions.map(function(item) {
    var value = ' - ' + item + '\n';
    return value.replace(/_/g, '\\_');
  }).join(''));

  var syncApiList = [
    'i18n.getUILanguage',
    'i18n.getMessage',
    'runtime.getManifest',
    'runtime.getURL',
    'extension.getURL',
    'app.getDetails'
  ];

  content = content.replace('{api sync list}', syncApiList.map(function(_item) {
    var item = _item.split('.');
    var func = item.splice(-1);
    item = [item.join('.'), func];
    var value = ' - ' + 'chrome.' + item[0] + '.' + '**' + item[1] + '**' + '\n';
    return value.replace(/_/g, '\\_');
  }).join(''));

  if (!engine.apiCache['bg']) {
    engine.makeApiCache();
  }

  content = content.replace('{api async list}', engine.apiCache['bg'].filter(function(item) {
    if (item[2] !== '[Function]') {
      return false;
    }
    return [
        'hasListener',
        'hasListeners',
        'dispatchToListener',
        'dispatch',
        'removeListener'
      ].indexOf(item[1]) === -1;
  }).map(function(item) {
    var path = item[0] + '.' + item[1];
    if (syncApiList.indexOf(path) !== -1) {
      return '';
    }
    var note = !item[3] ? '' : ' (' + item[3] + ')';
    var value = ' - ' + 'chrome.' + item[0] + '.' + '**' + item[1] + '**' + note + '\n';
    return value.replace(/_/g, '\\_');
  }).join(''));

  content = content.replace('{api var list}', engine.apiCache['bg'].filter(function(item) {
    if (item[2] === '[Function]') {
      return false;
    }
    return [

      ].indexOf(item[1]) === -1;
  }).map(function(item) {
    var path = item[0] + '.' + item[1];
    if ([

      ].indexOf(path) !== -1) {
      return '';
    }
    var value = ' - ' + 'chrome.' + item[0] + '.' + '**' + item[1] + '**' + '\n';
    return value.replace(/_/g, '\\_');
  }).join(''));

  body.innerHTML = markdown.toHTML(content);
};

var optionsToggle = function(force) {
  "use strict";
  var state = optionsToggle.state;
  if (force || !state) {
    document.body.classList.add('setupMode');
    optionsToggle.state = 1;
  } else {
    document.body.classList.remove('setupMode');
    optionsToggle.state = 0;
  }
};

var bindOptions = function(engine) {
  "use strict";
  var setup = document.querySelector('.setup.btn');
  setup.addEventListener('click', function(e) {
    e.preventDefault();
    optionsToggle();
  });
  setup = null;

  var fileInput = document.getElementById("extInput");
  fileInput.addEventListener('change', function() {
    fileInput.disabled = true;
    engine.installExt(fileInput.files[0], function(result) {
      fileInput.disabled = false;
      if (result === true) {
        return setTimeout(function() {
          location.reload();
        }, 250);
      }
      fileInput.value = '';
    });
  });


  var removeBtn = document.getElementById('removeBtn');
  removeBtn.addEventListener('click', function() {
    engine.removeExtension();
    setTimeout(function() {
      location.reload();
    }, 250);
  });
  removeBtn = null;

  var updateStatus = document.getElementById('updateStatus');
  var checkUpdateBtn = document.getElementById('checkUpdateBtn');
  checkUpdateBtn.addEventListener('click', function() {
    checkUpdateBtn.disabled = true;
    updateStatus.textContent = '';
    engine.ext.checkUpdate(function(data) {
      checkUpdateBtn.disabled = false;
      data.text && (updateStatus.textContent = data.text);
    });
  });

  if (engine.ext.manifest) {
    var extName = document.getElementById('extName');
    var extVersion = document.getElementById('extVersion');
    var extDesc = document.getElementById('extDesc');
    var appId = document.getElementById('appId');
    var details = engine.ext.details;

    document.body.classList.remove('noExt');
    extName.textContent = details.name;
    extVersion.textContent = details.version;
    if (engine.storage.appId) {
      appId.textContent = engine.storage.appId;
      checkUpdateBtn.parentNode.classList.remove('hide');
      appId.parentNode.classList.remove('hide');
    } else {
      checkUpdateBtn.parentNode.classList.add('hide');
      appId.parentNode.classList.add('hide');
    }
    extDesc.textContent = details.description;

    if (details.icons) {
      var icon;
      var style = document.createElement('style');
      style.textContent = '.setupMode .setup.btn.icon {'
        + 'background-image: url('+ (icon = engine.ext.getIcon({max: 48})) +');'
        + 'background-size: 48px;'
        + 'top: 25px;'
        + 'width: 48px;'
        + 'height: 48px;'
        + 'left: 12px;'
        + 'opacity: 1;' +
        '}';
      if (icon) {
        document.body.appendChild(style);
        icon = null;
      }
      style = null;
    }
  } else {
    document.body.classList.add('noExt');
  }

  var menu = document.querySelector('.menu');
  menu.addEventListener('click', function(e) {
    var el;
    if ((el = e.target).tagName !== 'A') {
      return;
    }
    e.preventDefault();

    var active = this.querySelector('.active');
    active.classList.remove('active');

    el.classList.add('active');
    var page = document.querySelector('.page.active');
    page.classList.remove('active');
    var pageType = el.dataset.page;
    page = document.querySelector('.page.' + pageType);
    if (pageType === 'documentation') {
      !writeDoc.fired && writeDoc(page, engine);
    }
    page.classList.add('active');
  });
  menu = null;


  /*setTimeout(function() {
    optionsToggle();
    var link = document.querySelector('a[data-page="documentation"]');
    link.dispatchEvent(new CustomEvent('click', {bubbles: true, cancelable: true}));
  });*/
};

var loadExtPage = function(engine) {
  "use strict";
  var manifest;
  if (!(manifest = engine.ext.manifest)) {
    throw new Error("Manifest is not found!");
  }

  var page = location.hash.substr(1);
  if (!engine.ext.hasFile(page)) {
    page = manifest.options_page;
  }
  if (!engine.ext.hasFile(page)) {
    throw new Error("File is not found! " + page);
  }

  location.hash = page;

  var data = engine.ext.getPage(page);

  tools.initSandbox(engine, 'options', function(sandbox) {
    sandbox.onMessage(function(msg, cb) {
      tools.onMessageFromFrame(msg, cb);
    });

    /*chrome.runtime.onMessage.addListener(function(msg, sender, response) {
      sandbox.sendMessage({action: 'onMessage', sender: sender, msg: msg}, response);
    });*/

    sandbox.sendMessage({action: 'setHtmlContent', html: data.html});
    sandbox.sendMessage({action: 'setStyle', css: data.css});
    sandbox.sendMessage({action: 'exec', script: data.js});

    setTimeout(function() {
      sandbox.sendMessage({action: 'getPageTitle'}, function(msg) {
        document.title = msg;
      });
    }, 50);

    tools.setFavicon();
  });
};

(function() {
  "use strict";
  chrome.runtime.getBackgroundPage(function(bgWindow) {
    var engine = bgWindow.engine;
    bindOptions(engine);
    try {
      loadExtPage(engine);
    } catch (e) {
      optionsToggle(1);
    }
    document.body.classList.remove('loading');
  });
})();