// JavaScript Document

var sideDict = window.sideDict||{};

sideDict.dictType = "";
chrome.storage.sync.get(["dict-type"],function(items){
	sideDict.dictType=items["dict-type"];
});

sideDict.queryWord = null;
sideDict.width = 610;
sideDict.youdWidth = 570;
sideDict.bingWidth = 555;
sideDict.dictWidth = 510;
sideDict.extension_url = chrome.extension.getURL("sidebar.html");
sideDict.extension_window_url = chrome.extension.getURL("window.html");
sideDict.theme_url = chrome.extension.getURL("themes");
sideDict.checkExist = function(){
	if($("#hanlin-dict-w").length>0){
		sideDict.update();
		sideDict.show();
	}
	else{
		sideDict.create();
	}
}

sideDict.status = "";

sideDict.show = function(){
	$("#hanlin-dict-w").animate({width: sideDict.width+"px"}, 300);
	if(sideDict.status == 'pin') return;
	sideDict.status = 'show';
}

sideDict.create = function(){

//Chrome https hack
	if(document.URL.indexOf("https://")==0){		
		sideDict.dictType = "bing_https";
	}
	$("body").after('<div id="hanlin-dict-w" dragenter="true" style="position:fixed; top:0; right:0; overflow:hidden;"><iframe src="'+sideDict.extension_url+'?query='+$.trim(sideDict.queryWord)+'&dict='+sideDict.dictType+'" id="hanlin-dict" frameborder="0" width="'+sideDict.width+'" height="100%" style="position:absolute; left:0; top:0;"></iframe><div id="hanlin-dict-minwidth"></div></div>');
	$("#hanlin-dict-w").animate({width: sideDict.width+"px"}, 300);
	sideDict.status = 'show';
}

sideDict.close = function(){
	if($("#hanlin-dict-w").width()>100){
		$("#hanlin-dict-w").animate({width: "0"}, 300);
	}
	else{
		$("#hanlin-dict-w").animate({width: "0"}, 100);
	}
	sideDict.status = 'close';
}

sideDict.max = function(){
	$("#hanlin-dict-w").animate({width: sideDict.width+"px"}, 300);
	sideDict.status = 'max';
}

sideDict.min = function(){
	var _min_width = $("#hanlin-dict-minwidth").width();
	$("#hanlin-dict-w").animate({width: _min_width+"px"}, 300);
	sideDict.status = 'min';
}

sideDict.pinToggle = function(){
	var _iframe = document.getElementById('hanlin-dict').contentWindow;
	if(sideDict.status!="pin"){
		sideDict.status = "pin";
		_iframe.postMessage("pin",sideDict.extension_url);
	}
	else{
		sideDict.status = "unpin";
		_iframe.postMessage("unpin",sideDict.extension_url);
	}
}

sideDict.update = function(){
	var _iframe = document.getElementById('hanlin-dict').contentWindow;
	_iframe.postMessage("update?queryWord="+sideDict.queryWord+"&dictType="+sideDict.dictType,sideDict.extension_url);
}

sideDict.setPopPosition = function(e){
	var _popHeight = $("#hldict-pop").height(); 
	var _popWidth = $("#hldict-pop").width(); 
	if(e.clientY<_popHeight+10){
		$("#hldict-pop").css({"left":e.pageX-_popWidth/2+"px","top":e.pageY+13+"px"});
		$("#hldict-pop").prepend('<div id="hldict-poparrow-w" class="up"><div id="hldict-poparrow" class="up"></div></div>');
	}
	else{
		$("#hldict-pop").css({"left":e.pageX-_popWidth/2+"px","top":e.pageY-_popHeight-17+"px"});
		$("#hldict-pop").append('<div id="hldict-poparrow-w" class="down"><div id="hldict-poparrow" class="down"></div></div>');
	}
	if(e.clientX<_popWidth/2){
		$("#hldict-pop").css({"left":"5px"});
		$("#hldict-poparrow").css({"left":e.pageX+'px'});
	}
	else if(($(window).width()-e.clientX)<_popWidth/2){
		$("#hldict-pop").css({"left":$(window).width()-_popWidth-5+"px"});
		$("#hldict-poparrow").css({"left":_popWidth+5-$(window).width()+e.pageX+'px'});
	}
}

