// ==UserScript==
// @exclude *
// ==/UserScript==

var youtube_com_embed = {
  lastSts: ["16873", [["splice",1],["swap",55],["swap",32],["swap",39],["reverse",null],["splice",3],["reverse",null],["swap",66],["splice",3]] ],
  /**
   * currentSts {{sts: Number, url: string, actList: Array, trust: boolean, invalid: boolean}}
   */
  currentSts: undefined,
  isTrackError: {},
  getYoutubeLinks: function (request, callback)
  {
    function callback_links(links, title, subtitles, duration)
    {
      youtube_com_embed.addUmmyLinks(links, request.extVideoId);

      var response = {
        action: request.action,
        extVideoId: request.extVideoId,
        links: links,
        title: title,
        subtitles: subtitles,
        duration: duration,
        checkLinks: null
      };

      if(request.checkLinks && links)
      {
        youtube_com_embed.checkYoutubeLinks(links, function(checkUrl, isValid){
          response.checkLinks = isValid;
          callback(response);
        });
        return;
      }

      callback(response);
    }

    youtube_com_embed.__getYoutubeLinks(request.url, request.extVideoId, request.checkSubtitles, callback_links, request.noDash);
  },

  prepareDechiper: function(testItem, currentSts, cb) {
    "use strict";
    var sigUrl = currentSts.url.match(/\/(?:[^\/]+)?player-([^\/]+)\//);
    sigUrl = sigUrl && sigUrl[1];
    if (!sigUrl) {
      sigUrl = 'unknownPlayerName';
    }
    this.ytHtml5SigDecipher.dechip({sts: currentSts.sts, url: currentSts.url}, function(actList, sts, trust) {
      if (!actList) {
        if (!this.isTrackError[sigUrl]) {
          this.isTrackError[sigUrl] = 1;
          sigUrl && currentSts.sts && engine.trackEvent('youtube', 'pError', currentSts.sts + ' ' + sigUrl);
        }
        currentSts.invalid = true;
        return cb();
      }

      currentSts.actList = actList;
      currentSts.trust = !!trust;

      if (!currentSts.sts && sts) {
        currentSts.sts = sts;
      }

      if (!trust) {
        var url = testItem.url;
        var signature = youtube_com_embed.ytRunActList(currentSts.actList, testItem.s);
        if (testItem.getUrl) {
          url = testItem.getUrl(signature);
        } else {
          url += '&signature=' + signature;
        }

        this.ytHtml5SigDecipher.checkActList(currentSts.sts, currentSts.actList, url, function(r) {
          if (r) {
            currentSts.trust = true;
          } else {
            currentSts.invalid = true;
          }
          cb();
        });
      } else {
        cb();
      }
    }.bind(this));
  },

  needDechiper: function(config) {
    "use strict";
    var needDechiper = false;
    ['url_encoded_fmt_stream_map', 'adaptive_fmts', 'fmt_url_map'].some(function(key) {
      var item = config[key];
      if (!item) {
        return 0;
      }

      item.some(function(item) {
        if (item.s && item.url) {
          needDechiper = item;
          return 1;
        }
      });

      if (needDechiper) {
        return 1;
      }
    });

    if (!needDechiper && config.dashmpd) {
      var s = config.dashmpd.match(youtube_com_embed.dashMpdSigR);
      if (s) {
        needDechiper = {
          s: s[2],
          url: config.dashmpd.replace(s[1], ''),
          getUrl: function(url, s, signature) {
            return url.replace(s[1], '/signature/' + signature);
          }.bind(null, config.dashmpd, s)
        };
      }
    }

    return needDechiper;
  },

  videoInfoToObj: function(data, isObj) {
    "use strict";
    var decodeParams = function(data) {
      ['url_encoded_fmt_stream_map', 'adaptive_fmts', 'fmt_url_map'].forEach(function(key) {
        if (data[key]) {
          data[key] = data[key].split(',').map(function(item) {
            return dataStrToObj(item);
          });
        }
      });
    };
    var dataStrToObj = function(data) {
      data = mono.parseUrlParams(data, {
        forceSep: '&',
        argsOnly: 1,
        useDecode: 1
      });
      decodeParams(data);
      return data;
    };

    var config = data;
    if (isObj) {
      decodeParams(config);
    } else {
      config = dataStrToObj(data);
    }
    return config;
  },

  expCurrentSts: function() {
    "use strict";
    var now = parseInt(Date.now() / 1000);

    if (this.currentSts === undefined) {
      return;
    }

    if (!this.currentSts.expire) {
      this.currentSts.expire = now + 21600;
    } else
    if (this.currentSts.expire < now) {
      this.currentSts = undefined;
    }
  },

  getYtConfig: function(videoId, eurl, cb, index, useDefaultSts) {
    "use strict";
    if (!index) {
      index = 0;
    }

    this.expCurrentSts();

    if (useDefaultSts) {
      this.currentSts = {sts: parseInt(this.lastSts[0]), actList: this.lastSts[1]};
      this.expCurrentSts();
    } else
    if (this.currentSts === undefined) {
      return this.getCurrentSts(function(obj) {
        this.currentSts = obj || {sts: parseInt(this.lastSts[0]), actList: this.lastSts[1], trust: true};
        this.expCurrentSts();
        this.getYtConfig(videoId, eurl, cb, index, useDefaultSts);
      }.bind(this));
    }

    var currentSts = JSON.parse(JSON.stringify(this.currentSts));

    var url, params;
    if (index === 0 || index === 1) {
      var domain = index === 0 ? 'www.youtube-nocookie.com' : 'www.youtube.com';
      params = {
        video_id: videoId,
        asv: 3,
        eurl: eurl,
        el: 'info',
        sts: currentSts.sts
      };
      url = 'http://' + domain + '/get_video_info?' + mono.param(params);
    } else
    if (index === 2) {
      url = 'http://www.youtube.com/watch?' + mono.param({v: videoId, spf: 'navigate'});
    } else
    if (index === 3) {
      url = 'http://www.youtube.com/watch?' + mono.param({v: videoId});
    } else {
      return cb();
    }

    var abort = function() {
      this.getYtConfig(videoId, eurl, cb, ++index, useDefaultSts);
    }.bind(this);

    mono.request({
      url: url
    }, function(err, resp, data) {
      if (err || !data) {
        return abort();
      }

      var jsonList = undefined;
      var config;
      if ([0,1].indexOf(index) !== -1) {
        config = this.videoInfoToObj(data);

        if (index === 0) {
          if (config.requires_purchase === '1'
            || config.url_encoded_fmt_stream_map === ''
            || config.fmt_url_map === ''
            || config.adaptive_fmts === ''
            || config.errorcode > 0) {
            return abort();
          }
        }
      } else
      if (index === 2) {
        try {
          data = JSON.parse(data);
          data.some(function(item) {
            if (item.data && (jsonList = item.data.swfcfg)) {
              return true;
            }
          });
          if (!jsonList) {
            return abort();
          }
        } catch (e) {
          return abort();
        }
      } else {
        var script = mono.getPageScript(data, /ytplayer\.config\s+=\s+/);
        if (!script.length) {
          return abort();
        }
        script = script[0];

        jsonList = mono.findJson(script, [/"video_id":/]);
        if (!jsonList.length) {
          return abort();
        }
        jsonList = jsonList[0];
      }
      if ([2,3].indexOf(index) !== -1) {
        if (!jsonList.args || typeof jsonList.args !== 'object') {
          return abort();
        }

        if (jsonList.assets && jsonList.assets.js) {
          currentSts = {sts: jsonList.sts, url: jsonList.assets.js};
        }

        config = this.videoInfoToObj(jsonList.args, 1);
      }

      var testItem;
      if (!currentSts.actList && (testItem = this.needDechiper(config))) {
        this.prepareDechiper(testItem, currentSts, function() {
          if (currentSts.invalid) {
            if (index !== 3) {
              return abort();
            }

            if (index === 3 && !useDefaultSts) {
              useDefaultSts = 1;
              index = -1;
              return abort();
            }
          }

          cb(config, currentSts);
        });
      } else {
        cb(config, currentSts);
      }
    }.bind(this));
  },

  readFmt: function(links, meta, fmt, currentSts, titleParam) {
    "use strict";
    fmt.forEach(function(item) {
      if (item.stream) {
        meta.hasStream = 1;
        return 1;
      }

      if (!item.url) {
        return 1;
      }

      var url = item.url;
      if(!/(\?|&)s(ig(nature)?)?=/i.test(url)) {
        if(item.sig) {
          url += '&signature=' + item.sig;
        } else
        if(item.signature) {
          url += '&signature=' + item.signature;
        } else
        if(item.s) {
          if (currentSts.invalid) {
            console.error('Sts is invalid!', currentSts);
            return 1;
          }
          if (!currentSts.actList) {
            console.error('Sts actList is not found!', currentSts);
            return 1;
          }
          url += '&signature=' + youtube_com_embed.ytRunActList(currentSts.actList, item.s);
        }
      }

      if(item.itag && !/(\?|&)itag=/i.test(url)) {
        url += '&itag=' + item.itag;
      }

      url = url.replace(/(\?|&)sig=/i, '$1signature=').replace(/\\u0026/ig, '&');

      var itag = url.match(/(?:\?|&)itag=(\d+)/i);
      itag = itag && itag[1];
      if (!itag) {
        return 1;
      }

      if (!meta[itag]) {
        meta[itag] = {};
      }

      if (item.fps) {
        meta[itag].fps = item.fps;
      }

      if (item.size && /^\d+x\d+$/.test(item.size)) {
        var wh = item.size.split('x');
        meta[itag].quality = youtube_com_embed.getDashQuality(wh[0], wh[1]);
      }

      if (!links[itag]) {
        links[itag] = url + titleParam;
      }
    });
  },

  onGetConfig: function(videoId, checkSubtitles, cb, noDash, config, currentSts) {
    "use strict";
    var links = null, title = '', subtitles = null, duration = '', dashUrl = null;

    if (!config) {
      return cb(links, title, subtitles, duration);
    }

    cb = function(cb) {
      var wait = 1;
      var ready = 0;

      var onReady = function() {
        ready++;
        if (ready !== wait) {
          return;
        }
        cb(links, title, subtitles, duration);
      };

      if(checkSubtitles) {
        wait++;
        this.getYoutubeSubtitles({extVideoId: videoId}, function(subs) {
          subtitles = subs || null;
          onReady();
        });
      }

      if (!noDash && dashUrl) {
        wait++;
        if (!links) {
          links = {};
        }
        this.getYouTubeDashLinks(links, dashUrl, function() {
          var len = Object.keys(links).length;
          if (links.meta && !links.meta.hasStream) {
            len--;
          }
          if (!len) {
            links = null;
          }
          onReady();
        }, !currentSts.invalid && currentSts.actList && function(actList, s) {
            return youtube_com_embed.ytRunActList(actList, s);
          }.bind(this, currentSts.actList));
      }

      onReady();
    }.bind(this, cb);

    var titleParam = '';
    title = config.title || '';
    duration = config.length_seconds || '';
    dashUrl = config.dashmpd || '';

    if (title) {
      title = title.replace(/\+/g, ' ');
      titleParam = '&title=' + encodeURIComponent(mono.fileName.modify(title));
    }

    var fmtMap = config.fmt_url_map || config.url_encoded_fmt_stream_map || [];
    var adaptiveFmts = config.adaptive_fmts || [];

    var meta = {};

    if (config.livestream || config.live_playback) {
      meta.hasStream = 1;
    }

    links = {};
    fmtMap && this.readFmt(links, meta, fmtMap, currentSts, titleParam);
    adaptiveFmts && this.readFmt(links, meta, adaptiveFmts, currentSts, titleParam);

    if (Object.keys(links).length === 0 && !meta.hasStream) {
      links = null;
    } else {
      links.meta = meta;
    }

    cb();
  },

  __getYoutubeLinks: function(eurl, videoId, checkSubtitles, cb, noDash) {
    "use strict";
    if (!eurl) {
      eurl = 'http://www.youtube.com/watch?v='+videoId;
    }

    this.getYtConfig(videoId, eurl, function(config, currentSts) {
      this.onGetConfig(videoId, checkSubtitles, cb, noDash, config, currentSts);
    }.bind(this));
  },

  addUmmyLinks: function(links, videoId) {
    if (!links || (links.meta && links.meta.hasStream)) {
      return;
    }

    if (engine.preferences.showUmmyItem) {
      links['ummy'] = 'ummy:www.youtube.com/watch?v=' + videoId;
      links['ummyAudio'] = 'ummy:www.youtube.com/watch?v=' + videoId+'&sf_type=audio';
    }
  },

  checkYoutubeLinks: function (links, callback) {
    var checkItags = ['18', '34', '35'], checkUrl = '';
    for(var i = 0; i < checkItags.length; i++)
    {
      if(links[checkItags[i]])
      {
        checkUrl = links[checkItags[i]];
        break;
      }
    }

    if(checkUrl)
    {
      mono.request({
        type: 'HEAD',
        url: checkUrl
      }, function(err, resp) {
        callback(checkUrl, !err);
      });
      return;
    }

    callback();
  },

  convertVtt2Srt: function(item, cb) {
    "use strict";
    mono.request({
      url: item.url
    }, function(err, resp, body) {
      if (err || !body) {
        console.error('Request error!', err);
        return cb();
      }

      var re = /(\d{2}:\d{2}:\d{2})\.(\d{3})/g;
      var validateRe = /^\d{2}:\d{2}:\d{2}\.\d{3}/;
      var arr = body.split('\n\n');

      if (!validateRe.test(arr[0])) {
        arr.shift();
      }

      if (!validateRe.test(arr[arr.length - 1])) {
        arr.pop();
      }

      var hasSkip = false;
      var srt = arr.filter(function(item) {
        var r = validateRe.test(item);
        if (!r) {
          hasSkip = true;
        }
        return r;
      }).map(function(item, index) {
        item = item.replace(re, "$1,$2");
        return (index + 1) + '\n' + item;
      });
      srt = srt.join('\n\n');

      if (hasSkip) {
        return cb();
      }

      item.srt = srt;
      item.preprocess = 'srt2url';
      cb();
    });
  },

  getYoutubeSubtitles: function(message, cb) {
    var _this = this;
    var videoId = message.extVideoId;
    var baseUrl = 'http://video.google.com/timedtext';
    mono.request({
      url: baseUrl + '?hl=' + engine.language.lang + '&v=' + videoId + '&type=list&tlangs=1',
      xml: true
    }, function(err, resp, xml) {
      if (err || !xml) {
        return cb();
      }

      var track = xml.querySelectorAll('track');
      var target = xml.querySelectorAll('target');
      var list = [];
      var trackList = {};
      var targetList = {};
      var origTrack = undefined;
      var langCode, param;
      for (var i = 0, item; item = track[i]; i++) {
        langCode = item.getAttribute('lang_code');
        param = {
          lang: langCode,
          v: videoId,
          fmt: 'vtt',
          name: item.getAttribute('name') || undefined
        };
        trackList[langCode] = {
          lang: item.getAttribute('lang_translated'),
          langCode: langCode,
          url: baseUrl + '?' + mono.param(param),
          name: param.name
        };
        list.push(trackList[langCode]);
        if (!origTrack && item.getAttribute('cantran')) {
          origTrack = param;
        }
      }

      if (origTrack) {
        for (i = 0, item; item = target[i]; i++) {
          langCode = item.getAttribute('lang_code');
          param = {
            lang: origTrack.lang,
            v: videoId,
            tlang: langCode,
            fmt: 'vtt',
            name: origTrack.name
          };
          targetList[langCode] = {
            lang: item.getAttribute('lang_translated'),
            langCode: langCode,
            url: baseUrl + '?' + mono.param(param),
            isAuto: true
          };
        }
      }

      engine.actionList.getNavigatorLanguage(undefined, function(langCode) {
        langCode = langCode.toLocaleLowerCase();
        if (langCode.indexOf('zh-hant') === 0) {
          langCode = 'zh-Hant';
        } else
        if (langCode.indexOf('zh-hans') === 0) {
          langCode = 'zh-Hans';
        }
        var localeList = [langCode];
        if (localeList[0] === 'uk') {
          localeList.push('ru');
        }
        for (i = 0, item; item = localeList[i]; i++) {
          if (!trackList[item] && targetList[item]) {
            list.push(targetList[item]);
          }
        }

        var waitCount = 0;
        var readyCount = 0;
        var onReady = function() {
          "use strict";
          readyCount++;
          if (waitCount !== readyCount) {
            return;
          }
          return cb(list);
        };
        waitCount++;
        list.forEach(function(item) {
          "use strict";
          waitCount++;
          _this.convertVtt2Srt(item, onReady);
        });
        onReady();
      });
    });
  },

  dashMpdSigR: /(\/s\/([^\/]+))/,

  getYouTubeDashLinks: function(links, dashmpd, cb, dechiper) {
    if (!dashmpd || dashmpd.indexOf('yt_live_broadcast') !== -1) {
      return cb();
    }

    var s = dashmpd.match(youtube_com_embed.dashMpdSigR);
    if (s) {
      if (!dechiper) {
        return cb();
      }

      var signature = dechiper(s[2]);
      dashmpd = dashmpd.replace(s[1], '/signature/' + signature);
    }

    dashmpd = dashmpd.replace('/sig/', '/signature/');

    mono.request({
      url: dashmpd,
      xml: true
    }, function(err, resp, xml) {
      if (err || !xml) {
        return cb();
      }

      youtube_com_embed.parseDash(xml, links, cb);
    });
  },

  getDashQuality: function(a, b) {
    var qualityList = {
      144: 144,
      240: 240,
      360: 360,
      480: 480,
      720: 720,
      1080: 1080,
      1440: 1440,
      '4K': 2160,
      '5K': 2880,
      '8K': 4320
    };

    var quality;
    var g = Math.max(a, b);
    a = Math.min(a, b);
    for (var qualityName in qualityList) {
      var value = qualityList[qualityName];
      if (g >= Math.floor(16 * value / 9) || a >= value) {
        quality = qualityName;
      } else {
        return quality;
      }
    }
    return quality;
  },

  parseDash: function(xml, links, cb) {
    "use strict";
    var elList = xml.querySelectorAll('Representation');
    if (!links) {
      links = {};
    }

    var meta = links.meta = links.meta || {};

    for (var i = 0, el; el = elList[i]; i++) {
      var itag = el.getAttribute('id');

      if (!meta[itag]) {
        meta[itag] = {};
      }

      meta[itag].fps = el.getAttribute('frameRate') || undefined;

      var width = el.getAttribute('width');
      var height = el.getAttribute('height');

      meta[itag].quality = width && height && youtube_com_embed.getDashQuality(width, height);

      if (links[itag] !== undefined) {
        continue;
      }

      var baseurl = el.querySelector('BaseURL');
      if (baseurl === null) {
        continue;
      }
      var url = baseurl.textContent;

      var SegmentURL = baseurl.parentNode.querySelector('SegmentURL');
      var segmentUrl;
      if (SegmentURL && (segmentUrl = SegmentURL.getAttribute('media'))) {
        if (segmentUrl.indexOf('sq/') === 0) {
          continue;
        }
      }

      links[itag] = url;
    }
    cb(links);
  },

  getYoutubeIdListFromPlaylist: function(request, cb) {
    youtube_com_embed.getIdListFromList(request.baseUrl || 'http://www.youtube.com', request.listId, cb);
  },

  getIdListFromList: (function() {
    var getNextPage = function(baseUrl, url, pageList, cb) {
      if (!pageList) {
        pageList = [];
      }
      mono.request({
        url: baseUrl + url,
        json: true
      }, function(err, resp, data) {
        if (err || !data) {
          return cb(pageList);
        }

        pageList.push(data.content_html);
        var nextPageUrl = getNextPageUrl(data.load_more_widget_html);
        if (nextPageUrl === undefined) {
          return cb(pageList);
        }
        getNextPage(baseUrl, nextPageUrl, pageList, cb);
      });
    };
    var getTitleFromPage = function(data) {
      var title = data.match(/<h1[^>]+>([^<]+)<\/h1>/);
      if (!title) {
        return undefined;
      }
      return title[1].replace(/\r?\n/g, " ").trim();
    };
    var getNextPageUrl = function(data) {
      if (!data) {
        return undefined;
      }
      var nextUrl = data.match(/data-uix-load-more-href="([^"]+)"/);
      if (nextUrl) {
        nextUrl = nextUrl[1];
      }
      return nextUrl || undefined;
    };
    var readLinksFromPages = function(listId, pageList, cb) {
      var title = getTitleFromPage(pageList[0]);
      var idObj = {};
      var idList = [];
      var pattern = /href="\/watch\?([^"]+)"/g;
      var maxIndex = 0;
      for (var i = 0, len = pageList.length; i < len; i++) {
        var content = pageList[i];
        content.replace(pattern, function(string, args) {
          var url = mono.parseUrlParams(args, {argsOnly: 1});
          if (url.list !== listId) {
            return;
          }
          url.index = parseInt(url.index);
          idObj[url.index] = url.v;
          if (url.index > maxIndex) {
            maxIndex = url.index;
          }
        });
      }
      for (i = 0; i <= maxIndex; i++) {
        if (idObj[i] === undefined) {
          continue;
        }
        if (idList.indexOf(idObj[i]) === -1) {
          idList.push(idObj[i]);
        }
      }
      cb({idList: idList, title: title});
    };
    return function getLinksFromList(baseUrl, listId, cb) {
      mono.request({
        url: baseUrl + '/playlist?list=' + listId
      }, function(err, resp, data) {
        if (err) {
          return cb();
        }

        var nextPageUrl = getNextPageUrl(data);
        if (!nextPageUrl) {
          return readLinksFromPages(listId, [data], cb);
        }
        getNextPage(baseUrl, nextPageUrl, [data], function(pageList) {
          readLinksFromPages(listId, pageList, cb);
        });
      });
    };
  })(),

  getYoutubeLinksFromConfig: function(message, cb) {
    "use strict";
    var abort = function() {
      youtube_com_embed.getYoutubeLinks(message, cb);
    };
    cb = function(cb, obj) {
      if (obj && obj.links) {
        youtube_com_embed.addUmmyLinks(obj.links, message.extVideoId);
      }
      cb(obj);
    }.bind(this, cb);

    var jsonList = message.config;
    if (!jsonList
      || !jsonList.args
      || jsonList.args.video_id !== message.extVideoId
      || !jsonList.assets
      || !jsonList.assets.js
    ) {
      return abort();
    }

    var config = this.videoInfoToObj(jsonList.args, 1);
    var currentSts = {sts: jsonList.sts, url: jsonList.assets.js};

    this.expCurrentSts();

    if (this.currentSts === undefined) {
      if (currentSts.sts) {
        this.currentSts = JSON.parse(JSON.stringify(currentSts));
        this.expCurrentSts();
      }
    } else
    if (this.currentSts.url === currentSts.url || this.currentSts.sts === currentSts.sts) {
      currentSts = JSON.parse(JSON.stringify(this.currentSts));
    }

    var onCurrentStsReady = function() {
      var onGetLinks = function(links, title, subtitles, duration) {
        cb({
          links: links,
          title: title,
          isQuick: 1
        });
      };
      this.onGetConfig(
        message.extVideoId,
        message.checkSubtitles,
        onGetLinks,
        message.noDash,
        config,
        currentSts
      );
    }.bind(this);

    var testItem;
    if (!currentSts.actList && (testItem = this.needDechiper(config))) {
      this.prepareDechiper(testItem, currentSts, function() {
        if (currentSts.invalid) {
          return abort();
        }

        onCurrentStsReady();
      }.bind(this));
    } else {
      onCurrentStsReady();
    }
  },

  ytRunActList: function(list, a) {
    var actionList = {
      slice:function(a,b){a.slice(b)},
      splice:function(a,b){a.splice(0,b)},
      reverse:function(a){a.reverse()},
      swap:function(a,b){var c=a[0];a[0]=a[b%a.length];a[b]=c}
    };
    a = a.split("");
    for (var i = 0, item; item = list[i]; i++) {
      actionList[item[0]](a, item[1]);
    }
    return a.join("");
  },

  ytHtml5SigDecipher: {
    readObfFunc: function(func, data) {
      var vList = func.match(/\[(\w+)\]/g);
      if (!vList) {
        return;
      }
      for (var i = 0, v; v = vList[i]; i++) {
        var vv = data.match(new RegExp('[, ]{1}'+ v.slice(1, -1) +'="(\\w+)"'));
        if (vv) {
          func = func.replace(v, '.'+vv[1]);
        }
      }
      var arr = func.split(';');
      var actList = [];
      for (var i = 0, item; item = arr[i]; i++) {
        if (item.indexOf('.split(') !== -1 || item.indexOf('.join(') !== -1) {
          continue;
        }
        if (item.indexOf('reverse') !== -1) {
          actList.push(['reverse', null]);
          continue;
        }
        var m = item.match(/splice\((\d+)\)/);
        if (m) {
          m = parseInt(m[1]);
          if (isNaN(m)) return;
          actList.push(['splice', m]);
          continue;
        }
        var m = item.match(/slice\((\d+)\)/);
        if (m) {
          m = parseInt(m[1]);
          if (isNaN(m)) return;
          actList.push(['slice', m]);
          continue;
        }
        var m = item.match(/\[(\d+)%\w+\.length/);
        if (m) {
          m = parseInt(m[1]);
          if (isNaN(m)) return;
          actList.push(['swap', m]);
        }
      }
      return actList;
    },
    getChip: function(data, cb) {
      var sts = data.match(/,sts:(\d+)/);
      sts = sts && sts[1];

      var actList = [];
      var funcName = data.match(/\.sig\|\|([$_a-zA-Z0-9]+)\(/);
      if (!funcName) {
        return cb();
      }
      funcName = funcName[1];
      funcName = funcName.replace(/\$/g, '\\$');
      var func = data.match(new RegExp("((?:function "+funcName+"|(?:var |,)"+funcName+"=function)\\(([\\w$]+)\\){[^}]*})[;,]"));
      if (!func) {
        return cb();
      }
      var vName = func[2];
      func = func[1];
      var regexp = new RegExp("[\\w$]+\\.[\\w$]+\\("+vName+"[^)]*\\)", 'g');
      var sFuncList = func.match(regexp);
      if (!sFuncList) {
        actList = this.readObfFunc(func, data);
        if (actList && actList.length > 0) {
          return cb(actList, sts);
        }
        return cb();
      }
      var objName = '';
      var objElList = [];
      for (var i = 0, item; item = sFuncList[i]; i++) {
        var m = item.match(/([\w$]+)\.([\w$]+)\([\w$]+,?([\w$]+)?\)/);
        if (m) {
          objName = m[1];
          objElList.push({name: m[2], arg: parseInt(m[3])});
        }
      }
      var sPos = data.indexOf('var '+objName+'={');
      if (sPos === -1) {
        sPos = data.indexOf(','+objName+'={');
      }
      if (sPos === -1) {
        sPos = data.indexOf(objName+'={');
      }
      var place = data.substr(sPos, 300);
      for (i = 0, item; item = objElList[i]; i++) {
        var vName = item.name;
        regexp = new RegExp(vName+":(function\\([$\\w,]+\\){[^}]+})");
        var sF = place.match(regexp);
        if (!sF) {
          return cb();
        }
        sF = sF[1];
        if (sF.indexOf('splice') !== -1) {
          if (isNaN(item.arg)) {
            return cb();
          }
          actList.push(['splice', item.arg]);
        } else
        if (sF.indexOf('slice') !== -1) {
          if (isNaN(item.arg)) {
            return cb();
          }
          actList.push(['slice', item.arg]);
        } else
        if (sF.indexOf('reverse') !== -1) {
          item.arg = null;
          actList.push(['reverse', item.arg]);
        } else {
          if (isNaN(item.arg)) {
            return cb();
          }
          actList.push(['swap', item.arg]);
        }
      }
      cb(actList, sts);
    },
    getPlayer: function(message, cb) {
      if (message.url.substr(0, 2) === '//') {
        message.url = 'http:' + message.url;
      }
      mono.request({
        url: message.url
      }, function(err, resp, data) {
        if (err || !data) {
          return cb();
        }

        return this.getChip(data, cb);
      }.bind(this))
    },
    checkActList: function(sts, actList, url, cb) {
      mono.request({
        type: 'HEAD',
        url: url
      }, function(err) {
        if (err) {
          return cb(0);
        }

        this.addDechipList(sts, actList);
        cb(1);
      }.bind(this));
    },
    getDechipList: function(cb) {
      if (this.getDechipList.data !== undefined) {
        return cb(this.getDechipList.data);
      }
      mono.storage.get('ytDechipList', function(data) {
        data.ytDechipList = data.ytDechipList || {};
        this.getDechipList.data = data;
        cb(data);
      }.bind(this));
    },
    addDechipList: function(sts, actList) {
      if (!sts) return;
      var lastSts = youtube_com_embed.lastSts;
      this.getDechipList.data.ytDechipList[lastSts[0] = sts] = lastSts[1] = actList;
      mono.storage.set(this.getDechipList.data);
    },
    /**
     * @param {{sts: Number, url: String}} message
     * @param {Function} cb
     */
    dechip: function(message, cb) {
      this.getDechipList(function(data) {
        if (message.sts) {
          var actList = data.ytDechipList[message.sts];
          if (actList) {
            return cb(actList, parseInt(message.sts), 1);
          }
        }
        this.getPlayer(message, function(actList, sts) {
          if (actList && actList.length > 0) {
            return cb(actList, parseInt(sts));
          }
          cb();
        });
      }.bind(this));
    }
  },

  addOnPrepareEvent: function() {
    "use strict";
    engine.onEvent('prepare', function() {
      mono.storage.get('ytDechipList', function(data) {
        var dechipList = data.ytDechipList = data.ytDechipList || {};
        var lastSts = this.lastSts;
        dechipList[lastSts[0]] = lastSts[1];

        this.ytHtml5SigDecipher.getDechipList.data = data;
        var keys = Object.keys(dechipList);
        keys.sort(function(a, b) {
          return a < b ? 1 : -1
        });

        if (lastSts[0] < keys[0]) {
          lastSts[0] = keys[0];
          lastSts[1] = dechipList[keys[0]];
        }

      }.bind(this));
    }.bind(youtube_com_embed));
  },

  getSignatureFromHtml: function(data, cb) {
    "use strict";
    var script = mono.getPageScript(data, /ytplayer\.config\s+=\s+/);
    if (!script.length) {
      return cb();
    }
    script = script[0];

    var jsonList = mono.findJson(script, [/"assets":/, /"sts":\d+/]);
    if (!jsonList.length) {
      return cb();
    }
    jsonList = jsonList[0];

    if (!jsonList.sts || !jsonList.assets || !jsonList.assets.js) {
      return cb();
    }

    return cb({sts: parseInt(jsonList.sts), url: jsonList.assets.js});
  },

  getCurrentSts: function(cb) {
    "use strict";
    mono.request({
      url: 'http://www.youtube.com/'
    }, function(err, resp, data) {
      if (err || !data) {
        return cb();
      }

      this.getSignatureFromHtml(data, cb);
    }.bind(this));
  }
};

if (typeof window === 'undefined') {
  exports.init = function(_mono, _engine) {
    mono = _mono;
    engine = _engine;
    youtube_com_embed.addOnPrepareEvent();
    return youtube_com_embed;
  };
} else {
  engine.modules.youtube = youtube_com_embed;
  youtube_com_embed.addOnPrepareEvent();
}