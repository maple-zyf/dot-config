Notifications=function(){var d=null,e=null,g=function(a,b){if(b){var c=a.find(".message");"string"===typeof b?c.text(b):b instanceof Array&&(c.empty(),c.append(b));a.css("top",0)}},h=function(a){g(d,a)},j=function(a,b){b.css("top",-b.outerHeight());a&&(a.stopPropagation(),a.preventDefault())},f=function(a){j(a,d)},k=function(a){j(a,e)},l=null,m=function(a){g(e,a);clearTimeout(l);l=setTimeout(function(){k()},3E3)},n=function(a){var b=["notification"].concat(LPTools.getOption(a,"additionalClasses",
[])),b=LPTools.createElement("div",{"class":b.join(" "),id:a.id,role:"alert","aria-atomic":"true"}),c=LPTools.createElement("div","messageCell");c.appendChild(LPTools.createElement("img",{src:a.img}));c.appendChild(LPTools.createElement("span","title",a.title));c.appendChild(LPTools.createElement("span","message"));b.appendChild(c);c=LPTools.createElement("div",{"class":"close midToneHover",title:Strings.translateString("Close")});c.appendChild(LPTools.createElement("img",{src:a.closeImg}));LPPlatform.addEventListener(c,
"click",a.closeHandler);b.appendChild(c);document.body.appendChild(b);return $(b)};return{displayErrorMessage:h,displaySuccessMessage:m,initialize:function(a){d=n($.extend(a,{id:"errorMessage",img:"images/vault_4.0/Error.png",title:Strings.translateString("ERROR")+": ",closeImg:"images/vault_4.0/Error_Close.png",closeHandler:f}));e=n($.extend(a,{id:"successMessage",img:"images/vault_4.0/Success.png",title:Strings.translateString("SUCCESS")+": ",closeImg:"images/vault_4.0/Success_Close.png",closeHandler:k}));
Topics.get(Topics.ERROR).subscribe(function(a){h(a)});Topics.get(Topics.SUCCESS).subscribe(function(a){m(a)});Topics.get(Topics.REQUEST_START).subscribe(function(){f()});Topics.get(Topics.DIALOG_CLOSE).subscribe(function(){f()})}}}();
