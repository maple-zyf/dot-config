// ==UserScript==
// @exclude *
// ==/UserScript==

var vkontakte_ru_embed = {
  getVKLinks: function (request, callback)
  {
    function callback_links(vid, links, title, duration, thumb, data, embed)
    {
      if(embed)
      {
        embed.origRequest = request;
        engine.onMessage(embed, callback);
        return;
      }

      var response = {
        action: request.action,
        extVideoId: vid ? vid : request.extVideoId,
        links: links,
        title: title,
        duration: duration,
        thumb: thumb,
        data: data,
        checkLinks: null
      };

      if(request.checkLinks && links && links.length > 0)
      {
        vkontakte_ru_embed.checkVkLinks(links, function(checkUrl, isValid){
          response.checkLinks = isValid;
          callback(response);
        });
        return;
      }

      callback(response);
    }

    vkontakte_ru_embed._getVKLinks(request.extVideoId, callback_links);
  },

  preparePladformLinks: function(pladformLinks) {
    var links;
    var obj = {
      links: links = []
    };
    pladformLinks.forEach(function(item) {
      obj.title = item.title;
      obj.duration = item.duration;
      obj.thumb = item.cover;

      var ext = item.url.match(/[\w]+\.(mp4|flv)(?:\?|$)/i);
      if (!ext) {
        ext = 'flv';
      } else {
        ext = ext[1];
      }
      links.push({
        url: item.url,
        name: ext.toUpperCase(),
        subname: item.quality.toUpperCase(),
        type: ext.toLowerCase()
      });
    });
    return obj;
  },

  _getVKLinks: function (videoId, callback) {
    var links = [], title = videoId, duration = '', thumb = '', data = null, embed = null;

    var vid = videoId;

    if(!/^video-?\d+_\d+/i.test(vid)) {
      var oidRe = /(?:^|&)oid=(-?\d+)/i;
      var idRe = /(?:^|&)id=(-?\d+)/i;
      var m = null;

      m = vid.match(oidRe);
      var oid = m && m[1];

      m = vid.match(idRe);
      var id = m && m[1];

      vid = '';
      if(oid && id) {
        vid = 'video' + oid + '_' + id;
      }
    }

    if(!vid)
    {
      callback(vid, links, title);
      return;
    }

    title = vid;

    var url = 'http://vk.com/' + vid;

    mono.request({
      url: url
    }, function(err, resp, response) {
      var data;
      if (err || !response) {
        return callback(vid, links, title, duration, thumb, data, embed);
      }

      var type = 1;
      var json = response
        .replace(/\{[-a-zA-Z_\.]+\}/ig, '')
        .match(/var\svars\s*=\s*(\{[^\}]+\})/i);
      if (!json) {
        type = 2;
        json = response
          .replace(/\{[-a-zA-Z_\.]+\}/ig, '')
          .match(/var\sopts\s*=\s*(\{[^\}]+\})/i);
        if (json) {
          try {
            json = json[1].replace(/\\n/g, '').replace(/\\\//g, '/').replace(/([{,])\s*(\w+)\s*:/g, '$1"$2":').replace(/'/g, '"');
            json = JSON.parse(json);
          } catch (e) {
            json = null;
          }
          if (!json || !json.url || !/\/\/.*pladform\..*\//.test(json.url)) {
            json = null;
          }
        }
        if (!json) {
          type = 0;
        }
      }
      if(type === 1) {
        try {
          json = json[1];

          if(json.search(/^\{\s*\\\"/) > -1)
            json = json.replace(/\\\"/g, '"');

          json = JSON.parse(json);
          if(json) {
            data = json;
            links = vkontakte_ru_embed.getVkVideoLinks(json);

            if(json.md_title)
              title = json.md_title;

            if(json.thumb)
              thumb = json.thumb;
            else if(json.jpg)
              thumb = json.jpg;

            if(thumb && thumb.search(/\\\//) > -1)
              thumb = thumb.replace(/\\\//g, '/');
          }
        } catch(err){}
      } else
      if (type === 2) {
        /*@if isVkOnly=0>*/
        var params = mono.parseUrlParams(json.url);
        var okEmbed = engine.modules.odnoklassniki;
        okEmbed.getPladformVideo({
          extVideoId: {
            playerId: params.pl,
            videoId: params.videoid
          }
        }, function(response) {
          if (response && response.action === 'getRutubeLinks') {
            response.links = null;
          }

          var pladformLinks = response && response.links;
          if (!Array.isArray(pladformLinks)) {
            return callback(vid, links, title, duration, thumb, data, embed);
          }

          var videoInfo = vkontakte_ru_embed.preparePladformLinks(pladformLinks);

          callback(vid, videoInfo.links, videoInfo.title, videoInfo.duration, videoInfo.thumb, data, embed);
        });
        return;
        /*@if isVkOnly=0<*/
      } else {
        /*@if isVkOnly=0>*/
        var frame = response.match(/<iframe[^>]+>/ig);
        var m;
        if(frame) {
          for(var i=0, l=frame.length; i<l; i++) {
            m = frame[i].match(/youtube.com\\?\/embed\\?\/([\w\-]+)/i);
            if(m && m.length > 1) {
              embed = {
                action: 'getYoutubeLinks',
                extVideoId: m[1]
              };
              break;
            }
            m = frame[i].match(/vimeo.com\\?\/video\\?\/(\d+)/i);
            if(m && m.length > 1) {
              embed = {
                action: 'getVimeoLinks',
                extVideoId: m[1]
              };
              break;
            }
          }
        }
        if (embed === null) {
          var ajaxPreload = response.lastIndexOf('ajax.preload');
          if (ajaxPreload !== -1) {
            data = response.substr(ajaxPreload);
            var dmId = data.match(/url: '(?:[\w\\/]+.)?dailymotion.com(?:\\\/swf)?\\\/video\\\/([\w\d]+)\??/);
            if (dmId && dmId.length > 1) {
              embed = {
                action: 'getDailymotionLinks',
                extVideoId: dmId[1]
              }
            }
          }
        }
        /*@if isVkOnly=0<*/
      }

      var _duration = response.match(/(['"]?)duration\1\s*:\s*(\d+)/i);
      if(_duration && _duration.length > 2)
      {
        duration = _duration[2];
      }

      callback(vid, links, title, duration, thumb, data, embed);
    });
  },

  checkVkLinks: function (links, callback)
  {
    var checkUrl = '';

    if(links && links.length > 0)
    {
      if(links[0].type == 'mp4')
        checkUrl = links[0].url;
      else if(links.length > 1)
        checkUrl = links[1].url;
      else
        checkUrl = links[0].url;
    }

    if(checkUrl) {
      mono.request({
        url: checkUrl,
        type: 'HEAD'
      }, function(err, resp) {
        callback(checkUrl, !err);
      });
      return;
    }

    callback();
  },

  getVkVideoLinks: function (v) {
    if(!v || !v.host || !v.vtag || (!v.vkid && !v.uid))
      return null;

    if(typeof(v.host) != 'string' && v.host.toString)
      v.host = v.host.toString();

    v.host = v.host.replace(/\\\//g, '/');

    if(v.hd > 0 && (!v.hd_def || v.hd > v.hd_def))
      v.hd_def = v.hd;

    var links = [];
    if(v.hd_def <= 0 && v.no_flv == 0)
    {
      links.push({
        url: vkontakte_ru_embed.getVkFlvLink(v),
        name: 'FLV',
        subname: '',
        type: 'flv'
      });
    }
    else
    {
      links.push({
        url: vkontakte_ru_embed.getVkMp4Link(v, 240),
        name: (v.no_flv == 0) ? 'FLV' : 'MP4',
        subname: '240',
        type: (v.no_flv == 0) ? 'flv' : 'mp4'
      });

      if(v.hd_def > 0)
      {
        links.push({
          url: vkontakte_ru_embed.getVkMp4Link(v, 360),
          name: 'MP4',
          subname: '360',
          type: 'mp4'
        });

        if(v.hd_def > 1)
        {
          links.push({
            url: vkontakte_ru_embed.getVkMp4Link(v, 480),
            name: 'MP4',
            subname: '480',
            type: 'mp4'
          });

          if(v.hd_def > 2)
          {
            links.push({
              url: vkontakte_ru_embed.getVkMp4Link(v, 720),
              name: 'MP4',
              subname: '720',
              type: 'mp4'
            });
          }
        }
      }
    }

    return links;
  },

  getVkFlvLink: function (v)
  {
    if(v.host.search(/^https?:\/\//i) != -1)
    {
      if(v.host.charAt(v.host.length - 1) != '/')
        v.host += '/';

      if(v.host.search(/^https?:\/\/cs\d+\./i) != -1)
        return v.host + 'u' + v.uid + '/videos/' + v.vtag + '.flv';

      return v.host + 'assets/video/' + v.vtag + v.vkid + '.vk.flv';
    }

    var url = v['url240'];
    if (url !== undefined) {
      url = decodeURIComponent(url.replace(/\\\//g, '/'));
      var ePos = url.indexOf('?');
      if (ePos === -1) {
        ePos = url.length;
      }
      if (url) {
        return url.substr(0, ePos);
      }
    }

    if(v.host.search(/\D/) == -1)
      return 'http://cs' + v.host + '.' + 'vk.com/u' + v.uid + '/videos/' + v.vtag + '.flv';

    return 'http://' + v.host + '/assets/video/' + v.vtag + v.vkid + '.vk.flv';
  },

  getVkMp4Link: function(v, q)
  {
    if(q == 240 && v.no_flv == 0)
      return vkontakte_ru_embed.getVkFlvLink(v);

    if(v.host.search(/^https?:\/\//i) != -1)
    {
      if(v.host.charAt(v.host.length - 1) != '/')
        v.host += '/';

      return v.host + 'u' + v.uid + '/videos/' + v.vtag + '.' + q + '.mp4';
    }

    var url = v['url'+q];
    if (url !== undefined) {
      url = decodeURIComponent(url.replace(/\\\//g, '/'));
      var ePos = url.indexOf('?');
      if (ePos === -1) {
        ePos = url.length;
      }
      if (url) {
        return url.substr(0, ePos);
      }
    }

    return 'http://cs' + v.host + '.' + 'vk.com/u' + v.uid + '/videos/' + v.vtag + '.' + q + '.mp4';
  },

  getVkLinksFromData: function(request, cb) {
    var data = request.data;
    var json = data.match(/var\s+vars\s+=\s+({.*});/i);
    if (!json) {
      return cb();
    }
    json = json[1];
    try {
      json = JSON.parse(json);
    } catch (e) {
      return cb();
    }
    var links = [];
    var vid = json.vid;
    var title = json.md_title || json.vid;
    var thumb = '';

    if(json.thumb) {
      thumb = json.thumb;
      if (thumb.search(/\\\//) !== -1) {
        thumb = thumb.replace(/\\\//g, '/');
      }
    } else
    if(json.jpg) {
      thumb = json.jpg;
    }

    for (var key in json) {
      if (key.substr(0, 3) !== 'url') {
        continue;
      }
      var quality = parseInt(key.substr(3));
      if (isNaN(quality)) {
        continue;
      }
      var url = json[key];
      var type = 'flv';
      if (json.no_flv === 1) {
        type = 'mp4';
      }
      links.push({
        url: url,
        subname: quality,
        name: type.toUpperCase(),
        type: type
      });
    }

    var duration = data.match(/(['"]?)duration\1\s*:\s*(\d+)/i);
    if(duration && duration.length > 2) {
      duration = duration[2];
    } else {
      duration = '';
    }

    return cb({
      action: 'getVKLinks',
      extVideoId: vid,
      links: links,
      title: title,
      duration: duration,
      thumb: thumb,
      data: json,
      checkLinks: null
    });
  }
};
/*@if isVkOnly=0>*/
if (typeof window === 'undefined') {
  exports.init = function(_mono, _engine) {
    mono = _mono;
    engine = _engine;
    return vkontakte_ru_embed;
  };
} else {
/*@if isVkOnly=0<*/
  engine.modules.vkontakte = vkontakte_ru_embed;
/*@if isVkOnly=0>*/
}
/*@if isVkOnly=0<*/