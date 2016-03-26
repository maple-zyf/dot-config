// ==UserScript==
// @exclude *
// ==/UserScript==

var soundcloud_com_embed = {
  getSoundcloudTrackInfo: function (request, callback)
  {
    function callback_links(data, isValid)
    {
      var response = {
        action: request.action,
        trackUrl: request.trackUrl,
        client_id: request.client_id,
        data: data,
        checkLinks: isValid
      };

      callback(response);
    }

    soundcloud_com_embed._getSoundcloudTrackInfo(request.trackUrl, request.client_id, callback_links);
  },

  _getSoundcloudTrackInfo: function (trackUrl, client_id, callback)
  {
    if(!trackUrl || !client_id)
    {
      callback(null);
      return;
    }

    var url = 'http://api.soundcloud.com/resolve.json?url=' + trackUrl +
      '&client_id=' + client_id;

    mono.request({
      url: url,
      headers: {
        Referer: url
      },
      json: true
    }, function(err, resp, json){
      if (err || !json) {
        return callback();
      }

      soundcloud_com_embed.checkSoundcloudLinks(json, client_id, callback);
    });
  },

  checkSoundcloudLinks: function (data, client_id, cb) {
    if (!data) {
      return cb();
    }
    var info = data;

    if(info.kind !== 'track' && info.tracks && info.tracks.length === 1) {
      info = info.tracks[0];
    }

    if(info.kind === 'track' && info.stream_url) {
      soundcloud_com_embed.validateSoundcloudTrackUrl(info.stream_url, client_id, function (isValid) {
        cb(data, isValid);
      });
      return;
    }

    if (info.tracks && info.tracks[0]) {
      soundcloud_com_embed.validateSoundcloudTrackUrl(info.tracks[0].stream_url, client_id, function(isValid) {
        cb(data, isValid);
      });
      return;
    }

    return cb(data);
  },

  validateSoundcloudTrackUrl: function (url, client_id, cb) {
    url += (url.indexOf('?') === -1) ? '?' : '&';
    url += 'client_id=' + client_id;
    mono.request({
      url: url,
      type: 'HEAD'
    }, function(err) {
      cb(!err);
    });
  }
};

if (typeof window === 'undefined') {
  exports.init = function(_mono, _engine) {
    mono = _mono;
    engine = _engine;
    return soundcloud_com_embed;
  };
} else {
  engine.modules.soundcloud = soundcloud_com_embed;
}