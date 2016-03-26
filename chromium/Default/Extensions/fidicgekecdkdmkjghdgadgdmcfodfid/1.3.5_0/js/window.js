// JavaScript Document

var dict = window.dict||{};

dict.mode = 0;
dict.preMode = 0;

dict.words = [];

dict.channels = [
	"https://flipboard.com/@thenewsdesk/news-i8koidj5z",
	"https://flipboard.com/@thenewsdesk/technology-shjum1jiz",
	"https://flipboard.com/section/diy-q8bmu05g4v46rcgd",
	"https://flipboard.com/@thenewsdesk/sports-kimf11q3z",
	"https://flipboard.com/section/food-%26-dining-5gksnlvmme2g3mgs",
	"https://flipboard.com/section/design-krk4m7o5bhjdm2cv",
	"https://flipboard.com/section/travel-4um5cdhvomc6eejd",
	"https://flipboard.com/section/auto-2oileoa19c8hs1nh"
				];

dict.type = "youdao";
dict.query = "";

dict.adjustAppearance = function(){
	var _window_width = $(window).width();
	var _window_height = $(window).height();
	var _texture_height = $("#texture").height();
	var _topbar_height = $("#topbar").height();
	$(".adjustheight").height(_window_height-_texture_height-_topbar_height);
	$("#flipboard, #flipboard-shield").width(_window_width-$("#leftmenu").width()-$("#wordlist").width()-2);
}

dict.showRecentWords = function(){
	$("#wordlist li").remove();
	chrome.storage.local.get(["words","wordsnumber"],function(items){
		dict.words = items["words"];
		var _l = dict.words.length;
		for( var i=0;i<_l;i++){
			$("#wordlist").prepend('<li><div class="w">'+dict.words[i].w+'</div><div class="t">'+dict.words[i].t+'</div><div class="n url">'+dict.words[i].u+'</div><div class="drop n">recent</div></li>');
		}
	});
}

dict.showImportantWords = function(){
	$("#wordlist li").remove();
	chrome.storage.local.get(["words","wordsnumber"],function(items){
		dict.words = items["words"];
		var _l = dict.words.length;
		for( var i=0;i<_l;i++){
			if(dict.words[i].i){
				$("#wordlist").prepend('<li><div class="w">'+dict.words[i].w+'</div><div class="t">'+dict.words[i].t+'</div><div class="n url">'+dict.words[i].u+'</div><div class="drop n">important</div></li>');
			}
		}
	});
}

dict.showTodayWords = function(){
	$("#wordlist li").remove();
	chrome.storage.local.get(["words","wordsnumber"],function(items){
		dict.words = items["words"];
		var _l = dict.words.length;
		for( var i=0;i<_l;i++){
			var _created = dict.words[i].c;
			var _current = new Date();
			_current = _current.getTime();
			var _diff = (_current - _created)/1000;
			if(_diff<2*24*3600||(_diff>5*24*3600&&_diff<6*24*3600)){
				$("#wordlist").prepend('<li><div class="w">'+dict.words[i].w+'</div><div class="t">'+dict.words[i].t+'</div><div class="n url">'+dict.words[i].u+'</div></li>');
			}
		}
	});
}

dict.flipboard = {};
dict.flipboard.setContent = function(i){
	$("#flipboard-iframe").attr("src",dict.channels[i]);
}
dict.flipboard.close = function(){
	$("#flipboard-iframe").hide();
}
dict.flipboard.open = function(){
	$("#flipboard-iframe").show();
}

