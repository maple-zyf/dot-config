(function() {
  var language = {};
  var preference = {};

  var hideNode = function(id, hide) {
    var node = document.getElementById(id);
    if(node) {
      node.style.display = hide ? 'none' : '';
    }
  };

  var onCbChange = function(event) {
    var e = event.target;
    mono.sendMessage({action: 'updateOption', key: e.id, value: e.checked ? 1 : 0 });
  };

  var createCacheBackBarOption = function() {
    "use strict";
    var node = document.querySelector('.clear');
    var item = mono.create('div', {
      class: 'block',
      append: [
        mono.create('label', {
          append: [
            mono.create('input', {
              type: 'checkbox',
              id: 'cacheBackBarEnabled',
              checked: true
            }),
            String.fromCharCode(160),
            mono.create('span', {
              text: 'CachBack bar (beta)'
            })
          ]
        })
      ]
    });
    node.parentNode.insertBefore(item, node);
  };

  var onReady = function() {
    var el, i, len, elList;
    elList = document.querySelectorAll('*[data-i18n]');
    for( i = 0, len = elList.length; i < len; i++) {
      el = elList[i];
      el.textContent = language[el.dataset.i18n];
    }

    if(!preference.hasSovetnik && !preference.hasDP) {
      hideNode('blockSovetnikEnabled', true);
    }

    if(!preference.hasAviaBar) {
      hideNode('blockAviaBar', true);
    }

    if(!preference.showUmmyItem) {
      hideNode('blockUmmyInfo', true);
    }

    if (preference.hasCacheBackBar) {
      createCacheBackBarOption();
    }

    elList = document.querySelectorAll('form input[type="checkbox"]');
    for(i = 0, len = elList.length; i < len; i++) {
      el = elList[i];
      if(el.id && preference[el.id] !== undefined)
      {
        el.checked = !!preference[el.id];
        el.addEventListener('change', onCbChange, false);
      }
    }

    if (mono.isOpera) {
      elList = document.querySelectorAll('.browser.opera');
      for(i = 0, len = elList.length; i < len; i++) {
        el = elList[i];
        el.style.display = 'block';
      }
    }
  };

  var initPage = function() {
    mono.initGlobal(function(resp) {
      clearInterval(initPage.interval);
      if (initPage.fired) {
        return;
      }
      initPage.fired = 1;

      language = mono.global.language;
      preference = mono.global.preference;

      onReady();

      document.body.classList.remove('loading');
    });
  };

  mono.onReady(function() {
    "use strict";
    initPage.interval = setInterval(function() {
      initPage();
    }, 1000);

    initPage();
  });

  setTimeout(function() {
    "use strict";
    document.body.classList.remove('loading');
  }, 1000);
})();