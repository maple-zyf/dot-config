// ==UserScript==
// @name legacy components
//
// @exclude     file://*
// @exclude     http://google.*/*
// @exclude     http://*.google.*/*
// @exclude     https://google.*/*
// @exclude     https://*.google.*/*
//
// ==/UserScript==

var SaveFrom_Utils = {
  downloadParam: 'sfh--download',

  setStyle: function(node, style)
  {
    if(!node || !style)
      return;

    for(var i in style)
      node.style[i] = style[i];
  },


  getStyle: function(node, property) {
    return node && window.getComputedStyle && window.getComputedStyle(node, null).getPropertyValue(property);
  },

  addStyleRules: function(selector, rules, className)
  {
    var style = className ? document.querySelector('#savefrom-styles.'+className) : document.getElementById('savefrom-styles');
    if(!style)
    {
      style = document.createElement('style');
      style.id = 'savefrom-styles';
      if (className) {
        style.classList.add(className);
      }
      // maybe need for safari
      //style.appendChild(document.createTextNode(""));
      var s = document.querySelector('head style');
      if(s)
      // allow to override our styles
        s.parentNode.insertBefore(style, s);
      else
        document.querySelector('head').appendChild(style);
    }

    if(typeof(rules) == 'object') {
      var r = [];
      for(var i in rules)
        r.push(i + ':' + rules[i]);

      rules = r.join(';');
    }

    style.textContent += selector + '{' + rules + '}';
  },

  getPosition: function(node, parent)
  {
    var box = node.getBoundingClientRect();

    if (parent) {
      var parent_pos = parent.getBoundingClientRect();
      return {
        top: Math.round(box.top - parent_pos.top),
        left: Math.round(box.left - parent_pos.left),
        width: box.width,
        height: box.height
      }
    }
    return {
      top: Math.round(box.top + window.pageYOffset),
      left: Math.round(box.left + window.pageXOffset),
      width: box.width,
      height: box.height
    }
  },

  getSize: function(node)
  {
    return {width: node.offsetWidth, height: node.offsetHeight};
  },

  getMatchFirst: function(str, re)
  {
    var m = str.match(re);
    if(m && m.length > 1)
      return m[1];

    return '';
  },

  /*@if isVkOnly=0>*/
  getElementByIds: function(ids)
  {
    for(var i = 0; i < ids.length; i++)
    {
      var node = document.getElementById(ids[i]);
      if(node)
        return node;
    }

    return null;
  },
  /*@if isVkOnly=0<*/

  getParentByClass: function(node, name) {
    if(!node || name == '') {
      return false;
    }

    var parent;
    if(typeof name === 'object' && name.length > 0) {
      for(parent = node; parent; parent = parent.parentNode) {
        if (parent.nodeType !== 1) {
          return null;
        }
        for(var i = 0; i < name.length; i++) {
          if(parent.classList.contains(name[i])) {
            return parent;
          }
        }
      }
    } else {
      for(parent = node; parent; parent = parent.parentNode) {
        if (parent.nodeType !== 1) {
          return null;
        }
        if(parent.classList.contains(name)) {
          return parent;
        }
      }
    }

    return null;
  },

  getParentByTagName: function(node, tagName) {
    if(!node || !tagName) {
      return false;
    }

    for(var parent = node; parent; parent = parent.parentNode) {
      if (parent.nodeType !== 1) {
        return null;
      }

      if(parent.tagName === tagName) {
        return parent;
      }
    }

    return null;
  },

  getParentById: function(node, id) {
    for(var parent = node; parent; parent = parent.parentNode) {
      if (parent.nodeType !== 1) {
        return null;
      }

      if(parent.id === id) {
        return parent;
      }
    }

    return null;
  },

  /*@if isVkOnly=0>*/
  hasChildrenTagName: function(node, tagName) {
    for (var i = 0, item; item = node.childNodes[i]; i++) {
      if (item.nodeType !== 1) {
        continue;
      }
      if (item.tagName === tagName) {
        return true;
      }
    }
    return false;
  },
  /*@if isVkOnly=0<*/

  isParent: function(node, testParent)
  {
    if (!testParent || [1, 9, 11].indexOf(testParent.nodeType) === -1) {
      return false;
    }

    return testParent.contains(node);
  },


  emptyNode: function(node)
  {
    while(node.firstChild)
      node.removeChild(node.firstChild);
  },

  /*@if isVkOnly=0>*/
  initFrameDownloadListener: function() {
    if (SaveFrom_Utils.initFrameDownloadListener.enable === 1) {
      return;
    }
    SaveFrom_Utils.initFrameDownloadListener.enable = 1;
    window.addEventListener("message", function listener(e) {
      if (e.data.substr(0, 6) !== 'killMe') {
        return;
      }
      var src = e.data.substr(7);
      var frameList = document.querySelectorAll('iframe.sf-dl-frame');
      var frameListLen = frameList.length;
      for (var f = 0, el; el = frameList[f]; f++) {
        if (el.src === src) {
          el.parentNode.removeChild(el);
          frameListLen--;
          break;
        }
      }
      if (frameListLen === 0) {
        SaveFrom_Utils.initFrameDownloadListener.enable = 0;
        window.removeEventListener("message", listener);
      }
    });
  },
  /*@if isVkOnly=0<*/

  download: function(filename, url, requestOptions, callback, options)
  {
    if(!url)
      return false;

    filename = filename || this.getFileName(url);
    if(!filename)
      return false;

    options = options || {};

    /*@if isVkOnly=0>*/
    if (!mono.global.preference.downloads) {
      if (options.useFrame && this.downloadCheckProtocol(url)) {
        SaveFrom_Utils.initFrameDownloadListener();
        var src = this.getMatchFirst(url, /(^https?:\/\/[^\/]+)/);

        if(src == location.protocol + '//' + location.host) {
          var a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          setTimeout(function() {
            mono.trigger(a, 'click', {
              cancelable: true
            });
            setTimeout(function(){
              a.parentNode.removeChild(a);
            }, 100);
          });
        }
        else {
          var params = {url: url, filename: filename};
          params = encodeURIComponent(JSON.stringify(params));

          src += '/404?#' + this.downloadParam + '=' + params;

          var f = document.createElement('iframe');
          f.src = src;
          f.classList.add('sf-dl-frame');
          f.style.display = 'none';

          document.body.appendChild(f);
        }

        return true;
      }

      return false;
    }
    /*@if isVkOnly=0<*/

    var params = requestOptions || {};
    params.url = url;
    params.filename = filename;

    var request = {
      action: 'downloadFile',
      options: params
    };

    callback = callback || undefined;

    mono.sendMessage(request, callback);
    return true;
  },

  downloadList: {
    showDownloadWarningPopup: function(onContinue, type) {
      var template = SaveFrom_Utils.playlist.getInfoPopupTemplate();

      mono.sendMessage({action: 'getWarningIcon', type: type}, function(icon) {
        template.icon.style.backgroundImage = 'url(' + icon + ')';
      });

      mono.create(template.textContainer, {
        append: [
          mono.create('p', {
            text: mono.global.language.warningPopupTitle,
            style: {
              color: '#0D0D0D',
              fontSize: '20px',
              marginBottom: '11px',
              marginTop: '13px'
            }
          }),
          mono.create('p', {
            text: mono.global.language.warningPopupDesc+' ',
            style: {
              color: '#868686',
              fontSize: '14px',
              marginBottom: '13px',
              lineHeight: '24px',
              marginTop: '0px'
            },
            append: mono.create('a', {
              href: (mono.global.language.lang === 'ru' || mono.global.language.lang === 'uk')?'http://vk.com/page-55689929_49003549':'http://vk.com/page-55689929_49004259',
              text: mono.global.language.readMore,
              target: '_blank',
              style: {
                color: '#4A90E2'
              }
            })
          }),
          mono.create('p', {
            style: {
              marginBottom: '13px'
            },
            append: [
              mono.create('label', {
                style: {
                  color: '#868686',
                  cursor: 'pointer',
                  fontSize: '14px',
                  lineHeight: '19px'
                },
                append: [
                  mono.create('input', {
                    type: 'checkbox',
                    style: {
                      cssFloat: 'left',
                      marginLeft: '0px'
                    },
                    on: ['click', function() {
                      mono.sendMessage({action: 'hideDownloadWarning', set: this.checked?1:0});
                    }]
                  }),
                  mono.global.language.noWarning
                ]
              })
            ]
          })
        ]
      });

      var cancelBtn = undefined;
      var continueBtn = undefined;
      mono.create(template.buttonContainer, {
        append: [
          cancelBtn = mono.create('button', {
            text: mono.global.language.cancel,
            style: {
              height: '27px',
              width: '118px',
              backgroundColor: '#ffffff',
              border: '1px solid #9e9e9e',
              margin: '12px',
              marginBottom: '11px',
              marginRight: '4px',
              borderRadius: '5px',
              fontSize: '14px',
              cursor: 'pointer'
            }
          }),
          continueBtn = mono.create('button', {
            text: mono.global.language.continue,
            style: {
              height: '27px',
              width: '118px',
              backgroundColor: '#ffffff',
              border: '1px solid #9e9e9e',
              margin: '12px',
              marginBottom: '11px',
              marginRight: '8px',
              borderRadius: '5px',
              fontSize: '14px',
              cursor: 'pointer'
            }
          })
        ]
      });

      cancelBtn.addEventListener('click', function(e) {
        var popup = template.body.parentNode;
        mono.trigger(popup.lastChild, 'click');
      });

      continueBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        onContinue();
        mono.trigger(cancelBtn, 'click');
      });

      SaveFrom_Utils.popupDiv(template.body, 'dl_warning_box_popup');
    },
    startChromeDownloadList: function(options, hideDialog) {
      var folderName = options.folderName;
      var linkList = options.list;
      var dataType = options.type;

      if (folderName) {
        folderName += '/';
      }

      var itemIndex = 0;
      var pause = false;
      var timeout = 500;

      var focusEl = document.body;

      focusEl.focus();

      if (!hideDialog) {
        focusEl.onblur = function () {
          pause = true;
        };
      }

      var nextOneFile = function() {
        var item = linkList[itemIndex];
        itemIndex++;

        if (item === undefined) {
          return;
        }

        if (mono.global.preference.downloads) {
          SaveFrom_Utils.download(folderName+item.filename, item.url);
        } else {
          mono.trigger(mono.create('a', {
            download: item.filename,
            href: item.url,
            on: ['click', function(e) {
              SaveFrom_Utils.downloadOnClick(e, null, {
                useFrame: true
              });
            }]
          }), 'click', {
            cancelable: true
          });
        }

        if (pause) {
          SaveFrom_Utils.downloadList.showDownloadWarningPopup(function() {
            pause = false;
            focusEl.focus();
            nextOneFile();
          }, dataType);
        } else {
          if (itemIndex > 5 && timeout) {
            timeout = undefined;
            focusEl.onblur = undefined;
            pause = false;
            if (mono.global.preference.downloads) {
              mono.sendMessage({action: 'downloadList', fileList: linkList.slice(itemIndex), path: folderName});
              return;
            }
          }

          setTimeout(function() {
            nextOneFile();
          }, timeout);
        }
      };

      nextOneFile();
    },
    startFfDownloadList: function(linkList, folderName) {
      mono.sendMessage({action: 'getPath', folder: folderName}, function (path) {
        mono.sendMessage({action: 'downloadList', fileList: linkList, path: path}, undefined, "service");
      }, "service");
    },
    startDownload: function(options) {
      options.list.forEach(function(item) {
        item.filename = mono.fileName.modify(item.filename);
      });

      options.folderName =  mono.fileName.modify(options.folderName);

      if (mono.isFF) {
        return SaveFrom_Utils.downloadList.startFfDownloadList(options.list, options.folderName);
      }

      if (mono.isChrome || mono.isGM || mono.isSafari) {
        return mono.sendMessage({action: 'hideDownloadWarning'}, function(state) {
          SaveFrom_Utils.downloadList.startChromeDownloadList(options, state);
        });
      }
    },
    showBeforeDownloadPopup: function(list, options) {
      options.list = list;
      var type = options.type;
      var folderName = options.folderName;
      var onContinue = options.onContinue || SaveFrom_Utils.downloadList.startDownload;
      var onShowList = options.onShowList || SaveFrom_Utils.playlist.popupFilelist;
      var count = options.count || list.length;
      var template = SaveFrom_Utils.playlist.getInfoPopupTemplate();

      mono.sendMessage({action: 'getWarningIcon', color: '#00CCFF', type: type}, function(icon) {
        template.icon.style.backgroundImage = 'url('+icon+')';
      });

      var showListLink = [];
      if (onShowList) {
        showListLink = [' (',mono.create('a', {href: '#', text: mono.global.language.vkListOfLinks.toLowerCase()}),')'];
        showListLink[1].addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          onShowList(options.list);
          mono.trigger(cancelBtn, 'click');
        });
      }

      mono.create(template.textContainer, {
        append: [
          mono.create('p', {
            text: folderName || mono.global.language.playlistTitle,
            style: {
              color: '#0D0D0D',
              fontSize: '20px',
              marginBottom: '11px',
              marginTop: '13px'
            }
          }),
          mono.create('p', {
            text: mono.global.language.vkFoundFiles.replace('%d', count),
            style: {
              color: '#868686',
              fontSize: '14px',
              marginBottom: '13px',
              lineHeight: '24px',
              marginTop: '0px'
            },
            append: showListLink
          }),
          mono.create('p', {
            text: mono.global.language.beforeDownloadPopupWarn,
            style: {
              color: '#868686',
              fontSize: '14px',
              marginBottom: '13px',
              lineHeight: '24px',
              marginTop: '0px'
            }
          })
        ]
      });

      var cancelBtn = undefined;
      var dlBtn = undefined;
      mono.create(template.buttonContainer, {
        append: [
          cancelBtn = mono.create('button', {
            text: mono.global.language.cancel,
            style: {
              height: '27px',
              width: '118px',
              backgroundColor: '#ffffff',
              border: '1px solid #9e9e9e',
              margin: '12px',
              marginBottom: '11px',
              marginRight: '4px',
              borderRadius: '5px',
              fontSize: '14px',
              cursor: 'pointer'
            }
          }),
          dlBtn = mono.create('button', {
            text: mono.global.language.continue,
            style: {
              height: '27px',
              width: '118px',
              backgroundColor: '#ffffff',
              border: '1px solid #9e9e9e',
              margin: '12px',
              marginBottom: '11px',
              marginRight: '8px',
              borderRadius: '5px',
              fontSize: '14px',
              cursor: 'pointer'
            }
          })
        ]
      });

      cancelBtn.addEventListener('click', function(e) {
        var popup = template.body.parentNode;
        mono.trigger(popup.lastChild, 'click');
      });

      dlBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        onContinue(options);
        mono.trigger(cancelBtn, 'click');
      });

      SaveFrom_Utils.popupDiv(template.body, 'dl_confirm_box_popup');
    }
  },

  /*@if isVkOnly=0>*/
  downloadCheckProtocol: function(url) {
    if(location.protocol == 'http:') {
      return true;
    }

    if(!url) {
      return false;
    }

    url = url.toLowerCase();

    if(location.protocol == url.substr(0, location.protocol.length)) {
      return true;
    }

    return false;
  },
  /*@if isVkOnly=0<*/

  downloadLink: function(a, callback, options)
  {
    if(!a.href)
      return false;

    var filename = a.getAttribute('download');

    return this.download(filename, a.href, null, callback, options);
  },

  safariDlLink: function(e) {
    "use strict";
    if (e.button || e.ctrlKey || e.altKey || e.shitfKey) {
      return;
    }

    var me = null;

    var legacy = function(e) {
      var me = document.createEvent('MouseEvents');
      me.initMouseEvent('click', true, e.cancelable, window, 0,
        e.screenX, e.screenY, e.clientX, e.clientY,
        false, true, false, e.metaKey, e.button, e.relatedTarget);
      return me;
    };

    try {
      if (typeof MouseEvent !== 'function') {
        throw 'legacy';
      }
      me = new MouseEvent('click', {
        bubbles: true,
        cancelable: e.cancelable,
        screenX: e.screenX,
        screenY: e.screenY,
        clientX: e.clientX,
        clientY: e.clientY,
        ctrlKey: false,
        altKey: true,
        shiftKey: false,
        metaKey: e.metaKey,
        button: e.button,
        relatedTarget: e.relatedTarget
      });
    } catch (err) {
      me = legacy(e);
    }

    e.preventDefault();
    e.stopPropagation();

    this.dispatchEvent(me);
  },

  downloadOnClick: function(event, callback, options)
  {
    options = options || {};
    var _this = SaveFrom_Utils;

    var node = options.el || event.target;
    if(node.tagName !== 'A') {
      node = node.parentNode;
    }

    if (mono.isSafari && node.tagName === 'A') {
      return _this.safariDlLink.call(node, event);
    }

    /*@if isVkOnly=0>*/
    if ( !mono.global.preference.downloads &&
      !(mono.global.preference.iframeDownload && options.useFrame && node.href && _this.downloadCheckProtocol(node.href)) ) {
      return;
    }
    /*@if isVkOnly=0<*/

    if(event.button === 2) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    _this.downloadLink(node, callback, options);
  },

  getQueryString: function(query, key_prefix, key_suffix)
  {
    if(!query || typeof(query) != 'object')
      return '';

    if(key_prefix === undefined)
      key_prefix = '';

    if(key_suffix === undefined)
      key_suffix = '';

    var str = '';
    for(var key in query)
    {
      if(str.length)
        str += '&';

      if(query[key] instanceof Object)
      {
        if(!key_prefix)
          key_prefix = '';

        if(!key_suffix)
          key_suffix = '';

        str += SaveFrom_Utils.getQueryString(query[key], key_prefix + key + "[", "]" + key_suffix);
      }
      else
        str += key_prefix + escape(key) + key_suffix + '=' + escape(query[key]);
    }

    return str;
  },

  /*@if isVkOnly=0>*/
  md5: function(str)
  {
    // http://kevin.vanzonneveld.net
    // +   original by: Webtoolkit.info (http://www.webtoolkit.info/)
    // + namespaced by: Michael White (http://getsprink.com)
    // +    tweaked by: Jack
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +      input by: Brett Zamir (http://brett-zamir.me)
    // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // -    depends on: utf8_encode
    // *     example 1: md5('Kevin van Zonneveld');
    // *     returns 1: '6e658d4bfcb59cc13f96c14450ac40b9'
    var xl;

    var rotateLeft = function (lValue, iShiftBits) {
      return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
    };

    var addUnsigned = function (lX, lY) {
      var lX4, lY4, lX8, lY8, lResult;
      lX8 = (lX & 0x80000000);
      lY8 = (lY & 0x80000000);
      lX4 = (lX & 0x40000000);
      lY4 = (lY & 0x40000000);
      lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
      if (lX4 & lY4) {
        return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
      }
      if (lX4 | lY4) {
        if (lResult & 0x40000000) {
          return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
        } else {
          return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
        }
      } else {
        return (lResult ^ lX8 ^ lY8);
      }
    };

    var _F = function (x, y, z) {
      return (x & y) | ((~x) & z);
    };
    var _G = function (x, y, z) {
      return (x & z) | (y & (~z));
    };
    var _H = function (x, y, z) {
      return (x ^ y ^ z);
    };
    var _I = function (x, y, z) {
      return (y ^ (x | (~z)));
    };

    var _FF = function (a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(_F(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    };

    var _GG = function (a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(_G(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    };

    var _HH = function (a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(_H(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    };

    var _II = function (a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(_I(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    };

    var convertToWordArray = function (str) {
      var lWordCount;
      var lMessageLength = str.length;
      var lNumberOfWords_temp1 = lMessageLength + 8;
      var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
      var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
      var lWordArray = new Array(lNumberOfWords - 1);
      var lBytePosition = 0;
      var lByteCount = 0;
      while (lByteCount < lMessageLength) {
        lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = (lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition));
        lByteCount++;
      }
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
      lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
      lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
      return lWordArray;
    };

    var wordToHex = function (lValue) {
      var wordToHexValue = "",
        wordToHexValue_temp = "",
        lByte, lCount;
      for (lCount = 0; lCount <= 3; lCount++) {
        lByte = (lValue >>> (lCount * 8)) & 255;
        wordToHexValue_temp = "0" + lByte.toString(16);
        wordToHexValue = wordToHexValue + wordToHexValue_temp.substr(wordToHexValue_temp.length - 2, 2);
      }
      return wordToHexValue;
    };

    var x = [],
      k, AA, BB, CC, DD, a, b, c, d, S11 = 7,
      S12 = 12,
      S13 = 17,
      S14 = 22,
      S21 = 5,
      S22 = 9,
      S23 = 14,
      S24 = 20,
      S31 = 4,
      S32 = 11,
      S33 = 16,
      S34 = 23,
      S41 = 6,
      S42 = 10,
      S43 = 15,
      S44 = 21;

    //str = this.utf8_encode(str);
    x = convertToWordArray(str);
    a = 0x67452301;
    b = 0xEFCDAB89;
    c = 0x98BADCFE;
    d = 0x10325476;

    xl = x.length;
    for (k = 0; k < xl; k += 16) {
      AA = a;
      BB = b;
      CC = c;
      DD = d;
      a = _FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
      d = _FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
      c = _FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
      b = _FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
      a = _FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
      d = _FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
      c = _FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
      b = _FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
      a = _FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
      d = _FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
      c = _FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
      b = _FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
      a = _FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
      d = _FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
      c = _FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
      b = _FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
      a = _GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
      d = _GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
      c = _GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
      b = _GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
      a = _GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
      d = _GG(d, a, b, c, x[k + 10], S22, 0x2441453);
      c = _GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
      b = _GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
      a = _GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
      d = _GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
      c = _GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
      b = _GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
      a = _GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
      d = _GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
      c = _GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
      b = _GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
      a = _HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
      d = _HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
      c = _HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
      b = _HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
      a = _HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
      d = _HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
      c = _HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
      b = _HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
      a = _HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
      d = _HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
      c = _HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
      b = _HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
      a = _HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
      d = _HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
      c = _HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
      b = _HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
      a = _II(a, b, c, d, x[k + 0], S41, 0xF4292244);
      d = _II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
      c = _II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
      b = _II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
      a = _II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
      d = _II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
      c = _II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
      b = _II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
      a = _II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
      d = _II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
      c = _II(c, d, a, b, x[k + 6], S43, 0xA3014314);
      b = _II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
      a = _II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
      d = _II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
      c = _II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
      b = _II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
      a = addUnsigned(a, AA);
      b = addUnsigned(b, BB);
      c = addUnsigned(c, CC);
      d = addUnsigned(d, DD);
    }

    var temp = wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);

    return temp.toLowerCase();
  },
  /*@if isVkOnly=0<*/


  decodeUnicodeEscapeSequence: function(text)
  {
    return text.replace(/\\u([0-9a-f]{4})/g, function(s, m){
      m = parseInt(m, 16);
      if(!isNaN(m))
      {
        return String.fromCharCode(m);
      }
    });
  },


  getFileExtension: function(str, def)
  {
    var ext = this.getMatchFirst(str, /\.([a-z0-9]{3,4})(\?|$)/i);
    if(ext)
      return ext.toLowerCase();

    return (def ? def : '');
  },


  getFileName: function(url)
  {
    var filename = this.getMatchFirst(url, /\/([^\?#\/]+\.[a-z\d]{2,6})(?:\?|#|$)/i);
    if(!filename)
      return filename;

    return mono.fileName.modify(filename);
  },


  getTopLevelDomain: function(domain)
  {
    if(!domain)
      return '';

    if(!domain.match(/^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}/))
      return domain;

    var a = domain.split('.');
    var l = a.length;

    if(l == 2)
      return domain;

    return (a[l - 2] + '.' + a[l - 1]);
  },


  dateToObj: function(ts, leadingZero)
  {
    var d = (ts === null || ts === undefined) ? new Date() : new Date(ts);

    if(leadingZero === undefined)
      leadingZero = true;

    var res = {
      year: d.getFullYear(),
      month: (d.getMonth() + 1),
      day: d.getDate(),
      hour: d.getHours(),
      min: d.getMinutes(),
      sec: d.getSeconds()
    };

    if(leadingZero)
    {
      for(var i in res)
      {
        if(res[i].toString().length == 1)
          res[i] = '0' + res[i];
      }
    }

    return res;
  },


  utf8Encode: function(str)
  {
    str = str.replace(/\r\n/g,"\n");
    var res = "";

    for (var n = 0; n < str.length; n++)
    {
      var c = str.charCodeAt(n);

      if (c < 128)
        res += String.fromCharCode(c);
      else if((c > 127) && (c < 2048))
      {
        res += String.fromCharCode((c >> 6) | 192);
        res += String.fromCharCode((c & 63) | 128);
      }
      else
      {
        res += String.fromCharCode((c >> 12) | 224);
        res += String.fromCharCode(((c >> 6) & 63) | 128);
        res += String.fromCharCode((c & 63) | 128);
      }

    }

    return res;
  },

  sizeHuman: function(size, round)
  {
    if(round == undefined || round == null)
      round = 2;

    var s = size, count = 0, sign = '', unite_spec = [
      mono.global.language.vkFileSizeByte,
      mono.global.language.vkFileSizeKByte,
      mono.global.language.vkFileSizeMByte,
      mono.global.language.vkFileSizeGByte,
      mono.global.language.vkFileSizeTByte
    ];

    if(s < 0)
    {
      sign = '-';
      s = Math.abs(s);
    }

    while(s >= 1000)
    {
      count++;
      s /= 1024;
    }

    if(round >= 0)
    {
      var m = round * 10;
      s = Math.round(s * m) / m;
    }

    if(count < unite_spec.length)
      return sign + s + ' ' + unite_spec[count];

    return size;
  },

  /*@if isVkOnly=0>*/
  secondsToDuration: function(seconds)
  {
    if(!seconds || isNaN(seconds))
      return '';

    function zfill(time)
    {
      if(time < 10)
        return '0' + time;

      return time.toString();
    }

    var hours = Math.floor(seconds / 3600);
    seconds %= 3600;

    var minutes = Math.floor(seconds / 60);
    seconds %= 60;

    if(hours > 0)
      return hours + ":" + zfill(minutes) + ":" + zfill(seconds);

    return minutes + ":" + zfill(seconds);
  },
  /*@if isVkOnly=0<*/

  svg: {
    icon: {
      download: 'M 4,0 4,8 0,8 8,16 16,8 12,8 12,0 4,0 z',
      info: 'M 8,1.55 C 11.6,1.55 14.4,4.44 14.4,8 14.4,11.6 11.6,14.4 8,14.4 4.44,14.4 1.55,11.6 1.55,8 1.55,4.44 4.44,1.55 8,1.55 M 8,0 C 3.58,0 0,3.58 0,8 0,12.4 3.58,16 8,16 12.4,16 16,12.4 16,8 16,3.58 12.4,0 8,0 L 8,0 z M 9.16,12.3 H 6.92 V 7.01 H 9.16 V 12.3 z M 8.04,5.91 C 7.36,5.91 6.81,5.36 6.81,4.68 6.81,4 7.36,3.45 8.04,3.45 8.72,3.45 9.27,4 9.27,4.68 9.27,5.36 8.72,5.91 8.04,5.91 z',
      noSound: 'M 11.4,5.05 13,6.65 14.6,5.05 16,6.35 14.4,7.95 16,9.55 14.6,11 13,9.35 11.4,11 10,9.55 11.6,7.95 10,6.35 z M 8,1.75 8,14.3 4,10.5 l -4,0 0,-4.75 4,0 z'
    },

    cache: {},

    getSrc: function(icon, color)
    {
      if(!this.icon[icon])
        return '';

      if(!this.cache[icon])
        this.cache[icon] = {};

      if(!this.cache[icon][color])
      {
        this.cache[icon][color] = btoa(
            '<?xml version="1.0" encoding="UTF-8"?>' +
            '<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" version="1.1" width="16" height="16" viewBox="0 0 16 16" id="svg2" xml:space="preserve">' +
            '<path d="' + this.icon[icon] + '" fill="' + color + '" /></svg>'
        );
      }

      if(this.cache[icon][color])
        return 'data:image/svg+xml;base64,' + this.cache[icon][color];

      return '';
    }
  },

  /*@if isVkOnly=0>*/
  appendDownloadInfo: function(parent, color, boxStyle, btnStyle)
  {
    if(!color)
      color = '#a0a0a0';

    var info = document.createElement('span');
    info.appendChild(document.createTextNode(mono.global.language.downloadTitle));
    this.setStyle(info, {
      display: 'inline-block',
      position: 'relative',
      border: '1px solid ' + color,
      borderRadius: '5px',
      fontSize: '13px',
      lineHeight: '17px',
      padding: '2px 19px 2px 5px',
      marginTop: '5px',
      opacity: 0.9
    });

    if(boxStyle)
      this.setStyle(info, boxStyle);

    var close = document.createElement('span');
    close.textContent = String.fromCharCode(215);
    this.setStyle(close, {
      color: color,
      width: '14px',
      height: '14px',
      fontSize: '14px',
      fontWeight: 'bold',
      lineHeight: '14px',
      position: 'absolute',
      top: 0,
      right: 0,
      overflow: 'hidden',
      cursor: 'pointer'
    });

    if(btnStyle)
      this.setStyle(close, btnStyle);

    close.addEventListener('click', function(){
      info.parentNode.removeChild(info);
      mono.sendMessage({action: 'updateOption', key: 'moduleShowDownloadInfo', value: 0});
    }, false);

    info.appendChild(close);
    parent.appendChild(info);
  },
  /*@if isVkOnly=0<*/

  appendFileSizeIcon: function(link, iconStyle, textStyle, error, noBrackets, container)
  {
    var iconColor = '#333333';
    if(error)
      iconColor = '#ff0000';
    else if(iconStyle && iconStyle.color)
      iconColor = iconStyle.color;

    var s = document.createElement('img');
    s.src = SaveFrom_Utils.svg.getSrc('info', iconColor);
    s.title = mono.global.language[error ? 'getFileSizeFailTitle' : 'getFileSizeTitle'];

    var defIconStyle = {
      width: '14px',
      height: '14px',
      marginLeft: '3px',
      verticalAlign: 'middle',
      position: 'relative',
      top: '-1px',
      cursor: 'pointer'
    };

    var defTextStyle = {
      fontSize: '75%',
      fontWeight: 'normal',
      marginLeft: '3px',
      whiteSpace: 'nowrap'
    };

    var _this = this;

    this.setStyle(s, defIconStyle);
    if(iconStyle && typeof(iconStyle) == 'object')
      this.setStyle(s, iconStyle);

    if (container) {
      container.appendChild(s);
    } else
    if(link.nextSibling == null) {
      link.parentNode.appendChild(s);
    } else
    {
      link.parentNode.insertBefore(s, link.nextSibling);
    }

    s.addEventListener("click", function(event){
      event.preventDefault();
      event.stopPropagation();

      var node = document.createElement('span');
      node.textContent = '...';
      _this.setStyle(node, defTextStyle);
      if(textStyle && typeof(textStyle) == 'object')
        _this.setStyle(node, textStyle);

      s.parentNode.replaceChild(node, s);

      var request = {
        action: 'getFileSize',
        url: link.href
      };

      mono.sendMessage(request, function(response){
        if(response.fileSize == 0)
        {
          node.parentNode.removeChild(node);
          _this.appendFileSizeIcon(link, iconStyle, textStyle, true, noBrackets, container);
        }
        else
        {
          if(response.fileType.search(/^audio\//i) > -1)
          {
            var seconds = link.getAttribute('data-savefrom-helper-duration');
            if(seconds)
            {
              seconds = parseInt(seconds);
              if(!isNaN(seconds))
              {
                var size = _this.sizeHuman(response.fileSize, 2);
                var bitrate = Math.floor((response.fileSize / seconds) / 125) + ' ' +
                  mono.global.language.kbps;

                if (noBrackets) {
                  node.textContent = size + ' ~ ' + bitrate;
                } else {
                  node.textContent = '(' + size + ' ~ ' + bitrate + ')';
                }
                return;
              }
            }
          }

          if (noBrackets) {
            node.textContent = _this.sizeHuman(response.fileSize, 2);
          } else {
            node.textContent = '(' + _this.sizeHuman(response.fileSize, 2) + ')';
          }
          node.title = response.fileType ? response.fileType : '';
        }
      });
    }, false);

    return s;
  },

  appendNoSoundIcon: function(link, iconStyle)
  {
    var noSoundIconColor = '#ff0000';
    if(iconStyle && iconStyle.color)
      noSoundIconColor = iconStyle.color;
    var s = document.createElement('img');
    s.src = SaveFrom_Utils.svg.getSrc('noSound', noSoundIconColor);
    s.title = mono.global.language.withoutAudio;

    var defIconStyle = {
      width: '14px',
      height: '14px',
      marginLeft: '3px',
      verticalAlign: 'middle',
      position: 'relative',
      top: '-1px',
      cursor: 'pointer'
    };
    SaveFrom_Utils.setStyle(s, defIconStyle);
    if(iconStyle && typeof(iconStyle) == 'object')
      SaveFrom_Utils.setStyle(s, iconStyle);

    if(link.nextSibling == null) {
      if (link.parentNode === null) {
        link.appendChild(s);
      } else {
        link.parentNode.appendChild(s);
      }
    } else
    {
      link.parentNode.insertBefore(s, link.nextSibling);
    }
  },

  video: {
    dataAttr: 'data-savefrom-video-visible',
    /*@if isVkOnly=0>*/
    yt: {
      inited: false,

      show3D: false,
      showMP4NoAudio: false,

      showFormat: {
        'FLV': true,
        'MP4': true,
        'WebM': false,
        '3GP': false,
        'Audio AAC': false,
        'Audio Vorbis': false,
        'Audio Opus': false
      },

      format: {
        'FLV': {
          '5': {quality: '240'},
          '6': {quality: '270'},
          '34': {quality: '360'},
          '35': {quality: '480'}
        },

        'MP4': {
          '18': {quality: '360'},
          '22': {quality: '720'},
          '37': {quality: '1080'},
          '38': {quality: '8K'},
          '59': {quality: '480'},
          '78': {quality: '480'},
          '82': {quality: '360', '3d': true},
          '83': {quality: '240', '3d': true},
          '84': {quality: '720', '3d': true},
          '85': {quality: '1080', '3d': true},
          '160': {quality: '144', noAudio: true},
          '133': {quality: '240', noAudio: true},
          '134': {quality: '360', noAudio: true},
          '135': {quality: '480', noAudio: true},
          '136': {quality: '720', noAudio: true},
          '137': {quality: '1080', noAudio: true},
          '264': {quality: '1440', noAudio: true},
          '138': {quality: '8K', noAudio: true},
          '298': {quality: '720', noAudio: true, sFps: true},
          '299': {quality: '1080', noAudio: true, sFps: true},
          '266': {quality: '4K', noAudio: true}
        },

        'WebM': {
          '43': {quality: '360'},
          '44': {quality: '480'},
          '45': {quality: '720'},
          '46': {quality: '1080'},
          '167': {quality: '360', noAudio: true},
          '168': {quality: '480', noAudio: true},
          '169': {quality: '720', noAudio: true},
          '170': {quality: '1080', noAudio: true},
          '218': {quality: '480', noAudio: true},
          '219': {quality: '480', noAudio: true},
          '242': {quality: '240', noAudio: true},
          '243': {quality: '360', noAudio: true},
          '244': {quality: '480', noAudio: true},
          '245': {quality: '480', noAudio: true},
          '246': {quality: '480', noAudio: true},
          '247': {quality: '720', noAudio: true},
          '248': {quality: '1080', noAudio: true},
          '271': {quality: '1440', noAudio: true},
          '272': {quality: '8K', noAudio: true},
          '278': {quality: '144', noAudio: true},
          '100': {quality: '360', '3d': true},
          '101': {quality: '480', '3d': true},
          '102': {quality: '720', '3d': true},
          '302': {quality: '720', noAudio: true, sFps: true},
          '303': {quality: '1080', noAudio: true, sFps: true},
          '308': {quality: '1440', noAudio: true, sFps: true},
          '313': {quality: '4K', noAudio: true},
          '315': {quality: '4K', noAudio: true, sFps: true}
        },

        '3GP': {
          '17': {quality: '144'},
          '36': {quality: '240'}
        },

        'Audio AAC': {
          '139': {quality: '48', ext: 'aac', noVideo: true},
          '140': {quality: '128', ext: 'aac', noVideo: true},
          '141': {quality: '256', ext: 'aac', noVideo: true},
          '256': {quality: '192', ext: 'aac', noVideo: true},
          '258': {quality: '384', ext: 'aac', noVideo: true}
        },

        'Audio Vorbis': {
          '171': {quality: '128', ext: 'webm', noVideo: true},
          '172': {quality: '192', ext: 'webm', noVideo: true}
        },

        'Audio Opus': {
          '249': {quality: '48', ext: 'opus', noVideo: true},
          '250': {quality: '128', ext: 'opus', noVideo: true},
          '251': {quality: '256', ext: 'opus', noVideo: true}
        }
      },


      init: function()
      {
        if ( SaveFrom_Utils.video.yt.inited ) {
          return;
        }

        ['Audio AAC', 'Audio Vorbis', 'Audio Opus'].forEach(function(item) {
          var formatType = SaveFrom_Utils.video.yt.format[item];
          for (var qualityValue in formatType) {
            formatType[qualityValue].quality += ' ' + mono.global.language.kbps;
          }
        });

        SaveFrom_Utils.video.yt.show3D = mono.global.preference.ytHide3D == '0';
        SaveFrom_Utils.video.yt.showMP4NoAudio = mono.global.preference.ytHideMP4NoAudio == '0';

        var show = false;
        var showAudio = false;
        for(var i in SaveFrom_Utils.video.yt.showFormat)
        {
          var prefName = 'ytHide' + i.replace(' ', '_');
          if (prefName === 'ytHideAudio_AAC') {
            prefName = 'ytHideAudio_MP4';
          }
          var value = mono.global.preference[prefName] == '0';
          if (i === 'Audio AAC') {
            showAudio = value;
          }
          SaveFrom_Utils.video.yt.showFormat[i] = value;
          if(value) {
            show = true;
          }
        }

        SaveFrom_Utils.video.yt.showFormat['Audio Vorbis'] = showAudio;
        SaveFrom_Utils.video.yt.showFormat['Audio Opus'] = showAudio;

        if(!show) {
          SaveFrom_Utils.video.yt.showFormat.FLV = true;
        }

        SaveFrom_Utils.video.yt.inited = true;
      },


      show: function(links, parent, showDownloadInfo, style, videoTitle)
      {
        style = style || {};

        var content = document.createElement('div');
        SaveFrom_Utils.setStyle(content, {
          display: 'inline-block',
          margin: '0 auto'
        });
        parent.appendChild(content);

        var box = document.createElement('div');
        SaveFrom_Utils.setStyle(box, {
          display: 'inline-block',
          padding: '0 90px 0 0',
          position: 'relative'
        });
        content.appendChild(box);

        var tbl = document.createElement('table');
        SaveFrom_Utils.setStyle(tbl, {
          emptyCells: 'show',
          borderCollapse: 'collapse',
          margin: '0 auto',
          padding: '0',
          width: 'auto'
        });
        box.appendChild(tbl);

        var hidden = false;

        for(var i in SaveFrom_Utils.video.yt.format)
        {
          if(SaveFrom_Utils.video.yt.append(links, i,
            SaveFrom_Utils.video.yt.format[i], tbl, style, videoTitle))
          {
            hidden = true;
          }
        }

        for(var i in links)
        {
          if (i === 'ummy' || i === 'ummyAudio' || i === 'meta') {
            continue;
          }
          if(SaveFrom_Utils.video.yt.append(links, '', null, tbl, style, videoTitle))
          {
            hidden = true;
          }

          break;
        }

        if (!tbl.firstChild) {
          parent.textContent = mono.global.language.noLinksFound;
          return;
        }

        if(!hidden)
          return;

        var more = document.createElement('span');
        more.textContent = mono.global.language.more + ' ' + String.fromCharCode(187);
        SaveFrom_Utils.setStyle(more, {
          color: '#555',
          border: '1px solid #a0a0a0',
          borderRadius: '3px',
          display: 'block',
          fontFamily: 'Arial',
          fontSize: '15px',
          lineHeight: '17px',
          padding: '1px 5px',
          position: 'absolute',
          bottom: '3px',
          right: '0',
          cursor: 'pointer'
        });

        if(style.btn && typeof(style.btn) == 'object')
          SaveFrom_Utils.setStyle(more, style.btn);

        box.appendChild(more);

        more.addEventListener('click', function(event){
          event.preventDefault();
          event.stopPropagation();

          var e = parent.querySelectorAll('*[' + SaveFrom_Utils.video.dataAttr + ']');
          for(var i = 0; i < e.length; i++)
          {
            var visible = e[i].getAttribute(SaveFrom_Utils.video.dataAttr);
            var display = 'none', symbol = String.fromCharCode(187);
            if(visible == '0')
            {
              visible = '1';
              display = '';
              symbol = String.fromCharCode(171);
            }
            else
              visible = '0';

            e[i].style.display = display;
            e[i].setAttribute(SaveFrom_Utils.video.dataAttr, visible);
            this.textContent = mono.global.language.more + ' ' + symbol;
          }

          return false;
        }, false);


        if(showDownloadInfo === 1)
        {
          var color = '#a0a0a0', a = tbl.querySelector('td a');

          content.appendChild(document.createElement('br'));
          SaveFrom_Utils.appendDownloadInfo(content, color, null, {
            width: '16px',
            height: '16px',
            fontSize: '16px',
            lineHeight: '16px'
          });
        }
      },


      append: function(links, title, format, parent, style, videoTitle)
      {
        var hidden = false;

        var aStyle = {
          whiteSpace: 'nowrap'
        };

        var sStyle = {
          fontSize: '75%',
          fontWeight: 'normal',
          marginLeft: '3px',
          whiteSpace: 'nowrap'
        };

        var tr = document.createElement('tr');

        var td = document.createElement('td');
        td.appendChild(document.createTextNode(title ? title : '???'));

        if(!title || !SaveFrom_Utils.video.yt.showFormat[title])
        {
          tr.setAttribute(SaveFrom_Utils.video.dataAttr, '0');
          tr.style.display = 'none';
          hidden = true;
        }

        SaveFrom_Utils.setStyle(td, {
          border: 'none',
          padding: '3px 15px 3px 0',
          textAlign: 'left',
          verticalAlign: 'middle'
        });

        tr.appendChild(td);

        td = document.createElement('td');
        SaveFrom_Utils.setStyle(td, {
          border: 'none',
          padding: '3px 0',
          textAlign: 'left',
          verticalAlign: 'middle',
          lineHeight: '17px'
        });
        tr.appendChild(td);

        var meta = links.meta || {};

        var sep = false;
        if(format)
        {
          for(var i in format)
          {
            if(links[i])
            {
              var quality = format[i].quality;
              if(sep)
              {
                td.lastChild.style.marginRight = '15px';
                td.appendChild(document.createTextNode(' '));
              }

              var span = document.createElement('span');
              span.style.whiteSpace = 'nowrap';

              var a = document.createElement('a');
              a.href = links[i];
              a.title = mono.global.language.downloadTitle;

              if (meta[i]) {
                if (meta[i].quality) {
                  quality = meta[i].quality;
                }

                if (format[i].sFps) {
                  quality += ' ' + (meta[i].fps || 60);
                }
              }

              if (format[i]['3d']) {
                a.textContent = '3D';
              } else {
                a.textContent = quality;
              }
              if(videoTitle)
              {
                var ext = format[i]['ext'];
                if(!ext)
                  ext = title.toLowerCase();

                a.setAttribute('download', mono.fileName.modify(videoTitle + '.' + ext) );

                if(format[i].noVideo || format[i].noAudio)
                {
                  a.addEventListener('click', function(event){
                    SaveFrom_Utils.downloadOnClick(event, null, {
                      useFrame: true
                    });
                  }, false);
                }
              }
              SaveFrom_Utils.setStyle(a, aStyle);
              if(style.link && typeof(style.link) == 'object')
                SaveFrom_Utils.setStyle(a, style.link);

              span.appendChild(a);
              SaveFrom_Utils.appendFileSizeIcon(a, style.fsIcon, style.fsText);

              if(format[i]['3d'])
              {
                if(!SaveFrom_Utils.video.yt.show3D)
                {
                  hidden = true;
                  span.setAttribute(SaveFrom_Utils.video.dataAttr, '0');
                  span.style.display = 'none';
                }

                var s = document.createElement('span');
                s.textContent = quality;
                SaveFrom_Utils.setStyle(s, sStyle);
                if(style.text && typeof(style.text) == 'object')
                  SaveFrom_Utils.setStyle(s, style.text);

                a.appendChild(s);
              }

              if(format[i]['noAudio'])
              {
                if(!SaveFrom_Utils.video.yt.showMP4NoAudio)
                {
                  hidden = true;
                  span.setAttribute(SaveFrom_Utils.video.dataAttr, '0');
                  span.style.display = 'none';
                }

                SaveFrom_Utils.appendNoSoundIcon(a, style ? style.noSoundIcon : false);
              }

              td.appendChild(span);

              sep = true;

              delete links[i];
            }
          }
        }
        else
        {
          for(var i in links)
          {
            if(sep)
            {
              td.lastChild.style.marginRight = '15px';
              td.appendChild(document.createTextNode(' '));
            }

            var span = document.createElement('span');
            span.style.whiteSpace = 'nowrap';

            var a = document.createElement('a');
            a.href = links[i];
            a.title = mono.global.language.downloadTitle;
            a.textContent = i;
            SaveFrom_Utils.setStyle(a, aStyle);
            if(style.link && typeof(style.link) == 'object')
              SaveFrom_Utils.setStyle(a, style.link);

            span.appendChild(a);
            SaveFrom_Utils.appendFileSizeIcon(a, style.fsIcon, style.fsText);
            td.appendChild(span);

            sep = true;

            delete links[i];
          }
        }

        if (sep === false) {
          return;
        }
        parent.appendChild(tr);

        return hidden;
      }
    }
    /*@if isVkOnly=0<*/
  }, // video


  playlist: {
    btnStyle: {
      display: 'block',
      fontWeight: 'bold',
      border: 'none',
      textDecoration: 'underline'
    },


    getFilelistHtml: function(links)
    {
      if(!links || links.length == 0)
        return;

      var rows = 0;
      var list = '';

      for(var i = 0; i < links.length; i++)
      {
        if(links[i].url)
        {
          list += links[i].url + '\r\n';
          rows++;
        }
      }

      if(list)
      {
        if(rows < 5) {
          rows = 5;
        } else
        if(rows > 14) {
          rows = 14;
        }

        return mono.create(document.createDocumentFragment(), {
          append: [
            mono.create('p', {
              text: mono.global.language.filelistTitle,
              style: {
                color: '#0D0D0D',
                fontSize: '20px',
                marginBottom: '11px',
                marginTop: '5px'
              }
            }),
            mono.create('p', {
              style: {
                marginBottom: '11px'
              },
              append: mono.parseTemplate(mono.global.language.filelistInstruction)
            }),
            mono.create('p', {
              text: mono.global.language.vkFoundFiles.replace('%d', links.length),
              style: {
                color: '#000',
                marginBottom: '11px'
              },
              append: mono.create('a', {
                text: mono.global.language.playlist,
                href: '#',
                class: 'sf__playlist',
                style: {
                  display: 'none',
                  cssFloat: 'right'
                }
              })
            }),
            mono.create('textarea', {
              text: list,
              rows: rows,
              cols: 60,
              style: {
                width: '100%',
                whiteSpace: (mono.isFF || (mono.isGM && !mono.isTM && !mono.isVM)) ? 'normal' : 'nowrap'
              }
            }),
            (!mono.isChrome && !mono.isFF)? undefined : mono.create('button', {
              text: mono.global.language.copy,
              style: {
                height: '27px',
                backgroundColor: '#ffffff',
                border: '1px solid #9e9e9e',
                marginTop: '6px',
                paddingLeft: '10px',
                paddingRight: '10px',
                borderRadius: '5px',
                fontSize: '14px',
                cursor: 'pointer',
                cssFloat: 'right'
              },
              on: ['click', function(e) {
                var _this = this;
                _this.disabled = true;
                mono.sendMessage({action: 'addToClipboard', text: list});
                setTimeout(function() {
                  _this.disabled = false;
                }, 1000);
              }],
              append: mono.create('style', {
                text: '#savefrom_popup_box button:hover:not(:disabled){' +
                  'background-color: #597A9E !important;' +
                  'border-color: #597A9E !important;' +
                  'color: #fff;' +
                  '}' +
                  '#savefrom_popup_box button:active{' +
                  'opacity: 0.9;' +
                  '}'
              })
            })
          ]
        });
      }
    },


    popupFilelist: function(links, title, playlist, id)
    {
      var content = SaveFrom_Utils.playlist.getFilelistHtml(links);
      if(!content)
        return;

      var popup = SaveFrom_Utils.popupDiv(content, id);
      if(playlist)
      {
        var a = popup.querySelector('a.sf__playlist');
        if(a)
        {
          a.addEventListener('click', function(event){
            setTimeout(function(){
              SaveFrom_Utils.playlist.popupPlaylist(links, title, true, id);
            }, 100);
            event.preventDefault();
            return false;
          }, false);

          SaveFrom_Utils.setStyle(a, SaveFrom_Utils.playlist.btnStyle);
        }
      }
    },

    getInfoPopupTemplate: function() {
      var popupContainer = mono.create('div', {
        class: 'sf-infoPopupTemplate',
        style: {
          width: '400px',
          minHeight: '40px'
        }
      });

      var mediaIcon = mono.create('div', {
        style: {
          backgroundSize: '48px',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center top',
          display: 'inline-block',
          width: '60px',
          height: '60px',
          cssFloat: 'left',
          marginTop: '16px',
          marginRight: '10px'
        }
      });

      var textContent = mono.create('div', {
        style: {
          display: 'inline-block',
          width: '330px'
        }
      });

      var buttonWrap = mono.create('div', {
        style: {
          textAlign: 'right'
        },
        append: mono.create('style', {
          text: '.sf-infoPopupTemplate a.sf-button {' +
            'padding: 1px 6px;' +
            'display: inline-block;' +
            'text-align: center;' +
            'height: 23px;' +
            'line-height: 23px;' +
            'text-decoration: none;' +
            '}' +
            '.sf-infoPopupTemplate button:hover,' +
            '.sf-infoPopupTemplate a.sf-button:hover{' +
            'background-color: #597A9E !important;' +
            'border-color: #597A9E !important;' +
            'color: #fff;' +
            '}'
        })
      });

      popupContainer.appendChild(mediaIcon);
      popupContainer.appendChild(textContent);
      popupContainer.appendChild(buttonWrap);
      return {
        icon: mediaIcon,
        buttonContainer: buttonWrap,
        textContainer: textContent,
        body: popupContainer
      }
    },

    getM3U: function(links)
    {
      var text = '#EXTM3U\r\n';

      for(var i = 0; i < links.length; i++)
      {
        if(!links[i].duration)
          links[i].duration = '-1';

        if(links[i].title || links[i].duration)
        {
          text += '#EXTINF:' + links[i].duration + ',' +
            links[i].title + '\r\n';
        }

        text += links[i].url + '\r\n';
      }

      return text;
    },


    getPlaylistHtml: function(links, fileTitle)
    {
      if(!links || links.length == 0)
        return;

      var links_len = links.length;

      var d = SaveFrom_Utils.dateToObj();
      var dateStr = d.year + '-' + d.month + '-' + d.day + ' ' +
        d.hour + '-' + d.min;

      // M3U
      var m3uList = SaveFrom_Utils.playlist.getM3U(links);
      m3uList = m3uList.replace(/\r\n/g, '\n');

      var m3uUrl;
      if (typeof URL !== 'undefined' && typeof Blob !== "undefined" && !mono.isSafari) {
        var m3uBlob = new Blob([m3uList], {encoding: "UTF-8", type: 'audio/x-mpegurl'});
        m3uUrl = URL.createObjectURL(m3uBlob);
      } else {
        var m3uUTF8 = SaveFrom_Utils.utf8Encode(m3uList);
        m3uUrl = 'data:audio/x-mpegurl;charset=utf-8;base64,' + encodeURIComponent(btoa(m3uUTF8))
      }

      var template = SaveFrom_Utils.playlist.getInfoPopupTemplate();

      mono.sendMessage({action: 'getWarningIcon', color: '#00CCFF', type: 'playlist'}, function(icon) {
        template.icon.style.backgroundImage = 'url('+icon+')';
      });

      mono.create(template.textContainer, {
        append: [
          mono.create('p', {
            text: fileTitle || mono.global.language.playlistTitle,
            style: {
              color: '#0D0D0D',
              fontSize: '20px',
              marginBottom: '11px',
              marginTop: '13px'
            }
          }),
          mono.create('p', {
            text: mono.global.language.playlistInstruction,
            style: {
              color: '#868686',
              fontSize: '14px',
              marginBottom: '13px',
              lineHeight: '24px',
              marginTop: '0px'
            }
          }),
          mono.create('a', {
            text: mono.global.language.filelist + ' ('+links_len+')',
            href: '#',
            class: 'sf__playlist',
            style: {
              display: 'none',
              fontSize: '14px',
              marginBottom: '13px',
              lineHeight: '24px',
              marginTop: '0px'
            }
          })
        ]
      });

      if(!fileTitle) {
        fileTitle = 'playlist';
      }
      fileTitle += ' ' + dateStr;

      mono.create(template.buttonContainer, {
        append: [
          mono.create('a', {
            text:  mono.global.language.download,
            href: m3uUrl,
            download: mono.fileName.modify(fileTitle + '.m3u'),
            class: 'sf-button',
            style: {
              width: '118px',
              backgroundColor: '#ffffff',
              border: '1px solid #9e9e9e',
              margin: '12px',
              marginBottom: '11px',
              marginRight: '8px',
              borderRadius: '5px',
              fontSize: '14px',
              cursor: 'pointer'
            }
          })
        ]
      });

      return template.body;
    },


    popupPlaylist: function(links, title, filelist, id)
    {
      var content = SaveFrom_Utils.playlist.getPlaylistHtml(links, title);
      if(!content)
        return;

      var popup = SaveFrom_Utils.popupDiv(content, id);
      if(filelist)
      {
        var a = popup.querySelector('a.sf__playlist');
        if(a)
        {
          a.addEventListener('click', function(event){
            setTimeout(function(){
              SaveFrom_Utils.playlist.popupFilelist(links, title, true, id);
            }, 100);
            event.preventDefault();
            return false;
          }, false);

          a.style.display = 'inline';
          a = null;
        }
      }
      var dl_links = popup.querySelectorAll('a[download]');
      for (var i = 0, el; el = dl_links[i]; i++) {
        el.addEventListener('click', SaveFrom_Utils.downloadOnClick, false);
      }
    }
  },

  popupCloseBtn: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAWUlEQVQ4y2NgGHHAH4j1sYjrQ+WIAvFA/B+I36MZpg8V+w9VQ9Al/5EwzDBkQ2AYr8uwaXiPQ0yfkKuwGUayIYQMI8kQqhlEFa9RLbCpFv1US5BUzSLDBAAARN9OlWGGF8kAAAAASUVORK5CYII=',

  popupDiv: function(content, id, maxWidth, maxHeight, onClose)
  {
    if(!id) {
      id = 'savefrom_popup_box';
    }

    if(!maxWidth)
      maxWidth = 580;

    if(!maxHeight)
      maxHeight = 520;

    var popupBody = document.getElementById(id);
    if(popupBody) {
      popupBody.parentNode.removeChild(popupBody);
    }

    popupBody = mono.create('div', {
      id: id,
      style: {
        zIndex: '9999',
        display: 'block',
        cssFloat: 'none',
        position: 'fixed',
        margin: '0',
        padding: '0',
        visibility: 'hidden',
        color: '#000',
        background: '#fff',
        border: '3px solid #c0cad5',
        borderRadius: '7px',
        overflow: 'auto'
      }
    });


    var cnt = mono.create('div', {
      style: {
        display: 'block',
        cssFloat: 'none',
        position: 'relative',
        overflow: 'auto',
        margin: '0',
        padding: '10px 15px'
      }
    });

    if (typeof content === 'function') {
      content(cnt);
    } else {
      cnt.appendChild(content);
    }

    var btn = mono.create('img', {
      src: SaveFrom_Utils.popupCloseBtn,
      alt: 'x',
      width: 18,
      height: 18,
      style: {
        position: 'absolute',
        top: '10px',
        right: '15px',
        opacity: '0.5',
        cursor: 'pointer'
      },
      on: [
        ['mouseenter', function() {
          "use strict";
          this.style.opacity = '0.9';
        }],
        ['mouseleave', function() {
          "use strict";
          this.style.opacity = '0.5';
        }],
        ['click', function() {
          "use strict";
          if (popupBody.parentNode) {
            popupBody.parentNode.removeChild(popupBody);
          }
          if (onClose) {
            onClose();
          }
          return false;
        }]
      ]
    });

    cnt.appendChild(btn);
    popupBody.appendChild(cnt);
    document.body.appendChild(popupBody);

    if(popupBody.offsetWidth > maxWidth) {
      popupBody.style.width = maxWidth + 'px';
    }

    if(popupBody.offsetHeight > maxHeight) {
      popupBody.style.height = maxHeight + 'px';
      popupBody.style.width = (maxWidth + 20) + 'px';
    }

    setTimeout(function() {
      var l = Math.floor((window.innerWidth - popupBody.offsetWidth) / 2.0);
      var t = Math.floor((window.innerHeight - popupBody.offsetHeight) / 2.0);
      if (t < 0) {
        t = 0;
      }
      if (location.host.indexOf('youtu') !== -1 && t < 50) {
        t = 50;
        popupBody.style.height = (popupBody.offsetHeight - t - 10) + 'px';
      }
      if (l < 0) {
        l = 0;
      }
      SaveFrom_Utils.setStyle(popupBody, {
        top: t + 'px',
        left: l + 'px',
        visibility: 'visible'
      });
    });

    var onDocClose = function(event){
      var node = event.target;
      if(node !== popupBody && !SaveFrom_Utils.isParent(node, popupBody))
      {
        if(popupBody.parentNode){
          popupBody.parentNode.removeChild(popupBody);
        }
        document.removeEventListener('click', onDocClose, false);
        if (onClose) {
          onClose();
        }
      }
    };

    setTimeout(function() {
      document.addEventListener('click', onDocClose, false);
    }, 100);

    popupBody.addEventListener('close', function() {
      if(popupBody.parentNode){
        popupBody.parentNode.removeChild(popupBody);
      }
      document.removeEventListener('click', onDocClose, false);
      if (onClose) {
        onClose();
      }
    });

    popupBody.addEventListener('kill', function() {
      if(popupBody.parentNode){
        popupBody.parentNode.removeChild(popupBody);
      }
      document.removeEventListener('click', onDocClose, false);
    });

    return popupBody;
  },

  popupDiv2: function(_details) {
    "use strict";
    var details = {
      id: 'savefrom_popup_box',
      containerStyle: null,
      bodyStyle: null,
      content: null,
      container: null,
      body: null
    };

    details._onClose = function() {
      document.removeEventListener('click', details._onClose);

      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }

      details.onClose && details.onClose();
    };

    mono.extend(details, _details);

    var container = details.container = mono.create('div', {
      id: details.id,
      style: {
        zIndex: 9999,
        display: 'block',
        position: 'fixed',
        background: '#fff',
        border: '3px solid #c0cad5',
        borderRadius: '7px'
      },
      append: [
        mono.create('style', {
          text: mono.style2Text({
            selector: '#' + details.id,
            style: mono.styleReset
          })
        })
      ],
      on: [
        ['click', function(e) {
          e.stopPropagation();
        }]
      ]
    });

    var closeBtn = mono.create('img', {
      src: SaveFrom_Utils.popupCloseBtn,
      alt: 'x',
      width: 18,
      height: 18,
      style: {
        position: 'absolute',
        top: '10px',
        right: '15px',
        opacity: '0.5',
        cursor: 'pointer'
      },
      on: [
        ['mouseenter', function() {
          "use strict";
          this.style.opacity = '0.9';
        }],
        ['mouseleave', function() {
          "use strict";
          this.style.opacity = '0.5';
        }],
        ['click', details._onClose]
      ]
    });

    container.appendChild(closeBtn);

    var body = details.body = mono.create('div', {
      style: mono.extendPos({
        display: 'block',
        position: 'relative',
        padding: '10px 15px',
        overflow: 'auto'
      }, details.bodyStyle)
    });

    if (typeof details.content === 'function') {
      details.content(body);
    } else {
      body.appendChild(details.content);
    }

    container.appendChild(body);

    document.body.appendChild(container);
    document.addEventListener('click', details._onClose);

    return details;
  },

  /*@if isVkOnly=0>*/
  // row - used for hide tooltip on mouseout
  // because node can dissaper from DOM before mouseout raised
  showTooltip: function(node, text, row, style)
  {
    if(!node)
      return;

    var tooltip = document.querySelector('.savefrom-tooltip');
    if(!tooltip)
    {
      tooltip = document.createElement('div');
      tooltip.className = 'savefrom-tooltip';
      SaveFrom_Utils.setStyle(tooltip, {
        'position': 'absolute',
        'opacity': 0,
        'zIndex': -1
      });
      if (style) {
        SaveFrom_Utils.setStyle(tooltip, style);
      }
    }

    tooltip.textContent = text;

    if(tooltip.lastNode && tooltip.lastNode === node)
    {
      fixPosition();
      return;
    }

    if(tooltip.lastNode)
    {
      mono.off(tooltip.lastNode, 'mouseleave', hide);
      mono.off(tooltip.lastNode, 'mousemove', fixPosition);
      tooltip.lastRow && mono.off(tooltip.lastRow, 'mouseleave', hide);
    }

    tooltip.lastNode = node;
    row && (tooltip.lastRow = row);

    mono.on(node, 'mouseleave', hide);
    mono.on(node, 'mousemove', fixPosition, false);
    row && mono.on(row, 'mouseleave', hide);

    document.body.appendChild(tooltip);
    fixPosition();

    function fixPosition(e) {
      if (e !== undefined) {
        e.stopPropagation();
      }
      var p = SaveFrom_Utils.getPosition(node),
        s = SaveFrom_Utils.getSize(tooltip);

      if(p.top == 0 && p.left == 0)
        return;

      p.top = p.top - s.height - 10;
      p.left = p.left - s.width / 2 + SaveFrom_Utils.getSize(node).width / 2;

      p.left = Math.min(p.left, document.body.clientWidth + document.body.scrollLeft - s.width);
      if(p.top < document.body.scrollTop)
        p.top = p.top + s.height + SaveFrom_Utils.getSize(node).height + 20;

      p.top += 'px';
      p.left += 'px';

      // show
      p.zIndex = 9999;
      p.opacity = 1;

      SaveFrom_Utils.setStyle(tooltip, p);
    }

    function hide() {
      if(tooltip.parentNode)
        document.body.removeChild(tooltip);

      tooltip.lastNode = null;
      tooltip.lastRow = null;
      SaveFrom_Utils.setStyle(tooltip, {
        zIndex: -1,
        opacity: 0
      });
      mono.off(node, 'mouseleave', hide);
      mono.off(node, 'mousemove', fixPosition);
      row && mono.off(row, 'mouseleave', hide);
    }
  },
  /*@if isVkOnly=0<*/

  embedDownloader: {
    dataAttr: 'data-savefrom-get-links',
    dataIdAttr: 'data-savefrom-container-id',
    containerClass: 'savefrom-links-container',
    linkClass: 'savefrom-link',
    panel: null,
    lastLink: null,
    style: null,

    hostings: {
      /*@if isVkOnly=0>*/
      'youtube': {
        re: [
          /^https?:\/\/(?:[a-z]+\.)?youtube\.com\/(?:#!?\/)?watch\?.*v=([\w\-]+)/i,
          /^https?:\/\/(?:[a-z0-9]+\.)?youtube\.com\/(?:embed|v)\/([\w\-]+)/i,
          /^https?:\/\/(?:[a-z]+\.)?youtu\.be\/([\w\-]+)/i
        ],
        action: 'getYoutubeLinks',
        prepareLinks: function(links) {
          var ret = [];
          var sfUtilsYt = SaveFrom_Utils.video.yt;
          var format = sfUtilsYt.format;

          var meta = links.meta || {};

          for(var formatName in format)
          {
            for(var iTag in format[formatName])
            {
              var metaTag = meta[iTag] || {};
              if(links[iTag]) {
                var type = formatName;
                if(format[formatName][iTag].ext) {
                  type = format[formatName][iTag].ext;
                }

                var quality = format[formatName][iTag].quality;
                if (metaTag.quality) {
                  quality = metaTag.quality;
                }

                if (format[formatName][iTag].sFps) {
                  quality += ' ' + (metaTag.fps || 60);
                }

                if (format[formatName][iTag]['3d']) {
                  quality += ' (3d)';
                }

                ret.push({
                  name: formatName + ' ' + quality,
                  type: type,
                  url: links[iTag],
                  noSound: format[formatName][iTag].noAudio
                });
              }
            }
          }

          return ret;
        }
      },
      'vimeo': {
        re: [
          /^https?:\/\/(?:[\w\-]+\.)?vimeo\.com\/(?:\w+\#)?(\d+)/i,
          /^https?:\/\/player\.vimeo\.com\/video\/(\d+)/i,
          /^https?:\/\/(?:[\w\-]+\.)?vimeo\.com\/channels\/(?:[^\/]+)\/(\d+)$/i,
          /^https?:\/\/vimeo\.com\/(?:.+)clip_id=(\d+)/i
        ],
        action: 'getVimeoLinks',
        prepareLinks: function(links) {
          return links.map(function(link) {
            var ext = link.ext;
            if(!ext)
            {
              ext = 'MP4';
              if(link.url.search(/\.flv($|\?)/i) != -1)
                ext = 'FLV';
            }

            link.name = link.name ? link.name : ext;
            link.type = link.type ? link.type : ext;
            link.ext = ext;

            return link;
          });
        }
      },
      /*@if isVkOnly=0<*/

      'vk': {
        re: [
          /^https?:\/\/(?:[\w\-]+\.)?(?:vk\.com|vkontakte\.ru)\/(?:[^\/]+\/)*(?:[\w\-\.]+\?.*z=)?(video-?\d+_-?\d+\?list=[0-9a-z]+|video-?\d+_-?\d+)/i,
          /^https?:\/\/(?:[\w\-]+\.)?(?:vk\.com|vkontakte\.ru)\/video_ext\.php\?(.+)/i
        ],
        action: 'getVKLinks'
      },

      /*@if isVkOnly=0>*/
      'dailymotion': {
        re: [
          /^http:\/\/(?:www\.)?dai\.ly\/([a-z0-9]+)_?/i,
          /^https?:\/\/(?:[\w]+\.)?dailymotion\.com(?:\/embed|\/swf)?\/video\/([a-z0-9]+)_?/i
        ],
        action: 'getDailymotionLinks'
      },

      'facebook': {
        re: [
          /^https?:\/\/(?:[\w]+\.)?facebook\.com(?:\/video)?\/video.php.*[?&]{1}v=([0-9]+).*/i,
          /^https?:\/\/(?:[\w]+\.)?facebook\.com\/.+\/videos(?:\/\w[^\/]+)?\/(\d+)/i
        ],
        action: 'getFacebookLinks'
      }
      /*@if isVkOnly=0<*/
    },


    init: function(style)
    {
      this.style = style;

      if(this.panel) {
        SaveFrom_Utils.popupMenu.removePanel();
      }

      this.panel = null;
      this.lastLink = null;

      var links = document.querySelectorAll('a[' + this.dataAttr + ']'),
        i, l = links.length;

      for(i = 0; i < l; i++)
      {
        if(['savefrom.net', 'sf-addon.com'].indexOf(
          SaveFrom_Utils.getTopLevelDomain(links[i].hostname)) > -1)
        {
          links[i].removeEventListener('click', this.onClick, false);
          links[i].addEventListener('click', this.onClick, false);
        }
      }

      // hide menu on click outside them
      // process dinamically added links
      if (document.body) {
        document.body.removeEventListener('click', this.onBodyClick, true);
        document.body.addEventListener('click', this.onBodyClick, true);
      }
    },


    checkUrl: function(url) {
      for(var hosting in this.hostings) {
        var params = this.hostings[hosting];

        for(var i = 0, len = params.re.length; i < len; i++) {
          var match = url.match(params.re[i]);
          if(match) {
            return {
              hosting: hosting,
              action: params.action,
              extVideoId: match[1]
            };
          }
        }
      }

      return null;
    },

    reMapHosting: function(action) {
      var map = {
        /*@if isVkOnly=0>*/
        'getYoutubeLinks': 'youtube',
        'getVimeoLinks': 'vimeo',
        'getDailymotionLinks': 'dailymotion',
        'getFacebookLinks': 'facebook'
        /*@if isVkOnly=0<*/
      };

      return map[action];
    },


    onClick: function(event, a)
    {
      var _this = SaveFrom_Utils.embedDownloader;

      if(!a)
      {
        a = event.target;
        while(a.parentNode) {
          if(a.nodeName === 'A')
            break;
          a = a.parentNode;
        }

        if(!a)
          return;
      }

      var href = a.getAttribute('data-savefrom-get-links');
      if(!href)
        return;

      if(event.button !== 0 || event.ctrlKey || event.shiftKey)
        return;

      if(_this.lastLink === a && _this.panel && _this.panel.style.display != 'none')
      {
        _this.lastLink = null;
        _this.panel.style.display = 'none';

        event.preventDefault();
        event.stopPropagation();
        return;
      }

      _this.lastLink = a;
      var data = _this.checkUrl(href);
      if(!data)
        return;

      event.preventDefault();
      event.stopPropagation();

      var request = {
        action: data.action,
        extVideoId: data.extVideoId
      };

      _this.showLinks(mono.global.language.download + ' ...', null, a);

      mono.sendMessage(request, function(response) {
        var hosting = data.hosting;

        if(response.action != request.action)
        {
          hosting = _this.reMapHosting(response.action);
        }

        if(response.links)
          _this.showLinks(response.links, response.title, a, hosting, true);
        else
          _this.showLinks(mono.global.language.noLinksFound, null, a, undefined, true);
      });

      return false;
    },


    onBodyClick: function(event)
    {
      var _this = SaveFrom_Utils.embedDownloader;

      var node = event.target;

      if(!_this.panel || _this.panel.style.display == 'none')
      {
        if (node.tagName !== 'A' && mono.matches(node, 'A ' + node.tagName)) {
          while(node.parentNode) {
            if(node.tagName === 'A') {
              break;
            }
            node = node.parentNode;
          }
        }

        if (node.nodeName !== 'A') {
          return;
        }

        // dinamic links
        if(node.hasAttribute(_this.dataAttr) &&
          ['savefrom.net', 'sf-addon.com'].indexOf(SaveFrom_Utils.getTopLevelDomain(node.hostname)) > -1)
        {
          return _this.onClick(event, node);
        }

        return;
      }

      if (_this.panel === node || _this.panel.contains(node)) {
        return;
      }

      _this.lastLink = null;
      _this.panel.style.display = 'none';

      event.preventDefault();
      event.stopPropagation();
    },

    hidePanel: function()
    {
      if (this.panel) {
        this.panel.style.display = 'none';
      }
    },

    createMenu: function(links, title, a, hname, update) {
      var menuLinks = mono.global.language.noLinksFound;
      if (typeof links === 'string') {
        menuLinks = links;
      } else
      if (SaveFrom_Utils.popupMenu.prepareLinks[hname] !== undefined && links) {
        menuLinks = SaveFrom_Utils.popupMenu.prepareLinks[hname](links, title, SaveFrom_Utils);
      }
      var options = {
        links: menuLinks,
        button: a,
        popupId: undefined,
        showFileSize: true,
        containerClass: this.containerClass,
        linkClass: this.linkClass,
        style: {
          popup: (this.style)?this.style.container:undefined,
          item: (this.style)?this.style.link:undefined
        },
        isUpdate: update
      };
      if (update && this.panel) {
        SaveFrom_Utils.popupMenu.update(this.panel, options)
      } else {
        this.panel = SaveFrom_Utils.popupMenu.create(options);
      }
    },

    showLinks: function(links, title, a, hname, update)
    {
      var panel, id = a.getAttribute(this.dataIdAttr);
      if(id)
        panel = document.getElementById(id);

      if(!panel)
      {
        this.createMenu(links, title, a, hname, update);

        return;
      }
      else if(this.panel)
      {
        this.panel.style.display = 'none';
      }

      if(typeof(links) == 'string')
      {
        panel.textContent = links;
      }
      else if(!links || links.length == 0)
      {
        panel.textContent = mono.global.language.noLinksFound;
      }
      else
      {
        // append links
        if(hname && this.hostings[hname] && this.hostings[hname].prepareLinks)
          links = this.hostings[hname].prepareLinks(links);

        panel.textContent = '';

        for(var i = 0; i < links.length; i++)
        {
          if(links[i].url && links[i].name)
          {
            var a = document.createElement('a');
            a.href = links[i].url;
            a.title = mono.global.language.downloadTitle;
            a.appendChild(document.createTextNode(links[i].name));
            var span = document.createElement('span');
            span.className = this.linkClass;

            span.appendChild(a);
            panel.appendChild(span);

            SaveFrom_Utils.appendFileSizeIcon(a);
            if(links[i].noSound)
              SaveFrom_Utils.appendNoSoundIcon(a);

            if(title && !links[i].noTitle && links[i].type)
            {
              a.setAttribute('download', mono.fileName.modify(
                  title + '.' + links[i].type.toLowerCase()));

              a.addEventListener('click', SaveFrom_Utils.downloadOnClick, false);
            }
          }
        }
      }
    }
  },
  /*@if isVkOnly=0>*/
  createFrameUmmyInfo: function(params) {
    "use strict";
    params = params || {};
    if (!params.vid) {
      params.vid = 111;
    }

    var info;
    var infoContainer = mono.create('div', {
      class: 'sf-ummy-info-popup-container',
      style: {
        position: 'absolute',
        zIndex: 9999
      },
      append: [
        mono.create('span', {
          style: {
            display: 'inline-block',
            border: '10px solid transparent',
            borderTop: 0,
            borderBottomColor: 'rgba(0, 0, 0, 0.7)',
            width: 0,
            top: '0px',
            left: '110px',
            position: 'absolute'
          }
        }),
        info = mono.create('div', {
          class: 'sf-ummy-info-popup',
          style: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '6px 5px',
            textAlign: 'center',
            maxWidth: '240px',
            lineHeight: '16px',
            fontFamily: 'arial, sans-serif',
            fontSize: '12px',
            color: '#fff',
            cursor: 'default',
            marginTop: '10px'
          },
          append: [
            mono.parseTemplate(mono.global.language.ummyMenuInfo.replace('{url}', 'http://videodownloader.ummy.net/?'+mono.param(params))
            ),
            mono.create('label', {
              style: {
                verticalAlign: 'middle',
                display: 'block'
              },
              append: [
                mono.create('input', {
                  type: 'checkbox',
                  name: 'showUmmyInfo',
                  style: {
                    verticalAlign: 'middle'
                  }
                }),
                mono.global.language.tooltipHide
              ]
            }),
            mono.create('style', {
              text: '' +
              '.sf-ummy-info-popup > p > .green-btn-2.arrow {' +
              'color: #fff;' +
              'background: #84bd07;' +
              'border-radius: 5px;' +
              'display: inline-block;' +
              'position: relative;' +
              'line-height: 1;' +
              'padding: 8px 34px 8px 10px;' +
              'text-decoration: none;' +
              'font-size: 12px;' +
              '}' +
              '.sf-ummy-info-popup > p > .green-btn-2.arrow:hover {' +
              'color: #fff;' +
              'opacity: .8;' +
              '}' +
              '.sf-ummy-info-popup > p {' +
              'margin: 0 0 .8em 0;' +
              '}' +
              '.sf-ummy-info-popup > p.center {' +
              'text-align: center;' +
              '}' +
              '.sf-ummy-info-popup > p > .green-btn-2.arrow:after {' +
              'background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAOCAYAAAAmL5yKAAAAjklEQVQoke3RsRGCQBCF4YuJsQDoQMpjKMImtAjth9xMEj4DF4c5QDH3n7lk773b3XsJNzTpR9DglrwYcUG9w1iHdoTpgYkBJ5QrxkPcDXNDQm/JHR2KOF3UcvoUgnZL8KFBi2I+Yrk2YsZjsaIsBVQ4i08KxqhVu1OYBLji+E/hzTKFlV13pfAVGynkPAFtrlNTMRczMgAAAABJRU5ErkJggg==) 0 0 no-repeat;' +
              'content: "";' +
              'display: block;' +
              'position: absolute;' +
              'width: 16px;' +
              'height: 14px;' +
              'top: 50%;' +
              'right: 10px;' +
              'margin-top: -7px;' +
              '}'
            })
          ]
        })
      ],
      on: [
        ['mouseclick', function(e) {
          e.stopPropagation();
        }],
        ['mousedown', function(e) {
          e.stopPropagation();
        }]]
    });

    mono.sendMessage({action: 'getUmmyIcon'}, function(dataImg) {
      var icon = info.querySelector('img');
      if (!info) {
        return;
      }
      icon.src = dataImg;
      icon.style.verticalAlign = 'text-bottom';
    });

    return infoContainer;
  },
  /*@if isVkOnly=0<*/
  createUmmyInfo: function(params, details) {
    "use strict";
    details = details || {};
    params = params || {};
    if (!params.vid) {
      params.vid = 111;
    }

    var ummyUrl = 'http://videodownloader.ummy.net/?'+mono.param(params);
    if (/^Mac/.test(navigator.platform) && /^yt-/.test(params.video)) {
      ummyUrl = 'http://videodownloader.ummy.net/save-from-youtube.html?' + mono.param({
        vid: params.vid,
        video: params.video,
        utm_source: 'savefrom-helper',
        utm_medium: 'youtube-helper',
        utm_campaign: 'ummy',
        utm_content: 'ummy_integration_h'
      });
    }


    var themeShadowArrowDirStyle, themeArrowDirStyle, themeInfoPopup, themeLinkColor;

    var shadowArrowDirStyle, arrowDirStyle, containerDirArrow;
    if (details.posLeft) {
      shadowArrowDirStyle = {
        border: '8px solid transparent',
        borderLeft: '10px solid rgb(192, 187, 187)',
        borderRight: 0,
        top: '8px',
        right: '11px'
      };

      arrowDirStyle = mono.extend({}, shadowArrowDirStyle, {
        right: '12px',
        borderLeft: '10px solid #fff'
      });

      containerDirArrow = {
        right: '21px'
      };

      if (details.darkTheme) {
        themeShadowArrowDirStyle = {
          borderLeftColor: 'rgba(255, 255, 255, 0.4)'
        };

        themeArrowDirStyle = {
          borderLeftColor: 'rgba(28,28,28, 0.6)'
        };
      }
    } else {
      shadowArrowDirStyle = {
        border: '8px solid transparent',
        borderRight: '10px solid rgb(192, 187, 187)',
        borderLeft: 0,
        top: '8px',
        left: '11px'
      };

      arrowDirStyle = mono.extend({}, shadowArrowDirStyle, {
        left: '12px',
        borderRight: '10px solid #fff'
      });

      containerDirArrow = {
        left: '21px'
      };

      if (details.darkTheme) {
        themeShadowArrowDirStyle = {
          borderRightColor: '#fff'
        };

        themeArrowDirStyle = {
          borderRightColor: '#000'
        };
      }
    }

    if (details.darkTheme) {
      themeLinkColor = {
        'a': {
          color: '#eee'
        }
      };
    } else {
      themeLinkColor = {};
    }

    if (details.darkTheme) {
      themeInfoPopup = {
        backgroundColor: 'rgba(28,28,28,0.8)',
        border: '1px solid rgba(255, 255, 255, 0.4)'
      };
    } else {
      themeInfoPopup = {
        backgroundColor: '#fff',
        border: '1px solid #ccc'
      };
    }


    var arrow = mono.create(document.createDocumentFragment(), {
      append: [
        mono.create('span', {
          style: mono.extend({
            display: 'inline-block',
            width: 0,
            position: 'absolute'
          }, shadowArrowDirStyle, themeShadowArrowDirStyle)
        }),
        mono.create('span', {
          style: mono.extend({
            display: 'inline-block',
            width: 0,
            position: 'absolute',
            zIndex: 1
          }, arrowDirStyle, themeArrowDirStyle)
        })
      ]
    });

    var info = null;
    var infoContainer = mono.create('div', {
      class: 'sf-ummy-info-popup-container',
      style: {
        position: 'absolute',
        zIndex: 9999
      },
      append: [
        arrow,
        info = mono.create('div', {
          class: 'sf-ummy-info-popup',
          style: mono.extend({
            position: 'relative',
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            padding: '6px 5px',
            textAlign: 'center',
            maxWidth: '240px',
            lineHeight: '16px',
            fontSize: '12px',
            fontFamily: 'arial, sans-serif',
            cursor: 'default'
          }, containerDirArrow, themeInfoPopup),
          append: [
            mono.parseTemplate(mono.global.language.ummyMenuInfo.replace(
              '{url}', ummyUrl
            )),
            mono.create('label', {
              style: {
                verticalAlign: 'middle',
                display: 'block'
              },
              append: [
                mono.create('input', {
                  type: 'checkbox',
                  name: 'showUmmyInfo',
                  style: {
                    verticalAlign: 'middle'
                  }
                }),
                mono.global.language.tooltipHide
              ]
            }),
            mono.create('style', {
              text: mono.styleObjToText(mono.extend({
                '> p > .green-btn-2.arrow': {
                  color: '#fff',
                  background: '#84bd07',
                  borderRadius: '5px',
                  display: 'inline-block',
                  position: 'relative',
                  lineHeight: 1,
                  padding: '8px 34px 8px 10px',
                  textDecoration: 'none',
                  fontSize: '12px'
                },
                '> p > .green-btn-2.arrow:hover': {
                  color: '#fff',
                  opacity: 0.8
                },
                '> p': {
                  margin: '0 0 .8em 0'
                },
                '> p.center': {
                  textAlign: 'center'
                },
                '> p > .green-btn-2.arrow:after': {
                  background: 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAOCAYAAAAmL5yKAAAAjklEQVQoke3RsRGCQBCF4YuJsQDoQMpjKMImtAjth9xMEj4DF4c5QDH3n7lk773b3XsJNzTpR9DglrwYcUG9w1iHdoTpgYkBJ5QrxkPcDXNDQm/JHR2KOF3UcvoUgnZL8KFBi2I+Yrk2YsZjsaIsBVQ4i08KxqhVu1OYBLji+E/hzTKFlV13pfAVGynkPAFtrlNTMRczMgAAAABJRU5ErkJggg==) 0 0 no-repeat',
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  width: '16px',
                  height: '14px',
                  top: '50%',
                  right: '10px',
                  marginTop: '-7px'
                }
              }, themeLinkColor), '.sf-ummy-info-popup')
            })
          ]
        })
      ],
      on: [
        ['mouseclick', function(e) {
          e.stopPropagation();
        }],
        ['mousedown', function(e) {
          e.stopPropagation();
        }]]
    });

    mono.sendMessage({action: 'getUmmyIcon'}, function(dataImg) {
      var icon = info.querySelector('img');
      if (!icon) {
        return;
      }
      icon.src = dataImg;
      icon.style.verticalAlign = 'text-bottom';
    });

    return infoContainer;
  },
  /*@if isVkOnly=0>*/
  bindFrameUmmyInfo: function(container, params) {
    "use strict";
    // rutube
    if (!mono.global.preference.showUmmyInfo) {
      return;
    }

    var infoPopup;
    var infoPopupShowTimer;
    var popupArrow;
    var size;

    var onMouseLeave = function() {
      clearTimeout(infoPopupShowTimer);
      infoPopupShowTimer = setTimeout(function() {
        if (infoPopup && infoPopup.parentNode) {
          infoPopup.parentNode.removeChild(infoPopup);
        }
      }, 100);
    };

    var onMouseEnter = function() {
      if (!mono.global.preference.showUmmyInfo) {
        return;
      }

      clearTimeout(infoPopupShowTimer);
      var position = SaveFrom_Utils.getPosition(this);

      if (!infoPopup) {
        infoPopup = SaveFrom_Utils.createFrameUmmyInfo(params);
        var showUmmyInfo = infoPopup.querySelector('input[name="showUmmyInfo"]');
        if (showUmmyInfo) {
          showUmmyInfo.checked = !mono.global.preference.showUmmyInfo;
          showUmmyInfo.addEventListener('change', function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (this.checked) {
              mono.off(container, 'mouseenter', onMouseEnter);
              mono.global.preference.showUmmyInfo = 0;
            } else {
              mono.on(container, 'mouseenter', onMouseEnter);
              mono.global.preference.showUmmyInfo = 1;
            }

            mono.sendMessage({
              action: 'updateOption',
              key: 'showUmmyInfo',
              value: mono.global.preference.showUmmyInfo
            });
          });
        }

        popupArrow = infoPopup.firstChild;

        size = SaveFrom_Utils.getSize(this);
        infoPopup.style.top = (position.top + size.height) + 'px';

        mono.on(infoPopup, 'mouseenter', function() {
          clearTimeout(infoPopupShowTimer);
        });

        mono.on(infoPopup, 'mouseleave', onMouseLeave);
      }

      infoPopup.style.left = (position.left - (240 - size.width) / 2) + 'px';

      document.body.appendChild(infoPopup);
    };

    mono.on(container, 'mouseenter', onMouseEnter);
    mono.on(container, 'mouseleave', onMouseLeave);
  },
  /*@if isVkOnly=0<*/
  bindUmmyInfo: function(container, params, details) {
    "use strict";
    // menu
    if (!mono.global.preference.showUmmyInfo) {
      return;
    }
    details = details || {};
    if (details.widthLimit && document.documentElement.offsetWidth < details.widthLimit) {
      return;
    }
    var infoPopup = null;
    var infoPopupShowTimer = null;
    var positionTop = null;

    var popupArrowTop = 8;
    var popupArrow = null;
    var popupArrowShadow = null;

    var killTimer = null;
    var killTimerUpdate = function() {
      clearTimeout(killTimer);
      killTimer = setTimeout(function() {
        if (infoPopup && infoPopup.parentNode) {
          if (infoPopup.style.display !== 'none') {
            return killTimerUpdate();
          }
          infoPopup.parentNode.removeChild(infoPopup);
        }
      }, 30 * 1000);
    };

    var fixPosition = function() {
      setTimeout(function() {
        var windowHeight = window.innerHeight;
        var infoHeight = infoPopup.clientHeight;
        var scrollY = window.scrollY;
        if (infoHeight + positionTop > windowHeight + scrollY) {
          var newPositionTop = windowHeight - infoHeight + scrollY;
          if (newPositionTop < 0) {
            return;
          }

          if (positionTop === newPositionTop) {
            return;
          }

          infoPopup.style.top = newPositionTop + 'px';

          var raz = 8 - (windowHeight - (infoHeight + positionTop) + scrollY);
          if (popupArrowTop !== raz) {
            popupArrowTop = raz;
            popupArrow.style.top = popupArrowTop + 'px';
            popupArrowShadow.style.top = popupArrowTop + 'px';
          }
        } else {
          if (popupArrowTop !== 8) {
            popupArrowTop = 8;
            popupArrow.style.top = popupArrowTop + 'px';
            popupArrowShadow.style.top = popupArrowTop + 'px';
          }
        }
      });
    };

    var onMouseLeave = function() {
      clearTimeout(infoPopupShowTimer);
      infoPopupShowTimer = setTimeout(function() {
        infoPopup && (infoPopup.style.display = 'none');
      }, 50);
    };

    var updateLeftPos = function(el) {
      var position = SaveFrom_Utils.getPosition(el);
      if (details.posLeft) {
        infoPopup.style.right = (document.documentElement.clientWidth - position.left - 21) + 'px';
      } else {
        var size = SaveFrom_Utils.getSize(el);
        infoPopup.style.left = (size.width + position.left - 21) + 'px';
      }
    };

    var onMouseEnter = function() {
      if (!mono.global.preference.showUmmyInfo) {
        return;
      }

      clearTimeout(infoPopupShowTimer);

      var position = SaveFrom_Utils.getPosition(container);

      if (!infoPopup) {
        if (details.expUmmyInfo) {
          infoPopup = details.expUmmyInfo(params);
        } else {
          infoPopup = SaveFrom_Utils.createUmmyInfo(params, details);
          var showUmmyInfo = infoPopup.querySelector('input[name="showUmmyInfo"]');
          if (showUmmyInfo) {
            showUmmyInfo.checked = !mono.global.preference.showUmmyInfo;
            showUmmyInfo.addEventListener('change', function(e) {
              e.preventDefault();
              e.stopPropagation();

              if (this.checked) {
                mono.off(container, 'mouseenter', onMouseEnter);
                mono.global.preference.showUmmyInfo = 0;
              } else {
                mono.on(container, 'mouseenter', onMouseEnter);
                mono.global.preference.showUmmyInfo = 1;
              }

              mono.sendMessage({
                action: 'updateOption',
                key: 'showUmmyInfo',
                value: mono.global.preference.showUmmyInfo
              });

              details.onHideClick && details.onHideClick();
            });
          }
        }

        popupArrow = infoPopup.firstChild;
        popupArrowShadow = popupArrow.nextElementSibling;

        positionTop = position.top - 4;

        mono.on(infoPopup, 'mouseenter', function() {
          clearTimeout(infoPopupShowTimer);
        });

        mono.on(infoPopup, 'mouseleave', onMouseLeave);
      } else {
        positionTop = position.top - 4;
      }

      infoPopup.style.top = positionTop + 'px';

      if (infoPopup.dataset.hide === '1') {
        return;
      }

      updateLeftPos(container);

      if (!infoPopup.parentNode) {
        infoPopup.style.display = 'none';
        document.body.appendChild(infoPopup);
      }

      if (infoPopup.style.display !== 'block') {
        infoPopup.style.display = 'block';
      }

      fixPosition();

      killTimerUpdate();
    };

    mono.on(container, 'mouseenter', onMouseEnter);
    mono.on(container, 'mouseleave', onMouseLeave);
  },

  popupMenu: {
    popupId: 'sf_popupMenu',
    popup: undefined,
    popupStyle: undefined,
    dataArrtVisible: 'data-isVisible',
    extStyleCache: undefined,
    ummyIcon: null,

    badgeQualityList: ['8K', '4K', '2160', '1440', '1080', '720', 'ummy'],
    createBadge: function(qulity, options) {
      options = options || {};
      var style = {
        display: 'inline-block',
        lineHeight: '18px',
        width: '19px',
        height: '17px',
        color: '#fff',
        fontSize: '12px',
        borderRadius: '2px',
        verticalAlign: 'middle',
        textAlign: 'center',
        paddingRight: '2px',
        fontWeight: 'bold',
        marginLeft: '3px'
      };
      for (var key in options.containerStyle) {
        style[key] = options.containerStyle[key];
      }

      var container = mono.create('div', {
        style: style
      });

      if (qulity === '1080' || qulity === '2160' || qulity === '1440' || qulity === '720') {
        container.textContent = 'HD';
        container.style.backgroundColor = '#505050';
        container.style.paddingRight = '1px';
      } else
      if (qulity === '8K' || qulity === '4K') {
        container.textContent = 'HD';
        container.style.paddingRight = '1px';
        container.style.backgroundColor = 'rgb(247, 180, 6)';
      } else
      if (qulity === 'mp3') {
        container.textContent = 'MP3';
        container.style.width = '26px';
        container.style.paddingRight = '1px';
        container.style.backgroundColor = '#505050';
      } else
      if (qulity === 'ummy') {
        if (this.ummyIcon) {
          container.style.background = 'url('+this.ummyIcon+') center center no-repeat';
        } else {
          mono.sendMessage({action: 'getUmmyIcon'}, function(dataImg) {
            container.style.background = 'url(' + (this.ummyIcon = dataImg) + ') center center no-repeat';
          }.bind(this));
        }
      }
      return container;
    },

    getTitleNode: function(link) {
      "use strict";
      var _this = SaveFrom_Utils.popupMenu;

      var titleContainer = mono.create('span', {
        style: {
          cssFloat: 'left'
        }
      });

      if ( link.quality === 'ummy' ) {
        // ummy hook
        var badge = document.createDocumentFragment();
        if (link.uQuality !== null) {
          if (['8K', '4K', '1440', '1080', '720'].indexOf(link.uQuality) !== -1) {
            badge.appendChild(document.createTextNode(link.uQuality));
          } else {
            badge.appendChild(_this.createBadge(link.uQuality, {
              containerStyle: {
                marginLeft: 0
              }
            }));
          }
        }
        mono.create(titleContainer, {
          append: [badge, ' ', 'Ummy']
        });
        badge = null;
      } else
      if (link.itemText) {
        titleContainer.textContent = link.itemText;
      } else {
        var titleQuality = link.quality?' '+link.quality:'';
        var titleFormat = link.format ? link.format : '???';
        var title3D = link['3d'] ? '3D ' : '';
        var titleFps = '';
        if (link.sFps) {
          titleFps += ' ' + (link.fps || 60);
        }
        titleContainer.textContent = title3D + titleFormat + titleQuality + titleFps;
      }

      if (_this.badgeQualityList.indexOf( String(link.quality) ) !== -1) {
        titleContainer.appendChild(_this.createBadge(String(link.quality)));
      }

      return titleContainer;
    },

    createPopupItem: function(listItem, options) {
      var _this = SaveFrom_Utils.popupMenu;

      var href;
      if (typeof listItem === 'string') {
        href = listItem;
      } else {
        href = listItem.href;
      }

      if (href === '-') {
        var line = mono.create('div', {
          style: {
            display: 'block',
            margin: '1px 0',
            borderTop: '1px solid rgb(214, 214, 214)'
          }
        });
        return {el: line};
      }

      var itemContainer = document.createElement( (href === '-text-') ? 'div' : 'a' );
      if (options.linkClass) {
        itemContainer.classList.add(options.linkClass);
      }
      var itemContainerStyle = {
        display: 'block',
        padding: '0 5px',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        overflow: 'hidden'
      };
      if (listItem.isHidden) {
        itemContainer.setAttribute(_this.dataArrtVisible, '0');
        itemContainerStyle.display = 'none';
      }
      SaveFrom_Utils.setStyle(itemContainer, itemContainerStyle);

      if (href === '-text-') {
        itemContainer.style.lineHeight = '22px';
        return {el: itemContainer};
      }

      itemContainer.href = href;

      if (href === '#') {
        return {el: itemContainer};
      }

      if (mono.isGM || mono.isOpera || mono.isSafari) {
        if (listItem.quality !== 'ummy') {
          itemContainer.title = mono.global.language.downloadTitle;
        }
      }

      if (listItem.title && listItem.format) {
        var ext = listItem.ext;
        if(!ext) {
          ext = listItem.format.toLowerCase();
        }
        itemContainer.setAttribute('download', mono.fileName.modify(listItem.title + '.' + ext) );
        if (listItem.forceDownload) {
          itemContainer.addEventListener('click', function(event) {
            SaveFrom_Utils.downloadOnClick(event, null, {
              useFrame: listItem.useIframe || false,
              el: this
            });
          }, false);
        }
      }

      if (options.onItemClick) {
        if (!listItem.func) {
          listItem.func = [];
        }
        if (!Array.isArray(listItem.func)) {
          listItem.func = [listItem.func];
        }
        if (listItem.func.indexOf(options.onItemClick) === -1) {
          listItem.func.push(options.onItemClick);
        }
      }

      if (listItem.func) {
        if (!Array.isArray(listItem.func)) {
          listItem.func = [listItem.func];
        }

        listItem.func.forEach(function(func) {
          "use strict";
          itemContainer.addEventListener('click', func.bind({link: listItem}), false);
        });
      }

      if (listItem.isBlank !== undefined) {
        itemContainer.setAttribute('target', 'blank');
      }

      itemContainer.appendChild(_this.getTitleNode(listItem));

      var infoConteiner = document.createElement('span');
      SaveFrom_Utils.setStyle(infoConteiner, {
        cssFloat: 'right',
        lineHeight: '22px',
        height: '22px'
      });
      var sizeIconStyle = {
        top: '5px',
        verticalAlign: 'top'
      };
      for (var key in options.sizeIconStyle) {
        sizeIconStyle[key] = options.sizeIconStyle[key];
      }
      var sizeIconTextStyle = {
        marginLeft: 0
      };

      if (listItem.noAudio) {
        SaveFrom_Utils.appendNoSoundIcon(infoConteiner, sizeIconStyle);
      }

      var sizeIconNode = null;
      if (!listItem.noSize) {
        infoConteiner.addEventListener('click', function onClick(e) {
          if (infoConteiner.firstChild.tagName === 'IMG') {
            e.preventDefault();
            e.stopPropagation();
            mono.trigger(infoConteiner.firstChild, 'click', {cancelable: true});
          }
          this.removeEventListener('click', onClick);
        });
        sizeIconNode = SaveFrom_Utils.appendFileSizeIcon(itemContainer, sizeIconStyle, sizeIconTextStyle, undefined, true, infoConteiner, listItem);
      }

      itemContainer.appendChild(infoConteiner);

      if (listItem.quality === 'ummy') {
        var ummyInfoParams = {
          video: listItem.videoId,
          vid: listItem.vid
        };
        SaveFrom_Utils.bindUmmyInfo(itemContainer, ummyInfoParams, options.ummyInfoDetails);
      }

      return {el: itemContainer, sizeIcon: sizeIconNode, prop: listItem};
    },

    sortMenuItems: function(list, options) {
      if (options === undefined) {
        options = {};
      }
      var formatPriority = ['ummy','Audio Opus','Audio Vorbis','Audio AAC','3GP','WebM','FLV','MP4'];
      var strQuality = {
        Mobile: 280,
        LD: 280,
        SD: 360,
        HD: 720,
        '480 low': 478,
        '480 med': 479,
        '480 high': 480,
        'ummy': 1
      };
      var sizePriority = {};
      var bitratePriority = [];
      var defList = [];
      var audioList = [];
      var subtitleList = [];
      var mute60List = [];
      var muteList = [];
      var _3dList = [];
      var unkList = [];

      list.forEach(function(item) {
        var prop = item.prop;
        if (options.noProp) {
          prop = item;
        }
        if (!prop.format) {
          unkList.push(item);
          return 1;
        }
        if (prop.isOther) {
          unkList.push(item);
        } else
        if (prop.isSubtitle) {
          subtitleList.push(item);
        } else
        if (!prop.noVideo) {
          var size = strQuality[prop.quality] || -1;
          if (size === -1) {
            if (String(prop.quality).substr(-1) === 'K') {
              size = parseInt(prop.quality) * 1000;
            } else {
              size = parseInt(prop.quality);
            }
          }
          if (options.maxSize && size > options.maxSize) {
            return 1;
          }
          if (options.minSize && size < options.minSize) {
            return 1;
          }
          sizePriority[prop.quality] = size;
          if (prop.noAudio) {
            if (prop.sFps) {
              mute60List.push(item);
            } else {
              muteList.push(item);
            }
          } else
          if (prop['3d']) {
            _3dList.push(item);
          } else {
            defList.push(item);
          }
        } else {
          bitratePriority[prop.quality] = parseInt(prop.quality);
          audioList.push(item);
        }
      });
      var sizeCompare = function(a, b) {
        return sizePriority[a.quality] > sizePriority[b.quality]? -1 : sizePriority[a.quality] === sizePriority[b.quality]? 0 : 1;
      };
      var bitrateCompare = function(a, b) {
        return bitratePriority[a.quality] > bitratePriority[b.quality]? -1 : (bitratePriority[a.quality] === bitratePriority[b.quality])? 0 : 1;
      };
      var formatCompare = function(a, b) {
        if (a.noVideo && b.noVideo) {
          return bitrateCompare(a, b);
        }
        if (a.noVideo) {
          return 1;
        }
        if (b.noVideo) {
          return -1;
        }
        return formatPriority.indexOf(a.format) > formatPriority.indexOf(b.format)? -1 : formatPriority.indexOf(a.format) === formatPriority.indexOf(b.format)? 0 : 1;
      };

      var compare = function(aa, bb) {
        var a = aa.prop;
        var b = bb.prop;
        if (options.noProp) {
          a = aa;
          b = bb;
        }

        var size = sizeCompare(a, b);
        if (size !== 0) {
          return size;
        }
        return formatCompare(a, b);
      };
      defList.sort(compare);
      _3dList.sort(compare);
      audioList.sort(compare);
      mute60List.sort(compare);
      muteList.sort(compare);

      var resList = null;
      if (options.typeList) {
        resList = [];
        if (options.typeList.indexOf('video') !== -1) {
          resList = resList.concat(defList);
        }
        if (options.typeList.indexOf('3d') !== -1) {
          resList = resList.concat(_3dList);
        }
        if (options.typeList.indexOf('audio') !== -1) {
          resList = resList.concat(audioList);
        }
        if (options.typeList.indexOf('mute') !== -1) {
          resList = resList.concat(muteList);
        }
        if (options.typeList.indexOf('mute60') !== -1) {
          resList = resList.concat(mute60List);
        }
        if (options.typeList.indexOf('subtitles') !== -1) {
          resList = resList.concat(subtitleList);
        }
        if (options.typeList.indexOf('other') !== -1) {
          resList = resList.concat(unkList);
        }
      } else {
        resList = defList.concat(_3dList, audioList, subtitleList, mute60List, muteList, unkList);
      }
      if (options.groupCompare) {
        resList.sort(compare);
      }
      return resList;
    },

    removePanel: function() {
      if (this.popup.parentNode !== null) {
        this.popup.parentNode.removeChild(this.popup);
      }
      if (this.popupStyle !== undefined && this.popupStyle.parentNode !== null) {
        this.popupStyle.parentNode.removeChild(this.popupStyle);
      }
      this.popup = undefined;
      this.popupStyle = undefined;
    },

    getHiddenList: function(hiddenList, options) {
      "use strict";
      var _this = this;
      var content = document.createDocumentFragment();
      var scrollListItemCount = 8;
      if (hiddenList.length < scrollListItemCount) {
        mono.create(content, {
          append: hiddenList
        });
      } else {
        var scrollContainer = mono.create('div', {
          style: {
            maxHeight: (scrollListItemCount * 24) + 'px',
            overflowY: 'scroll',
            display: 'none'
          },
          on: [
            ['wheel', function(e) {
              if (e.wheelDeltaY > 0 && this.scrollTop === 0) {
                e.preventDefault();
              } else
              if (e.wheelDeltaY < 0 && this.scrollHeight - (this.offsetHeight + this.scrollTop) <= 0) {
                e.preventDefault();
              }
            }],
            (function() {
              var hasTopShadow = false;
              return ['scroll', function() {
                if (this.scrollTop !== 0) {
                  if (hasTopShadow) {
                    return;
                  }
                  hasTopShadow = true;
                  this.style.boxShadow = 'rgba(0, 0, 0, 0.40) -2px 1px 2px 0px inset';
                } else {
                  if (!hasTopShadow) {
                    return;
                  }
                  hasTopShadow = false;
                  this.style.boxShadow = '';
                }
              }];
            })()
          ],
          append: hiddenList
        });
        scrollContainer.setAttribute(_this.dataArrtVisible, '0');

        content.appendChild(scrollContainer);
      }

      var separator = _this.createPopupItem('-', options).el;
      content.appendChild(separator);

      var moreItem = _this.createPopupItem('#', options).el;
      mono.create(moreItem, {
        text: mono.global.language.more + ' ' + String.fromCharCode(187), //171 //160 - space
        data: {
          visible: '0'
        },
        on: ['click', function(e) {
          e.preventDefault();
          var state = this.dataset.visible;
          var symbol;
          if (state > 0) {
            state--;
            symbol = 187;
          } else {
            state++;
            symbol = 171;
          }
          this.textContent = mono.global.language.more + ' ' + String.fromCharCode(symbol);
          this.dataset.visible = state;
          var itemList = this.parentNode.querySelectorAll('*[' + _this.dataArrtVisible + ']');
          for (var i = 0, item; item = itemList[i]; i++) {
            if (state === 1) {
              item.style.display = 'block';
            } else {
              item.style.display = 'none';
            }
            item.setAttribute( _this.dataArrtVisible, state);
          }
        }]
      });
      content.appendChild(moreItem);

      if (options.visibleCount === 0) {
        mono.trigger(moreItem, 'click', {cancelable: true});
      }

      return content;
    },

    getContent: function(options) {
      "use strict";
      var _this = this;
      var links = options.links;

      var content = document.createDocumentFragment();

      var sizeIconList = [];

      if(typeof(links) === 'string') {
        var loadingItem = _this.createPopupItem('-text-', options).el;
        loadingItem.textContent = links;
        content.appendChild( loadingItem );
      } else
      if (links.length === 0) {
        var emptyItem = _this.createPopupItem('-text-', options).el;
        emptyItem.textContent = mono.global.language.noLinksFound;
        content.appendChild( emptyItem );
      } else {
        var items = [];
        links.forEach(function(link) {
          items.push(_this.createPopupItem(link, options));
        });

        items = _this.sortMenuItems(items);

        var hiddenList = [];

        items.forEach(function(item) {
          if (item.prop.isHidden) {
            hiddenList.push(item.el);
            return 1;
          }

          content.appendChild(item.el);

          if (options.showFileSize && item.sizeIcon) {
            sizeIconList.push(item.sizeIcon);
          }
        });

        options.visibleCount = items.length - hiddenList.length;

        if (hiddenList.length > 0) {
          if (options.getHiddenListFunc) {
            content.appendChild(options.getHiddenListFunc(hiddenList, options));
          } else {
            content.appendChild(_this.getHiddenList(hiddenList, options));
          }
        }
      }

      return {sizeIconList: sizeIconList, content: content};
    },

    create: function(options) {
      var button = options.button;
      var _this = SaveFrom_Utils.popupMenu;

      options.linkClass = options.linkClass || 'sf-menu-item';

      options.offsetRight = options.offsetRight || 0;
      options.offsetTop = options.offsetTop || 0;

      options.parent = options.parent || document.body;

      if (options.isUpdate && (_this.popup === undefined || _this.popup.style.display === 'none')) {
        return;
      }

      if(_this.popup) {
        _this.removePanel();
      }

      var popupContainer = _this.popup = document.createElement('div');
      var containerSelector = '#'+_this.popupId;
      if (options.popupId) {
        containerSelector = '#'+options.popupId;
        popupContainer.id = options.popupId;
      } else
      if (options.containerClass) {
        containerSelector = '.'+options.containerClass;
        popupContainer.classList.add(options.containerClass);
      } else {
        popupContainer.id = _this.popupId;
      }

      var popupContainerStyle = {
        display: 'block',
        position: 'absolute',
        minHeight: '24px',
        cursor: 'default',
        textAlign: 'left',
        whiteSpace: 'nowrap',
        fontFamily: 'arial, sans-serif'
      };
      if (options.extStyle) {
        delete popupContainerStyle.display;
      }

      var pos = SaveFrom_Utils.getPosition(button, options.parent),
        size = SaveFrom_Utils.getSize(button);

      popupContainerStyle.top = (pos.top + options.offsetTop + size.height) + 'px';
      popupContainerStyle.left = (pos.left + options.offsetRight) + 'px';
      SaveFrom_Utils.setStyle(popupContainer, popupContainerStyle);

      var popupCustomContainerStyle = {
        'background-color': '#fff',
        'z-index': '9999',
        'box-shadow': '0 2px 10px 0 rgba(0,0,0,0.2)',
        border: '1px solid #ccc',
        'border-radius': '3px',
        'font-size': '12px',
        'font-weight': 'bold',
        'min-width': '190px'
      };

      if (options.style && options.style.popup) {
        for (var key in options.style.popup) {
          var value = options.style.popup[key];
          popupCustomContainerStyle[key] = value;
        }
      }

      SaveFrom_Utils.addStyleRules(containerSelector, popupCustomContainerStyle);

      var itemCustomStyle = {
        'line-height': '24px',
        color: '#3D3D3D'
      };

      if (options.style && options.style.item) {
        for (var key in options.style.item) {
          var value = options.style.item[key];
          itemCustomStyle[key] = value;
        }
      }

      SaveFrom_Utils.addStyleRules(containerSelector+' .'+ options.linkClass, itemCustomStyle);

      var stopPropagationFunc = function(e){e.stopPropagation()};
      mono.create(popupContainer, {
        on: [
          ['click', stopPropagationFunc],
          ['mouseover', stopPropagationFunc],
          ['mouseup', stopPropagationFunc],
          ['mousedown', stopPropagationFunc],
          ['mouseout', stopPropagationFunc]
        ]
      });

      while (popupContainer.firstChild !== null) {
        popupContainer.removeChild(popupContainer.firstChild);
      }

      var menuContent = _this.getContent.call(_this, options);
      var sizeIconList = menuContent.sizeIconList;
      menuContent = menuContent.content;
      popupContainer.appendChild(menuContent);


      var hoverBgColor = '#2F8AFF';
      var hoverTextColor = '#fff';
      if (options.style && options.style.hover) {
        hoverBgColor = options.style.hover.backgroundColor || hoverBgColor;
        hoverTextColor = options.style.hover.color || hoverTextColor;
      }
      var styleEl = _this.popupStyle = document.createElement('style');
      styleEl.textContent = containerSelector + ' a:hover'+
        '{'+
        'background-color: '+hoverBgColor+';'+
        'color: '+hoverTextColor+';'+
        '}'+
        containerSelector + ' > a:first-child'+
        '{'+
        'border-top-left-radius: 3px;'+
        'border-top-right-radius: 3px;'+
        '}'+
        containerSelector + ' > a:last-child'+
        '{'+
        'border-bottom-left-radius: 3px;'+
        'border-bottom-right-radius: 3px;'+
        '}';

      options.parent.appendChild(styleEl);
      options.parent.appendChild(popupContainer);
      if (options.extStyle) {
        if (SaveFrom_Utils.popupMenu.extStyleCache !== undefined && SaveFrom_Utils.popupMenu.extStyleCache.parentNode !== null) {
          SaveFrom_Utils.popupMenu.extStyleCache.parentNode.removeChild(SaveFrom_Utils.popupMenu.extStyleCache);
        }

        var extElClassName = 'sf-extElStyle_'+containerSelector.substr(1);
        var extBodyClassName = 'sf-extBodyStyle_'+containerSelector.substr(1);
        var extBodyStyle = document.querySelector('style.'+extBodyClassName);
        if (extBodyStyle === null) {
          document.body.appendChild( mono.create('style', {
            class: extBodyClassName,
            text: containerSelector+' {' +
              'display: none;' +
              '}'
          }) );
        }
        SaveFrom_Utils.popupMenu.extStyleCache = options.extStyle.appendChild(mono.create('style', {
          class: extElClassName,
          text: 'body ' + containerSelector + ' {' +
            'display: block;' +
            '}'
        }));
      }

      setTimeout(function() {
        sizeIconList.forEach(function(icon) {
          mono.trigger(icon, 'click', {bubbles: false, cancelable: true});
        });
      });

      return popupContainer;
    },

    update: function(popupContainer, options) {
      var _this = SaveFrom_Utils.popupMenu;

      while (popupContainer.firstChild !== null) {
        popupContainer.removeChild(popupContainer.firstChild);
      }

      var menuContent = _this.getContent.call(_this, options);
      var sizeIconList = menuContent.sizeIconList;
      menuContent = menuContent.content;
      popupContainer.appendChild(menuContent);

      setTimeout(function() {
        sizeIconList.forEach(function(icon) {
          mono.trigger(icon, 'click', {bubbles: false, cancelable: true});
        });
      });
    },

    preprocessItem: {
      srt2url: function(item, popupLink) {
        "use strict";
        var srt = item.srt;
        var blobUrl = null;

        if (typeof URL !== 'undefined' && typeof Blob !== "undefined" && !mono.isSafari) {
          var blob = new Blob([srt], {encoding: "UTF-8", type: 'text/plain'});
          blobUrl = URL.createObjectURL(blob);
        } else {
          var srtUTF8 = SaveFrom_Utils.utf8Encode(srt);
          blobUrl = 'data:text/plain;charset=utf-8;base64,' + encodeURIComponent(btoa(srtUTF8))
        }

        popupLink.ext = 'srt';
        popupLink.format = 'SRT';
        popupLink.href = blobUrl;
        popupLink.noSize = true;
        if (mono.isOpera || mono.isFF) {
          popupLink.forceDownload = false;
        }
      }
    },

    prepareLinks: {
      /*@if isVkOnly=0>*/
      youtube: function(links, title, subtitles, details) {
        details = details || {};
        subtitles = subtitles || [];
        links = mono.extend({}, links);
        var sfUtilsYt = SaveFrom_Utils.video.yt;
        sfUtilsYt.init();

        var badgeQualityList = SaveFrom_Utils.popupMenu.badgeQualityList;
        var menuLinks = [];
        var popupLink;
        var qualityIndex = -1;
        var qualityBadge = null;
        var ummyHasAudio = false;
        var meta = links.meta || {};

        for (var format in sfUtilsYt.format) {
          var formatList = sfUtilsYt.format[format];
          for (var itag in formatList) {
            if (links[itag] === undefined) {
              continue;
            }
            var url = links[itag];
            delete links[itag];

            var prop = formatList[itag];

            var isHidden = false;

            if (!sfUtilsYt.showFormat[format]) {
              isHidden = true;
            }

            if (prop['3d'] && !sfUtilsYt.show3D) {
              isHidden = true;
            }

            if (prop.noAudio && !sfUtilsYt.showMP4NoAudio) {
              isHidden = true;
            }

            popupLink = {
              href: url,
              isHidden: isHidden,
              title: title,
              format: format,
              itag: itag
            };

            for (var pItem in prop) {
              popupLink[pItem] = prop[pItem];
            }

            var metaTag = meta[itag] || {};

            if (metaTag.quality) {
              popupLink.quality = metaTag.quality;
            }

            if (metaTag.fps) {
              popupLink.fps = metaTag.fps;
            }

            if(prop.noVideo || prop.noAudio) {
              if (!prop.noAudio) {
                ummyHasAudio = true;
              }
              popupLink.forceDownload = true;
              popupLink.useIframe = true;
            }

            var qIndex = badgeQualityList.indexOf(popupLink.quality);
            if (qIndex !== -1 && (qualityIndex === -1 || qIndex < qualityIndex) ) {
              qualityIndex = qIndex;
            }

            menuLinks.push(popupLink);
          }
        }

        if (qualityIndex !== -1) {
          qualityBadge = badgeQualityList[qualityIndex];
        }

        var videoId;
        if (links.ummy || links.ummyAudio) {
          videoId = mono.parseUrlParams(links.ummy || links.ummyAudio);
          videoId = videoId.v;
        }
        if (videoId) {
          videoId = 'yt-' + videoId;
        }

        for (var itag in links) {
          if (itag === 'meta') {
            continue;
          }
          if (['ummy', 'ummyAudio'].indexOf(itag) !== -1) {
            popupLink = {
              href: links[itag],
              quality: 'ummy',
              noSize: true,
              format: 'ummy',
              videoId: videoId
            };
            if (itag === 'ummy') {
              popupLink.itag = 'ummy';
              popupLink.uQuality = qualityBadge;
            } else {
              popupLink.itag = 'ummyAudio';
              popupLink.uQuality = 'mp3';
              popupLink.uIsAudio = true;
            }
            if (details.ummyVid) {
              popupLink.vid = details.ummyVid;
            }
          } else {
            popupLink = {
              href: links[itag],
              isHidden: true,
              title: title,
              quality: itag,
              itag: itag
            };
          }
          menuLinks.push(popupLink);
          delete links[itag];
        }

        subtitles.forEach(function(item) {
          "use strict";
          popupLink = {
            href: item.url,
            isHidden: true,
            quality: 'SRT' + (item.isAuto ? 'A' : ''),
            itemText: mono.global.language.subtitles + ' (' + item.lang + ')',
            title: title + '-' + item.langCode,
            ext: 'vtt',
            format: 'VTT',
            isSubtitle: true,
            langCode: item.langCode,
            forceDownload: true
          };

          if (item.preprocess === 'srt2url') {
            SaveFrom_Utils.popupMenu.preprocessItem.srt2url(item, popupLink);
          }

          menuLinks.push(popupLink);
        });

        return menuLinks;
      },
      vimeo: function(links, title) {
        var menuLinks = [];
        var popupLink;
        links.forEach(function(link) {
          var ext = link.ext;
          if(!ext) {
            ext = 'mp4';
            if(link.url.search(/\.flv($|\?)/i) != -1) {
              ext = 'flv';
            }
          }
          var quality = link.name || ext;
          var format = link.format || link.type || ext;
          format = format.toUpperCase();
          popupLink = { href: link.url, title: title, ext: ext, format: format, quality: quality, forceDownload: true, useIframe: true };
          menuLinks.push(popupLink);
        });
        return menuLinks;
      },
      /*@if isVkOnly=0<*/
      vk: function(links, title) {
        var menuLinks = [];
        var popupLink;
        links.forEach(function(link) {
          var ext = link.name|| link.ext;
          var format = (ext)?ext.toUpperCase():'';
          var quality = (link.subname)?link.subname:'';
          popupLink = { href: link.url, title: title, ext: ext, format: format, quality: quality, forceDownload: true, useIframe: true };
          menuLinks.push(popupLink);
        });
        return menuLinks;
      },
      /*@if isVkOnly=0>*/
      dailymotion: function(links, title) {
        var menuLinks = [];
        var popupLink;
        links.forEach(function(link) {
          var format = link.ext;
          var quality = (link.height)?link.height:'';
          popupLink = { href: link.url, title: title, ext: format, format: format, quality: quality, forceDownload: true };

          if (mono.isOpera) {
            popupLink.noSize = true;
          }

          menuLinks.push(popupLink);
        });
        return menuLinks;
      },
      facebook: function(links, title) {
        var menuLinks = [];
        var popupLink;
        links.forEach(function(link) {
          var ext = link.ext;
          var format = (ext)?ext.toUpperCase():'';
          var quality = link.name;
          popupLink = { href: link.url, title: title, ext: ext, format: format, quality: quality, forceDownload: true };
          menuLinks.push(popupLink);
        });
        return menuLinks;
      },
      rutube: function(href) {
        "use strict";
        if (Array.isArray(href)) {
          href = href[0];
        }
        if (typeof href !== 'string') {
          return;
        }
        var links = [];

        var videoId = href.match(/\/embed\/(\d+)/);
        videoId = videoId && videoId[1] || undefined;

        if (!videoId) {
          videoId = href.match(/\/video\/([0-9a-z]+)/);
          videoId = videoId && videoId[1] || undefined;
        }

        if (/\/\/video\./.test(href)) {
          href = href.replace(/\/\/video\./, '//');
          if(!videoId) {
            videoId = href.match(/\/(\d+)$/);
            videoId = videoId && videoId[1] || undefined;
          }
        }

        if (videoId) {
          videoId = 'rt-' + videoId;
        }

        var ummyUrl = href.replace(/^.*(\/\/.*)$/, 'ummy:$1');

        var videoLink = {
          href: ummyUrl,
          quality: 'ummy',
          noSize: true,
          format: 'ummy',
          itag: 'ummy',
          uQuality: '720',
          vid: 114,
          videoId: videoId
        };

        var sep = '?';
        if (ummyUrl.indexOf(sep) !== -1) {
          sep = '&';
        }
        ummyUrl += sep + 'sf_type=audio';

        var audioLink = {
          href: ummyUrl,
          quality: 'ummy',
          noSize: true,
          format: 'ummy',
          itag: 'ummyAudio',
          uQuality: 'mp3',
          uIsAudio: true,
          vid: 114,
          videoId: videoId
        };

        links.push(videoLink);
        links.push(audioLink);

        return links;
      }
      /*@if isVkOnly=0<*/
    },

    /**
     * @param {Node|Element} target
     * @param {String|Array} links
     * @param {String} id
     * @param {Object} [_details]
     * @returns {{isShow: boolean, el: Node|Element, hide: Function, update: Function}}
     */
    quickInsert: function(target, links, id, _details) {
      _details = _details || {};
      var result = {};

      var hideMenu = function(e) {
        if (e && (e.target === target || target.contains(e.target))) {
          return;
        }

        if (!result.isShow) {
          return;
        }

        menu.style.display = 'none';
        mono.off(document, 'mousedown', hideMenu);
        result.isShow = false;
        _details.onHide && _details.onHide(menu);
      };

      var options = {
        links: links,
        button: target,
        popupId: id,
        showFileSize: true
        /*
         parent: args.parent,
         extStyle: args.extStyle,
         offsetRight: args.offsetRight,
         offsetTop: args.offsetTop,
         onItemClick: args.onItemClick
         */
      };

      mono.extend(options, _details);

      var menu = SaveFrom_Utils.popupMenu.create(options);

      _details.onShow && _details.onShow(menu);

      mono.off(document, 'mousedown', hideMenu);
      mono.on(document, 'mousedown', hideMenu);

      return mono.extend(result, {
        button: target,
        isShow: true,
        el: menu,
        hide: hideMenu,
        update: function(links) {
          options.links = links;
          SaveFrom_Utils.popupMenu.update(menu, options)
        }
      });
    }
  },

  /*@if isVkOnly=0>*/
  frameMenu: {
    getBtn: function(details) {
      "use strict";
      var selectBtn = undefined;

      var containerStyle = {
        verticalAlign: 'middle',
        position: 'absolute',
        zIndex: 999,
        fontFamily: 'arial, sans-serif'
      };

      for (var key in details.containerStyle) {
        containerStyle[key] = details.containerStyle[key];
      }

      var quickBtnStyle = {
        display: 'inline-block',
        fontSize: 'inherit',
        height: '22px',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        borderRadius: '3px',
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
        paddingRight: '12px',
        paddingLeft: '28px',
        cursor: 'pointer',
        verticalAlign: 'middle',
        position: 'relative',
        lineHeight: '22px',
        textDecoration: 'none',
        zIndex: 1,
        color: '#fff'
      };

      for (var key in details.quickBtnStyle) {
        quickBtnStyle[key] = details.quickBtnStyle[key];
      }

      var quickBtnLabel = details.quickBtnLabel || mono.global.language.download;

      var insertStyle = {
        '': {
          opacity: 0.8,
          display: 'none'
        },
        '\\.sf-show': {
          display: 'block'
        },
        'button::-moz-focus-inner': {
          padding: 0,
          margin: 0
        },
        '.sf-quick-btn': {
          backgroundColor: 'rgba(28,28,28,0.1)'
        },
        '.sf-select-btn': {
          backgroundColor: 'rgba(28,28,28,0.1)'
        },
        ':hover,\\.hover': {
          opacity: 1
        },
        ':hover .sf-quick-btn,\\.hover .sf-quick-btn': {
          backgroundColor: 'rgba(0, 163, 80, 0.5)'
        },
        ':hover .sf-select-btn,\\.hover .sf-select-btn': {
          backgroundColor: 'rgba(60, 60, 60, 0.5)'//'rgba(28,28,28,0.8)'
        },
        '\\.hover .sf-select-btn': {
          backgroundColor: 'rgba(28,28,28,0.8)'
        }
      };

      for (var key in details.insertStyle) {
        insertStyle[key] = details.insertStyle[key];
      }

      var selectBtnStyle = {
        position: 'relative',
        display: 'inline-block',
        fontSize: 'inherit',
        height: '24px',
        padding: 0,
        paddingRight: '21px',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        borderLeft: 0,
        borderRadius: '3px',
        borderTopLeftRadius: '0',
        borderBottomLeftRadius: '0',
        cursor: 'pointer',
        color: '#fff',
        zIndex: 0,
        verticalAlign: 'middle',
        marginLeft: 0
      };

      for (var key in details.selectBtnStyle) {
        selectBtnStyle[key] = details.selectBtnStyle[key];
      }

      var quickBtnIcon = details.quickBtnIcon || mono.create('i', {
        style: {
          position: 'absolute',
          display: 'inline-block',
          left: '6px',
          top: '3px',
          backgroundImage: 'url('+SaveFrom_Utils.svg.getSrc('download', '#ffffff')+')',
          backgroundSize: '12px',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          width: '16px',
          height: '16px'
        }
      });

      var selectBtnIcon = details.selectBtnIcon || mono.create('i', {
        style: {
          position: 'absolute',
          display: 'inline-block',
          top: '9px',
          right: '6px',
          border: '5px solid #FFF',
          borderBottomColor: 'transparent',
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent'
        }
      });

      var quickBtn;

      var btnContainer = mono.create('div', {
        id: details.btnId,
        style: containerStyle,
        on: details.on,
        append: [
          quickBtn = mono.create('a', {
            class: 'sf-quick-btn',
            style: quickBtnStyle,
            href: '#',
            append: [
              quickBtnIcon,
              quickBtnLabel
            ]
          }),
          mono.create('style', {text: mono.styleObjToText(insertStyle, '#'+details.btnId)}),
          selectBtn = mono.create('button', {
            class: 'sf-select-btn',
            style: selectBtnStyle,
            on: details.onSelectBtn,
            append: [
              selectBtnIcon
            ]
          })
        ]
      });

      var setQuality = function(text) {
        var node = typeof text === 'object' ? text : document.createTextNode(text);
        var first = selectBtn.firstChild;
        if (first === selectBtnIcon) {
          selectBtn.insertBefore(node, first);
        } else {
          selectBtn.replaceChild(node, first);
        }
      };

      return {
        node: btnContainer,
        setQuality: setQuality,
        setLoadingState: function() {
          setQuality(mono.create('img', {
            src: SaveFrom_Utils.svg.getSrc('info', '#ffffff'),
            style: {
              width: '14px',
              height: '14px',
              marginLeft: '6px',
              verticalAlign: 'middle',
              top: '-1px',
              position: 'relative'
            }
          }));
        },
        selectBtn: selectBtn,
        quickBtn: quickBtn
      };
    },

    getHiddenList: function(hiddenList, options) {
      "use strict";
      var popupMenu = SaveFrom_Utils.popupMenu;
      var moreBtn = popupMenu.createPopupItem('-text-', options).el;
      mono.create(moreBtn, {
        text: mono.global.language.more + ' ' + String.fromCharCode(187),
        style: {
          cursor: 'pointer'
        },
        on: ['click', function() {
          var content = this.parentNode;
          var itemList = content.querySelectorAll('*[' + popupMenu.dataArrtVisible + ']');
          for (var i = 0, item; item = itemList[i]; i++) {
            item.style.display = 'block';
            item.setAttribute( popupMenu.dataArrtVisible, 1);
          }
          this.parentNode.removeChild(this);
          /*content.replaceChild(mono.create('i', {
            class: 'sf-separator'
          }), this);*/
        }]
      });

      var content = document.createDocumentFragment();
      content.appendChild(moreBtn);

      mono.create(content, {
        append: hiddenList
      });

      if (options.visibleCount === 0) {
        mono.trigger(moreBtn, 'click', {cancelable: true});
      }

      return content;
    },

    getMenuContainer: function(options) {
      "use strict";
      var popupMenu = SaveFrom_Utils.popupMenu;
      var button = options.button;
      var popupId = options.popupId;

      var container = mono.create('div',  {
          style: {
            position: 'absolute',
            minHeight: '24px',
            cursor: 'default',
            textAlign: 'left',
            whiteSpace: 'nowrap',
            overflow: 'auto'
          }
      });

      if (popupId[0] === '#') {
        container.id = popupId.substr(1);
      } else {
        container.classList.add(popupId);
      }

      var menuContent = popupMenu.getContent(options);
      container.appendChild(menuContent.content);

      setTimeout(function() {
        menuContent.sizeIconList.forEach(function(icon) {
          mono.trigger(icon, 'click', {bubbles: false, cancelable: true});
        });
      });

      var insertStyle = {
        '': {
          display: 'none',
          fontFamily: 'arial, sans-serif',

          backgroundColor: 'rgba(28,28,28,0.8)',
          zIndex: 9999,
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          minWidth: '190px',
          color: '#fff'
        },
        '\\.sf-show': {
          display: 'block'
        },
        '::-webkit-scrollbar-track': {
          backgroundColor: '#424242'
        },
        '::-webkit-scrollbar': {
          width: '10px',
          backgroundColor: '#424242'
        },
        '::-webkit-scrollbar-thumb': {
          backgroundColor: '#8e8e8e'
        },
        '.sf-menu-item': {
          lineHeight: '24px',
          color: '#fff'
        },
        '.sf-menu-item:hover': {
          backgroundColor: '#1c1c1c'
        }
      };
      for (var key in options.insertStyle) {
        insertStyle[key] = options.insertStyle[key];
      }

      var pos = SaveFrom_Utils.getPosition(button, options.parent);
      var size = SaveFrom_Utils.getSize(button);

      var stopPropagationFunc = function(e){e.stopPropagation()};

      var topOffset = pos.top + size.height;
      mono.create(container, {
        style: {
          top: topOffset + 'px',
          right: (document.body.offsetWidth - pos.left - size.width) + 'px',
          maxHeight: (document.body.offsetHeight - topOffset - 40) + 'px'
        },
        on: [
          ['click', stopPropagationFunc],
          ['mouseover', stopPropagationFunc],
          ['mouseup', stopPropagationFunc],
          ['mousedown', stopPropagationFunc],
          ['mouseout', stopPropagationFunc],
          ['wheel', function(e) {
            if (e.wheelDeltaY > 0 && this.scrollTop === 0) {
              e.preventDefault();
            } else
            if (e.wheelDeltaY < 0 && this.scrollHeight - (this.offsetHeight + this.scrollTop) <= 0) {
              e.preventDefault();
            }
          }]
        ],
        append: [
          mono.create('style', {text: mono.styleObjToText(insertStyle, (popupId[0] === '#' ? '' : '.') + popupId)})
        ]
      });

      return container;
    },
    getMenu: function(target, links, id, _options) {
      "use strict";
      var options = {
        links: links,
        button: target,
        popupId: id || '#sf-frame-menu',
        showFileSize: true,
        sizeIconStyle: {
          color: '#fff'
        },
        linkClass: 'sf-menu-item',
        ummyInfoDetails: {
          posLeft: true,
          darkTheme: true,
          widthLimit: 480
        },
        getHiddenListFunc: this.getHiddenList.bind(this)
      };

      for (var key in _options) {
        options[key] = _options[key];
      }

      var menu = this.getMenuContainer(options);

      document.body.appendChild(menu);

      var hideMenu = function() {
        if (menu.parentNode) {
          menu.parentNode.removeChild(menu);
        }
        out.hide = true;
        options.onHide && options.onHide();
      };

      options.onShow && options.onShow(menu);

      mono.off(document, 'mousedown', hideMenu);
      mono.on(document, 'mousedown', hideMenu);

      var out = {
        isShow: true,
        el: menu,
        hide: hideMenu,
        update: function(links) {
          var popupMenu = SaveFrom_Utils.popupMenu;
          var style = menu.lastChild;
          menu.textContent = '';

          options.links = links;
          var menuContent = popupMenu.getContent(options);

          setTimeout(function() {
            menuContent.sizeIconList.forEach(function(icon) {
              mono.trigger(icon, 'click', {bubbles: false, cancelable: true});
            });
          });

          menu.appendChild(menuContent.content);
          menu.appendChild(style);
        }.bind(this)
      };

      return out;
    }
  },
  /*@if isVkOnly=0<*/

  mobileLightBox: {
    id: 'sf-lightbox',
    clear: function() {
      var el = document.getElementById(SaveFrom_Utils.mobileLightBox.id);
      if (el === null) {
        return;
      }
      el.parentNode.removeChild(el);
    },
    getTitle: function(item) {
      var title = [];

      title.push(item.format || '???');
      if (item.quality) {
        var quality = item.quality;

        if (item.sFps) {
          quality += ' ' + (item.fps || 60);
        }

        title.push(quality);
      }
      if (item['3d']) {
        title.push('3D');
      }
      if (item.noAudio) {
        title.push(mono.global.language.withoutAudio);
      }

      return title.join(' ');
    },
    createItem: function(listItem) {
      var mobileLightBox = SaveFrom_Utils.mobileLightBox;

      var button = mono.create('a', {
        style: {
          display: 'block',
          marginBottom: '6px',
          border: 'solid 1px #d3d3d3',
          lineHeight: '36px',
          minHeight: '36px',
          background: '#f8f8f8',
          verticalAlign: 'middle',
          fontSize: '15px',
          textAlign: 'center',
          color: '#333',
          borderRadius: '2px',
          overflow: 'hidden'
        }
      });

      if (typeof listItem === 'string') {
        button.textContent = listItem;
        return button;
      } else {
        button.href = listItem.href;
        button.download = listItem.title;
        button.textContent = mobileLightBox.getTitle(listItem);
      }

      if (listItem.isHidden) {
        button.classList.add('isOptional');
        button.style.display = 'none';
      }

      var sizeIconStyle = {
        verticalAlign: 'middle',
        cssFloat: 'right',
        lineHeight: '36px',
        minHeight: '36px',
        paddingRight: '15px',
        width: '18px'
      };
      var sizeIconTextStyle = {
        cssFloat: 'right',
        paddingRight: '5px'
      };
      SaveFrom_Utils.appendFileSizeIcon(button, sizeIconStyle, sizeIconTextStyle, undefined, true, button);

      return button;
    },
    getItems: function(itemList) {
      var mobileLightBox = SaveFrom_Utils.mobileLightBox;

      if (typeof itemList === 'string') {
        return {list: [mobileLightBox.createItem(itemList)], hiddenCount: 0};
      }

      var list = [];
      for (var i = 0, item; item = itemList[i]; i++) {
        if (item.quality === 'ummy') {
          continue;
        }
        list.push({el: mobileLightBox.createItem(item), prop: item});
      }
      list = SaveFrom_Utils.popupMenu.sortMenuItems(list);
      var elList = [];
      var hiddenElList = [];
      for (i = 0, item; item = list[i]; i++) {
        if (item.prop.isHidden) {
          hiddenElList.push(item.el);
        } else {
          elList.push(item.el);
        }
      }
      return {list: elList.concat(hiddenElList), hiddenCount: hiddenElList.length};
    },
    show: function(itemList) {
      var mobileLightBox = SaveFrom_Utils.mobileLightBox;

      var topOffset = window.pageYOffset;
      var winHeight = window.innerHeight;
      var mTop = parseInt(winHeight / 100 * 15);
      var btnBox = undefined;
      var moreBtn;

      var getBtnBoxSize = function(hasMore) {
        "use strict";
        var i = hasMore ? 2 : 1;
        return winHeight - 46*i - mTop*2;
      };

      var setMoreBtnState = function(itemObj) {
        "use strict";
        if (itemObj.hiddenCount > 0) {
          btnBox.style.height = getBtnBoxSize(1) + 'px';
          moreBtn.style.display = 'block';
        } else {
          moreBtn.style.display = 'none';
          btnBox.style.height = getBtnBoxSize(0) + 'px';
        }
      };

      var exLb = document.getElementById(mobileLightBox.id);
      if (exLb !== null) {
        exLb.parentNode.removeChild(exLb);
      }


      var lbWidth = window.innerWidth;
      if (lbWidth <= 250) {
        lbWidth = '90%';
      } else {
        lbWidth = '70%';
      }

      if (!itemList || itemList.length === 0) {
        itemList = mono.global.language.noLinksFound;
      }

      var itemObj = mobileLightBox.getItems(itemList);

      var lightbox = mono.create('div', {
        id: mobileLightBox.id,
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          zIndex: 9000,
          height: document.body.scrollHeight + 'px',
          background: 'rgba(0,0,0,0.85)',
          textAlign: 'center'
        },
        on: [
          ['click', function(e) {
            e.preventDefault();
            close();
          }]
        ],
        append: mono.create('div', {
          style: {
            display: 'inline-block',
            width: lbWidth,
            backgroundColor: '#eee',
            height: (winHeight - mTop*2)+'px',
            marginTop: (mTop + topOffset)+'px',
            borderRadius: '4px',
            padding: '8px',
            position: 'relative'
          },
          append: [
            btnBox = mono.create('div', {
              style: {
                overflowY: 'auto',
                marginBottom: '6px'
              },
              append: itemObj.list,
              on: ['touchmove', function(e) {
                e.stopPropagation();
              }]
            }),
            moreBtn = mono.create(mobileLightBox.createItem(mono.global.language.more + ' ' + String.fromCharCode(187)), {
              href: '#',
              on: ['click', function(e) {
                e.preventDefault();
                var state = 'none';
                var elList = this.parentNode.querySelectorAll('.isOptional');
                if (this.dataset.state !== 'open') {
                  this.dataset.state = 'open';
                  this.textContent = mono.global.language.more + ' ' + String.fromCharCode(171);
                  state = 'block';
                } else {
                  this.dataset.state = 'close';
                  this.textContent = mono.global.language.more + ' ' + String.fromCharCode(187);
                }
                for (var i = 0, el; el = elList[i]; i++) {
                  el.style.display = state;
                }
              }]
            }),
            mono.create(mobileLightBox.createItem(mono.global.language.close), {
              on: ['click', function(e) {
                e.preventDefault();
                close();
              }]
            })
          ],
          on: ['click', function(e) {
            e.stopPropagation();
          }]
        })
      });

      setMoreBtnState(itemObj);

      document.body.appendChild(lightbox);

      var topPos = document.body.scrollTop;

      var result = {};

      var close = function() {
        if (!result.isShow) {
          return;
        }

        document.body.scrollTop = topPos;
        result.hide();
      };

      return mono.extend(result, {
        isShow: true,
        el: lightbox,
        hide: function() {
          lightbox.parentNode && lightbox.parentNode.removeChild(lightbox);
          result.isShow = false;
        },
        close: close,
        update: function(itemList) {
          if (lightbox.parentNode === null) {
            return;
          }

          if (!itemList || itemList.length === 0) {
            itemList = mono.global.language.noLinksFound;
          }

          btnBox.textContent = '';
          var itemObj = mobileLightBox.getItems(itemList);

          mono.create(btnBox, {
            append: itemObj.list
          });

          setMoreBtnState(itemObj);
        }
      });
    }
  },

  bridge: function(details) {
    "use strict";
    details.args = details.args || [];
    if (details.timeout === undefined) {
      details.timeout = 300;
    }
    var scriptId = 'sf-bridge-' + parseInt(Math.random() * 1000) + '-' + Date.now();

    var listener = function (e) {
      window.removeEventListener('sf-bridge-' + scriptId, listener);
      var data;
      if (!e.detail) {
        data = undefined;
      } else {
        data = JSON.parse(e.detail);
      }
      details.cb(data);
    };

    window.addEventListener('sf-bridge-' + scriptId, listener);

    var wrapFunc = '(' + (function(func) {
        /* fix */
        var scriptId = "{scriptId}";
        var timeout = parseInt("{timeout}");

        var node = document.getElementById(scriptId);
        if (node) {
          node.parentNode.removeChild(node);
        }

        var fired = false;
        var done = function(data) {
          if (fired) {
            return;
          }
          fired = true;

          var event = new CustomEvent('sf-bridge-' + scriptId, {detail: JSON.stringify(data)});
          window.dispatchEvent(event);
        };

        timeout && setTimeout(function() {
          done();
        }, timeout);

        var args = [/*args*/];
        args.push(done);

        func.apply(null, args);
    }).toString() + ')(' + details.func.toString() + ');';

    wrapFunc = wrapFunc.replace('{scriptId}', scriptId);
    wrapFunc = wrapFunc.replace('{timeout}', details.timeout);
    wrapFunc = wrapFunc.replace('[/*args*/]', JSON.stringify(details.args));

    /*@if isVkOnly=0>*/
    if (mono.isSafari) {
      var safariFix = function() {
        if (typeof CustomEvent === 'undefined') {
          CustomEvent = function (event, params) {
            params = params || { bubbles: false, cancelable: false };
            var evt = document.createEvent('CustomEvent');
            evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
            return evt;
          };
          CustomEvent.prototype = window.Event.prototype;
        }
      };
      wrapFunc = wrapFunc.replace('/* fix */', '('+safariFix.toString()+')();');
    } else
    if (mono.isOpera) {
      wrapFunc = wrapFunc.replace('/* fix */', 'var CustomEvent = window.CustomEvent;');
    }
    /*@if isVkOnly=0<*/

    var script = mono.create('script', {
      id: scriptId,
      text: wrapFunc
    });
    document.body.appendChild(script);
  }
};
/*@if isVkOnly=0>*/
SaveFrom_Utils.tutorial = {
  getYtSlideList: function(type) {
    "use strict";
    var logoImg = 'data:image/png;base64,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';
    var arrowImg = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAWCAYAAAArdgcFAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAV1JREFUeNpiZNgexQAEhkDcDsQ2QMzNQD74CsRHgLgSiM+zAAkjID4MxFwMlAOQw9yB2BaEmaAupobByABkXjsTNChoAWxYCLl6qX42Q5SkFYb4sufHGKIvTsXreiYGGoJRw4eZ4YzA7P8fXbBFNZTBXEAFzNbhkWGQYBfA0Pji5weGK1+egNknP9xhqLm9GkMNCzYbJz7cyXBW2pZBlkMYp6tAFoLwkx/vcKZ3rMHy+tcnBu+z3Qyf/nzH6+3Pf34weJ3tYngFVE9SmF/+/Jgh9tI0hr///2GVB4nHXJoKVkdWhG56dY6h/OZyrHIVt1aA5SlKLb0PtjHMfrwfRWzOk/0MPfe3Uicp5lxfwLDv7VUwG0RnX1tAdDr/RkjRr39/GMIuTGLY8eYiQ/jFyWA+EeAbKJ3vBDLcaJCHdjFB67tvVDYYZF4lyPBz0NpoFxUsAenfDcR2IHMBAgwACpV16b/HM30AAAAASUVORK5CYII=';

    var language = mono.global.language;

    var langPrepare = (function(langCode, nodeList) {
      var imgList;
      var linkList;
      var img, link, node, i, n;

      for (n = 0; node = nodeList[n]; n++) {
        imgList = node.querySelectorAll('img[src="#logo"]');
        for (i = 0; img = imgList[i]; i++) {
          img.src = logoImg;
          img.width = 16;
          img.style.verticalAlign = 'baseline';
        }

        imgList = node.querySelectorAll('img[src="#arrow"]');
        for (i = 0; img = imgList[i]; i++) {
          img.src = arrowImg;
          img.width = 16;
          img.style.verticalAlign = 'baseline';
        }

        linkList = node.querySelectorAll('a[href="#support"]');
        for (i = 0; link = linkList[i]; i++) {
          link.href = 'http://savefrom.userecho.com';
          link.target = '_blank';
          link.style.color = '#1795b9';
        }

        linkList = node.querySelectorAll('a[href="#vk"]');
        for (i = 0; link = linkList[i]; i++) {
          link.href = 'https://vk.com/savefrom_net';
          link.target = '_blank';
          link.style.color = '#1795b9';
        }

        linkList = node.querySelectorAll('a[href="#fb"]');
        for (i = 0; link = linkList[i]; i++) {
          link.href = 'https://www.facebook.com/SaveFromNetEn';
          link.target = '_blank';
          link.style.color = '#1795b9';
        }
      }
    }).bind(null, language.lang);

    var styleFix = {
      en: {
        tutorialS1Main: {
          margin: '0px 17px'
        }
      },
      ru: {
        tutorialS2Main: {
          margin: '0px 18px',
          width: 'initial'
        },
        tutorialS4Main: {
          top: '228px',
          margin: '0px 16px',
          width: 'initial'
        },
        tutorialS5Main: {
          margin: '0 10px'
        }
      },
      de: {
        tutorialS1Arrow: {
          right: '28px'
        },
        tutorialS3Main: {
          margin: 0,
          width: 'initial',
          top: '228px'
        },
        tutorialS4Main: {
          margin: 0,
          width: 'initial',
          top: '228px'
        }
      },
      id: {
        tutorialS1Arrow: {
          width: '175px'
        },
        tutorialS3Main: {
          margin: '0 6px',
          top: '228px',
          width: 'initial'
        }
      },
      es: {
        tutorialS1Arrow: {
          width: '160px'
        },
        tutorialS3Main: {
          top: '228px'
        },
        tutorialS4Main: {
          margin: '0 14px',
          width: 'initial',
          top: '228px'
        }
      },
      tr: {
        tutorialS1Title: {
          fontSize: '32px',
          marginTop: '40px'
        },
        tutorialS1Main: {
          marginTop: '-14px'
        },
        tutorialS1Arrow: {
          width: '187px'
        },
        tutorialS3Main: {
          top: '228px'
        },
        tutorialS4Main: {
          top: '228px'
        },
        tutorialS5Title: {
          fontSize: '32px',
          marginTop: '40px'
        }
      },
      fr: {
        tutorialS3Main: {
          top: '228px'
        },
        tutorialS4Main: {
          top: '228px',
          margin: 0,
          width: 'initial'
        },
        tutorialS5Main: {
          margin: '0 18px'
        }
      },
      uk: {
        tutorialS1Arrow: {
          width: '175px'
        },
        tutorialS5Main: {
          margin: '0 18px'
        }
      }
    };

    styleFix = styleFix[mono.global.language.lang] || styleFix.en;

    var slideList = [
      mono.create(document.createDocumentFragment(), {
        append: [
          mono.create('span', {
            style: {
              display: 'block',
              color: '#a4a1a1',
              fontSize: '20px',
              textAlign: 'center',
              margin: '28px 0'
            },
            append: [
              mono.create('img', {
                style: {
                  verticalAlign: 'middle',
                  marginRight: '18px'
                },
                src: logoImg,
                width: 44
              }),
              language.extName
            ]
          }),
          mono.create('span', {
            style: mono.extend({
              display: 'block',
              color: '#84bd07',
              fontSize: '40px',
              textAlign: 'center',
              marginBottom: '28px'
            }, styleFix.tutorialS1Title),
            text: language.tutorialS1Title
          }),
          mono.create('span', {
            style: mono.extend({
              display: 'block',
              color: '#666',
              fontSize: '25px',
              textAlign: 'center',
              margin: '0 22px'
            }, styleFix.tutorialS1Main),
            append: mono.parseTemplate(language.tutorialS1Main)
          }),
          mono.create('span', {
            style: mono.extend({
              position: 'absolute',
              display: 'block',
              textAlign: 'center',
              width: '145px',
              fontSize: '15px',
              color: '#666',
              right: '48px',
              bottom: '10px'
            }, styleFix.tutorialS1Arrow),
            append: mono.parseTemplate(language.tutorialS1Arrow)
          }),
          mono.create('img', {
            src: type !== 'black' ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACYAAAAjCAYAAAD48HgdAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAAsSAAALEgHS3X78AAACBklEQVRYw83YTYhNYRgH8N/1MY2PNBtWGrGxkFFTrERZYGGjlNSrZzs2FmZpEvlaiJUasnqbk5TNiAVWLBSaMEgUpiwokQULX2Ms7pm6GaZJzT3nX6dz73ufOr+e99z3fDSKnDdjPToxF+P4hs/4iHd4jfcp4qc2ZV65/4IP+FXiOrEE3diGZWgUOb/FC9zDaIr4MluwxkwLi5yXoqfcNmBxibyGuyniayWwv0CXYwt2owNXMJgixiuF/YHsxX5sxECKuFQLWIlrYA0OYCmOpIiRymEtwHnYgcBVDKWIH5XDWoArcR6vUsS+2sBKXCdOYRH6U8SnWsBK3AIcQxf6/mdaZxt4rsj55Ezr57TRdhC9Rc57Z1I861PZmiLnbgwjpYhn09W2s2NSxBucwEA7jzvjFDlfLnLeOl1NWzvWkrPoryPsDt4VOe+qFay84RzCP68IVXUMbqO7yHlFrWBl14axp1awMhexvch5bq1gKeIhFmLKdFbdMXiq+RxRO9hjrK0jbBSr6wh7ghVFzvNbB9t6dzGZIufDWIXTKWK0yPmW5rLRhUMYqwrWofk034Mz6NX8E/RhBJsqgZW4XtzXfCUxme9YlyKeV7nyP9C8XrbmQop4TvUn/3FMlJ8ncHryh6pX/pe4WX59lCLGagErM1juj7YO1gF2Q/Pl4PWqIVNS5Lzzz7HfNv+X/HfgpHUAAAAASUVORK5CYII=' : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACYAAAAjCAYAAAD48HgdAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAdNJREFUeNrM2EsoRFEcx/EZw4QkCiuRRylCTbFVFljIQlMeJVuTHSspETtZKDWkpJSVBbFSFhYKaTwXiLGjRBaUt/E9+t+axtDVjHvPrz7NLGamX+fce+ac6wyFQjUOh6MKyXDhHc+4xy2uEMQ13hwWJVFeH3CDDymnSqYjD/XIgROXOMEW9uV7/xInI2b2s9moENVIk5Ir2MSTXcUik4tatMCNJfjlUog9qlgceDCLM7TG4zdjGbFvo48y9Mi0D2HHjqn87YZqRCeWMYdXHYoZKcAUzuH765cT/nEpukCTrH0zyNRlxIykYAQZ6DI7rVYUMzKJO/TZPZWR6YcHHVauY2blIYBSK9cxs/GiGe26TKWRBSShTrdiKhPo1bHYhuzzvLoVe5O/Kp9uxVTWZSOar1sxNWqLaNOtmMo8GmQ7r1WxXaRGm067i6kcyTlCu2IHKNexmDoGluhY7FCusaRoB16rM4hCjMmIqSNflmwmB752vxZvewxu7OIdo1jDOJ6xAZcd2x4jatO4HbGGvaASx3ZeYwH5vwzPtCpl9Z4/WopxKodlVaRITle235VnWJX3e0YpXZYLv7wO23V8+ynqWVxQpvFRpxFTz9W6w0upfAowAMpXzPWPJzeOAAAAAElFTkSuQmCC',
            style: {
              position: 'absolute',
              right: '10px',
              bottom: '2px'
            },
            width: 38,
            height: 35
          })
        ]
      }),

      mono.create(document.createDocumentFragment(), {
        append: [
          mono.create('span', {
            style: {
              display: 'inline-block',
              marginTop: '37px',
              width: '430px',
              position: 'relative'
            },
            append: [
              mono.create('img', {
                src: 'data:image/png;base64,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',
                width: 430,
                height: 219
              }),
              mono.create('span', {
                text: mono.global.language.download,
                style: {
                  position: 'absolute',
                  top: '184px',
                  left: '168px',
                  fontSize: '14px',
                  color: '#fff',
                  width: '84px'
                }
              }),
              mono.create('span', {
                text: language.tutorialS2Main,
                style: mono.extend({
                  position: 'absolute',
                  display: 'block',
                  top: '238px',
                  left: '0px',
                  fontSize: '18px',
                  color: '#333',
                  margin: '0 -22px',
                  width: '474px'
                }, styleFix.tutorialS2Main)
              })
            ]
          })
        ]
      }),

      mono.create(document.createDocumentFragment(), {
        append: [
          mono.create('span', {
            style: {
              display: 'inline-block',
              marginTop: '37px',
              width: '430px',
              position: 'relative'
            },
            append: [
              mono.create('img', {
                src: 'data:image/png;base64,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',
                width: 430,
                height: 209
              }),
              mono.create('span', {
                text: language.tutorialS3History,
                style: {
                  position: 'absolute',
                  top: '143px',
                  left: '55px',
                  fontSize: '14px',
                  color: '#fff'
                }
              }),
              mono.create('span', {
                append: mono.parseTemplate(language.tutorialS3Main),
                style: mono.extend({
                  position: 'absolute',
                  display: 'block',
                  top: '238px',
                  left: '0px',
                  fontSize: '18px',
                  color: '#333',
                  margin: '0 -22px',
                  width: '474px'
                }, styleFix.tutorialS3Main)
              })
            ]
          })
        ]
      }),

      mono.create(document.createDocumentFragment(), {
        append: [
          mono.create('span', {
            style: {
              display: 'inline-block',
              marginTop: '37px',
              width: '430px',
              position: 'relative'
            },
            append: [
              mono.create('img', {
                src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAa4AAADRCAYAAACU9lY6AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpCMzdBMTc3MDJDM0NFNTExOUVBNEUxMTFGMUJDRTg1QyIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpCMEU3MDY3MzQwMjAxMUU1QkNGMEQyMjZDODREREUzNyIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpCMEU3MDY3MjQwMjAxMUU1QkNGMEQyMjZDODREREUzNyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M2IChXaW5kb3dzKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjQ1OTAzRDM5RkYzRkU1MTE5REQyQUUwQ0M4QzA1OEE3IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkIzN0ExNzcwMkMzQ0U1MTE5RUE0RTExMUYxQkNFODVDIi8+IDwvcmRmOkRlc2NyaXB0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',
                width: 430,
                height: 209
              }),
              mono.create('span', {
                append: mono.parseTemplate(language.tutorialS4Main),
                style: mono.extend({
                  position: 'absolute',
                  display: 'block',
                  top: '238px',
                  left: '0px',
                  fontSize: '18px',
                  color: '#333',
                  margin: '0 -22px',
                  width: '474px'
                }, styleFix.tutorialS4Main)
              })
            ]
          })
        ]
      }),

      mono.create(document.createDocumentFragment(), {
        append: [
          mono.create('span', {
            style: {
              display: 'inline-block',
              width: '430px',
              position: 'relative'
            },
            append: [
              mono.create('span', {
                style: mono.extend({
                  display: 'block',
                  color: '#84bd07',
                  fontSize: '40px',
                  margin: '67px 0 32px 0'
                }, styleFix.tutorialS5Title),
                text: language.tutorialS5Title
              }),
              mono.create('span', {
                style: mono.extend({
                  display: 'block',
                  color: '#333',
                  fontSize: '18px'
                }, styleFix.tutorialS5Main),
                append: mono.parseTemplate(language.tutorialS5Main)
              }),
              mono.create('span', {
                style: {
                  display: 'block',
                  color: '#666',
                  fontSize: '14px',
                  marginTop: '50px'
                },
                append: [
                  mono.create('img', {
                    style: {
                      verticalAlign: 'middle',
                      marginRight: '11px'
                    },
                    src: logoImg,
                    width: 29
                  }),
                  language.extName
                ]
              })
            ]
          })
        ]
      })
    ];

    langPrepare(slideList);

    return slideList;
  },
  getImage: function(type, color) {
    "use strict";
    var img;
    color = color || '#A6A2A3';
    var head = '<?xml version="1.0" encoding="UTF-8"?>';
    if (type === 'arrowLeft') {
      img = '<svg height="512px" style="enable-background:new 0 0 512 512;" version="1.1" viewBox="0 0 512 512" width="512px" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><polygon fill="'+color+'" points="352,128.4 319.7,96 160,256 160,256 160,256 319.7,416 352,383.6 224.7,256 "/></svg>';
    } else
    if (type === 'arrowRight') {
      img = '<svg height="512px" style="enable-background:new 0 0 512 512;" version="1.1" viewBox="0 0 512 512" width="512px" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><polygon fill="'+color+'" points="160,128.4 192.3,96 352,256 352,256 352,256 192.3,416 160,383.6 287.3,256 "/></svg>'
    }
    return 'data:image/svg+xml;base64,' + btoa(head + img);
  },
  setSlide: function(details, index) {
    "use strict";
    index = parseInt(index);
    if (index < 0) {
      index = 0;
    }
    var max = details.slideList.length - 1;
    if (index > max) {
      index = max;
    }

    if (index === 0) {
      details.leftBtn.classList.add('hide');
    } else {
      details.leftBtn.classList.remove('hide');
    }

    if (index === max) {
      details.rightBtn.classList.add('hide');
    } else {
      details.rightBtn.classList.remove('hide');
    }

    var oldDot = details.dotContainer.querySelector('.sf-dot.active');
    var dot = details.dotContainer.querySelector('.sf-dot[data-index="' + index + '"]');

    oldDot && oldDot.classList.remove('active');
    dot.classList.add('active');

    var posLeft = index * details.slide.width;
    details.slider.firstChild.style.marginLeft = (posLeft * -1) + 'px';

    details.index = index;

    if (details.viewSlideList.indexOf(index) === -1) {
      details.viewSlideList.push(index);
    }

    if (details.startTime === 0 && index > 0) {
      details.startTime = Date.now();
    }
  },
  switchSlide: function(details, direct) {
    "use strict";
    var newIndex = details.index;
    if (direct) {
      newIndex++;
    } else {
      newIndex--;
    }

    this.setSlide(details, newIndex);
  },
  onResize: function(details) {
    "use strict";
    var height = window.innerHeight;
    details.box.style.paddingTop = parseInt((height - details.height - details.padding * 2) / 2) + 'px';
    details.box.style.height = height + 'px';
  },
  getLiveTime: function(startTime) {
    "use strict";
    var time = Date.now() - startTime;
    time = parseInt(time / 1000);
    var liveTime = 0;
    if (time < 11) {
      liveTime = time;
    } else
    if (time < 31) {
      liveTime = 15;
    } else
    if (time < 61) {
      liveTime = 30;
    } else
    if (time < 121) {
      liveTime = 60;
    } else
    if (time < 181) {
      liveTime = 90;
    } else {
      liveTime = 180;
    }
    return liveTime;
  },
  sendStat: function(details) {
    "use strict";
    if (!details.trackId) {
      return;
    }
    var viewSlideList = details.viewSlideList;
    viewSlideList.sort();
    var slideList = viewSlideList.join(',');
    mono.sendMessage({action: 'trackEvent', category: 'tutorial', event: 'slides' + details.trackId, label: slideList, params: {tid: 'UA-7055055-11'}});

    if (details.startTime > 0) {
      var liveTime = this.getLiveTime(details.startTime);
      if (liveTime > 0) {
        mono.sendMessage({action: 'trackEvent', category: 'tutorial', event: 'time' + details.trackId, label: liveTime, params: {tid: 'UA-7055055-11'}});
      }
    }
  },
  onClose: function(details) {
    "use strict";
    details.container.removeEventListener('click', details.onBodyClick);
    window.removeEventListener('resize', details._onResize);

    if (details.withOpacity) {
      details.box.style.opacity = 0;
      setTimeout(function() {
        details.box.parentNode.removeChild(details.box);
      }, 500);
    } else {
      details.box.parentNode.removeChild(details.box);
    }

    details.checkExists(function(isExists) {
      !isExists && this.sendStat(details);

      details.onClose && details.onClose();
    }.bind(this));
  },
  getContent: function(details) {
    "use strict";
    var fullWidth = 0;
    var container = mono.create('div', {
      class: 'sf-slider-conteiner'
    });
    details.slideList.forEach(function(data, index) {
      var slide = mono.create('div', {
        data: {
          index: index
        },
        style: {
          display: 'inline-block',
          height: details.slide.height + 'px',
          width: details.slide.width + 'px',
          position: 'relative',
          verticalAlign: 'top',
          textAlign: 'center'
        },
        append: [
          data
        ]
      });
      fullWidth += details.slide.width;
      container.appendChild(slide);
    });

    container.style.width = fullWidth + 'px';
    return [container];
  },
  getDotList: function(details) {
    "use strict";
    var _this = this;
    var nodeList = [];
    var count = details.slideList.length;
    for (var i = 0; i < count; i++) {
      nodeList.push(mono.create('a', {
        class: 'sf-dot',
        data: {
          index: i
        },
        href: '#',
        on: ['click', function(e) {
          e.preventDefault();
          _this.setSlide(details, this.dataset.index);
        }],
        append: mono.create('i')
      }));
    }
    return nodeList;
  },
  onBodyClick: function(details) {
    "use strict";
    details.bodyClickCount++;
    if (details.bodyClickCount < 2) {
      return;
    }

    details._onClose();
  },
  show: function(_details) {
    "use strict";
    var _this = SaveFrom_Utils.tutorial;

    var details = {
      container: document.body,
      width: 564,
      height: 398,
      padding: 8,
      slide: {},
      viewSlideList: [],
      startTime: 0,
      margin: 0
    };

    for (var key in _details) {
      details[key] = _details[key];
    }

    details.width -= details.padding * 2;
    details.height -= details.padding * 2;

    details.slide.width = details.width;
    details.slide.height = details.height - 34;

    details._onResize = mono.debounce((details.onResize || _this.onResize).bind(_this, details), 250);
    details._onClose = _this.onClose.bind(_this, details);
    details.setSlide = _this.setSlide.bind(_this, details);
    details.onBodyClick = _this.onBodyClick.bind(_this, details);
    details.bodyClickCount = 0;

    var boxClassName = details.boxClassName || 'sf-tutorial-box';

    details.box = mono.create('div', {
      class: boxClassName,
      style: mono.extend({
        position: 'fixed',
        width: '100%',
        textAlign: 'center',
        display: 'block',
        zIndex: 9999999,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        top: 0
      }, details.boxStyle),
      append: [
        mono.create('div', {
          class: 'sf-tutorial-container',
          style: mono.extend({
            display: 'inline-block',
            width: details.width + 'px',
            height: details.height + 'px',
            backgroundColor: '#eee',
            fontFamily: 'Arial',
            lineHeight: 'normal',
            borderRadius: '6px',
            textAlign: 'left',
            position: 'relative',
            padding: details.padding + 'px',
            boxShadow: '0 0 25px rgba(0, 0, 0, 0.5)'
          }, details.containerStyle),
          on: ['click', function(e) {
            e.stopPropagation();
          }],
          append: [
            details.slider = mono.create('div', {
              class: 'sf-slider',
              style: mono.extend({
                backgroundColor: '#fff',
                borderRadius: '6px',
                height: details.slide.height + 'px',
                width: details.slide.width + 'px',
                overflow: 'hidden'
              }, details.slideStyle),
              append: _this.getContent(details)
            }),
            mono.create('div', {
              class: 'sf-contorls',
              style: {
                position: 'relative'
              },
              append: [
                details.leftBtn = mono.create('a', {
                  class: ['sf-btn', 'left'],
                  href: '#',
                  style: mono.extend({
                    position: 'absolute',
                    top: '8px',
                    left: 0,
                    width: '16px',
                    height: '27px'
                  }, details.leftBtnStyle),
                  on: ['click', function(e) {
                    e.preventDefault();
                    _this.switchSlide.call(_this, details, 0);
                  }]
                }),
                details.dotContainer = mono.create('div', {
                  class: ['sf-dots'],
                  append: _this.getDotList(details)
                }),
                details.rightBtn = mono.create('a', {
                  class: ['sf-btn', 'right'],
                  href: '#',
                  style: mono.extend({
                    position: 'absolute',
                    top: '8px',
                    right: 0,
                    width: '16px',
                    height: '27px'
                  }, details.rightBtnStyle),
                  on: ['click', function(e) {
                    e.preventDefault();
                    _this.switchSlide.call(_this, details, 1);
                  }]
                })
              ]
            }),
            mono.create('a', {
              class: ['sf-btn', 'close'],
              text: 'x',
              href: '#',
              style: mono.extend({
                display: 'block',
                position: 'absolute',
                borderRadius: '9px',
                right: '10px',
                top: '10px',
                backgroundColor: '#ccc',
                width: '18px',
                height: '18px',
                textAlign: 'center',
                textDecoration: 'none',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '14px',
                lineHeight: '16px'
              }, details.closeBtnStyle),
              on: ['click', function(e) {
                e.preventDefault();
                details._onClose();
              }]
            })
          ]
        }),
        mono.create('style', {
          text: mono.styleObjToText(mono.extend({
            '': {
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              OUserSelect: 'none',
              userSelect: 'none'
            },
            '.sf-slider .sf-slider-conteiner': {
              transition: 'margin-left 0.5s'
            },
            '.sf-contorls .sf-btn.left': {
              backgroundImage: 'url(' + this.getImage('arrowLeft', details.arrowColor) + ')',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '44px'
            },
            '.sf-contorls .sf-btn.left.hide': {
              display: 'none'
            },
            '.sf-contorls .sf-btn.right': {
              backgroundImage: 'url(' + this.getImage('arrowRight', details.arrowColor) + ')',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '44px'
            },
            '.sf-contorls .sf-btn.right.hide': {
              display: 'none'
            },
            '.sf-contorls .sf-btn.left:hover': {
              backgroundImage: 'url(' + this.getImage('arrowLeft', details.arrowColorActive || '#00b75a') + ')'
            },
            '.sf-contorls .sf-btn.right:hover': {
              backgroundImage: 'url(' + this.getImage('arrowRight', details.arrowColorActive || '#00b75a') + ')'
            },
            '.sf-dots': {
              textAlign: 'center',
              paddingTop: '5px'
            },
            '.sf-dot': {
              display: 'inline-block',
              padding: '8px'
            },
            '.sf-dot i': {
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '4px',
              backgroundColor: '#a4a1a1'
            },
            '.sf-dot.active i': {
              backgroundColor: '#00b75a'
            }
          }, details.cssStyle), '.' + boxClassName + ' .sf-tutorial-container')
        })
      ]
    });

    details.setSlide(0);
    (details.onResize || _this.onResize).call(_this, details);

    setTimeout(function() {
      if (details.withOpacity) {
        details.box.style.transition = 'opacity 0.5s';
        details.box.style.opacity = 0;
        details.container.appendChild(details.box);
        setTimeout(function() {
          details.box.style.opacity = 1;
        }, 50);
      } else {
        details.container.appendChild(details.box);
      }
      details.onShow && details.onShow();
    }, details.withDelay);

    window.addEventListener('resize', details._onResize);

    details.container.addEventListener('click', details.onBodyClick);
  }
};

SaveFrom_Utils.tutorialTooltip = {
  getTooltipEl: function(details) {
    "use strict";
    var language = mono.global.language;

    var zIndex = (function() {
      var zIndex = 1000;
      var top = document.getElementById('masthead-positioner');
      var styleList = top && window.getComputedStyle(top, null);
      if (styleList) {
        zIndex = parseInt(styleList.getPropertyValue('z-index')) + 1;
      }
      return zIndex;
    })();

    var box = mono.create('div', {
      class: 'sf-tooltip',
      on: ['mouseup', function(e) {
        e.stopPropagation();
      }],
      append: [
        mono.create('span', {
          style: {
            display: 'inline-block',
            border: '8px solid transparent',
            borderRight: '10px solid #4D4D4D',
            borderLeft: 0,
            width: 0,
            top: '8px',
            left: '0px',
            position: 'absolute'
          }
        }),
        mono.create('span', {
          style: {
            display: 'inline-block',
              backgroundColor: '#4D4D4D',
              marginLeft: '10px',
              padding: '10px 10px',
              maxWidth: '220px',
              lineHeight: '16px',
              fontSize: '14px',
              fontFamily: 'font-family: arial, sans-serif',
              color: '#fff'
          },
          append: [
            mono.create('p', {
              style: {
                margin: 0
              },
              append: mono.parseTemplate(language.tutorialTooltipText)
            }),
            mono.create('a', {
              class: 'sf-button',
              text: 'OK',
              style: {
                display: 'inline-block',
                textAlign: 'center',
                textDecoration: 'none',
                padding: '0 10px',
                cssFloat: 'right',

                marginTop: '5px',
                lineHeight: '20px',
                borderRadius: '3px',
                fontSize: '12px',
                color: '#fff',
                fontWeight: 'bolder',
                backgroundColor: '#167AC6'
              },
              on: ['click', (function(e) {
                e.preventDefault();
                details._onClose();
              }).bind(this)]
            }),
            mono.create('style', {
              text: mono.styleObjToText({
                '': {
                  position: 'absolute',
                  zIndex: zIndex + 2
                },
                '.sf-button:hover': {
                  backgroundColor: '#126db3 !important'
                },
                '.sf-button:active': {
                  opacity: 0.9
                }
              }, '.sf-tooltip')
            })
          ]
        })
      ]
    });

    return box;
  },
  onClose: function(details, isHide) {
    "use strict";
    if (details.fired) {
      return;
    }
    details.fired = true;

    if (details.tooltipEl.parentNode) {
      details.tooltipEl.parentNode.removeChild(details.tooltipEl);
    }

    window.removeEventListener('resize', details._onResize);
    details.target.removeEventListener('mouseup', details._onClose);

    if (isHide === 1) {
      return;
    }

    if (details.startTime > 0) {
      var liveTime = SaveFrom_Utils.tutorial.getLiveTime(details.startTime);
      if (liveTime > 0) {
        mono.sendMessage({action: 'trackEvent', category: 'tutorial', event: 'timeTooltip' + details.trackId, label: liveTime, params: {tid: 'UA-7055055-11'}});
      }
    }

    details.onClose && details.onClose(isHide);
  },
  onResize: function(details) {
    "use strict";
    var btn = details.target;
    if (!btn.offsetParent || !btn.parentNode) {
      return details._onClose(1);
    }

    var btnPos = SaveFrom_Utils.getPosition(btn, details.tooltipContainer);
    var top = btnPos.top + details.btnTopOffset;
    var left = btnPos.left + btnPos.width + details.btnLeftOffset;
    details.tooltipEl.style.top = top + 'px';
    details.tooltipEl.style.left = left + 'px';
  },
  insert: function(_details) {
    "use strict";
    var details = {
      btnTopOffset: -3,
      btnLeftOffset: 0,
      startTime: Date.now(),
      fired: false
    };
    for (var key in _details) {
      details[key] = _details[key];
    }

    if (details.target.dataset.sfHasTooltip === '1') {
      return;
    }
    details.target.dataset.sfHasTooltip = '1';

    details._onResize = mono.debounce(this.onResize.bind(this, details), 250);
    details._onClose = this.onClose.bind(this, details);

    details.tooltipEl = this.getTooltipEl(details);

    details.target.addEventListener('mouseup', details._onClose);

    details.target.addEventListener('sf-removed', function() {
      details._onClose(1);
    });

    window.addEventListener('resize', details._onResize);

    this.onResize.call(this, details);

    document.body.appendChild(details.tooltipEl);

    return details;
  }
};
/*@if isVkOnly=0<*/

SaveFrom_Utils.mutationWatcher = {
  getMutationObserver: function() {
    "use strict";
    var MutationObserverCtor = null;
    if (typeof MutationObserver !== 'undefined') {
      MutationObserverCtor = MutationObserver;
    } else
    if (typeof WebKitMutationObserver !== 'undefined') {
      MutationObserverCtor = WebKitMutationObserver;
    } else
    if (typeof MozMutationObserver !== 'undefined') {
      MutationObserverCtor = MozMutationObserver;
    } else
    if (typeof JsMutationObserver !== 'undefined') {
      MutationObserverCtor = JsMutationObserver;
    }
    return MutationObserverCtor;
  },
  isAvailable: function() {
    "use strict";
    return !!this.getMutationObserver();
  },
  disconnect: function(details) {
    "use strict";
    details.observer.disconnect();
  },
  connect: function(details) {
    "use strict";
    details.observer.observe(details.target, details.config);
  },
  joinMutations: function(mutations) {
    "use strict";
    var jMutations = [];
    var targetList = [];

    var jObj = {}, obj, hasNodes;
    var mutation, i, node, tIndex;
    while(mutation =  mutations.shift()) {
      tIndex = targetList.indexOf(mutation.target);

      if (tIndex === -1) {
        tIndex = targetList.push(mutation.target) - 1;
        jObj[tIndex] = {
          target: mutation.target,
          added: [],
          removed: []
        };
      }

      obj = jObj[tIndex];
      hasNodes = undefined;

      for (i = 0; node = mutation.addedNodes[i]; i++) {
        if (node.nodeType !== 1) {
          continue;
        }

        obj.added.push(node);
        hasNodes = true;
      }

      for (i = 0; node = mutation.removedNodes[i]; i++) {
        if (node.nodeType !== 1) {
          continue;
        }

        obj.removed.push(node);
        hasNodes = true;
      }

      if (hasNodes !== undefined && obj.inList === undefined) {
        obj.inList = true;
        jMutations.push(obj);
      }
    }

    return jMutations;
  },
  isMatched: null,
  prepareMatched: function() {
    "use strict";
    if (this.isMatched) {
      return;
    }

    var el = document.createElement('div');

    if (typeof el.matches === 'function') {
      this.isMatched = function(node, selector){
        return node.matches(selector);
      };
    } else
    if (typeof el.matchesSelector === 'function') {
      this.isMatched = function(node, selector){
        return node.matchesSelector(selector);
      };
    } else
    if (typeof el.webkitMatchesSelector === 'function') {
      this.isMatched = function(node, selector){
        return node.webkitMatchesSelector(selector);
      };
    } else
    if (typeof el.mozMatchesSelector === 'function') {
      this.isMatched = function(node, selector){
        return node.mozMatchesSelector(selector);
      };
    } else
    if (typeof el.oMatchesSelector === 'function') {
      this.isMatched = function(node, selector){
        return node.oMatchesSelector(selector);
      };
    } else
    if (typeof el.msMatchesSelector === 'function') {
      this.isMatched = function(node, selector){
        return node.msMatchesSelector(selector);
      };
    }

    el = null;
  },
  match: function(details, summaryList, mutation) {
    "use strict";
    var _this = this;
    var node, i, query, n;
    var queries = details.queries;
    var hasChanges = false;
    ['added', 'removed'].forEach(function(type) {
      var nodeList = mutation[type];
      for (n=0; node = nodeList[n]; n++) {
        for(i = 0; query = queries[i]; i++) {
          if (query.is !== undefined && query.is !== type) {
            continue;
          }
          var nodeArr = summaryList[i][type];
          if (_this.isMatched(node, query.css) === true) {
            nodeArr.push(node);
          } else {
            nodeArr.push.apply(nodeArr, node.querySelectorAll(query.css));
          }

          if (hasChanges === false) {
            hasChanges = nodeArr[0] !== undefined;
          }
        }
      }
    });

    return hasChanges;
  },
  filterTarget: function(queries, node) {
    "use strict";
    var i, query;
    for(i = 0; query = queries[i]; i++) {
      if (this.isMatched(node, query.css) === true) {
        return true;
      }
    }
    return false;
  },
  run: function(_details) {
    "use strict";
    var _this = this;
    var details = {
      config: {
        childList: true,
        subtree: true
      },
      target: document.body,
      filterTarget: []
    };
    mono.extend(details, _details);

    details._disconnect = this.disconnect.bind(this, details);
    details._connect = this.connect.bind(this, details);
    details._match = this.match.bind(this, details);

    var _summaryList = [];
    for(var i = 0; i < details.queries.length; i++) {
      _summaryList.push({
        added: [],
        removed: []
      });
    }
    _summaryList = JSON.stringify(_summaryList);

    this.prepareMatched();

    var mObserver = this.getMutationObserver();
    details.observer = new mObserver(function (mutations) {
      // console.time('o');
      var jMutations = _this.joinMutations(mutations);
      if (jMutations.length === 0) {
        // console.timeEnd('o');
        return;
      }

      var hasChanges = false;
      var mutation;
      var summaryList = JSON.parse(_summaryList);
      while(mutation = jMutations.shift()) {
        // console.log('mutation', mutation);
        if (_this.filterTarget(details.filterTarget, mutation.target) === false) {
          if (details._match(summaryList, mutation) === true) {
            hasChanges = true;
          }
        }
      }

      hasChanges === true && details.callback(summaryList);
      // console.timeEnd('o');
    });

    details.start = function() {
      details._disconnect();
      details._connect();

      var hasChanges = false;
      var summaryList = JSON.parse(_summaryList);

      var mutation = {
        added: [details.target],
        removed: []
      };
      if (details._match(summaryList, mutation)) {
        hasChanges = true;
      }

      hasChanges === true && details.callback(summaryList);
    };

    details.stop = function() {
      details._disconnect();
    };

    details.start();

    return details;
  }
};

SaveFrom_Utils.mutationAttrWatcher = {
  isAvailable: function() {
    "use strict";
    return !!SaveFrom_Utils.mutationWatcher.getMutationObserver();
  },
  disconnect: function(details) {
    "use strict";
    details.observer.disconnect();
  },
  connect: function(details) {
    "use strict";
    details.observer.observe(details.target, details.config);
  },
  run: function(_details) {
    "use strict";
    var _this = this;

    var details = {
      config: {
        attributes: true,
        childList: false,
        attributeOldValue: true
      },
      target: document.body
    };

    mono.extend(details, _details);

    if (!Array.isArray(details.attr)) {
      details.attr = [details.attr];
    }

    details.config.attributeFilter = details.attr;

    details._disconnect = this.disconnect.bind(this, details);
    details._connect = this.connect.bind(this, details);

    var _summaryList = [];
    for(var i = 0; i < details.attr.length; i++) {
      _summaryList.push({});
    }
    _summaryList = JSON.stringify(_summaryList);

    var mObserver = SaveFrom_Utils.mutationWatcher.getMutationObserver();
    details.observer = new mObserver(function (mutations) {
      var hasChanges = false;
      var mutation;
      var summaryList = JSON.parse(_summaryList);
      while(mutation = mutations.shift()) {
        // console.log('mutation', mutation);
        var index = details.attr.indexOf(mutation.attributeName);
        if (index === -1) {
          continue;
        }

        var value = mutation.target.getAttribute(mutation.attributeName);
        if (value === mutation.oldValue) {
          continue;
        }

        summaryList[index] = {
          value: value,
          oldValue: mutation.oldValue
        };

        hasChanges = true;
      }

      hasChanges === true && details.callback(summaryList);
    });

    details.start = function() {
      details._disconnect();
      details._connect();

      var hasChanges = false;
      var summaryList = JSON.parse(_summaryList);

      for (var i = 0, attributeName; attributeName = details.attr[i]; i++) {
        var value = details.target.getAttribute(attributeName);
        if (value === null) {
          continue;
        }
        summaryList[i] = {
          value: value,
          oldValue: null
        };

        hasChanges = true;
      }

      hasChanges === true && details.callback(summaryList);
    };

    details.stop = function() {
      details._disconnect();
    };

    details.start();

    return details;
  }
};