dict.sidebar = {};
dict.sidebar.width = 650;
dict.sidebar.show = function(_word){
	var _tempword =$.trim($("#searchbox-input").val());
	if(!_tempword&&$("#wordlist li").length==0) return;
	$("#result").show().animate({width: dict.sidebar.width+"px"}, 100);
	$("#flipboard-shield").show();
	//dict.sidebar.displayResult(_word, dict.type);
}
dict.sidebar.close = function(){
	$("#result").animate({width: "0"}, 100);
	$("#flipboard-shield").hide();
}
dict.sidebar.updateProgressBar = function(_length){
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

dict.sidebar.displayResult = function(_query,_dict){
	$("#tabs-dict .i").removeClass("selected");
	$("#tab-"+_dict).addClass("selected");
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
			$("#bing-dict").attr("src","http://cn.bing.com/dict/search?q="+_query+'&mkt=zh-CN').show();
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
	if(arguments[2]){
		$("#result-op .url").show();
	}
	else{
		$("#result-op .url").hide();
	}
	if(arguments[3]){
		$("#result-op .drop").show();
	}
	else{
		$("#result-op .drop").hide();
	}
}
dict.updateQuery = function(_query, _dict){
	if( _query.indexOf("&")>0 ){
		_query = _query.split("&");
		_query = _query[0];
	}
	_query = _query.replace(/\+/g,' ');
	dict.type = _dict;
	dict.query = _query;
	dict.sidebar.displayResult(_query,_dict);
}

dict.timestamp = new Date().getTime();

dict.getRelateSearch = function(_queryWord){
	$.get("http://api.bing.com/qsonhs.aspx?mkt=zh-CN&ds=bingdict&q="+_queryWord,"json",function(_responde){
		_responde = _responde.AS;
		if(_responde.FullResults){
			$("#wordlist li").remove();
			_results = _responde.Results[0].Suggests;
			$.each(_results,function(){
				var _this = this;
				var _title = _this.Url;
				_title = _title.replace('%EE%80%81','');
				_title = decodeURIComponent(_title);
				_title = _title.split("/search?q=");
				_title = _title[1];
				_title = _title.split("&");
				_title = _title[0];
				$("#wordlist").append('<li><div class="w">'+_title+'</div><div class="t">'+_this.Txt+'</div></li>');
			});
			var _tempWord = $("#wordlist li").eq(0).children(".w").html();
			$("#wordlist li").eq(0).addClass("selected");
			dict.sidebar.displayResult(_tempWord,dict.type);
			var _tempstamp = new Date().getTime();
			dict.sidebar.show(_tempWord);
		}
		else if(_responde.Query==""){
			return;
		}
		else{
			$("#wordlist li").remove();
			$("#wordlist").append('<li><div class="w">'+_queryWord+'</div><div class="t">No result for "'+_queryWord+'". Click to see web explanations.</div></li>');
			var _tempWord = $("#wordlist li").eq(0).children(".w").html();
			$("#wordlist li").eq(0).addClass("selected");
			dict.sidebar.displayResult(_tempWord,dict.type);
			dict.sidebar.show(_tempWord);
		}
	});
}

dict.setTheme = function(){
	chrome.storage.sync.get(["theme"],function(items){
		var _theme_url = chrome.extension.getURL("themes");
		$('head').append( $('<link rel="stylesheet" type="text/css" />').attr('href', _theme_url+'/'+items["theme"]+'/window.css') );
		dict.adjustAppearance();
		$("#themes li").removeClass("selected");
		$("#themes li a").remove();
		$( "[theme='"+items["theme"]+"']" ).addClass("selected").append('<a>√</a>');
	});
}


$(document).ready(function() {
	
	
	dict.setTheme();
	dict.adjustAppearance();
	
	$(window).resize(function(){
		dict.adjustAppearance();
	});
	
	$("#leftmenu .cell .content .i").click(function(){
		$("#leftmenu .cell .content .i").removeClass("selected");
		$(this).addClass("selected");
		$("#search-results-w").hide();
		$(".mode").hide();
		var _i = $("#leftmenu .cell .content .i").index(this);
		dict.preMode = dict.mode;
		dict.mode = _i;
		if( $(".mode:visible").length==0&&$("#result:visible").length==0){
			$("#flipboard-shield").hide();
		}
	});
	
	$("#leftmenu .cell .content .i.recent").click(function(){
		dict.showRecentWords();
	});
	$("#leftmenu .cell .content .i.more").click(function(){
		dict.showImportantWords();
	});
	$("#leftmenu .cell .content .i.today").click(function(){
		dict.showTodayWords();
	});
	$("#leftmenu .cell .content .i.search").click(function(){
		$("#wordlist li").remove();
		$("#search-results-w").show();
		$("#searchbox-input").focus().select();
	});
	$("#leftmenu .cell .content .i.setting").click(function(){
		$("#setting").show();
		$(".mode").eq(0).show();
		dict.sidebar.close();
		$("#flipboard-shield").show();
	});
	$("#leftmenu .cell .content .i.help").click(function(){
		$("#help").show();
		$(".mode").eq(1).show();
		dict.sidebar.close();
		$("#flipboard-shield").show();
	});
	$("#tabs-read .i").mousedown(function(){
		$("#tabs-read .i").removeClass("selected");
		$(this).addClass("selected");
		var _i = $("#tabs-read .i").index(this);
		dict.flipboard.setContent(_i);
		dict.sidebar.close();
		$(".mode").hide();
		chrome.storage.sync.set({"flip-channel":_i});
	});
	$("#tabs-fswitch .i").click(function(){
		$("#tabs-fswitch .i").removeClass("selected");
		$(this).addClass("selected");
		var _i = $("#tabs-fswitch .i").index(this);
		chrome.storage.sync.set({"flip-on":1-_i});
		if(_i==1){
			$("#tabs-read").hide();
		}
		else{
			var _c = $("#tabs-read .i").index($("#tabs-read .i.selected")) ;
			$("#tabs-read").show();
			dict.flipboard.setContent(_c);
		}
	});
	$("#tabs-fswitch #tab-fon").click(function(){
		dict.flipboard.open();
	});
	$("#tabs-fswitch #tab-foff").click(function(){
		dict.flipboard.close();
	});
	$("#flipboard-shield").click(function(){
		$(this).hide();
		dict.sidebar.close();
		$(".mode").hide();
		$("#leftmenu .cell .content .i").eq(dict.mode).removeClass("selected");
		$("#leftmenu .cell .content .i").eq(dict.preMode).addClass("selected");
		$("#wordlist li").removeClass("selected");
	});
	$("#result-op .return").click(function(){
		dict.sidebar.close();
		$(".mode").hide();
		$("#leftmenu .cell .content .i").eq(dict.mode).removeClass("selected");
		$("#leftmenu .cell .content .i").eq(dict.preMode).addClass("selected");
		$("#wordlist li").removeClass("selected");
	});
	$("#wordlist li").live('click',function(){
		if( $(this).hasClass("selected") ){
			dict.sidebar.close();
			$(this).removeClass("selected");
			return;
		}
		var _word = $(this).children(".w").html();
		var _this = $(this);
		dict.updateQuery(_word,dict.type);
		dict.sidebar.show(_word);
		$("#searchbox-input").val(_word);
		$("#wordlist li").removeClass("selected");
		$(this).addClass("selected");
		if( $(this).children('.url').length>0 &&  $(this).children('.url').html()){
			var _url = $(this).children('.url').html();
			_url = _url.replace(/\"/g,"");
			$("#result-op .url").show().unbind().click(function(){
				window.open(_url);
			});
		}
		else{
			$("#result-op .url").hide().unbind();
		}
		
		if( $(this).children('.drop').length>0 &&  $(this).children('.drop').html()){
			var _listType = $(this).children('.drop').html();
			var _important = (_listType=="recent")?false:true;
			$("#result-op .drop").show().unbind().click(function(){
				chrome.runtime.sendMessage({command:"deleteWord",entry:{
					w:_word,
					i:_important
				}});
				_this.remove();
				dict.sidebar.close();
			});
		}
		else{
			$("#result-op .drop").hide().unbind();
		}
	});
	$("#tabs-dict .i").mousedown(function(){
		$("#tabs-dict .i").removeClass("selected");
		$(this).addClass("selected");
		var _click_dict = $(this).attr("dict");
		if(_click_dict!=dict.type){
			if(!dict.query && $("#searchbox-input").val()){
				dict.query = $("#searchbox-input").val();
			}
			dict.updateQuery(dict.query,_click_dict);
		}
	});
	$("#searchbox-go").mousedown(function(){
		$(this).addClass("mousedown");
	}).mouseup(function(){
		$(this).removeClass("mousedown");
		$("#wordlist li").removeClass("selected");
		var _queryWord = $.trim($("#searchbox-input").val());
		dict.updateQuery(_queryWord, dict.type);
		dict.sidebar.show(_queryWord);
		var _time = new Date();
		_time = _time.getTime();
		var _t = "";
		if($("#wordlist li:first .w").html()==_queryWord){
			_t = $("#wordlist li:first .t").html();
			$("#wordlist li").eq(0).addClass("selected");
		}
		else{
			_t = '[Search directly] '+_queryWord;
		}
		chrome.runtime.sendMessage({command:"storageNewWord",entry:{
			w:_queryWord,
			t:_t,
			u:'',
			i:false,
			c:_time
		}});
	});
	
	$("#searchbox-input").focus(function(){
		var _queryWord = $(this).val();
		var _tempfirst = $("#wordlist li").eq(0).children(".w").html();
		if($.trim(_queryWord) && _tempfirst!=$.trim(_queryWord)){
			//dict.getRelateSearch(_queryWord);
		}
		$("#search-results-w").show();
		$("#leftmenu .i").removeClass("selected");
		$("#leftmenu .i.search").addClass("selected");
		$(".mode").hide();
	}).keyup(function(e){
		var _this = $(this);
		switch(e.which){
			case 13:
				if(!$.trim(_this.val())){
					$("#searchbox-input").val('');
					return false;
				}
				$("#searchbox-go").mouseup();
				return;
				break;
			case 40:
				if($("#wordlist li.selected").length>0){
					var _length = $("#wordlist li").length;
					var _index = $("#wordlist li.selected").index("#wordlist li");
					if(_index<_length-1){
						$("#wordlist li").eq(_index+1).click();
						var _query = $("#wordlist li").eq(_index+1).children(".w").html();
						$(this).val(decodeURIComponent(_query));
					}
					else{
						var _temp = $(this).attr("temp");
						$(this).val(_temp);
						$("#wordlist li").eq(_length-1).removeClass("selected");
					}
					return;
				}
				else{
					$("#wordlist li").eq(0).click();
					var _query = $("#wordlist li").eq(0).children(".w").html();
					$(this).val(decodeURIComponent(_query));
					return;
				}
				break;
			case 38:
				if($("#wordlist li.selected").length>0){
					var _length = $("#wordlist li").length;
					var _index = $("#wordlist li.selected").index("#wordlist li");
					if(_index>0){
						$("#wordlist li").eq(_index-1).click();
						var _query = $("#wordlist li").eq(_index-1).children(".w").html();
						$(this).val(decodeURIComponent(_query));
					}
					else{
						var _temp = $(this).attr("temp");
						$(this).val(_temp);
						$("#wordlist li").eq(0).removeClass("selected");
					}
					return;
				}
				else{
					$("#wordlist li").last().click();
					var _query = $("#wordlist li").last().children(".w").html();
					$(this).val(decodeURIComponent(_query));
					return;
				}
				break;
			default:
				$(this).attr("temp",$(this).val());
				if(!$.trim($(this).val())){
					$("#flipboard-shield").hide();
					dict.sidebar.close();
				}
				break;
		}
		var _queryWord = $.trim($(this).val());
		if(!_queryWord){
			$("#wordlist li").remove();
		}
		dict.getRelateSearch(_queryWord);
	}).mouseenter(function(){
		var _val = $(this).val();
		$(this).focus().select();
	}).click(function(){
		$("#search-results-w").show();
		$(this).select();
		var _queryWord = $.trim($(this).val());
		dict.getRelateSearch(_queryWord);
	});
	
	$('#dbclick').click(function() {
	    var $this = $(this); 
		if ($this.is(':checked')) {
			chrome.storage.sync.set({dbclick:"open"});
		} else {
			chrome.storage.sync.set({dbclick:"closed"});
		}
	});
	$('#ctrlclick').click(function() {
	    var $this = $(this); 
		if ($this.is(':checked')) {
			chrome.storage.sync.set({ctrlclick:"open"});
		} else {
			chrome.storage.sync.set({ctrlclick:"closed"});
		}
	});
	$('#autosclick').click(function() {
	    var $this = $(this); 
		if ($this.is(':checked')) {
			chrome.storage.sync.set({autosclick:"open"});
		} else {
			chrome.storage.sync.set({autosclick:"closed"});
		}
	});
	$("#themes li").click(function(){
		var _theme = $(this).attr("theme");
		chrome.runtime.sendMessage({command:"updateTheme",entry:{
			theme:_theme
		}},function(_response){
			dict.setTheme();
		});
	});
	
	$("#dict-types li").click(function(){
		var _dict_type = $(this).attr("dict-type");
		chrome.storage.sync.set({"dict-type":_dict_type});
		$("#dict-types li").removeClass("selected");
		$("#dict-types li a").remove();
		$(this).addClass("selected").append('<a>√</a>');
	});
	
	$("#op-clear-words").click(function(){
		var r=confirm("确定要清除所有单词吗（包含More过的单词）？")
		if (r == true) {
			chrome.runtime.sendMessage({command:"deleteRecentSearch"});
			dict.showRecentWords();
		}
	});
	$("#op-clear-more").click(function(){
		var r=confirm("确定要清除More过的单词吗（其他单词保留）？")
		if (r == true) {
			chrome.runtime.sendMessage({command:"deleteRecentMore"});
			dict.showRecentWords();
		}
	});
	$("#op-export").click(function(){
		window.open(chrome.extension.getURL("export.html"),'_blank');
	});
	
	chrome.storage.sync.get(["dbclick"],function(items){
		if(!items["dbclick"]){
			chrome.storage.sync.set({"dbclick":"open"});
			$("#dbclick").prop('checked', true);
		}
		else if(items["dbclick"]=="close"){
			$("#dbclick").prop('checked', false);
		}
		else if(items["dbclick"]=="open"){
			$("#dbclick").prop('checked', true);
		}
	});
	
	chrome.storage.sync.get(["ctrlclick"],function(items){
		if(!items["ctrlclick"]){
			chrome.storage.sync.set({"ctrlclick":"open"});
			$("#ctrlclick").prop('checked', true);
		}
		else if(items["ctrlclick"]=="close"){
			$("#ctrlclick").prop('checked', false);
		}
		else if(items["ctrlclick"]=="open"){
			$("#ctrlclick").prop('checked', true);
		}
	});
	
	chrome.storage.sync.get(["autosclick"],function(items){
		if(!items["autosclick"]){
			chrome.storage.sync.set({"autosclick":"open"});
			$("#autosclick").prop('checked', true);
		}
		else if(items["autosclick"]=="close"){
			$("#autosclick").prop('checked', false);
		}
		else if(items["autosclick"]=="open"){
			$("#autosclick").prop('checked', true);
		}
	});
	
	chrome.storage.sync.get(["dict-type"],function(items){
		$( "[dict-type='"+items["dict-type"]+"']" ).addClass("selected").append('<a>√</a>');
		dict.type = items["dict-type"];
		$("#tab-"+dict.type).addClass("selected");
	});
	
	dict.showRecentWords();
	//dict.flipboard.setContent(0);
	chrome.storage.sync.get(["flip-channel","flip-on"],function(items){
		if(items["flip-on"]){
			dict.flipboard.setContent(items["flip-channel"]);
			$("#tabs-read .i").eq(items["flip-channel"]).mousedown();
		}
		else{
			$("#tabs-read .i").removeClass("selected");
			$("#tabs-read .i").eq(items["flip-channel"]).addClass("selected");
			
			$("#tabs-fswitch .i").eq(1).click();
		}
	});
	$("#searchbox-input").focus();
});


window.addEventListener("message", function(e){ 		// listen msg from content.js
	var _message = e.data;
	if(_message.indexOf("update?")==0){
		var _querys = _message.split("?queryWord=");
		_querys = _querys[1];
		_querys = _querys.split('&dictType=');
		var _queryWord = _querys[0];
		var _dictType = _querys[1];
		_queryWord = $.trim(_queryWord);
		dict.updateQuery(_queryWord,_dictType);
		if($("#searchbox-input:focus").length==0){
			$("#searchbox-input").val(decodeURIComponent(dict.query));
		}
		dict.getRelateSearch(_queryWord);
		$("#leftmenu .search").click();
	}
	else if(e.data.indexOf("updateQueryWord?")==0){
		var _newQueryWord = e.data;
		_newQueryWord = _newQueryWord.split("updateQueryWord?word=");
		_newQueryWord = _newQueryWord[1];
		_newQueryWord = _newQueryWord.replace('+',' ');
		_newQueryWord = $.trim(_newQueryWord);
		dict.query = _newQueryWord;
		dict.sidebar.displayResult(dict.query,dict.type);
		dict.sidebar.show(dict.query);
		if($("#searchbox-input:focus").length==0){
			$("#searchbox-input").val(decodeURIComponent(dict.query));
		}
		dict.getRelateSearch(dict.query);
		$("#leftmenu .search").click();
	}
	else if(e.data.indexOf("updateQueryWordOnly?")==0){
		var _newQueryWord = e.data;
		_newQueryWord = _newQueryWord.split("updateQueryWordOnly?word=");
		_newQueryWord = _newQueryWord[1];
		_newQueryWord = _newQueryWord.replace('+',' ');
		_newQueryWord = $.trim(_newQueryWord);
		dict.query = _newQueryWord;
		if($("#searchbox-input:focus").length==0){
			$("#searchbox-input").val(decodeURIComponent(dict.query));
		}
	}
	else if(e.data.indexOf("updateprogress?")==0){
		var _length = e.data;
		_length = _length.split("updateprogress?length=");
		_length = _length[1];
		dict.sidebar.updateProgressBar(_length);
	}
}, false);