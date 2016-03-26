// ==UserScript==
// @name        SaveFrom.net link modifier
//
// @exclude     file://*
// @exclude     http://google.*/*
// @exclude     http://*.google.*/*
// @exclude     https://google.*/*
// @exclude     https://*.google.*/*
//
// @exclude     http://acidtests.org/*
// @exclude     http://*.acidtests.org/*
//
// @exclude     http://savefrom.net/*
// @exclude     http://*.savefrom.net/*
//
// @exclude     http://youtube.com/*
// @exclude     http://*.youtube.com/*
// @exclude     https://youtube.com/*
// @exclude     https://*.youtube.com/*
//
// @exclude     http://dailymotion.*/*
// @exclude     http://*.dailymotion.*/*
// @exclude     https://dailymotion.*/*
// @exclude     https://*.dailymotion.*/*
//
// @exclude     http://vimeo.com/*
// @exclude     http://*.vimeo.com/*
// @exclude     https://vimeo.com/*
// @exclude     https://*.vimeo.com/*
//
// @exclude     http://vk.com/*
// @exclude     http://*.vk.com/*
// @exclude     http://vkontakte.ru/*
// @exclude     http://*.vkontakte.ru/*
// @exclude     https://vk.com/*
// @exclude     https://*.vk.com/*
// @exclude     https://vkontakte.ru/*
// @exclude     https://*.vkontakte.ru/*
//
// @exclude     http://odnoklassniki.ru/*
// @exclude     http://*.odnoklassniki.ru/*
// @exclude     https://odnoklassniki.ru/*
// @exclude     https://*.odnoklassniki.ru/*
// @exclude     http://ok.ru/*
// @exclude     http://*.ok.ru/*
// @exclude     https://ok.ru/*
// @exclude     https://*.ok.ru/*
//
// @exclude     http://my.mail.ru/*
// @exclude     https://my.mail.ru/*
//
// @exclude     http://facebook.com/*
// @exclude     http://*.facebook.com/*
// @exclude     https://facebook.com/*
// @exclude     https://*.facebook.com/*
//
// @exclude     http://soundcloud.com/*
// @exclude     http://*.soundcloud.com/*
// @exclude     https://soundcloud.com/*
// @exclude     https://*.soundcloud.com/*
//
// @exclude     http://instagram.com/*
// @exclude     http://*.instagram.com/*
// @exclude     https://instagram.com/*
// @exclude     https://*.instagram.com/*
//
// @exclude     http://rutube.ru/*
// @exclude     http://*.rutube.ru/*
// @exclude     https://rutube.ru/*
// @exclude     https://*.rutube.ru/*
//
// ==/UserScript==

(typeof mono === 'undefined') && (mono = {loadModule: function() {this.loadModuleStack.push(arguments);},loadModuleStack: []});

