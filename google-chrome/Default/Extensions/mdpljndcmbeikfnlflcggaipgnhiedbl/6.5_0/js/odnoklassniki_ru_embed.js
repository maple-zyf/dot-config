// ==UserScript==
// @exclude *
// ==/UserScript==

var odnoklassniki_ru_embed = {
  getOdnoklassnikiLinks: function (request, callback)
  {
    function callback_links(links)
    {
      var response = {
        action: request.action,
        extVideoId: request.extVideoId,
        links: links,
        title: request.title
      };

      callback(response);
    }

    odnoklassniki_ru_embed._getOdnoklassnikiLinks(request.extVideoId, callback_links);
  },

  getOdnoklassnikiAudioLinks: function (request, callback)
  {
    function callback_links(data)
    {
      var response = {
        action: request.action,
        trackId: request.trackId,
        jsessionId: request.jsessionId,
        data: data
      };

      callback(response);
    }

    odnoklassniki_ru_embed._getOdnoklassnikiAudioLinks(request.url, request.trackId, request.jsessionId, callback_links);
  },

  _getOdnoklassnikiLinks: function(extVideoId, callback)
  {
    if(!extVideoId)
    {
      callback(null);
      return;
    }

    var url = 'http://in.video.mail.ru/cgi-bin/video/oklite?eid=' + extVideoId;

    mono.request({
      url: url
    }, function(err, resp, data) {
      if (err || !data) {
        return callback(null);
      }

      var u = 'http://www.okcontent.video.mail.ru/media/';

      var host = data.match(/\$vcontentHost=([^\s"'<>]+)/i);
      if(host && host.length > 1) {
        u = 'http://' + host[1] + '/media/';
      }

      u += extVideoId;

      var links = [];

      var quality = '';
      var qulityMatch = data.match(/\$height=([0-9]+)/);
      if(qulityMatch && qulityMatch.length > 1) {
        quality = qulityMatch[1];
      }

      links.push({
        url: u + '-v.mp4',
        name: 'SD',
        ext: 'FLV',
        subname: quality
      });

      if(data.search(/\$HDexist=1/i) > -1) {
        quality = '';
        qulityMatch = data.match(/\$HDheight=([0-9]+)/);
        if(qulityMatch && qulityMatch.length > 1) {
          quality = qulityMatch[1];
        }

        links.push({
          url: u + '-hv.mp4',
          name: 'HD',
          ext: 'MP4',
          subname: quality
        });
      }

      if(links) {
        callback(links);
      }
    });
  },

  _getOdnoklassnikiAudioLinks: function(pageUrl, trackId, jSessionId, cb)
  {
    if(!trackId || !jSessionId) {
      return cb(null);
    }

    mono.request({
      url: 'http://wmf1.odnoklassniki.ru/play;jsessionid=' + jSessionId + '?tid=' + trackId + '&',
      json: true
    }, function(err, resp, json) {
      if (err || !json) {
        return cb(null);
      }

      cb(json);
    });
  },

  getOkAudioListLinks: function(msg, cb) {
    var responseList = [];
    var trackIdList = msg.trackIdArr;
    var jSessionId = msg.jsessionId;
    if(!Array.isArray(trackIdList) || typeof jSessionId !== 'string'  || !trackIdList.length) {
      return cb(responseList);
    }

    var waitCount = trackIdList.length;
    var readyCount = 0;
    var onReady = function() {
      readyCount++;
      if (readyCount !== waitCount) {
        return;
      }
      return cb(responseList);
    };
    var onGetData = function(data) {
      if (data) {
        responseList.push(data);
      }
      onReady();
    };
    for (var i = 0, trackId; trackId = trackIdList[i]; i++) {
      this._getOdnoklassnikiAudioLinks(undefined, trackId, jSessionId, onGetData);
    }
  },

  getClipyouLinks: function(id, hash, quality, title, cb) {
    mono.request({
      url: 'http://media.clipyou.ru/api/player/secure_link?record_id=' + id + '&type=mp4&resource_hash=' + hash,
      json: true
    }, function(err, resp, json) {
      if (err || !json || !Array.isArray(json.data) || !json.data.length) {
        return cb();
      }

      var links = [];
      json.data.forEach(function(item) {
        links.push({
          quality: quality,
          url: item,
          title: title
        });
      });
      cb(links);
    });
  },

  getClipyouHash: function(id, cb) {
    mono.request({
      url: 'http://media.clipyou.ru/api/player_data.json?id=' + id
    }, function(err, resp, data) {
      if (err || !data) {
        return cb();
      }

      data = data.match('resource_hash".?:.?"([^"]*)"');
      if (!data || data.length < 2) {
        return cb();
      }
      var hash = data[1];
      cb(hash);
    });
  },

  getPladformVideo: function(message, cb) {
    "use strict";
    var response = {
      action: message.action,
      extVideoId: message.extVideoId,
      links: [],
      title: message.title
    };

    var done = function() {
      cb(response);
    };

    var playerId = message.extVideoId.playerId;
    var videoId = message.extVideoId.videoId;

    mono.request({
      url: 'http://out.pladform.ru/getVideo?pl=' + playerId + '&videoid=' + videoId,
      xml: true
    }, function(err, resp, xml) {
      if (err || !xml) {
        return done();
      }

      var srcList = xml.querySelectorAll('src');
      if (srcList.length === 0) {
        return done();
      }

      var cover = xml.querySelector('cover') || undefined;
      if (cover && (cover = cover.textContent) && cover.substr(0, 2) === '//') {
        cover = 'http:' + cover;
      }

      var time = xml.querySelector('time') || undefined;
      time = time && time.textContent;

      var title = xml.querySelector('title');
      title = title && title.textContent;
      if (title) {
        response.title = title;
      }

      var firstLink = srcList[0];
      var type = firstLink.getAttribute('type');
      var id = firstLink.textContent || '';
      var quality = firstLink.getAttribute('quality');
      if (firstLink) {
        if (type === 'clipyou') {
          odnoklassniki_ru_embed.getClipyouHash(id, function(hash) {
            if (!hash) {
              return done();
            }

            odnoklassniki_ru_embed.getClipyouLinks(id, hash, quality, title, function(links) {
              response.links = links;

              done();
            });
          });
          return;
        } else
        if (type === 'rutube') {
          var externalEmbed = xml.querySelector('external_embed');
          externalEmbed = externalEmbed && externalEmbed.textContent;
          if (externalEmbed) {
            response.action = 'getRutubeLinks';
            response.links = [externalEmbed];
          }

          return done();
        }
      }

      var qualityList = ['ld', 'sd'];
      var sizeList = ['360', '720'];

      for (var i = 0, src; src = srcList[i]; i++) {
        id = src.textContent || '';
        quality = src.getAttribute('quality');

        if (/^\d+p$/.test(quality)) {
          quality = quality.match(/^(\d+)p$/)[1];
        }

        var qIndex = qualityList.indexOf(quality);
        if (qIndex !== -1) {
          quality = sizeList[qIndex];
        }

        type = src.getAttribute('type');

        if (type === 'video') {
          response.links.push({url: id, quality: quality, title: title, cover: cover, duration: time});
        }
      }

      return done();
    });
  },

  getOkMetadata: function(message, cb) {
    var url = message.url;
    if (!url) {
      return cb();
    }
    mono.request({
      url: url,
      json: true
    }, function(err, resp, json) {
      if (err || !json) {
        return cb();
      }

      cb(json);
    });
  },

  getOkViaMobile: function(message, cb) {
    "use strict";
    var metadata = message.metadata;
    var params = {
      'st.cmd': 'movieLayer',
      'st.mvId': message.mvId
    };
    var url = 'http://m.ok.ru/dk?' + mono.param(params);

    var response = {
      action: message.action,
      links: null,
      title: metadata.movie.title
    };

    mono.request({
      url: url
    }, function(err, resp, data) {
      if (err || !data) {
        return cb();
      }

      var r = new RegExp('href="([^"]+st\\.cmd=moviePlaybackRedirect[^"]+st\\.mvid='+message.mvId+'[^"]+)"');
      var moviePlaybackRedirect = data.match(r);
      moviePlaybackRedirect = moviePlaybackRedirect && moviePlaybackRedirect[1];
      if (!moviePlaybackRedirect) {
        return cb();
      }

      moviePlaybackRedirect = mono.fileName.decodeSpecialChars(moviePlaybackRedirect);

      response.links = [{url: moviePlaybackRedirect}];

      if (!/st.mq=\d+/.test(moviePlaybackRedirect)) {
        return cb(response);
      }

      var videos = metadata.videos;
      if (!videos || !videos.length) {
        return cb(response);
      }

      videos.forEach(function(item) {
        if (!item.url) {
          return;
        }

        var params = mono.parseUrlParams(item.url);
        if (params.type === undefined) {
          return;
        }

        item.url = moviePlaybackRedirect.replace(/(st.mq=)\d+/, '$1' + params.type);
      });

      response.links = videos;

      cb(response);
    });
  },

  okDirectOrMobile: function(message, cb) {
    "use strict";
    var metadata = message.metadata;
    var url = null;
    metadata.videos && metadata.videos.some(function(item) {
      if (item.url) {
        url = item.url;
        return true;
      }
    });

    var onAbort = function() {
      message.action = 'getOkViaMobile';
      odnoklassniki_ru_embed.getOkViaMobile(message, cb);
    };

    if (!url) {
      return onAbort();
    }

    mono.request({
      url: url,
      type: 'HEAD'
    }, function(err) {
      if (err) {
        return onAbort();
      }

      message.action = 'getOkViaMobileNoWrap';
      message.links = metadata.videos;
      return cb(message);
    });
  }
};

if (typeof window === 'undefined') {
  exports.init = function(_mono, _engine) {
    mono = _mono;
    engine = _engine;
    return odnoklassniki_ru_embed;
  };
} else {
  engine.modules.odnoklassniki = odnoklassniki_ru_embed;
}