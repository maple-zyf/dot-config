/**
 * Created by Anton on 17.06.2015.
 */
(function() {
  "use strict";
  var basePopup = function() {
    document.body.classList.remove('loading');
    document.body.classList.add('baseMode');
    var base = document.querySelector('.base');
    var extList = [
      {
        href: 'https://addons.opera.com/extensions/details/multi-links/',
        img: 'img/ext/multi-links.png',
        title: 'Multi-links',
        desc: 'A useful extension to open multiple links at once.'
      }, {
        href: 'https://addons.opera.com/extensions/details/simple-to-do-list/',
        img: 'img/ext/simple-to-do-list.png',
        title: 'Simple To-Do List',
        desc: 'Simple and minimalistic extension for task management.'
      }, {
        href: 'https://addons.opera.com/extensions/details/vktm-image-zoom/',
        img: 'img/ext/vktm-image-zoom.png',
        title: 'VK™ Image ZOOM',
        desc: 'Image ZOOM'
      }, {
        href: 'https://addons.opera.com/extensions/details/scroller/',
        img: 'img/ext/scroller.png',
        title: 'Scroller',
        desc: 'Scrolls the websites smoothly when scrolling with the mouse wheel or th...'
      }, {
        href: 'https://addons.opera.com/extensions/details/notepad/',
        img: 'img/ext/notepad.png',
        title: 'Notepad',
        desc: 'A quick simple notepad for your browser.'
      }
    ];
    extList.forEach(function(item) {
      var a = document.createElement('a');
      a.classList.add('item');
      var img = document.createElement('img');
      img.classList.add('row');
      var div = document.createElement('div');
      div.classList.add('row');
      var h4 = document.createElement('h4');
      var strong = document.createElement('strong');
      h4.appendChild(strong);
      var p = document.createElement('p');
      div.appendChild(h4);
      div.appendChild(p);
      a.appendChild(img);
      a.appendChild(div);

      a.title = item.title;
      a.href = item.href;
      a.target = '_blank';
      img.src = item.img;
      strong.textContent = item.title;
      p.textContent = item.desc;

      base.appendChild(a);
    });
  };

  chrome.runtime.getBackgroundPage(function(bgWindow) {
    var engine = bgWindow.engine;

    if (!engine.ext.getPopup) {
      return basePopup();
    }

    var data = engine.ext.getPopup();
    if (data === null) {
      return;
    }

    var sandbox = tools.initSandbox(engine, 'popup', function() {
      sandbox.onMessage(function(msg, cb) {
        if (msg.action === 'closePopup') {
          window.close();
        } else
        if (msg.action === 'resizePopup') {
          document.body.style.width = msg.width + 'px';
          document.body.style.height = msg.height + 'px';

          cb(1);
        } else {
          tools.onMessageFromFrame(msg, cb);
        }
      });

      chrome.runtime.onMessage.addListener(function(msg, sender, response) {
        if (msg.action === 'sb') {
          if (msg.sub === 'localStorageUpdate') {
            msg.action = msg.sub;
            delete msg.sub;
            tools.sandbox.sendMessage(msg);
          }
        }
        /* else {
         sandbox.sendMessage({action: 'onMessage', sender: sender, msg: msg}, response);
         }*/
      });

      sandbox.sendMessage({action: 'isPopup'});
      sandbox.sendMessage({action: 'setHtmlContent', html: data.html});
      sandbox.sendMessage({action: 'setStyle', css: data.css});
      sandbox.sendMessage({action: 'exec', script: data.js});

      document.body.classList.remove('loading');

      sandbox.sendMessage({action: 'getPopupSize'});
    });
  });
})();