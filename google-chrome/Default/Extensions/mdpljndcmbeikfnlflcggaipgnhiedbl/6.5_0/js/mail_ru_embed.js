// ==UserScript==
// @exclude *
// ==/UserScript==

var mail_ru_embed = {
  getMailruLinks: function(request, callback) {
    function callback_links(links, title, thumb, vid, duration)
    {
      var response = {
        action: request.action,
        extVideoId: vid || request.extVideoId,
        links: links,
        title: title,
        thumb: thumb,
        duration: duration
      };

      callback(response);
    }

    mail_ru_embed._getMailruLinks(request.extVideoId, callback_links);
  },
  _getMailruLinks: function(pathname, callback) {
    "use strict";
    var metadataUrl, vPath = pathname;
    var videoId = pathname.match(/\/([^\/]+)\/([^\/]+)\/video\/(.+).html/);
    if (!videoId) {
      videoId = pathname.match(/embed\/([^\/]+)\/([^\/]+)\/(.+).html/);
    }
    if (videoId) {
      metadataUrl = 'http://api.video.mail.ru/videos/' + videoId[1] + '/' + videoId[2] + '/' + videoId[3] + '.json';
      vPath = videoId[1] + '/' + videoId[2] + '/video/' + videoId[3]+'.html';
    }
    if (metadataUrl) {
      return mail_ru_embed.onGetMailruMetadataUrl(metadataUrl, vPath, callback);
    }
    mono.request({
      url: 'http://my.mail.ru/' + pathname
    }, function(err, resp, data) {
      if (err || !data) {
        return callback();
      }

      var jsonRe = /"metaUrl":/;
      var pageConfig = null;
      mono.getPageScript(data, jsonRe).some(function(script) {
        return mono.findJson(script, jsonRe).some(function(json) {
          if (json.metaUrl) {
            pageConfig = json;
            return true;
          }
        });
      });

      if (pageConfig) {
        metadataUrl = pageConfig.metaUrl;
        mail_ru_embed.onGetMailruMetadataUrl(metadataUrl, vPath, callback);
        return;
      }

      data = data.match(/<meta\s+content="[^"]+(videoapi\.my\.mail[^&]+)&[^"]+"[^>]+\/>/);
      if (!data) {
        return callback();
      }
      data = decodeURIComponent(data[1]);
      var vid = data.substr(data.lastIndexOf('/')+1);
      metadataUrl = 'http://videoapi.my.mail.ru/videos/'+vid+'.json';
      mail_ru_embed.onGetMailruMetadataUrl(metadataUrl, vPath, callback);
    });
  },
  onGetMailruMetadataUrl: function(metadataUrl, vPath, callback) {
    mail_ru_embed.getMailruMetadata(metadataUrl, function(data) {
      if (!data || typeof data === 'string') {
        return callback();
      }
      mail_ru_embed.readMailruMetadata(data, function(_links, title, thumb, duration) {
        callback(mail_ru_embed.prepMailruLinks(_links), title, thumb, vPath, duration);
      });
    });
  },
  prepMailruLinks: function(_links) {
    if (!_links) {
       return;
    }
    var links = [];
    for (var i = 0, link; link = _links[i]; i++) {
      var url = link.url;
      var format = 'FLV';
      if (url.indexOf('.mp4') !== -1) {
        format = 'MP4';
      }
      if (url.indexOf('.mov') !== -1) {
        format = 'MOV';
      }
      if (url.indexOf('.mpg') !== -1) {
        format = 'MPG';
      }
      if (!link.quality) {
        link.quality = '-?-';
      }
      var quality = link.quality.toUpperCase();

      var qList = ['1080P', '720P', '480P', '360P', '272P'];
      var tList = ['1080', '720', '480', '360', '272'];

      var qPos = qList.indexOf(quality);
      if (qPos !== -1) {
        quality = tList[qPos];
      }

      var ext = format.toLowerCase();
      links.push({
        url: url,
        subname: quality,
        name: format,
        ext: ext
      });
    }
    links.sort(function(a, b) {
      if (a.subname === 'HD') {
        return 1;
      }
      return a.subname > b.subname;
    });
    return links;
  },
  getMailruMetadata: function(url, cb) {
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
  readMailruMetadata: function(metadata, cb) {
    var links = [], title;
    /**
     * @namespace metadata.provider Object
     * @namespace metadata.movie Object
     * @namespace metadata.videos Object
     * @namespace metadata.meta Object
     * @namespace metadata.meta.poster Object
     */
    var duration = undefined;
    var thumb = undefined;
    if (metadata.meta) {
      thumb = metadata.meta.poster;
      duration = metadata.meta.duration;
    }
    if (metadata.provider === 'UPLOADED') {
      title = metadata.movie?metadata.movie.title:undefined;
      if (!metadata.videos) {
        return cb();
      }
      metadata.videos.forEach(function(item) {
        links.push({
          quality: item.name,
          url: item.url,
          title: title
        });
      });
    } else
    if (metadata.provider === 'ugc') {
      title = metadata.meta?metadata.meta.title:undefined;
      if (!metadata.videos) {
        return cb();
      }
      metadata.videos.forEach(function(item) {
        links.push({
          quality: item.key,
          url: item.url,
          title: title
        });
      });
    } else
    if (metadata.provider === 'pladform') {
      title = metadata.meta?metadata.meta.title:undefined;
      var okEmbed = engine.modules.odnoklassniki;
      okEmbed.getPladformVideo({
        extVideoId: {
          playerId: metadata.meta.playerId,
          videoId: metadata.meta.videoId
        }
      }, function(response) {
        if (!response) {
          return cb();
        }

        if (response.action === 'getRutubeLinks') {
          response.links = null;
        }

        var links = response.links;
        if (!links) {
          return cb();
        }
        links.forEach(function(item) {
          if (item.title === undefined) {
            item.title = title
          }
        });
        cb(links, title, thumb, duration);
      });
      return;
    }
    if (links.length === 0) {
      return cb();
    }
    return cb(links, title, thumb, duration);
  }
};

if (typeof window === 'undefined') {
  exports.init = function(_mono, _engine) {
    mono = _mono;
    engine = _engine;
    return mail_ru_embed;
  };
} else {
  engine.modules.mail_ru = mail_ru_embed;
}