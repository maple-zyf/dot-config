var _dict_type_of_this_page = false;

if(window != top ){
		
		if(document.URL.indexOf('http://dict.youdao.com/')==0||document.URL.indexOf('http://account.youdao.com/')==0){
			_dict_type_of_this_page = 'youdao';
		}
		else if(document.URL.indexOf('http://cn.bing.com/dict/search')==0||document.URL.indexOf('https://cn.bing.com/dict/search')==0){
			_dict_type_of_this_page = 'bing';
		}
		else if(document.URL.indexOf('http://dictionary.reference.com/browse/')==0||document.URL.indexOf('http://app.dictionary.com/signup/')==0){
			_dict_type_of_this_page = 'dictionary';
		}
}

if(_dict_type_of_this_page){
	
	window.parent.postMessage("updateprogress?length=70","*");
	
	$("html").css({"margin":"0"});
	$("body").css({"margin":"0 0 0 0"});
	
	switch(_dict_type_of_this_page){
		
		case 'youdao':
			$("html").css({"margin-left":"-120px", "margin-top":"-10px"}).prepend("<style>.c-topbar, .c-header, #custheme, #topImgAd, #ads, #result_navigator, #rel-search, .c-bsearch, #c_footer, #imgAd, #ft, #t, #b, .login_left{display:none; visibility:hidden;}</style>");
			break;
			
		case 'bing':
			$("html").css({"margin-left":"-90px", "margin-top":"10px"}).prepend("<style>#b_header, .sidebar, #id_h, .b_footer{display:none; visibility:hidden;}</style>");
			break;
			
		case 'dictionary':
			$("html").prepend('<style>#responsive-header, #footer, #fly-out, #adunit, #dra-html, #header-leaderboard, #nav, #popup, #wrpT, #Dash_1, #lr, #exsntBlock, #sfdkf_pt1, #wrapserp, #quotesbox, #rltqns, #fcrds, #top, #fcimgh, .hdrsc, #rightRail, #nfotr, #sftr, .bottomAd, .banner-ad, .botAd, #midRail+span, #contentResults+span, #rpane+span, #dcomad_top_728x90_0, #visual_the, #adcontainer1, #wrpT, .c3, #nfr, #wrpT, .dictionary-header, .dicticon-hamburger-menu, .footer-thin  {visibility:hidden; display:none; width:0; height:0;}</style><div style="width:100%; height:20px;"></div>');
			break;
	}
}
