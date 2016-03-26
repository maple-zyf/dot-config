// JavaScript Document
var dict_type;
var query;
var dict_status;
var dict_https = false;
var mouse_in_input_area = false;

function adjust_appearance(){
	var _window_width = $(window).width();
	var _window_height = $(window).height();
	$(".adjustheight").height(_window_height-100);
}

function updateProgressBar(_length){
	$("#result-https").stop().hide();
	$("#result-progress").stop(true, true).show();
	var _c_length = $("#result-progress").width();
	_c_length = _c_length/600;
	if(_c_length>_length)	return;
	var _time = _length==100?500:2500;
	$("#result-progress").animate({width:_length+"%"},_time,function(){
		if(_length==100){
			$(this).width(0).hide();
		}
	});
}


function initial(){
	var url = document.URL;
	var _query = null;
	var _dict = null;
	adjust_appearance();
	if(window != top ){
		var urlArray = url.split("?query=");
		urlArray = urlArray[1];
		urlArray = urlArray.split("&dict=");
		_query = urlArray[0];
		_dict = urlArray[1];
	}
	dict_type = _dict;
	query = _query;
	if(_dict=="bing_https"){
		dict_https = true;
		dict_type = "bing";
	}
	displayResult(_query,dict_type);
	$("#tabs .i").mousedown(function(){
		$("#tabs .i").removeClass("selected");
		$(this).addClass("selected");
		var _click_dict = $(this).attr("dict");
		if(_click_dict!=dict_type){
			if(dict_https&&_click_dict!="bing"){
				$("#result-https").fadeIn(5000);
			}
			updateQuery(query,_click_dict);
			dict_type = _click_dict;
			top.postMessage('updateDictType?type='+dict_type, '*');
		}
	});
	$("#top-close").click(function(){
		top.postMessage('sideDictClose?type=direct', '*');
		$("#top-min").show();
		$("#top-max").hide();
		$("#top-pin").removeClass("pinned");
	});
	$("#top-min").click(function(){
		top.postMessage('sideDictMin', '*');
		$("#top-min").hide();
		$("#top-max").show();
		$("#top-pin").removeClass("pinned");
	});
	$("#top-max").click(function(){
		top.postMessage('sideDictMax', '*');
		$("#top-min").show();
		$("#top-max").hide();
	});
	$("#top-pin").click(function(){
		top.postMessage('sideDictPin', '*');
	});
	$("#texture").dblclick(function(){
		$("#top-min").click();
	}).click(function(e){
		if(e.which==2){
			$("#top-close").click();
		}
	});
	$("#searchbox-go").mousedown(function(){
		$(this).addClass("mousedown");
	});
	$("#searchbox-go").mouseup(function(){
		$(this).removeClass("mousedown");
		var _queryWord = $.trim($("#searchbox-input").val());
		updateQuery(_queryWord, dict_type);
		$("#searchbox-results-w").hide();
	});
	$("#search-results-w").mouseleave(function(){
		mouse_in_input_area = false;
	}).mouseenter(function(){
		mouse_in_input_area = true;
	});
	$("#searchbox-input").focus(function(){
		mouse_in_input_area = true;
		$("#search-results-w").show();
		var _queryWord = $(this).val();
		$("#search-results .i").remove();
		if(!$.trim(_queryWord)){
			$("#search-tip").show();
		}
		else{
			getRelateSearch(_queryWord);
		}
	}).blur(function(){
		if(mouse_in_input_area) return;
		$("#search-results-w").hide();
	}).keyup(function(e){
		var _this = $(this);
		$("#search-results-w").show();
		switch(e.which){
			case 13:
				if(!$.trim($(this).val())){
					$("#searchbox-input").val('');
					return false;
				}
				mouse_in_input_area = false;
				$("#searchbox-input").blur();
				$("#searchbox-go").mouseup();
				break;
			case 40:
				if($("#search-results .i.hover").length>0){
					var _length = $("#search-results .i").length;
					var _index = $("#search-results .i.hover").index("#search-results .i");
					if(_index<_length-1){
						$("#search-results .i").eq(_index).removeClass("hover");
						$("#search-results .i").eq(_index+1).addClass("hover");
						var _url = $("#search-results .i").eq(_index+1).attr("url");
						var _query = getQueryWordFromUrl(_url);
						$(this).val(decodeURIComponent(_query));
					}
					else{
						var _temp = $(this).attr("temp");
						$(this).val(_temp);
						$("#search-results .i").eq(_length-1).removeClass("hover");
					}
					return;
				}
				else{
					$("#search-results .i").eq(0).addClass("hover");
					var _url = $("#search-results .i").eq(0).attr("url");
					var _query = getQueryWordFromUrl(_url);
					$(this).val(decodeURIComponent(_query));
					return;
				}
				break;
			case 38:
				e.preventDefault();
				if($("#search-results .i.hover").length>0){
					var _length = $("#search-results .i").length;
					var _index = $("#search-results .i.hover").index("#search-results .i");
					if(_index>0){
						$("#search-results .i").eq(_index-1).addClass("hover");
						$("#search-results .i").eq(_index).removeClass("hover");
						var _url = $("#search-results .i").eq(_index-1).attr("url");
						var _query = getQueryWordFromUrl(_url);
						$(this).val(decodeURIComponent(_query));
					}
					else{
						var _temp = $(this).attr("temp");
						$(this).val(_temp);
						$("#search-results .i").eq(0).removeClass("hover");
					}
					return;
				}
				else{
					$("#search-results .i").last().addClass("hover");
					var _url = $("#search-results .i").last().attr("url");
					var _query = getQueryWordFromUrl(_url);
					$(this).val(decodeURIComponent(_query));
					return;
				}
				break;
			default:
				$(this).attr("temp",$(this).val());
				break;
		}
		var _queryWord = $.trim($(this).val());
		if(!_queryWord){
			$("#search-results .i").remove();
			$("#search-tip").show();
		}
		getRelateSearch(_queryWord);
		
		
	}).mouseenter(function(){
		var _val = $(this).val();
		if(!$("#search-results-w").is(":visible")){
			$(this).select().focus();
			$("#search-results-w").hide();
		}
	}).click(function(){
		$("#search-results-w").show();
		$(this).select();
	});
	$("#search-results .i").live('click',function(){
		var _url = $(this).attr("url");
		var _queryWord = getQueryWordFromUrl(_url);
		updateQuery(_queryWord,dict_type);
		$("#search-results-w").hide();
	}).live('mouseover',function(){
		$("#search-results .i").removeClass("hover");
		$(this).addClass("hover");
	}).live('mouseout',function(){
		$(this).removeClass("hover");
	});
	setTheme();
}

