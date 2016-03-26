// ==UserScript==
// @exclude *
// ==/UserScript==

var dailymotion_com_embed = {
  getDailymotionLinks: function (request, callback)
  {
    function callback_links(data)
    {
      if (!data) {
        data = {};
      }
      var response = {
        action: request.action,
        extVideoId: request.extVideoId,
        links: data.links,
        title: data.title,
        duration: data.duration,
        thumb: data.thumb
      };

      callback(response);
    }

    dailymotion_com_embed.getEmbedVideoInfo(request.extVideoId, request.metadata, callback_links)
  },

  readDmMetadata: function(metadata, noRead) {
    "use strict";
    if (!metadata.qualities) {
      return;
    }

    delete metadata.qualities.auto;

    var qualities = metadata.qualities;

    var links = [];
    var info = {
      title: metadata.title,
      duration: metadata.duration,
      thumb: metadata.poster_url,
      links: undefined
    };

    for (var size in qualities) {
      var linkList = qualities[size];
      if (!Array.isArray(linkList)) continue;

      for (var i = 0, item; item = linkList[i]; i++) {
        if (!/mp4|flv/.test(item.type) || !item.url) {
          continue;
        }
        if (!noRead) {
          var linkObj = dailymotion_com_embed.readLink(item.url);
          linkObj && links.push(linkObj);
        } else {
          links.push(item.url);
        }
      }
    }

    if (links.length) {
      if (!noRead) {
        links.sort(function(a,b) {
          return a.height < b.height;
        });
      }
      info.links = links;
    }

    return info;
  },

  getPlayerV5Links: function(text, cb, noRead) {
    "use strict";
    var metadata = null;
    try {
      var scriptList = mono.getPageScript(text, /playerV5/);
      scriptList.some(function(script) {
        "use strict";
        var jsonList = mono.findJson(script);
        return jsonList.some(function(json) {
          if (json && json.metadata) {
            metadata = json.metadata;
            return true;
          }
        });
      });

      if (!metadata) {
        throw 'Metadata is not found!';
      }
    } catch (e) {
      return cb();
    }

    var info = this.readDmMetadata(metadata, noRead);
    cb(info);
  },

  readLink: function(url) {
    url = url.replace(/\\\//g, '/');
    url = url.replace(/\@\@[\w\-]+$/, '');
    var size = '';
    var t = url.match(/\/cdn\/\w+\-(\d+x\d+)\//i);
    if(t && t.length > 1)
    {
      size = t[1];
    }
    else
    {
      t = url.match(/\D(\d+x\d+)\D/i);
      if(t && t.length > 1)
      {
        size = t[1];
      }
    }

    var ext = 'FLV';
    t = url.match(/\.(\w{1,6})(?:$|\?)/);
    if(t && t.length > 1)
    {
      ext = t[1].toUpperCase();
    }

    if(size !== '80x60')
    {
      var height = parseInt(size.split('x').slice(-1)[0]);
      return {url: url, name: ext+' '+height, ext: ext, info_url: '', height: height};
    }
  },

  getLinks: function(text, cb, noRead)
  {
    var about = {};
    var links = [];
    var info = text.match(/(?:var|,)\s*info\s*=\s*\{(.*?)\}\s*(?:;|,\s*\w+\s*=)/i);

    if(!info || info.length < 2) {
      return dailymotion_com_embed.getPlayerV5Links(text, cb, noRead);
    }
    info = info[1];
    try {
      info = JSON.parse('{' + info + '}');
      if(!info) {
        return cb();
      }
      about.title = info.title;
      about.duration = info.duration;
      about.thumb = info.thumbnail_medium_url;
      for(var i in info)
      {
        if (!info.hasOwnProperty(i)) {
          continue;
        }
        if (typeof info[i] !== 'string') {
          continue;
        }
        if(info[i].search(/^https?:\/\/[^\s\"]+\.(mp4|flv)(\?|$)/) > -1)
        {
          if (noRead) {
            links.push(info[i]);
          } else {
            var link = dailymotion_com_embed.readLink(info[i]);
            if (link !== undefined) {
              links.push(link);
            }
          }
        }
      }
    } catch(e){}
    if (links.length > 0) {
      if (!noRead) {
        links.sort(function(a,b) {
          return a.height < b.height;
        });
      }
      about.links = links;
    }
    cb(about);
  },

  getDailymotionEmbedVideoInfoMsg: function(message, cb) {
    mono.request({
      url: message.url
    }, function(err, resp, data) {
      if (err || !data) {
        return cb();
      }

      dailymotion_com_embed.getLinks(data, cb, true);
    });
  },

  getEmbed: function(url, cb) {
    mono.request({
      url: url
    }, function(err, resp, data) {
      if (err || !data) {
        return cb();
      }

      dailymotion_com_embed.getLinks(data, cb);
    });
  },

  getEmbedVideoInfo: function (id, metadata, callback) {
    "use strict";
    if (metadata) {
      var info = this.readDmMetadata(metadata);
      if (info && info.links && info.links.length) {
        return callback(info);
      }
    }

    var url = "http://www.dailymotion.com/embed/video/" + id;
    dailymotion_com_embed.getEmbed(url, callback);
  }
};

if (typeof window === 'undefined') {
  exports.init = function(_mono, _engine) {
    mono = _mono;
    engine = _engine;
    return dailymotion_com_embed;
  };
} else {
  engine.modules.dailymotion = dailymotion_com_embed;
}