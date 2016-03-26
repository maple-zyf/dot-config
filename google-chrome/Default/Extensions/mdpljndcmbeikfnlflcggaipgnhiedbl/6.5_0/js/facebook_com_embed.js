// ==UserScript==
// @exclude *
// ==/UserScript==

var facebook_com_embed = {
  getFacebookLinks: function(request, callback) {
    var callback_links = function (links, title, thumb, duration) {
      var response = {
        action: request.action,
        extVideoId: request.extVideoId,
        links: links || null,
        title: title || '',
        thumb: thumb || '',
        duration: duration || ''
      };

      callback(response);
    };

    facebook_com_embed._getFacebookLinks(request.extVideoId, callback_links);
  },

  _getFacebookLinks: function(videoId, cb) {
    mono.request({
      type: 'GET',
      url: 'https://www.facebook.com/video.php?v=' + videoId
    }, function(err, resp, data) {
      if (err || !data) {
        return cb();
      }

      facebook_com_embed.getLinksFromData(data, videoId, cb);
    });
  },
  getLinksFromData: function(data, videoId, cb) {
    "use strict";
    var match = data.match(/\["params","([^"]*)"\]/im);
    var mTitle = data.match(/<h2[^>]*>([^<]*)<\/h2>/im);
    if (!mTitle) {
      mTitle = ['',''];
    }
    if (!match) {
      return this.getLinksFromData2(data, videoId, cb);
    }
    var videoData = null;
    try {
      videoData = JSON.parse(decodeURIComponent(JSON.parse('"'+match[1]+'"'))).video_data;
      if (videoData.progressive) {
        videoData = videoData.progressive;
      }
      if (!videoData) {
        return cb();
      }
    } catch (e) {
      return cb();
    }

    var thumb = null;
    var duration = null;

    var links = [];
    var typeMap = {
      sd_src: 'SD',
      hd_src: 'HD'
    };
    for (var i = 0, item; item = videoData[i]; i++) {
      ['sd_src', 'hd_src'].forEach(function(type) {
        if (item.thumbnail_src) {
          thumb = item.thumbnail_src;
        }

        if (item.video_duration) {
          duration = item.video_duration;
        }

        if (!item[type]) {
          return;
        }

        var ext = facebook_com_embed.getFileExtension(item[type], 'mp4');
        links.push({
          url: item[type],
          name: typeMap[type],
          type: ext,
          ext: ext.toUpperCase()
        });
      });
    }

    cb(links, mTitle[1], thumb, duration);
  },

  getLinksFromData2: function(data, videoId, cb) {
    "use strict";
    var title = data.match(/<h2[^>]*>([^<]*)<\/h2>/im);
    title = title && title[1];

    data = data.match(/"videoData":\[([^\]]+)\]/);
    data = data && data[1];

    if (!data) {
      return cb();
    }

    var jsonList = mono.findJson(data, [/"(sd|hd)_src":/, new RegExp(videoId)]);
    if (!jsonList || !jsonList.length) {
      return cb();
    }

    var params = jsonList[0];

    if (String(params.video_id) !== String(videoId)) {
      return cb();
    }

    var links = [];

    var ext;
    if (params.sd_src) {
      ext = facebook_com_embed.getFileExtension(params.sd_src, 'mp4');
      links.push({
        url: params.sd_src,
        name: 'SD',
        type: ext,
        ext: ext.toUpperCase()
      });
    }
    if (params.hd_src) {
      ext = facebook_com_embed.getFileExtension(params.hd_src, 'mp4');
      links.push({
        url: params.hd_src,
        name: 'HD',
        type: ext,
        ext: ext.toUpperCase()
      });
    }

    return cb(links, title, params.thumbnail_src, params.video_duration);
  },

  getFileExtension: function(str, def) {
    var ext = str.match(/\.([a-z0-9]{3,4})(\?|$)/i);
    if(ext) {
      ext = ext[1];
      return ext.toLowerCase();
    }

    return (def ? def : '');
  },

  getFacebookPhotoUrl: function(message, cb) {
    if (!message.fbid) {
      return cb();
    }
    mono.request({
      url: 'https://www.facebook.com/photo.php?fbid=' + message.fbid
    }, function(err, resp, data) {
      if (err || !data) {
        return cb();
      }

      var m = data.match(/<a[^>]+fbPhotosPhotoActionsItem[^>]+href="([^">]+dl=1)"[^>]+>/i);
      if (m) {
        var url = m[1];
        url = url.replace(/&amp;/g, '&');
        return cb(url);
      }

      return cb();
    });
  }
};

if (typeof window === 'undefined') {
  exports.init = function(_mono, _engine) {
    mono = _mono;
    engine = _engine;
    return facebook_com_embed;
  };
} else {
  engine.modules.facebook = facebook_com_embed;
}