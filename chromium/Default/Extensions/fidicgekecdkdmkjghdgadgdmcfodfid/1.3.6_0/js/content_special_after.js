$(function(){
	if(!_dict_type_of_this_page)	return false;
	switch(_dict_type_of_this_page){
		
		case 'youdao':
			$("html").css({"margin-left":"0"});
			$(".c-topbar, .c-header, #custheme, #topImgAd, #ads, #result_navigator, #rel-search, .c-bsearch, #c_footer, #imgAd, #ft, #t, #b, .login_left, #header-leaderboard").remove();
			$("#login").css({"width":"600px"});
			$("#editwordform").css({"left":"500px"});
			$(".login_right").css({"float":"none","margin":"0 auto"});
			$("#results-contents").css({"margin-left":"20px"});
			$("a:link").mousedown(function(e){
				e.preventDefault();
				var _query = $(this).attr("href");
				if(_query.indexOf("/w/")>=0){
					_query = _query.split("/w/");
					_query = _query[0];
					_query = _query.replace(/\_/g," ");
				}
				else{
					_query = _query.split("/search?q=");
					_query = _query[1];
				}
				_query = _query.split("&");
				_query = _query[0];
				_query = _query.replace(/\+/g,' ');
				parent.postMessage("updateQueryWord?word="+_query, sideDict.extension_url);
				parent.postMessage("updateQueryWord?word="+_query, sideDict.extension_window_url);
			});	
			break;
		
		case 'bing':
			$("html").css({"margin":"0"});
			$("#b_header, .sidebar, #id_h, .b_footer").remove();
			$(".content").css({"margin":"10px 0 0 30px", "padding":0});
			$(".contentPadding").css({"padding-left":0});
			$("a:link").click(function(e){				   
				if($(this).parent().parent().parent().hasClass("bi_pag")){
					return true;
				}
				e.preventDefault();
				var _query = $(this).attr("href");
				if(_query.indexOf("/dict/search?q=")<0) return;
				_query = _query.split("/dict/search?q=");
				_query = _query[1];
				_query = _query.replace(/\+/g,' ');
				if( _query.indexOf("&")>0 ){
					_query = _query.split("&");
					_query = _query[0];
				}
				parent.postMessage("updateQueryWord?word="+_query, sideDict.extension_url);
				parent.postMessage("updateQueryWord?word="+_query, sideDict.extension_window_url);
			});	
			break;
		
		case 'dictionary':
			$("#responsive-header, #footer, #fly-out, #adunit, #dra-html, #header-leaderboard, #nav, #dcomSERPBottomLeaderBoard-728x90, #popup, #wrpT, #Dash_1, #lr, #exsntBlock, #sfdkf_pt1, #wrapserp, #quotesbox, #rltqns, #fcrds, #top, #fcimgh, .hdrsc, #rightRail, #nfotr, #sftr, .bottomAd, .banner-ad, .botAd, #midRail+span, #contentResults+span, #rpane+span, #dcomad_top_728x90_0, #visual_the, #adcontainer1, #wrpT, .c3, #nfr, #wrpT, .dictionary-header, .dicticon-hamburger-menu, .footer-thin").remove();
			$("#midRail, #rpane, #Headserp, #contentResults, #results, #dmain, #de, #cwrp, #contouter").width(sideDict.dictWidth);
			$(".signup-header-right").css({"float":"none","margin":"0 auto"});
			$("#cwrp").width(sideDict.width).css({"margin":"0"});
			$("#signup-wrapper").css({"margin":"20px 0 0 -110px","width":"600px"});
			$("#contouter").css({"background":"white","box-shadow":"none","background-image":"none"});
			$("body").css({"background":"white","overflow-x":"hidden"});
			$("#dmain").css({"margin-left":"-10px"});
			$("#contentResults").css({"padding":"0"});
			$("html").css({"overflow-x":"hidden","background":"white"});
			$("#de").css({"margin":"0"});
			$(".c2").css({"float":"left"});
			
			var title = $("#Headserp").html();
			var content = $("#rpane").html();
			
			var _query = $(".head-entry .me:first").text();
			_query = _query.split('·').join('');
			
			if(_query){
				parent.postMessage("updateQueryWordOnly?word="+_query, sideDict.extension_url);
				parent.postMessage("updateQueryWordOnly?word="+_query, sideDict.extension_window_url);
			}
			break;
	}
	
});