sideDict.showPop = function(type,e){
	var _width = 300;
	var _titleShow = true;
	switch(type){
		case 'word':
			
			break;
		case 'paragraph':
			_width = 300;
			_titleShow = false;
			break;
	}
	$("#hldict-pop").remove();
	sideDict.queryWord = $.trim(window.getSelection().toString());
	var queryWord = sideDict.queryWord;
	$("body").after('<div id="hldict-pop" style="width:'+_width+'px;"><div id="hldict-pop-texture"><div id="hldict-pop-close"></div></div><div id="hldict-pop-content">Searching...</div></div>');
	
	$("#hldict-pop-close").click(function(){
		$("#hldict-pop").remove();
	}).hover(function(){
		$(this).addClass("hldict-hover");
	},
	function(){
		$(this).removeClass("hldict-hover");
	});
	sideDict.setPopPosition(e);
	
	
	var http_s = document.URL.indexOf("https")==0?"https":"http";
	
	/*
		2016-03-17
		Youdao limited our requests.
		So, change to Bing API
		Fuck you, Youdao.
	*/
	
	$.get(http_s+"://api.bing.com/qsonhs.aspx?mkt=zh-CN&ds=bingdict&q="+queryWord,"json",function(_result){
		if(!$("#hldict-pop").length) return;
		var _title = _titleShow?'<strong>'+_result.AS.Query+'</strong><div id="hldict-pop-play"></div><audio id="hldict-pop-audio" src="http://www.gstatic.com/dictionary/static/sounds/de/0/'+_result.AS.Query+'.mp3"></audio>':"";
		var _content = "";
		var _storage = "";
		if(_result.AS.FullResults){
			_storage = _result.AS.Results[0].Suggests[0].Txt;
			_storage = $.trim(_storage.replace(_result.AS.Query.toLowerCase(),''));
			_storage = $.trim(_storage.replace(_result.AS.Query.toUpperCase(),''));
			_content = _storage+'<br>';
			sideDict.storage( _result.AS.Query, _storage, document.URL, false); // Try to insert the new entry.
		}else{
			_title = "<strong>Sorry, no results found.</strong>";
		}

		$("#hldict-pop-content").html('<div id="hldict-pop-title">'+_title+'</div><div id="hldict-pop-detail">'+_content+'</div><div id="hldict-pop-more">More</div>');
		$("#hldict-poparrow-w").remove();
		if(!_result.AS.FullResults){
			$("#hldict-pop-play").remove();
		}
		
		// Important!! Judge the mp3 source file is loaded!
		if($("#hldict-pop-audio")[0]){
			$("#hldict-pop-audio")[0].onloadeddata = function() {
				$("#hldict-pop-play").show();
				chrome.storage.sync.get(["autosclick"],function(items){
					if(items["autosclick"]==="open"){
						$('#hldict-pop-audio')[0].play();
					}
				});
			};
			// If load error, remove the audio play button
			$("#hldict-pop-audio")[0].addEventListener('error', function (e) { 
				$("#hldict-pop-play").remove();
			}, false);
		}
		
		
		$("#hldict-pop-more").click(function(){
			$("#hldict-pop").remove();
			sideDict.storage( _result.AS.Query, _storage, document.URL, true); // Try to insert the new entry.
			
			if(window!=top){
				top.postMessage("updateQueryWord?word="+sideDict.queryWord,"*");
				return;
			}
			sideDict.checkExist();
			
		});
		
		$("#hldict-pop-play").click(function(){
			$('#hldict-pop-audio')[0].play();
		}).mouseover(function(){
			$('#hldict-pop-audio')[0].play();
		});
		sideDict.setPopPosition(e);
	});
}

