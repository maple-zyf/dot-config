// ==UserScript==
// @include     http://savefrom.net/*
// @include     http://*.savefrom.net/*
// ==/UserScript==

(typeof mono === 'undefined') && (mono = {loadModule: function() {this.loadModuleStack.push(arguments);},loadModuleStack: []});

mono.loadModule('savefrom', function(moduleName, initData) {
  "use strict";
  var language = initData.getLanguage;
  var preference = initData.getPreference;

  mono.asyncCall(function() {
    savefrom.run();
  });

  var getRandomInt = function() {
    var now = Date.now();
    var rnd = now;
    while (now === rnd) {
      rnd = Date.now();
    }
    return rnd;
  };

  var savefrom = {
    name: moduleName,
    scriptId: 'savefrom__ext_script',
    dataAttr: 'data-extension-disabled',


    run: function()
    {
      savefrom.setExtParams();

      if(location.href.search(/\/(update-helper|userjs-setup)\.php/i) > -1)
      {
        var btn = document.getElementById('js-not-remind');
        if(btn)
        {
          btn.addEventListener('click', function(e){
            if(e.button === 0)
            {
              mono.sendMessage({action: 'hideUserjsMigrationInfo'});
            }
          });
        }
        return;
      }

      var form = document.getElementById('sf_form');
      if(!form)
        return;

      form.addEventListener('submit', function(event){
        var url = form.sf_url.value;
        if(!url)
          return;

        if(form.getAttribute(savefrom.dataAttr) == '1')
          return;

        var re = {
          getVKLinks: [
            /^https?:\/\/(?:[a-z]+\.)?(?:vk\.com|vkontakte\.ru)\/(video-?\d+_-?\d+)/i,
            /^https?:\/\/(?:[a-z]+\.)?(?:vk\.com|vkontakte\.ru)\/video_ext.php\?(.*oid=-?\d+.*)$/i,
            /^https?:\/\/(?:[a-z]+\.)?(?:vk\.com|vkontakte\.ru)\/[\w\-\.]+\?.*z=(video-?\d+_-?\d+)/i
          ],
          getYoutubeLinks: [
            /^https?:\/\/(?:[a-z]+\.)?youtube\.com\/(?:#!?\/)?watch\?.*v=([\w\-]+)/i,
            /^https?:\/\/(?:[a-z0-9]+\.)?youtube\.com\/(?:embed|v)\/([\w\-]+)/i,
            /^https?:\/\/(?:[a-z]+\.)?youtu\.be\/([\w\-]+)/i
          ],
          getVimeoLinks: [
            /^https?:\/\/(?:[\w\-]+\.)?vimeo\.com\/(?:\w+\#)?(\d+)/i,
            /^https?:\/\/player\.vimeo\.com\/video\/(\d+)/i,
            /^https?:\/\/(?:[\w\-]+\.)?vimeo\.com\/channels\/(?:[^\/]+)\/(\d+)$/i,
            /^https?:\/\/(?:[\w\-]+\.)?vimeo\.com\/[^\/]+\/review\/(\d+)\/(?:\d+)/i
          ],

          getDailymotionLinks: [
            /^http:\/\/(?:www\.)?dai\.ly\/([a-z0-9]+)_?/i,
            /^https?:\/\/(?:[\w]+\.)?dailymotion\.com(?:\/embed|\/swf)?\/video\/([a-z0-9]+)_?/i
          ],

          getFacebookLinks: [
            /^https?:\/\/(?:[\w]+\.)?facebook\.com(?:\/video)?\/video.php.*[?&]{1}v=([0-9]+).*/i,
            /^https?:\/\/(?:[\w]+\.)?facebook\.com\/.+\/videos(?:\/\w[^\/]+)?\/(\d+)/i
          ],

          getMailruLinks: [
            /^https?:\/\/my\.mail\.ru\/([^\/]+\/[^\/]+\/[^\/]+\/[^\/]+\/[^\/]+\.html).*/i,
            /^https?:\/\/videoapi\.my\.mail\.ru\/videos\/(embed\/[^\/]+\/[^\/]+\/[^\/]+\/[^\/]+\.html).*/i
          ]
        };

        for(var i in re)
        {
          for(var j = 0; j < re[i].length; j++)
          {
            var vid = url.match(re[i][j]);
            if(vid && vid.length > 1)
            {
              vid = vid[1];
              var playlist = SaveFrom_Utils.getMatchFirst(url, /list=([\w\-]+)/i);
              event.preventDefault();
              event.stopPropagation();

              var request = {
                extVideoId: vid,
                action: i,
                checkSubtitles: true,
                checkLinks: true
              };

              if (i === 'getVimeoLinks') {
                request.url = url;
              }

              mono.sendMessage(request, function(r){
                savefrom.setLinks(r.action, r.extVideoId, r.links, r.title, null,
                  r.subtitles, playlist, r.duration, r.thumb, r.checkLinks);
              });

              return false;
            }
          }
        }
      }, false);


      document.body.addEventListener('click', function(event){
        var node = event.target;

        if (node.tagName === 'I' && node.classList.contains('file-info-btn')) {
          savefrom.onInfoBtnClick.call(node, event);
          return;
        }

        if(node.tagName != 'A')
        {
          if(node.parentNode.tagName == 'A')
            node = node.parentNode;
          else
            return;
        }

        if ((mono.isChrome || mono.isFF) && node.classList.contains('link-download') && !node.classList.contains('disabled') && node.getAttribute('download')) {
          if (node.classList.contains('ga_track_events') && node.getAttribute('data-ga-event')) {
            mono.trigger(node, 'sendstats', {bubbles: true, cancelable: false});
          }
          return SaveFrom_Utils.downloadOnClick(event, null);
        }

        var vid = node.getAttribute('data-video-id');
        if(!vid) {
          return;
        }

        if(node.getAttribute(savefrom.dataAttr) == '1')
          return;

        var action = {
          vk: 'getVKLinks',
          yt: 'getYoutubeLinks'
        };

        vid = vid.split(':', 2);
        if(vid.length != 2 || !action[vid[0]])
          return;

        event.preventDefault();
        event.stopPropagation();

        node.style.display = 'none';

        if(!node.id)
        {
          node.id = vid[0] + '_' + vid[1] + '_' + (Math.random() * 1000) +
            '_' + (new Date()).getTime();
        }

        var request = {
          extVideoId: vid[1],
          action: action[vid[0]],
          checkSubtitles: true,
          checkLinks: true
        };

        mono.sendMessage(request, function(r){
          savefrom.setLinks(r.action, r.extVideoId, r.links, r.title, node,
            r.subtitles, null, r.duration, r.thumb, r.checkLinks);
        });

        return false;
      }, true);
    },

    onInfoBtnClick: function(e) {
      e.preventDefault();
      e.stopPropagation();

      if (this.classList.contains('sf-clicked')) {
        return;
      }
      this.classList.add('sf-clicked');

      var className = 'sf-btn'+getRandomInt();
      this.classList.add(className);

      var rmOldScript = function() {
        var exScript = document.getElementsByClassName('sf-script')[0];
        if (exScript !== undefined) {
          exScript.parentNode.removeChild(exScript);
        }
      };

      rmOldScript();
      document.body.appendChild(mono.create('script', {
        class: 'sf-script',
        text: '('+ function() {
          try{
            var btnClassName = '{btnClassName}';
            var btn = document.getElementsByClassName(btnClassName);
            var $btn = $(btn);

            $btn.unbind('click').removeAttr('onclick').addClass('active');

            if(btn.onclick) {
              btn.onclick = null;
            }

            var parent = $btn.closest('.result-box').find('.meta')[0];

            if (!parent) {
              return;
            }

            var boxId = 'file_info' + btnClassName;

            var box = sf.append(parent, 'div', {'id': boxId, 'class': 'media-info'});

            sf.append(box, 'span', {id: boxId + '_busy'});

            sf.busy(boxId + '_busy', true);
          }catch(err){}
        }.toString().replace('{btnClassName}', className) +')()'
      }));

      var url = this.nextElementSibling.href;
      var title = this.nextElementSibling.textContent;
      mono.sendMessage({action: 'getFileSize', url: url}, function(response) {
        var size = response.fileSize;
        var data = JSON.stringify({
          size: {
            name: {
              trans: language.size
            },
            value: SaveFrom_Utils.sizeHuman(size)
          }
        });
        rmOldScript();
        document.body.appendChild(mono.create('script', {
          class: 'sf-script',
          text: '('+ function() {
            try{
              var btnClassName = '{btnClassName}';
              var busy = document.getElementById('file_info' + btnClassName + '_busy');

              $(busy).slideUp();

              var json = undefined;
              try {
                json = $.parseJSON('{data}');
              } catch(err){
                json = '<!--error-->';
              }

              if(!json || typeof(json) !== 'object') {
                if(json.indexOf('<!--error-->') > -1) {
                  json = {err: json};
                } else {
                  json = {information: {value: json}};
                }
              }

              var btn = document.getElementsByClassName(btnClassName);

              sf.fileInfo.show(json, '{title}', btn, busy.parentNode);
            }catch(err){}
          }.toString().replace('{btnClassName}', className).replace('{title}', title).replace('{data}', data) +')()'
        }));
      });
    },

    setExtParams: function()
    {
      var script = mono.create('script', {
        id: 'savefrom__ext_params',
        type: 'text/javascript'
      });

      var params = {
        id: preference.sfHelperName,
        version: preference.version,
        enable: 1
      };

      script.textContent = '(' + function(json) {
          try{
            if(window.setBrowserExtension && typeof setBrowserExtension == "function"){
              setBrowserExtension(json);
            }
          } catch(err) {}
        }.toString() + ')('+JSON.stringify(params)+')';

      document.body.appendChild(script);
    },


    setLinks: function(action, vid, links, title, btn, subtitles, playlist,
                       duration, thumb, valid)
    {
      if(valid === false)
      {
        savefrom.handleError(btn);
        return;
      }

      switch(action)
      {
        case 'getYoutubeLinks':
          savefrom.setYoutubeLinks(vid, links, title, btn, subtitles,
            playlist, duration, thumb);
          break;
        case 'getVKLinks':
          savefrom.setVKLinks(vid, links, title, btn, duration, thumb);
          break;

        case 'getVimeoLinks':
          savefrom.setVimeoLinks(vid, links, title, btn, duration, thumb);
          break;

        case 'getDailymotionLinks':
          savefrom.setDailymotionLinks(vid, links, title, btn, duration, thumb);
          break;

        case 'getFacebookLinks':
          savefrom.setFacebookLinks(vid, links, title, btn, duration, thumb);
          break;

        case 'getMailruLinks':
          savefrom.setMailruLinks(vid, links, title, btn, duration, thumb);
          break;
      }
    },


    handleError: function(btn)
    {
      if(btn)
      {
        if(btn)
        {
          btn.style.display = '';
          btn.setAttribute(savefrom.dataAttr, '1');
          btn.click();
        }
        return;
      }

      var form = document.getElementById('sf_form');
      if(!form)
        return;

      form.setAttribute(savefrom.dataAttr, '1');
      form.submit();
      form.removeAttribute(savefrom.dataAttr);
    },

    showVideoResult: function(result, btn)
    {
      if(!result || !result.url || !result.url.length)
      {
        savefrom.handleError(btn);
        return;
      }

      var script = document.getElementById(savefrom.scriptId);
      if(script) {
        script.parentNode.removeChild(script);
      }

      script = mono.create('script', {
        id: savefrom.scriptId,
        type: 'text/javascript'
      });

      var fn;
      if(btn) {
        var btnId = btn.id;
        fn = '(' + function(btnId, json) {
            try {
              var btn = document.getElementById(btnId);
              sf.result.replaceAjaxResult(json, true, true, btn);
            } catch(err) {}
          }.toString() + ')("'+btnId+'",'+JSON.stringify(result)+')';
      } else {
        fn = '(' + function(json) {
            try {
              sf.finishRequest(true);
              sf.videoResult.show(json);
            } catch(err) {}
          }.toString() + ')('+JSON.stringify(result)+')';
      }
      script.textContent = fn;

      document.body.appendChild(script);
    },


    setVKLinks: function(vid, links, title, btn, duration, thumb)
    {
      if(!vid || !links)
      {
        savefrom.handleError(btn);
        return;
      }

      var result = {
        id: vid,
        url: links,
        hosting: 'vk.com (h)',
        meta: {
          title: (title ? mono.fileName.modify(title) : ''),
          source: "http://vk.com/" + vid,
          duration: SaveFrom_Utils.secondsToDuration(duration)
        }
      };

      if(thumb)
        result.thumb = thumb;

      for(var i = 0; i < result.url.length; i++)
      {
        result.url[i].info_url = '#';

        if(!result.url[i].ext && result.url[i].type)
          result.url[i].ext = result.url[i].type;

        if(!result.sd && !result.url[i].subname)
          result.sd = {url: result.url[i].url};
        else if(!result.hd && result.url[i].subname && parseInt(result.url[i].subname) >= 720)
          result.hd = {url: result.url[i].url};
      }

      savefrom.showVideoResult(result, btn);
    },

    setYoutubeLinks: function(vid, links, title, btn, subtitles, playlist,
                              duration, thumb)
    {
      if(!vid || !links)
      {
        savefrom.handleError(btn);
        return;
      }

      var result = {
        id: vid,
        url: [],
        hosting: '101 (h)',
        meta: {
          title: (title ? mono.fileName.modify(title) : ''),
          source: (vid ? 'http://youtube.com/watch?v=' + vid : ''),
          duration: SaveFrom_Utils.secondsToDuration(duration)
        },
        thumb: (vid ? 'http://i.ytimg.com/vi/' + vid + '/hqdefault.jpg' : '')
      };

      var sig = false;


      SaveFrom_Utils.video.yt.init();

      var meta = links.meta || {};

      for(var formatName in SaveFrom_Utils.video.yt.format)
      {
        var f = SaveFrom_Utils.video.yt.format[formatName];
        for(var iTag in f)
        {
          var metaTag = meta[iTag] || {};
          if(links[iTag])
          {
            if(!sig && links[iTag].search(/(\?|&)sig(nature)?=/i) > -1) {
              sig = true;
            }

            var quality = f[iTag].quality;

            if (metaTag.quality) {
              quality = metaTag.quality;
            }

            var l = {
              url: links[iTag],
              name: formatName,
              subname: quality,
              info_url: '#',
              type: formatName,
              quality: quality,
              attr: {}
            };


            if(f[iTag].sFps) {
              l.subname += ' ' + (metaTag.fps || 60);
            }

            if(f[iTag]['3d'])
            {
              l.name = '3D ' + l.name;
              l.group = '3d';
              l['3d'] = true;
            }
            else if(f[iTag]['noAudio'])
            {
              l.group = 'MP4 ';
              l.attr['class'] = 'no-audio';
              // l.ext = 'mp4';
            }
            else if(formatName == 'Audio AAC')
            {
              l.type = 'AAC';
              l.ext = 'aac';
              l.attr.style = 'white-space: nowrap;';
            }
            else if(formatName == 'Audio Vorbis')
            {
              l.type = 'Vorbis';
              l.ext = 'webm';
              l.attr.style = 'white-space: nowrap;';
            }
            else if(formatName == 'Audio Opus')
            {
              l.type = 'Opus';
              l.ext = 'opus';
              l.attr.style = 'white-space: nowrap;';
            }
            else
            {
              if(formatName.toLowerCase() == 'flv' && !result.sd)
              {
                result.sd = {url: links[iTag]};
              }

              if(parseInt(quality) >= 720 && result.sd && !result.hd)
              {
                result.hd = {url: links[iTag]};
              }
            }

            if (l.ext === undefined && l.type) {
              l.ext = l.type.toLowerCase();
            }

            if (f[iTag].noVideo === undefined && f[iTag].noAudio === undefined) {
              l.no_download = true;
            }

            result.url.push(l);
            delete links[iTag];
          }
        }
      }

      if(!sig)
      {
        savefrom.handleError(btn);
        return;
      }

      if(subtitles && subtitles.length > 0)
      {
        var subsId = vid.replace(/[^\w]/, '_');
        var btnId = 'yt_subs_btn_' + subsId;
        subsId = 'yt_subs_' + subsId;

        var subtToken = 'extension';
        var subsTitle = result.meta.title ? btoa(SaveFrom_Utils.utf8Encode(result.meta.title)) : '';

        result.action = [];
        result.action.push({
          name: language.subtitles,
          attr: {
            id: btnId,
            href: '#'
          },

          bind: {
            click: {
              fn: 'sf.youtubeSubtitles("{vid}","{subsId}","{btnId}","{subtToken}","{subsTitle}")'
                .replace('{vid}', vid)
                .replace('{subsId}', subsId)
                .replace('{btnId}', '#' + btnId)
                .replace('{subtToken}', subtToken)
                .replace('{subsTitle}', subsTitle)
            }
          }
        });
      }

      if(playlist && false)
      {
        playlist = 'http://www.youtube.com/playlist?list=' + playlist;
        if(!result.action)
          result.action = [];
        result.action.push({
          name: language.playlist,
          attr: {
            href: '#',
            class: 'tooltip',
            title: language.downloadWholePlaylist
          },

          bind: {
            click: {
              fn: 'sf.processLink("{playlist}");'
                .replace('{playlist}', playlist)
            }
          }
        });
      }

      if (preference.showUmmyItem) {
        result.action = result.action || [];

        var params = mono.param({
          vid: 112,
          video: 'yt-' + vid,
          utm_source: 'savefrom',
          utm_medium: 'vidacha-helper',
          utm_campaign: 'ummy',
          utm_content: 'ummy_integration'
        });

        var tooltip = mono.create('div', {
          append: mono.parseTemplate(language.ummyMenuInfo.replace('{url}', 'http://videodownloader.ummy.net/?'+params).replace("src:'#'", "src:'/img/ummy_icon_16.png'"))
        });

        mono.create(tooltip.querySelector('a.arrow'), {
          class: ['ga_track_events'],
          data: {
            gaEvent: 'send;event;vidacha-helper;youtube;ummy-tooltip-click'
          }
        });

        result.action.push({
          name: language.ummySfTitle,
          group: 'ummy',
          'second-btn': true,

          attr: {
            href: 'ummy:www.youtube.com/watch?v=' + vid,
            class: 'ummy-link tooltip ga_track_events',
            title: tooltip.innerHTML,
            target: '_blank',
            'data-ga-event': 'send;event;vidacha-helper;youtube;ummy-helper-button-click',
            'data-tooltip-ga-event': 'vidacha-helper;youtube;ummy-helper-tooltip-show'
          }
        });

        result.fn = result.fn || [];
        result.fn.push("if(window.ga){ga('send','event','vidacha-helper','youtube','ummy-helper-button-show');}");
      }

      savefrom.showVideoResult(result, btn);
    },

    setVimeoLinks: function(vid, links, title, btn, duration, thumb)
    {
      if(!vid || !links)
      {
        savefrom.handleError(btn);
        return;
      }

      var result = {
        id: vid,
        url: links,
        hosting: 'vimeo.com (h)',
        meta: {
          title: (title ? mono.fileName.modify(title) : ''),
          source: "http://vimeo.com/" + vid,
          duration: SaveFrom_Utils.secondsToDuration(duration)
        }
      };

      if(thumb)
        result.thumb = thumb;

      for(var i = 0; i < result.url.length; i++)
      {
        result.url[i].info_url = '#';

        if(!result.url[i].ext && result.url[i].type)
          result.url[i].ext = result.url[i].type;

        if(!result.sd && result.url[i].name == 'SD')
          result.sd = {url: result.url[i].url};
        else if(!result.hd && result.url[i].name == 'HD')
          result.hd = {url: result.url[i].url};
      }

      savefrom.showVideoResult(result, btn);
    },

    setDailymotionLinks: function(vid, links, title, btn, duration, thumb) {
      if(!vid || !links)
      {
        savefrom.handleError(btn);
        return;
      }

      var result = {
        id: vid,
        url: links,
        hosting: 'dailymotion.com (h)',
        meta: {
          title: (title ? mono.fileName.modify(title) : ''),
          source: "http://dai.ly/" + vid,
          duration: SaveFrom_Utils.secondsToDuration(duration)
        }
      };

      if(thumb)
        result.thumb = thumb;

      var hd_size = 0, sd_size = 0;
      for (var i = 0, item; item = links[i]; i++) {
        item.info_url = '#';

        if (item.height >= 720) {
          if (hd_size < item.height) {
            result.hd = {url: item.url};
            hd_size = item.height;
          }
        } else
        if (sd_size < item.height) {
          result.sd = {url: item.url};
          sd_size = item.height;
        }
        delete item.height;
      }
      savefrom.showVideoResult(result, btn);
    },

    setFacebookLinks: function(vid, links, title, btn, duration, thumb) {
      if(!vid || !links)
      {
        savefrom.handleError(btn);
        return;
      }

      var result = {
        id: vid,
        url: links,
        hosting: 'facebook.com (h)',
        meta: {
          title: (title ? mono.fileName.modify(title) : ''),
          source: "https://facebook.com/video.php?v=" + vid,
          duration: SaveFrom_Utils.secondsToDuration(duration)
        }
      };

      if(thumb) {
        result.thumb = thumb;
      }

      for (var i = 0, item; item = links[i]; i++) {
        item.info_url = '#';

        if (item.name === "SD") {
          result.sd = {url: item.url};
        } else
        if (item.name === "HD") {
          result.hd = {url: item.url};
        }

        item.subname = item.name;
        item.name = item.ext;
      }
      savefrom.showVideoResult(result, btn);
    },

    setMailruLinks: function(vid, links, title, btn, duration, thumb) {
      if(!vid || !links)
      {
        savefrom.handleError(btn);
        return;
      }

      var result = {
        id: vid,
        url: links,
        hosting: 'mail.ru (h)',
        meta: {
          title: (title ? mono.fileName.modify(title) : ''),
          source: "http://my.mail.ru/" + vid,
          duration: SaveFrom_Utils.secondsToDuration(duration)
        }
      };

      if(thumb)
        result.thumb = thumb;

      var maxSd = 0;
      for(var i = 0, item; item = result.url[i]; i++)
      {
        item.info_url = '#';
        if (!isNaN(parseInt(item.subname))) {
          if (maxSd < item.subname && item.subname < 720) {
            result.sd = {url: item.url};
            maxSd = item.subname;
          }
          if (!result.hd && item.subname >= '720') {
            result.hd = {url: item.url};
          }
        } else {
          if (item.subname.toLowerCase() === 'sd') {
            result.sd = {url: item.url};
          } else if (item.subname.toLowerCase() === 'hd') {
            result.hd = {url: item.url};
          }
        }
      }

      savefrom.showVideoResult(result, btn);
    }
  };
}, null, function syncIsActive() {
  "use strict";
  if (mono.isSafari || mono.isGM) {
    if (!mono.checkUrl(document.URL, [
        'http://savefrom.net/*',
        'http://*.savefrom.net/*'
      ])) {
      return false;
    }
  }

  if (!mono.isIframe()) {
    if (location.href.search(/savefrom\.net\/(index\d?\.php|user\.php|update-helper\.php|userjs-setup\.php|\d+-[^\/]+\/|articles\/.+)?(\?|#|$)/i) === -1) {
      return false;
    }
  } else {
    var allowFrame = false;

    if (mono.isGM) {
      allowFrame = location.href.indexOf('/tools/helper-check.html') !== -1;
    }

    if (!allowFrame) {
      return false;
    }
  }

  return true;
});