// JavaScript Document
$(function(){
	chrome.storage.local.get(["words"],function(items){
		var _words = items["words"];
		var _l = _words.length;
		for( var i=0;i<_l;i++){
			$("#export").prepend("<tr><td>"+_words[i].w+"</td><td>"+_words[i].t+"</td></tr>");
		}
		$("#export").prepend('<tr><td width="50%">全选复制，然后打开新建excel，直接粘贴。之后另存为你需要的文件格式。</td><td width="50%"></td></tr>');
	});
});