sideDict.storage = function(_word, _translation, _url, _important){
	var _time = new Date();
	_time = _time.getTime();
	_entry = {
		w : _word,
		t : _translation,
		u : _url,
		i : _important,
		c : _time
	};
	chrome.runtime.sendMessage({command:"storageNewWord",entry:_entry}, function(response) {
		console.log(response.result);
	});
}
sideDict.setTheme = function(){
	chrome.storage.sync.get(["theme"],function(items){
		$('head').append( $('<link rel="stylesheet" type="text/css" />').attr('href', sideDict.theme_url+'/'+items["theme"]+'/content.css') );
	});
	if(document.getElementById('hanlin-dict')){
		var _iframe = document.getElementById('hanlin-dict').contentWindow;
		_iframe.postMessage("updateTheme",sideDict.extension_url);
	}
	
}


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch(request.command){
		case "queryWord":
			if(window != top ) return;
			sideDict.queryWord = request.queryWord;
			sideDict.checkExist();
			sideDict.storage(request.queryWord, 'Searching by right clicking', document.URL, true);
			break;
		case "updateTheme":
			sideDict.setTheme();
			break;
	}
});

window.addEventListener("message", function(e){ 		// listen msg from sidebar.js
	switch(e.data){
		case "sideDictMax":
			sideDict.max();
			break;
		case "sideDictMin":
			sideDict.min();
			break;
		case "sideDictPin":
			sideDict.pinToggle();
			break;
		default:
			if(typeof e.data == "string" && e.data.indexOf("updateDictType?")==0){
				var _newType = e.data;
				_newType = _newType.split("updateDictType?type=");
				_newType = _newType[1];
				sideDict.dictType = _newType;
			}
			
			else if(typeof e.data == "string" && e.data.indexOf("updateQueryWord?")==0){
				var _newQueryWord = e.data;
				_newQueryWord = _newQueryWord.split("updateQueryWord?word=");
				_newQueryWord = _newQueryWord[1];
				_newQueryWord = _newQueryWord.replace(/\+/g,' ');
				sideDict.queryWord = _newQueryWord;
				if(document.URL==sideDict.extension_url){
					sideDict.update(sideDict.queryWord,sideDict.dictType);
				}
				else{
					sideDict.checkExist();
				}
			}
			else if(typeof e.data == "string" && e.data.indexOf("sideDictClose?")==0){
				var _type = e.data;
				_type = _type.split("sideDictClose?type=");
				_type = _type[1];
				if(_type=="direct"){
					sideDict.close();
				}
				else if(_type=="clickmargin" && sideDict.status!="pin" && sideDict.status!="min"){
					sideDict.close();
				}
			}
			break;
	}
}, false);

$(window).dblclick(function(e){
	chrome.storage.sync.get(["dbclick"],function(items){
		if(items["dbclick"]==="open"){
			if(window.getSelection().toString()){
				var _string = window.getSelection().toString();
				_string = $.trim(_string);
				if(!_string) return;
				sideDict.showPop('word',e);
			}
		}
	});
}).keydown(function(e){
	if(e.which==27){
		$("#hldict-pop").remove();
	}
});
$(function(){
	$("body").mousedown(function(){
		$("#hldict-pop").remove();
		if(sideDict.status=='min'||sideDict.status=='pin'){
			return;
		}
		sideDict.close();
		if(window!=top){
			var _url = document.URL;
			if(_url.indexOf("youdao.com")>=0||_url.indexOf("bing.com/dict")>=0||_url.indexOf("dictionary.reference.com")>=0) {
				return;
			}
			top.postMessage("sideDictClose?type=clickmargin","*");
		}
	}).mouseup(function(event){
		if ((event.metaKey||event.ctrlKey) && event.button == 0 && window.getSelection().toString() ) { 
			chrome.storage.sync.get(["ctrlclick"],function(items){
				if(items["ctrlclick"]==="open"){
					var _string = window.getSelection().toString();
					if(!$.trim(_string))	return false;
					if(_string.length>20){
						sideDict.showPop('paragraph',event);
					}
					else{
						sideDict.showPop('word',event);
					}
				}
			});
		}
	});
	if(typeof(_dict_type_of_this_page) != "undefined" && _dict_type_of_this_page){
		window.parent.postMessage("updateprogress?length=85","*");
	}
	sideDict.setTheme();
});

$(window).load(function() {
	if(typeof(_dict_type_of_this_page) != "undefined" && _dict_type_of_this_page){
		window.parent.postMessage("updateprogress?length=100","*");
	}
});