function getQueryWordFromUrl(_url){
	var _queryWord = _url.split("/search?q=");
	_queryWord = _queryWord[1];
	_queryWord = _queryWord.split("&");
	_queryWord = _queryWord[0];
	return _queryWord;
}

function getRelateSearch(_queryWord){
	var http_s = dict_https?"https":"http";
	$.get(http_s+"://api.bing.com/qsonhs.aspx?mkt=zh-CN&ds=bingdict&q="+_queryWord,"json",function(_responde){
		_responde = _responde.AS;
		if(_responde.FullResults){
			$("#search-results .i").remove();
			$("#search-tip").hide();
			_results = _responde.Results[0].Suggests;
			$.each(_results,function(){
				var _this = this;
				$("#search-results").append('<div class="i" url="http://cn.bing.com'+_this.Url+'">'+_this.Txt+'</div>');
			});
		}
		else if(_responde.Query==""){
			return;
		}
		else{
			$("#search-results .i").remove();
			$("#search-results").append('<div class="i" url="http://cn.bing.com/dict/search?q='+_queryWord+'&sk=">'+_queryWord+'</div>');
		}
	});
}

function updateQuery(_query,_dict){
	if( _query.indexOf("&")>0 ){
		_query = _query.split("&");
		_query = _query[0];
	}
	_query = _query.replace(/\+/g,' ');
	dict_type = _dict;
	query = _query;
	displayResult(_query,_dict);
}

