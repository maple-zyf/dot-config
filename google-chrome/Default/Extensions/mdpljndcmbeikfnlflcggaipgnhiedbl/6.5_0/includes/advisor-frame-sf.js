(typeof mono === 'undefined') && (mono = {loadModule: function() {this.loadModuleStack.push(arguments);},loadModuleStack: []});

mono.loadModule('dealplyFrame', function(moduleName, initData) {
  "use strict";
  var preference = initData.getPreference;

  if (!document.body.querySelector('.offers_ul')) {
    return;
  }

  mono.sendMessage({action: 'trackEvent', category: 'dealply', event: 'show', label: 'bar', params: {tid: 'UA-67738130-3'}});

  document.body.addEventListener('mousedown', function(e) {
    if (e.button !== 0) {
      return;
    }

    var link = e.target;

    var isLink = false;

    if (/goto/.test(link.id)) {
      isLink = true;
    }

    if (!isLink) {
      link = mono.getParent(link, 'A');

      if (!link) {
        return;
      }

      if (!link.classList.contains('cliackableArea')) {
        return;
      }

      isLink = true;
    }

    if (!isLink) {
      return;
    }

    var label = preference.country + ' link';
    mono.sendMessage({action: 'trackEvent', category: 'dealply', event: 'click', label: label, params: {tid: 'UA-67738130-3', noRewrite: true}});
    mono.sendMessage({action: 'trackEvent', category: 'dealply', event: 'click', label: label, params: {tid: 'UA-7055055-5', noRewrite: true}});
  });
}, function isActive(initData) {
  "use strict";
  var preference = initData.getPreference;

  if (!preference.hasDP) {
    return false;
  }

  if (!preference.sovetnikEnabled) {
    return false;
  }

  if (!preference.country) {
    return;
  }

  return true;
}, function syncIsAvailable() {
  "use strict";
  if (!document.body) {
    return false;
  }

  if (!mono.isIframe()) {
    return false;
  }

  /*@if isVkOnly=0>*/
  if (mono.isSafari || mono.isGM) {
    if (!mono.checkUrl(document.URL, [
        "http://f.mgicinjs.info/*",
        "https://f.mgicinjs.info/*"
      ])) {
      return false;
    }
  }
  /*@if isVkOnly=0<*/

  return true;
});