mono.loadModule('lm', function(moduleName, initData) {
  "use strict";
  var language = initData.getLanguage;
  var preference = initData.getPreference;
  var moduleState = (preference.lmFileHosting || preference.lmMediaHosting) ? 1 : 0;

  if (preference.showUmmyInfo) {
    mono.asyncCall(function() {
      checkUmmyPage();
    });
  }

  mono.onMessage(function(message, cb){
    if (message.action === 'getModuleInfo') {
      if (message.url !== location.href) return;
      return cb({state: moduleState, moduleName: moduleName});
    }
    if (message.action === 'changeState') {
      if (moduleName !== message.moduleName) {
        return;
      }
      return lm.changeState(message.state);
    }
    if (!moduleState) {
      return;
    }
    if (message.action === 'updateLinks') {
      lm.savefromLinkCount = -1;
      lm.run();
    }
  });

  if (moduleState) {
    mono.asyncCall(function() {
      lm.run();
    });
  }

  var checkUmmyPage = function() {
    if (typeof location === 'undefined') return;

    var url = location.href;
    if (url.indexOf("videodownloader.ummy.net") === -1) {
      return;
    }
    if (url.match(/pozdravlyaem|congratulations|tebrikler/) !== null) {
      mono.sendMessage({action: 'updateOption', key: 'showUmmyInfo', value: 0});
      mono.sendMessage({action: 'updateOption', key: 'ummyDetected', value: 1});
    }
  };

  var lm = {
    htmlAfter: '',

    linkText: '',

    linkStyle: {
      'border': 'none',
      'textDecoration': 'none',
      'padding': '0',
      'position': 'relative'
    },

    imgStyle: {
      'border': 'none',
      'width': 'auto',
      'height': 'auto'
    },

    buttonSrc: 'data:image/gif;base64,R0lGODlhEAAQAOZ3APf39+Xl5fT09OPj4/Hx8evr6/3+/u7u7uDh4OPi497e3t7e3/z8/P79/X3GbuXl5ubl5eHg4WzFUfb39+Pj4lzGOV7LOPz7+/n6+vn5+ZTLj9/e387Ozt7f3/7+/vv7/ISbePn5+m/JV1nRKXmVbkCnKVrSLDqsCuDh4d/e3uDn3/z7/H6TdVeaV1uSW+bn5v39/eXm5eXm5kyHP/f39pzGmVy7J3yRd9/f3mLEKkXCHJbka2TVM5vaZn6Wdfn6+YG/c/r5+ZO/jeLi41aHTIeageLn4f39/vr6+kzNG2PVM5i+lomdf2CXYKHVmtzo2YXNeDqsBebl5uHh4HDKWN3g3kKqEH6WeZHTXIPKdnSPbv79/pfmbE7PHpe1l4O8dTO5DODg4VDLIlKUUtzo2J7SmEWsLlG4NJbFjkrJHP7+/VK5Nfz8+zmnC3KKa+Hg4OHh4Y63j/3+/eDg4Ojo6P///8DAwP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAEAAHcALAAAAAAQABAAAAfWgHd2g4SFhYJzdYqLjIpzgx5bBgYwHg1Hk2oNDXKDFwwfDF5NLmMtcStsn4MhGT8YS04aGmU1QRhIGYMTADQAQlAODlloAMYTgwICRmRfVBISIkBPKsqDBAREZmcVFhYVayUz2IMHB1dWOmImI2lgUVrmgwUFLzdtXTxKSSduMfSD6Aik48MGlx05SAykM0gKhAAPAhTB0oNFABkPHg5KMIBCxzlMQFQZMGBIggSDpsCJgGDOmzkIUCAIM2dOhEEcNijQuQDHgg4KOqRYwMGOIENIB90JBAA7',

    sfref: '&utm_source={sfHelperName}&utm_medium=extensions&utm_campaign=link_modifier',

    pageUrl: 'http://savefrom.net/',
    anchorAttribute: 'savefrom_lm',
    anchorAttributeLink: 'savefrom_lm_is_link',
    anchorIndexAttribute: 'savefrom_lm_index',

    linkRegExp: null,

    savefromLinkCount: 0,

    re: {
      filehosting: {
        'rapidshare.com': [/^https?:\/\/([\w\-]+\.)?rapidshare\.com\/\#\!download\|\d+\|\d+\|[^\s\"\|]+\|\d+/i, /^https?:\/\/(rs\d+\.|www\.)?rapidshare\.com\/files\/\d+\/.+/i],
        'filefactory.com': [/^http:\/\/(www\.)?filefactory\.com\/file\/[a-z0-9]+\/?/i],
        'sendspace.com': [/^http:\/\/(www\.)?sendspace\.com\/file\/\w+/i]
      },

      mediahosting: {
        'youtube.com': [
          /^https?:\/\/([a-z]+\.)?youtube\.com\/(#!?\/)?watch\?.*v=/i,
          /^https?:\/\/([a-z0-9]+\.)?youtube\.com\/(embed|v)\/[\w\-]+/i
        ],
        'youtu.be': [/^https?:\/\/([a-z]+\.)?youtu\.be\/[\w\-]+/i],
        'google.com': [/^http:\/\/video\.google\.com\/videoplay\?.*docid=/i],
        'metacafe.com': [/^http:\/\/(www\.)?metacafe\.com\/watch\/\d+\/[^\/]+\/?/i],
        'break.com': [/^http:\/\/(www\.)?break\.com\/(index|movies\w*|(\w+\-)+\w+)\/.+\.html$/i, /^http:\/\/view\.break\.com\/\d+/i],
        'vimeo.com': [/^http:\/\/([\w\-]+\.)?vimeo\.com\/\d+$/i],
        'sevenload.com': [/^http:\/\/([\w\-]+\.)?sevenload\.com\/videos\/[-\w\+\/=]+/i, /^http:\/\/([\w\-]+\.)?sevenload\.com\/shows\/.+/i],
        'facebook.com': [/^https?:\/\/(?:www\.)facebook\.com\/([^\/]+\/)*video\.php\?([^&]+&)*v=\d+/i],
        //'rutube.ru': [/^http:\/\/rutube\.ru\/tracks\/\d+\.html\?.*v=[a-f0-9]+/i],
        'mail.ru': [/^http:\/\/([a-z0-9_-]+\.)?video\.mail\.ru\/(.+\/)+\d+\.html/i, /^http:\/\/r\.mail\.ru\/\w+\/video\.mail\.ru\/(.+\/)+\d+\.html/i],
        'yandex.ru': [/^http:\/\/video\.yandex\.ru\/users\/[-\w,!\+]+\/view\/[-\w,!\+]+\/?/i],
        'rambler.ru': [/^http:\/\/vision\.rambler\.ru\/users\/[^\/\s]+\/\d+\/[-\w_\+!]+\/?/i],
        'smotri.com': [/^http:\/\/([a-z0-9_-]+\.)?smotri\.com\/video\/view\/\?.*id=v[0-9a-f]/i],
        'tvigle.ru': [/^http:\/\/(www\.)?tvigle\.ru\/channel\/\d+\?.*vid_id=\d+/i, /^http:\/\/(www\.)tvigle\.ru\/prg\/\d+\/\d+/i],
        'intv.ru': [/^http:\/\/(www\.)?intv\.ru\/(view|quickdl)\/\?.*film_id=\w+/i, /^http:\/\/(www\.)?intv\.ru\/v\/\w+/i],
        'yasee.ru': [/^http:\/\/([a-z0-9_-]+\.)?yasee\.ru\/video\/view\/\?.*id=v[0-9a-f]/i],
        'narod.tv': [/^http:\/\/(?:www\.)?narod\.tv\/\?.*vid=/i],
        'vkadre.ru': [/^http:\/\/(www\.)?vkadre\.ru\/videos\/\d+/i],
        'myvi.ru': [
          /^http:\/\/(www\.)?myvi\.ru\/([a-z][a-z]\/)?videodetail\.aspx\?.*video=/i,
          /^http:\/\/(www|kino|anime)\.myvi\.ru\/watch\/[\w\-]+/i
        ],
        '1tv.ru': [/^http:\/\/(www\.)?1tv\.ru(\:\d+)?\/newsvideo\/\d+/i, /^http:\/\/(www\.)?1tv\.ru(\:\d+)?\/news\/\w+\d+/i],
        'ntv.ru': [/^http:\/\/news\.ntv\.ru\/(\w+\/)?\d+\/video\/?/i],
        'vesti.ru': [/^http:\/\/(www\.)?vesti\.ru\/videos\?.*vid=\d+/i],
        'bibigon.ru': [/^http:\/\/(www\.)?bibigon\.ru\/videow\.html\?id=\d+/i, /^http:\/\/(www\.)?bibigon\.ru\/video\.html\?vid=\d+/i],
        'mreporter.ru': [/^http:\/\/(www\.)?mreporter\.ru\/reportermessages\!viewreport\.do[^\?]*\?.*reportid=\d+/i],
        'autoplustv.ru': [/^http:\/\/(www\.)?autoplustv\.ru\/494\/\?id=\d+/i],
        'russia.ru': [/^http:\/\/([\w\-]+\.)?russia\.ru\/video\/?/i],
        'amik.ru': [/^http:\/\/(www\.)?amik\.ru\/video\/vid\d+\.html/i, /^http:\/\/(www\.)?amik\.ru\/video\/vcid\d+\.html/i],
        'life.ru': [/^http:\/\/([\w+\-]+\.)?life\.ru\/video\/\d+/i]
      }
    },


    parseHref: function(href, search)
    {
      var res = [];
      res.push(href);

      var i = href.toLowerCase().indexOf('http://', 7);
      if(i > 7)
      {
        res.push(href.substring(i));
      }
      else if(search)
      {
        var h = search.match(/http%3a(%2f%2f|\/\/)[^\s\&\"\<\>]+/i);
        if(h && h.length > 0)
        {
          res.push(decodeURIComponent(h[0]));
        }
        else
        {
          var s = '';
          try
          {
            s = decodeURIComponent(search);
          }
          catch(err)
          {
          }

          if(s)
          {
            // facebook
            h = s.match(/((?:aHR0cDovL|aHR0cHM6Ly)[a-z0-9+\/=]+)/i);
            if(h && h.length > 1)
            {
              try {
                h = atob(h[1]);
              } catch (e) {
                h = '';
              }
              if(h.search(/^https?:\/\//i) != -1)
                res.push(decodeURIComponent(h));
            }
          }
        }
      }

      return res;
    },


    href: function(a)
    {
      return a.getAttribute('href') || '';
    },


    getElementIndex: function(e)
    {
      var html = e.innerHTML;
      if(!html || html == ' ')
        return 1;

      var bg = e.style.backgroundImage;
      if(bg && bg != 'none')
        return 1;

      var c = e.getElementsByTagName('*');
      for(var i = 0; i < c.length; i++)
      {
        if(c[i].tagName == 'IMG')
          return 2;
        else
        {
          bg = c[i].style.backgroundImage;
          if(bg && bg != 'none')
            return 1;
        }
      }

      return 0;
    },


    run: function()
    {
      SaveFrom_Utils.embedDownloader.init();

      lm.sfref = lm.sfref.replace('{sfHelperName}', preference.sfHelperName);

      var prefFileHosting = !!preference.lmFileHosting;
      var prefMediaHosting = !!preference.lmMediaHosting;

      moduleState = 1;

      lm.linkRegExp = {};
      if(prefFileHosting)
      {
        for(var i in lm.re.filehosting)
          lm.linkRegExp[i] = lm.re.filehosting[i];
      }

      if(prefMediaHosting)
      {
        for(var i in lm.re.mediahosting)
          lm.linkRegExp[i] = lm.re.mediahosting[i];
      }


      var a = document.getElementsByTagName('a');
      if(lm.savefromLinkCount != a.length)
      {
        lm.savefromLinkCount = a.length;

        var found = {}, lastHref = '';

        for(var i = 0, len = a.length; i < len; i++)
        {
          var href = handleAnchor(a[i]);
          if(href)
          {
            var index = 0;
            var attr = a[i].getAttribute(lm.anchorIndexAttribute);
            if(attr === 0 || attr)
              index = parseInt(attr);
            else
            {
              index = lm.getElementIndex(a[i]);
              a[i].setAttribute(lm.anchorIndexAttribute, index);
            }

            if(found[href])
            {
              if(index < found[href].index)
              {
                found[href].elements = [a[i]];
                found[href].index = index;
                lastHref = href;
              }
              else if(index == found[href].index && href != lastHref)
              {
                found[href].elements.push(a[i]);
                lastHref = href;
              }
            }
            else
            {
              found[href] = {
                index: index,
                elements: [a[i]]
              };

              lastHref = href;
            }
          }
        }

        var count = 0;
        for(var i in found)
        {
          for(var j = 0, len = found[i].elements.length; j < len; j++)
          {
            var e = found[i].elements[j];
            count++;
            if(!e.getAttribute(lm.anchorAttribute))
              modifyLink(e, i);
          }
        }
      }



      function checkLink(link, domain)
      {
        if(!link)
          return false;

        if(link == window.location.href)
          return false;

        domain = SaveFrom_Utils.getTopLevelDomain(domain);
        if(!domain || !lm.linkRegExp[domain])
          return false;

        for(var i = 0; i < lm.linkRegExp[domain].length; i++)
        {
          if(link.search(lm.linkRegExp[domain][i]) != -1)
            return true;
        }

        return false;
      }


      function handleAnchor(obj)
      {
        var href = obj.href;
        if (typeof href === 'string' && href.search(/^https?:\/\/([\w\-]+\.)?savefrom\.net\//i) == -1) {
          var hrefArray = lm.parseHref(href, obj.search);

          if(hrefArray.length > 0)
          {
            if(lm.href(obj).indexOf('#') != 0 && checkLink(hrefArray[0], obj.hostname))
            {
              return hrefArray[0];
            }
            else if(hrefArray.length > 1)
            {
              for(var j = 1; j < hrefArray.length; j++)
              {
                var aTemp = document.createElement('a');
                aTemp.href = hrefArray[j];
                if(lm.href(aTemp).indexOf('#') != 0 && checkLink(hrefArray[j], aTemp.hostname))
                {
                  return hrefArray[j];
                }
              }
            }
          }
        }

        return '';
      }

      function modifyLink(obj, link)
      {
        if(!obj)
          return;

        obj.setAttribute(lm.anchorAttribute, '1');

        var box = document.createElement('span');
        box.setAttribute('style', 'padding: 0; margin: 0; margin-left: 5px;');
        box.addEventListener('click', function(e) {
          e.stopPropagation();
        });

        var parent = obj.parentNode;
        if(!parent)
          return;

        try
        {
          link = encodeURIComponent(link);
        }
        catch(err)
        {
          return;
        }

        var href = lm.pageUrl + '?url=' + link;
        if(lm.sfref)
          href += lm.sfref;

        // add button
        var a = document.createElement('a');
        a.href = href;
        a.target = '_blank';
        a.title = language.lmButtonTitle;

        a.style.backgroundImage = 'url('+lm.buttonSrc+')';
        a.style.backgroundRepeat = 'no-repeat';
        a.style.width = '16px';
        a.style.height = '16px';
        a.style.display = 'inline-block';

        a.addEventListener('click', function() {
          if ([1].indexOf(preference.cohortIndex) !== -1) {
            mono.sendMessage({action: 'trackCohort', category: 'mediahost', event: 'from', label: mono.getDomain(location.href, 1)});
          }
        });

        for(var i in lm.linkStyle)
          a.style[i] = lm.linkStyle[i];

        if (obj.style.zIndex) {
          a.style.zIndex = obj.style.zIndex;
        }

        a.setAttribute(lm.anchorAttribute, '1');
        a.setAttribute(lm.anchorAttributeLink, '1');
        if(lm.linkText)
        {
          a.textContent = lm.linkText;
        }

        box.appendChild(a);

        if(lm.htmlAfter)
          box.textContent += lm.htmlAfter;


        if(obj.nextSibling)
          parent.insertBefore(box, obj.nextSibling);
        else
          parent.appendChild(box);
      }
    },
    changeState: function(state) {
      preference.lmFileHosting = state;
      preference.lmMediaHosting = state;
      moduleState = state;
      var btnList = document.querySelectorAll('a['+lm.anchorAttributeLink+']');
      for (var i = 0, item; item = btnList[i]; i++) {
        item = item.parentNode;
        item.parentNode.removeChild(item);
      }
      var dataAttrList = document.querySelectorAll(['*['+lm.anchorAttribute+']', '*['+lm.anchorIndexAttribute+']']);
      for (i = 0, item; item = dataAttrList[i]; i++) {
        item.removeAttribute(lm.anchorAttribute);
        item.removeAttribute(lm.anchorIndexAttribute);
      }
      lm.savefromLinkCount = -1;

      if (state) {
        lm.run();
      }
    }
  };
}, null, function syncIsActive() {
  "use strict";
  if (document.contentType && document.contentType !== 'text/html') {
    return false;
  }

  if (mono.isIframe()) {
    return false;
  }

  if (mono.isSafari || mono.isFF || mono.isGM) {
    if (mono.checkUrl(document.URL, [
        "ftp://*",
        "file://*",
        "http://google.*/*",
        "http://*.google.*/*",
        "https://google.*/*",
        "https://*.google.*/*",
        "http://acidtests.org/*",
        "http://*.acidtests.org/*",
        "http://savefrom.net/*",
        "http://*.savefrom.net/*",
        "http://youtube.com/*",
        "http://*.youtube.com/*",
        "https://youtube.com/*",
        "https://*.youtube.com/*",
        "http://vimeo.com/*",
        "http://*.vimeo.com/*",
        "https://vimeo.com/*",
        "https://*.vimeo.com/*",
        "http://dailymotion.*/*",
        "http://*.dailymotion.*/*",
        "https://dailymotion.*/*",
        "https://*.dailymotion.*/*",
        "http://vk.com/*",
        "http://*.vk.com/*",
        "http://vkontakte.ru/*",
        "http://*.vkontakte.ru/*",
        "https://vk.com/*",
        "https://*.vk.com/*",
        "https://vkontakte.ru/*",
        "https://*.vkontakte.ru/*",
        "http://odnoklassniki.ru/*",
        "http://*.odnoklassniki.ru/*",
        "https://odnoklassniki.ru/*",
        "https://*.odnoklassniki.ru/*",
        "http://ok.ru/*",
        "http://*.ok.ru/*",
        "https://ok.ru/*",
        "https://*.ok.ru/*",
        "http://my.mail.ru/*",
        "https://my.mail.ru/*",
        "http://soundcloud.com/*",
        "http://*.soundcloud.com/*",
        "https://soundcloud.com/*",
        "https://*.soundcloud.com/*",
        "http://facebook.com/*",
        "http://*.facebook.com/*",
        "https://facebook.com/*",
        "https://*.facebook.com/*",
        "https://instagram.com/*",
        "http://instagram.com/*",
        "https://*.instagram.com/*",
        "http://*.instagram.com/*",
        "https://rutube.ru/*",
        "http://rutube.ru/*",
        "https://*.rutube.ru/*",
        "http://*.rutube.ru/*"
      ])) {
      return false;
    }
  }

  return true;
});