function displayResult(_query,_dict){
	$("#tabs .i").removeClass("selected");
	$("#tab-"+_dict).addClass("selected");
	$("#top-min").show();
	$("#top-max, #search-results-w").hide();
	$("#searchbox-input").val(decodeURIComponent(_query));
	$("#searchbox-input").attr("temp",decodeURIComponent(_query));
	switch(_dict){
		case 'youdao':
			$(".iframeresult").hide();
			$("#youdao-dict").attr("src","");
			$("#youdao-dict").attr("src","http://dict.youdao.com/search?q="+_query).show();
			$("#bing-dict").attr("src","");
			$("#dictionary-dict").attr("src","");
			break;
		case 'bing':
			$(".iframeresult").hide();
			$("#bing-dict").attr("src","");
			if(dict_https){
				$("#bing-dict").attr("src","https://cn.bing.com/dict/search?q="+_query+'&mkt=zh-cn').show();
			}
			else{
				$("#bing-dict").attr("src","http://cn.bing.com/dict/search?q="+_query+'&mkt=zh-cn').show();
			}
			$("#youdao-dict").attr("src","");
			$("#dictionary-dict").attr("src","");
			break;
		case 'dictionary':
			$(".iframeresult").hide();
			$("#dictionary-dict").attr("src","");
			$("#dictionary-dict").attr("src","http://dictionary.reference.com/browse/"+_query).show();
			$("#youdao-dict").attr("src","");
			$("#bing-dict").attr("src","");
			break;
	}
}

function setTheme(){
	chrome.storage.sync.get(["theme"],function(items){
		var _theme_url = chrome.extension.getURL("themes");
		$('head').append( $('<link rel="stylesheet" type="text/css" />').attr('href', _theme_url+'/'+items["theme"]+'/sidebar.css') );
	});
}

$(document).ready(function() {
	initial();	
	$(window).resize(function(){
		adjust_appearance();
	});
});

window.addEventListener("message", function(e){ 		// listen msg from content.js
	var _message = e.data;
	if(_message.indexOf("update?")==0){
		var _querys = _message.split("?queryWord=");
		_querys = _querys[1];
		_querys = _querys.split('&dictType=');
		var _queryWord = _querys[0];
		var _dictType = _querys[1];
		if(_dictType=="bing_https"){
			_dictType = "bing";
		}
		updateQuery(_queryWord,_dictType);
	}
	else if(e.data.indexOf("updateQueryWord?")==0){
		var _newQueryWord = e.data;
		_newQueryWord = _newQueryWord.split("updateQueryWord?word=");
		_newQueryWord = _newQueryWord[1];
		_newQueryWord = _newQueryWord.replace('+',' ');
		query = _newQueryWord;
		displayResult(query,dict_type);
	}
	else if(e.data.indexOf("updateQueryWordOnly?")==0){
		var _newQueryWord = e.data;
		_newQueryWord = _newQueryWord.split("updateQueryWordOnly?word=");
		_newQueryWord = _newQueryWord[1];
		_newQueryWord = _newQueryWord.replace('+',' ');
		query = _newQueryWord;
		$("#searchbox-input").val(decodeURIComponent(query));
	}
	else if(e.data.indexOf("updateprogress?")==0){
		var _length = e.data;
		_length = _length.split("updateprogress?length=");
		_length = _length[1];
		updateProgressBar(_length);
	}
	else if(e.data=="pin"){
		$("#top-pin").addClass("pinned");
	}
	else if(e.data=="unpin"){
		$("#top-pin").removeClass("pinned");
	}
	else if(e.data=="updateTheme"){
		location.reload();
	}
	
}, false);
