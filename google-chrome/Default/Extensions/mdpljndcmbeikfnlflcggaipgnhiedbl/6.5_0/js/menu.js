(function() {
  var language = {};
  var preference = {};
  var varCache = {
    icons: {},
    activeTabInfo: {},
    helperName: ''
  };
  var menuContainer = undefined;

  var translatePage = function() {
    var elList = menuContainer.querySelectorAll('*[data-i18n]');
    for(var i = 0, len = elList.length; i < len; i++) {
      var el = elList[i];
      var key = el.dataset.i18n;
      el.textContent = language[key];
      if (el.classList.contains('label')) {
        el.title = language[key];
      }
    }
  };

  var onModuleToggle = function() {
    var tabInfo = varCache.activeTabInfo;

    var state = varCache.moduleTrigger.classList.contains('disabled') ? 1 : 0;
    tabInfo.state = state;

    setCheckboxState(state, 1);

    if (!Array.isArray(tabInfo.prefKey)) {
      tabInfo.prefKey = [tabInfo.prefKey];
    }

    for (var i = 0, key; key = tabInfo.prefKey[i]; i++) {
      preference[key] = state;
    }

    mono.sendMessage({action: 'viaMenu_' + 'changeState', state: state ?  1 : 0, prefKey: tabInfo.prefKey, moduleName: tabInfo.moduleName, needInclude: tabInfo.isNotResponse});

    tabInfo.isNotResponse = false;

    updateMenuItem(tabInfo);
  };

  var menuItemAction = function(event) {
    event.preventDefault();
    event.stopPropagation();
    var node = this;

    if (node.classList.contains('inactive')) {
      return;
    }

    var action = node.dataset.action;

    var isModule = node.classList.contains('module');

    if ([1].indexOf(preference.cohortIndex) !== -1) {
      if (['updateLinks', 'downloadPlaylist', 'downloadPhotos', 'downloadMP3Files'].indexOf(action) !== -1) {
        if (['dailymotion', 'facebook', 'mailru', 'odnoklassniki', 'savefrom', 'soundcloud', 'vimeo', 'vk',
            'youtube',
            'instagram', 'rutube'].indexOf(varCache.activeTabInfo.moduleName) !== -1) {
          mono.sendMessage({action: 'trackCohort', category: 'extensionMenu', event: 'click', label: action});
        } else {
          mono.sendMessage({action: 'trackCohort', category: 'sitesNotSupporded', event: action, label: mono.getDomain(varCache.activeTabInfo.url, 1)});
        }
      }
    }

    mono.sendMessage({action: 'trackEvent', category: 'extensionMenu', event: 'click', label: action});

    if (action === 'enableModule') {
      return onModuleToggle();
    } else {
      mono.sendMessage({action: (isModule ? 'viaMenu_' : '') + action});
    }

    if (mono.isGM) {
      _menu.hideMenuItems();
      return;
    }
    if (mono.isFF) {
      mono.addon.postMessage('hidePopup');
      return;
    }
    if (mono.isSafari) {
      safari.extension.popovers[0].hide();
      return;
    }
    window.close();
  };

  var setItemState = function (className, show) {
    var li = menuContainer.querySelectorAll('div.' + className);
    for(var i = 0; i < li.length; i++) {
      if (show) {
        li[i].classList.remove('inactive');
      } else {
        li[i].classList.add('inactive');
      }
    }
  };

  var setModuleItemState = function (moduleName, show) {
    if (!show) {
      return setItemState('module', false);
    }

    var li = menuContainer.querySelectorAll('div.module');
    for(var i = 0; i < li.length; i++) {
      if (li[i].classList.contains(moduleName)) {
        li[i].classList.remove('inactive');
      } else {
        li[i].classList.add('inactive');
      }
    }
  };

  var safariBlankLink = function(e) {
    e.preventDefault();

    mono.openTab(this.href, true);
  };

  var updateSafariLinks = function() {
    var links = menuContainer.querySelectorAll('a[href][target="_blank"]');
    for (var i = 0, len = links.length; i < len; i++) {
      links[i].removeEventListener('click', safariBlankLink);
      links[i].addEventListener('click', safariBlankLink);
    }
  };

  var bindSocialBtn = function() {
    var targetUrl = 'http://savefrom.net/user.php';
    var url = encodeURIComponent(targetUrl);
    var image = encodeURIComponent('http://savefrom.net/img/icon_100.png');
    var title = encodeURIComponent(language.extName);
    var desc = encodeURIComponent(language.socialDesc);
    var btnList = {
      vk: {
        network: 'vkontakte',
        title: language.shareIn.replace('%w', 'VK'),
        href: 'http://vk.com/share.php?url='+url+'&image='+image+'&title='+title+'&description='+desc
      },
      ok: {
        network: 'odnoklassniki',
        title: language.shareIn.replace('%w', 'OK.ru'),
        href: 'http://www.odnoklassniki.ru/dk?st.cmd=addShare&st.s=1&st._surl='+url+'&st.comments='+desc
      },
      mailru: {
        network: 'mail.ru',
        title: language.shareIn.replace('%w', 'Mail.ru'),
        href: 'http://connect.mail.ru/share?url='+url+'&title='+title+'&description='+desc+'&imageurl='+image
      },
      tw: {
        network: 'twitter',
        title: language.shareIn.replace('%w', 'Twitter'),
        href: 'https://twitter.com/intent/tweet?text='+title+'&url='+url
      },
      fb: {
        network: 'facebook',
        title: language.shareIn.replace('%w', 'Facebook'),
        href: 'http://www.facebook.com/sharer.php?s=100&p[url]='+url+'&p[title]='+title+'&p[summary]='+desc+'&p[images][0]='+image
      },
      gp: {
        network: 'google+',
        title: language.shareIn.replace('%w', 'Google+'),
        href: 'https://plus.google.com/share?url='+url
      },
      lj: {
        network: 'livejournal',
        title: language.shareIn.replace('%w', 'Livejournal'),
        href: 'http://www.livejournal.com/update.bml?subject='+title+'&event='+desc+' '+url
      }
    };
    for (var item in btnList) {
      var link = menuContainer.querySelector('.social-btn.'+item);
      if (!link) {
        continue;
      }
      link.title = btnList[item].title;
      link.href = btnList[item].href;
      link.dataset.network = btnList[item].network;
    }
    link.parentNode.addEventListener('click', function(e) {
      var btn = e.target;
      if (!btn.classList.contains('social-btn')) {
        return;
      }
      var network = btn.dataset.network;
      mono.sendMessage({action: 'trackSocial', target: targetUrl, event: 'share', network: network});
    });
  };

  var setModuleBtnState = function(tabInfo) {
    if (['odnoklassniki'].indexOf(tabInfo.moduleName) !== -1) {
      setItemState('bookmarklet', false);
    } else {
      setItemState('bookmarklet', true);
    }

    setModuleItemState(tabInfo.moduleName, tabInfo.state);

    if (tabInfo.state && tabInfo.moduleName === 'youtube') {
      var url = tabInfo.url;

      var isPlaylist = /\/playlist\?|[?&]list=/.test(url);
      if (!isPlaylist) {
        isPlaylist = /(user|channel|show)\/[^\/]+(\/feed|\/featured|\/videos|$)/i.test(url);
      }
      if (!isPlaylist) {
        isPlaylist = /\/(feed)\/(trending|subscriptions|history)/i.test(url);
      }

      setItemState('plYoutube', !!isPlaylist);
    }
  };

  var setCheckBoxModuleState = function(tabInfo) {
    "use strict";
    var checkBoxIsEnable = false;
    var checkBoxState = false;
    if (['savefrom'].indexOf(tabInfo.moduleName) !== -1) {
      checkBoxState = 'force';
    } else
    if (tabInfo.moduleName) {
      checkBoxState = !!tabInfo.state;
      checkBoxIsEnable = true;
    }
    setItemState('enableModule', checkBoxIsEnable);
    setCheckboxState(checkBoxState);
  };

  var onGetTabInfo = function(tabInfo, force) {
    varCache.activeTabInfo = tabInfo = tabInfo || {};

    setCheckBoxModuleState(tabInfo);
    setModuleBtnState(tabInfo);

    if (!force) {
      var onResponse = function(moduleInfo) {
        "use strict";
        clearTimeout(timeout);
        tabInfo.isNotResponse = !moduleInfo;

        for (var key in moduleInfo) {
          tabInfo[key] = moduleInfo[key];
        }

        setCheckBoxModuleState(tabInfo);
        setModuleBtnState(tabInfo);
      };
      var timeout = setTimeout(onResponse, 250);
      mono.sendMessage({action: 'getActiveTabModuleInfo', url: tabInfo.url}, onResponse);
    }
  };

  var updateMenuItem = function(tabInfo) {
    varCache.activeTabInfo = {};

    if (tabInfo) {
      onGetTabInfo(tabInfo, 1);
    } else {
      mono.sendMessage('getActiveTabInfo', onGetTabInfo);
    }
  };

  var setIconState = function(el, state) {
    var path = el.querySelector('path');
    if (state === 'hover') {
      path.setAttribute('fill', '#ffffff');
    } else
    if (state === 'active') {
      path.setAttribute('fill', '#AAAAAA');
    } else {
      var type = el.getAttribute('data-type');
      if (type === 'downloadMP3Files') {
        path.setAttribute('fill', '#00CCFF');
      } else
      if (type === 'downloadPlaylist') {
        path.setAttribute('fill', '#77D1FA');
      } else
      if (type === 'downloadPhotos') {
        path.setAttribute('fill', '#88cb66');
      } else
      if (type === 'showAboutPage') {
        path.setAttribute('fill', '#ADE61B');
      } else
      if (type === 'updateLinks') {
        path.setAttribute('fill', '#CB7FBD');
      } else
      if (type === 'downloadFromCurrentPage') {
        path.setAttribute('fill', '#CB7FBD');
      }
    }
  };

  var getAboutPage = function() {
    "use strict";
    return mono.create(document.createDocumentFragment(), {
      append: [
        mono.create('p', {
          text: language.aboutDescription
        }),
        mono.create('a', {
          href: 'http://savefrom.net/faq.php#supported_resourses',
          target: '_blank',
          text: language.aboutSupported,
          style: {
            display: 'block'
          }
        }),
        mono.create('a', {
          href: 'http://savefrom.net/user.php?helper=' + varCache.helperName,
          target: '_blank',
          text: language.homePage,
          style: {
            display: 'block'
          }
        })
      ]
    });
  };

  var updateDescription = function(action, label) {
    var desc = varCache.desc;
    var text = varCache.deskText;
    var title = varCache.descTitel;
    var more = varCache.descMore;
    desc.dataset.page = action;

    var icon = varCache.icons[ action ];
    var subIcon = desc.querySelector('.icon');
    if (icon) {
      var _icon = icon.cloneNode(true);
      setIconState(_icon, 'active');
      if (subIcon) {
        subIcon.parentNode.replaceChild(_icon, subIcon);
      }
      subIcon.style.visibility = 'visible';
    } else {
      subIcon.style.visibility = 'hidden';
    }

    if (action === 'showAboutPage') {
      title.textContent = language.aboutTitle;
      text.textContent = '';
      text.appendChild(getAboutPage());
      more.style.display = 'none';
    } else {
      title.textContent = label;
      text.textContent = language['menu'+mono.capitalize(action)] || '';
      more.style.display = 'block';
    }

    if (mono.isSafari) {
      updateSafariLinks();
    }
  };

  var onReady = function() {
    translatePage();

    varCache.descMore.href = 'http://savefrom.net/user.php?helper=' + varCache.helperName;

    var btnList = menuContainer.querySelectorAll('div[data-action]');
    for(var i = 0; i < btnList.length; i++) {
      var icon = btnList[i].querySelector('svg');
      if (icon) {
        varCache.icons[ btnList[i].dataset.action ] = icon;
        setIconState(icon);
      }

      if (btnList[i].style.display === 'none') {
        continue;
      }

      mono.create(btnList[i], {
        on: [
          ['click', menuItemAction],
          ['mouseenter', function() {
            "use strict";
            var action = this.dataset.action;

            var icon = varCache.icons[ action ];
            icon && setIconState(icon, 'hover');

            var span = this.querySelector('span');
            var title = span && span.textContent || '';

            updateDescription(action, title);
          }],
          ['mouseleave', function() {
            "use strict";
            var action = this.dataset.action;

            var icon = varCache.icons[ action ];
            icon && setIconState(icon);
          }]
        ]
      });
    }

    bindSocialBtn();

    if (mono.isSafari) {
      updateSafariLinks();
    }

    updateDescription('showAboutPage');

    updateMenuItem();

    menuContainer.classList.remove('loading');
  };

  var setCheckboxState = function(state, byUser) {
    if (byUser) {
      varCache.moduleTrigger.classList.add('sf-transition');
    }
    if (state === 'force') {
      varCache.moduleTrigger.classList.add('enableForce');
    } else {
      varCache.moduleTrigger.classList.remove('enableForce');
    }
    if (state) {
      varCache.moduleTrigger.classList.remove('disabled');
      varCache.moduleTrigger.nextElementSibling.textContent = language.disableModule;
    } else {
      varCache.moduleTrigger.classList.add('disabled');
      varCache.moduleTrigger.nextElementSibling.textContent = language.enableModule;
    }
    if (varCache.desc.dataset.page !== 'showAboutPage') {
      updateDescription('enableModule', state ? language.disableModule : language.enableModule);
    }
  };

  var tutorial = {
    show: function() {
      "use strict";
      if (!SaveFrom_Utils.tutorialTooltip) {
        return;
      }

      if (!preference.showTutorial) {
        return;
      }

      if (mono.isGM) {
        mono.storage.set({onceYtTutorial: 1});
        return;
      }

      mono.storage.get('onceYtTutorial', function(storage) {
        if (storage.onceYtTutorial) {
          return;
        }
        storage.onceYtTutorial = 1;

        SaveFrom_Utils.tutorial.show({
          container: menuContainer,
          width: 482,
          height: 404 + (mono.isGM ? 2 : 0),
          padding: 4,
          slideList: SaveFrom_Utils.tutorial.getYtSlideList('black'),
          onClose: function() {
            mono.storage.set(storage);

            mono.sendMessage({action: 'setIconBadge', text: ''});
          },
          checkExists: function(cb) {
            mono.storage.get('onceYtTutorial', function(storage) {
              if (storage.onceYtTutorial) {
                return cb(1);
              }
              cb();
            });
          },
          trackId: 'Menu',
          boxStyle: {
            backgroundColor: 'transparent'
          },
          containerStyle: {
            borderRadius: '3px',
            backgroundColor: 'rgba(0, 104, 255, 0.9)',
            padding: 0,
            margin: '4px',
            boxShadow: 'none'
          },
          slideStyle: {
            backgroundColor: 'transparent',
            borderRadius: 0
          },
          leftBtnStyle: {
            top: '4px',
            left: '4px'
          },
          rightBtnStyle: {
            top: '4px',
            right: '4px'
          },
          closeBtnStyle: {
            backgroundColor: '#fff',
            color: 'rgba(0, 104, 255, 0.9)'
          },
          cssStyle: {
            ' .sf-dots': {
              'paddingTop': '2px'
            },
            ' .sf-dot i': {
              backgroundColor: '#fff'
            },
            ' .sf-dot.active i': {
              backgroundColor: 'transparent',
              borderRadius: '6px',
              margin: '-1px',
              width: '6px',
              height: '6px',
              border: '2px solid #fff'
            },
            ' .sf-slider-conteiner span': {
              color: '#fff !important'
            },
            ' .sf-slider-conteiner a': {
              color: '#fff !important'
            }
          },
          arrowColor: '#fff',
          arrowColorActive: '#fff',
          onResize: function(details) {
            details.box.style.position = 'absolute';
          },
          withOpacity: true,
          withDelay: 250,
          onShow: function() {
            mono.isSafari && updateSafariLinks();

            mono.sendMessage({action: 'setIconBadge', text: '?'});
          }
        });
      });
    }
  };

  var setVersion = function(version, lastVersion) {
    "use strict";
    var versionNode = varCache.desc.querySelector('.version');

    versionNode.textContent = '';

    versionNode.appendChild(mono.create('span', {
      text: language.aboutVersion+' '+version
    }));

    if (lastVersion && lastVersion !== version) {
      versionNode.appendChild(mono.create('a', {
        text: language.updateTo.replace('%d', lastVersion),
        href: 'http://savefrom.net/user.php?helper=' + varCache.helperName + '&update=' + version,
        target: '_blank',
        on: ['click', function() {
          mono.sendMessage({action: 'trackEvent', category: 'extensionMenu', event: 'click', label: 'updateVersion'});
        }]
      }));
    }
  };

  var run = function(parent) {
    menuContainer = (parent || document).querySelector('.sf-menu-container');
    if (!menuContainer) {
      return;
    }

    setTimeout(function() {
      menuContainer.classList.remove('loading');
    }, 1000);

    varCache.list = menuContainer.querySelector('.sf-menu-list');
    varCache.desc = menuContainer.querySelector('.sf-menu-desc');
    varCache.moduleTrigger = menuContainer.querySelector('.sf-checkbox');
    varCache.descTitel = varCache.desc.querySelector('.title');
    varCache.deskText = varCache.desc.querySelector('.desc');
    varCache.descMore = varCache.desc.querySelector('.more');

    varCache.list.style.height = varCache.list.offsetHeight + 'px';

    mono.sendMessage({action: 'getMenuDetails'}, function(response) {
      language = response.language;
      preference = response.preferences;

      mono.global.language = language;
      mono.global.preference = preference;

      varCache.helperName = response.helperName;

      setVersion(response.version, response.lastVersion);

      if (['en', 'uk', 'ru'].indexOf(language.lang) === -1) {
        menuContainer.classList.add('no-poll');
      }

      tutorial.show();

      onReady();
    });
  };

  mono.onReady(function() {
    // GM!
    mono.onMessage(function () {});

    if (mono.isGM) {
      _menu.initMenu = run;
    } else {
      run();
    }
  });

  //@insert
})();