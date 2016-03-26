// ==UserScript==
// @exclude *
// ==/UserScript==

var utils = {
  getFileSize: function(message, cb) {
    "use strict";
    var url = message.url;
    var response = {
      fileSize: 0,
      fileType: '',
      status: 0
    };
    mono.request({
      url: url,
      type: 'HEAD'
    }, function(err, resp) {
      if (err) {
        return cb(response);
      }

      response.status = resp.statusCode;

      var contentLength = parseInt(resp.headers['content-length']);
      if(contentLength) {
        response.fileSize = contentLength;
      }

      var contentType = resp.headers['content-type'];
      if(contentType) {
        response.fileType = contentType;
      }

      cb(response);
    });
  },
  downloadFile: function(message) {
    "use strict";
    var url = message.options.url;
    var filename = message.options.filename;
    if (mono.isFF) {
      return mono.sendMessage({action: 'download', url: url, filename: filename}, undefined, 'service');
    }
    if (mono.isChrome) {
      chrome.downloads.download({
        url: url,
        filename: filename
      });
    }
    if (mono.isGM) {
      GM_download(url, filename);
    }
  },
  downloadList: function(message) {
    "use strict";
    var list = message.fileList;
    var path = message.path;
    list.forEach(function(item) {
      utils.downloadFile({options: {url: item.url, filename: path + item.filename}});
    });
  },
  getUmmyIcon: function(message, cb) {
    "use strict";
    var icon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAB90lEQVQ4EcVSy2oUURCtqm7HcYgmYDTiYxEEERdZGP0B0UVwEcSv8LHIb4gbQcjGlVtB40YhfkAWuhs0uFOIgjJomiEzztzue4+n7rTgH6SaoqpPnao6fW+LHLapC9hdPHMbKT1UTcsQWxDBnAAdFkuvQ6QR1cD0QAUVoF+0kKdXBoO32j959maK8V1LVDaBDXkwm9q32atz/hmRpIZb5STqPaDIjP/oFAS5Xu1l/MPCBZhxt09uSRykCn1QhmQr1MiSQ3TPGYdIMtwfZPh3MjkhlvOWOcuTrJQB5VJeR0g5HlzjMSSVpp7mtQGFBJjXwJp69AlqtlTW0bpQ6nNLbTdjSCIxNhkOqUBwBconZYWZr1G6RgXcRoI782k0rO681vVq15o6SGyCrFefbHVnS6eNkmcSyMlOvr48ernimjlf5WcUuP1zr7C7W090/twiMcjw+y95dWcjXRr7Sn6Ba8mmB1RQ/MwqOK2mg356FPFi4xGm4z8I40nOT434OanElDdWM2aH/eAtHOlz98XZRBch0uPnHPu4J9uPn+dNzNGTLho/Kj+D1gza12fl1RuEtlmaaWPiGkOK8k0mecB5Nnes8DZvdiwPgRVrmbAp19aI8Fe2ZSDN86aOk9OpkfiHqfKoap9JfMTWfcavvNXN+/H9G596uPYX83AWUVC6/FsAAAAASUVORK5CYII=';
    cb(icon);
  },
  getWarningIcon: function(message, cb) {
    "use strict";
    var icon;
    var color = message.color || '#c2c2c2';
    if (message.type === 'audio') {
      icon = '<svg width="21px" height="24px" viewBox="0 0 21 24" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M21,2.76923077 L21,17.6487288 C21,17.6487288 21,17.6487288 21,17.6487288 L21,18.4615385 L20.9068729,18.4615385 C20.723595,19.2712249 20.2716013,20.0865791 19.5669296,20.7680198 C17.9203537,22.360313 15.5176896,22.6184747 14.2004289,21.3446402 C12.8831682,20.0708056 13.1501309,17.7473503 14.7967068,16.1550571 C16.0602516,14.9331676 17.7690324,14.4969051 19.0909091,14.9356816 L19.0909091,14.9356816 L19.0909091,4.15384615 L7.63636364,6.92307692 L7.63636364,19.4948826 C7.63636364,19.4948826 7.63636364,19.4948826 7.63636364,19.4948826 L7.63636364,20.3076923 L7.5432365,20.3076923 C7.35995859,21.1173788 6.90796493,21.9327329 6.20329323,22.6141737 C4.55671732,24.2064669 2.15405328,24.4646286 0.836792552,23.190794 C-0.480468173,21.9169595 -0.213505501,19.5935041 1.43307041,18.0012109 C2.69661523,16.7793214 4.40539601,16.343059 5.72727273,16.7818354 L5.72727273,16.7818354 L5.72727273,6.46153846 L5.72727273,3.69230769 L21,0 L21,2.76923077 Z" fill="'+color+'"></path></svg>';
    } else
    if (message.type === 'playlist') {
      icon = '<svg width="24px" height="18px" viewBox="0 0 24 18" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M0,0 L0,3.6 L3.42857143,3.6 L3.42857143,0 L0,0 Z M0,7.2 L0,10.8 L3.42857143,10.8 L3.42857143,7.2 L0,7.2 Z M5.14285714,0 L5.14285714,3.6 L24,3.6 L24,0 L5.14285714,0 Z M5.14285714,7.2 L5.14285714,10.8 L20.5714286,10.8 L20.5714286,7.2 L5.14285714,7.2 Z M0,14.4 L0,18 L3.42857143,18 L3.42857143,14.4 L0,14.4 Z M5.14285714,14.4 L5.14285714,18 L22.2857143,18 L22.2857143,14.4 L5.14285714,14.4 Z" fill="'+color+'"></path></svg>';
    } else {
      // photo
      icon = '<svg width="24px" height="18px" viewBox="0 0 24 18" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M19.5,3 L21.0089096,3 C22.6582294,3 24,4.34288718 24,5.99942248 L24,15.0005775 C24,16.6556493 22.6608432,18 21.0089096,18 L2.99109042,18 C1.34177063,18 0,16.6571128 0,15.0005775 L0,5.99942248 C0,4.34435073 1.33915679,3 2.99109042,3 L7.5,3 C7.5,1.34651712 8.84187067,0 10.497152,0 L16.502848,0 C18.1583772,0 19.5,1.34314575 19.5,3 L19.5,3 Z M13.5,16.5 C16.8137087,16.5 19.5,13.8137087 19.5,10.5 C19.5,7.18629134 16.8137087,4.5 13.5,4.5 C10.1862913,4.5 7.5,7.18629134 7.5,10.5 C7.5,13.8137087 10.1862913,16.5 13.5,16.5 Z M13.5,15 C15.9852815,15 18,12.9852815 18,10.5 C18,8.0147185 15.9852815,6 13.5,6 C11.0147185,6 9,8.0147185 9,10.5 C9,12.9852815 11.0147185,15 13.5,15 Z" fill="'+color+'"></path></svg>';
    }
    cb('data:image/svg+xml;utf8,'+encodeURIComponent(icon));
  },
  /*@if isVkOnly=0>*/
  getUmmyRadioLogo: function(msg, cb) {
    "use strict";
    var icon = 'data:image/png;base64,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';
    cb(icon);
  },
  checkUrlsOfOpenTabs: function(regExpList, callback) {
    "use strict";
    var getUrlList = mono.isGM ? function(cb) {
      cb([location.href]);
    } : mono.isChrome ? function(cb) {
      var urlList = [];
      chrome.tabs.query({}, function (tabs) {
        tabs.forEach(function (tab) {
          urlList.push(tab.url);
        });
        cb(urlList);
      });
    } : mono.isFF ? function(cb) {
      var urlList = [];
      var ffTabs = require("sdk/tabs");
      for (var tab in ffTabs) {
        urlList.push(ffTabs[tab].url);
      }
      cb(urlList);
    } : mono.isOpera ? function(cb) {
      var urlList = [];
      var oTabs = opera.extension.tabs.getAll();
      oTabs.forEach(function(tab) {
        urlList.push(tab.url);
      });
      cb(urlList);
    } : mono.isSafari ? function(cb) {
      var urlList = [];

      safari.application &&
      safari.application.activeBrowserWindow &&
      safari.application.activeBrowserWindow.tabs &&
      safari.application.activeBrowserWindow.tabs.forEach(function (tab) {
        if (!tab.url) {
          return 1;
        }
        urlList.push(tab.url);
      });

      cb(urlList);
    } : function(cb) {
      cb([]);
    };

    getUrlList(function(urlList) {
      var foundUrlList = [];
      urlList.forEach(function(url) {
        regExpList.forEach(function(regexp) {
          if (url.search(regexp) !== -1 ) {
            foundUrlList.push(url);
          }
        });
      });
      callback(foundUrlList);
    });
  },
  /*@if isVkOnly=0<*/
  getData: function(message, cb) {
    "use strict";
    var url = message.url;
    if (!url) {
      return cb();
    }

    mono.request({
      url: url
    }, function(err, resp, data) {
      if (err) {
        return cb();
      }
      cb(data);
    });
  }
};
/*@if isVkOnly=0>*/
if (typeof window === 'undefined') {
  exports.init = function(_mono, _engine) {
    mono = _mono;
    engine = _engine;
    return utils;
  };
}
/*@if isVkOnly=0<*/