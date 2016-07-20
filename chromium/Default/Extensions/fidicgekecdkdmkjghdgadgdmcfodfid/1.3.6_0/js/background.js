// JavaScript Document

chrome.contextMenus.create({
	title: '使用翰林词典查询 "%s"',
	id: "hanlin-dict",
	contexts: ["selection"],
	onclick: queryWordInsideTab
});

// Block flipboard iframe deny
chrome.webRequest.onHeadersReceived.addListener(
    function(info) {
        var headers = info.responseHeaders;
        for (var i=headers.length-1; i>=0; --i) {
            var header = headers[i].name.toLowerCase();
            if (header == 'x-frame-options' || header == 'frame-options') {
                headers.splice(i, 1); // Remove header
            }
        }
        return {responseHeaders: headers};
    },
    {
        urls: [ 'https://flipboard.com/*' ], // Pattern to flipboard
        types: [ 'sub_frame' ]
    },
    ['blocking', 'responseHeaders']
);

chrome.browserAction.onClicked.addListener(function (){
	var _url = chrome.extension.getURL("window.html");
	chrome.tabs.query({url:_url}, function(array){
		if(array.length==0){
			chrome.tabs.create({url:_url});
		}
		else{
			chrome.windows.update(array[0].windowId, {focused:true});
			chrome.tabs.update(array[0].id, {active:true});
		}
	});
});

function queryWordInsideTab(info, tab){
	chrome.tabs.sendMessage(tab.id, {command:"queryWord", queryWord:info.selectionText, tabId:tab.id, dictType:'bing'});
}


function storageInitial(){
/*	chrome.storage.sync.clear();
	chrome.storage.local.clear();*/
	chrome.storage.sync.get(["dbclick"],function(items){
		if(!items["dbclick"]){
			chrome.storage.sync.set({"dbclick":"open"});
		}
		else{
			console.log("dbclick status changed into:"+items["dbclick"]);
		}
	});
	
	chrome.storage.sync.get(["ctrlclick"],function(items){
		if(!items["ctrlclick"]){
			chrome.storage.sync.set({"ctrlclick":"open"});
		}
		else{
			console.log("ctrlclick status changed into:"+items["ctrlclick"]);
		}
	});
	
	chrome.storage.sync.get(["autosclick"],function(items){
		if(!items["autosclick"]){
			chrome.storage.sync.set({"autosclick":"open"});
		}
		else{
			console.log("autosclick status changed into:"+items["autosclick"]);
		}
	});
	
	chrome.storage.sync.get(["theme"],function(items){
		if(!items["theme"]){
			chrome.storage.sync.set({"theme":"default"});
		}
	});
	
	chrome.storage.local.get(["words"],function(items){
		if(!items["words"]){
			chrome.storage.local.set({"words":[{w:"Welcome to Hanlin Dictionary",t:"欢迎使用翰林英汉双解词典",i:true}],"wordsnumber":1,"importantwordsnumber":1});
		}
	});
	
	chrome.storage.sync.get(["dict-type"],function(items){
		if(!items["dict-type"]){
			chrome.storage.sync.set({"dict-type":"bing"});
		}
	});
	
	chrome.storage.sync.get(["flip-on"],function(items){
		if(!items["flip-on"]){
			chrome.storage.sync.set({"flip-on":1});
		}
	});
	
	chrome.storage.sync.get(["flip-channel"],function(items){
		if(!items["flip-channel"]){
			chrome.storage.sync.set({"flip-channel":0});
		}
	});
}

function addQueryWord(_entry){
	if(_entry.w=="undifined"&&_entry.t=="")	return;
	chrome.storage.local.get(["wordsnumber","words","importantwordsnumber"],function(items){
		var _words = items["words"];
		var _words_number = items["wordsnumber"];
		var _important_words_number = items["importantwordsnumber"];
		var _l = _words.length;
		if(_l!=_words_number){
			_words_number = _l;
		}
		var _find_index = false;
		for( var i=0;i<_l;i++){
			if(_words[i].w==_entry.w){
				_find_index = i+1;
			}
		}
		if(_find_index){
			_words.splice(_find_index-1,1);
		}
		_words.push(_entry);
		if(_words_number>=300){
			_removed_word = _words.shift();
			if(_removed_word.i)	_important_words_number--;
		}
		else{
			_words_number++;
		}
		if(_entry.i)	_important_words_number++;
		chrome.storage.local.set({"words":_words,"wordsnumber":_words_number,"importantwordsnumber":_important_words_number});
	});
}

function deleteQueryWord(_entry){
	if(_entry.i){	// If the word is in the important list, only update the important status
		chrome.storage.local.get(["wordsnumber","words","importantwordsnumber"],function(items){
			var _words = items["words"];
			var _words_number = items["wordsnumber"];
			var _important_words_number = items["importantwordsnumber"];
			var _l = _words.length;
			var _index=-1;
			for( var i=0;i<_l;i++){
				if(_words[i].w==_entry.w){
					_index = i;
				}
			}
			_words[_index].i = false;
			_important_words_number--;
			chrome.storage.local.set({"words":_words,"importantwordsnumber":_important_words_number});
		});
	}
	else{	// If the word is not in the important list, then delete it.
		chrome.storage.local.get(["words","wordsnumber","importantwordsnumber"],function(items){
			var _words = items["words"];
			var _words_number = items["wordsnumber"];
			var _important_words_number = items["importantwordsnumber"];
			var _l = _words.length;
			var _index=-1;
			for( var i=0;i<_l;i++){
				if(_words[i].w==_entry.w){
					_index = i;
				}
			}
			if(_index>=0&&_words[_index].i)	_important_words_number--;
			_words.splice(_index,1);
			_words_number--;
			chrome.storage.local.set({"wordsnumber":_words_number,"words":_words,"importantwordsnumber":_important_words_number});
		});
	}
}

function deleteRecentSearch(){
	chrome.storage.local.set({"words":[]});
}

function deleteRecentMore(){
	chrome.storage.local.get(["words","importantwordsnumber"],function(items){
		var _words = items["words"];
		var _important_words_number = items["importantwordsnumber"];
		var _l = _words.length;
		for( var i=0;i<_l;i++){
			_words[i].i=false;
		}
		_important_words_number=0;
		chrome.storage.local.set({"words":_words,"importantwordsnumber":_important_words_number});
	});
}

function updateTheme(_entry){
	chrome.storage.sync.set({theme:_entry.theme},function(){
		chrome.tabs.query({}, function(tabs) {
			var message = {command: "updateTheme"};
			for (var i=0; i<tabs.length; ++i) {
				chrome.tabs.sendMessage(tabs[i].id, message);
			}
		});
	});
}


storageInitial();

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		switch(request.command){
			case "storageNewWord":
				addQueryWord(request.entry);
				sendResponse({result: "entry: "+request.entry.w+" inserted"});
				break;
			case "deleteWord":
				deleteQueryWord(request.entry);
				break;
			case "updateTheme":
				updateTheme(request.entry);
				sendResponse({theme: request.entry.theme});
				break;
			case "deleteRecentSearch":
				deleteRecentSearch();
				break;
			case "deleteRecentMore":
				deleteRecentMore();
				break;
		}
	}
);