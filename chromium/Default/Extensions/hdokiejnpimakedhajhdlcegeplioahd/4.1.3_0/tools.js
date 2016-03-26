LPPlatform.addEventListener(document,"keydown",function(a){try{switch(a.keyCode||a.which){case 13:"checkbox"!==a.target.type?Topics.get(Topics.ENTER).publish(a):a.target.checked=!a.target.checked;break;case 27:Topics.get(Topics.ESCAPE).publish(a);break;case 37:Topics.get(Topics.LEFT_ARROW).publish(a);break;case 38:Topics.get(Topics.UP_ARROW).publish(a);break;case 39:Topics.get(Topics.RIGHT_ARROW).publish(a);break;case 40:Topics.get(Topics.DOWN_ARROW).publish(a)}}catch(m){LPPlatform.logException(m)}});
LPTools={};
(function(a){var m=[];a.setDragItems=function(a){m=a};a.getDragItems=function(){return m};a.buildItemButton=function(d){var b=Constants.ACTION_BUTTONS[d];return a.createElement("button",{"class":"itemButton "+b.css,vaultaction:d,title:Strings.Vault[b.title],allowmultiple:!1})};a.setContent=function(d,b){d.empty();if(b)if("string"===typeof b){for(var c=b.indexOf("<br/>");-1<c;)d.append(document.createTextNode(b.substring(0,c))),d.append(document.createElement("br")),b=b.substring(c+5),c=b.indexOf("<br/>");
d.append(document.createTextNode(b))}else if(b instanceof Array)for(var c=0,e=b.length;c<e;++c){var f=b[c];"string"===typeof f&&(f=a.createElement("p","dialogText",f));d.append(f)}else d.append(b)};a.hideContextMenu=function(d){null!==d&&(d.removeClass("bottomAligned"),d.hide(),a.removeKeyBoardNavigation())};a.displayContextMenu=function(a,b){var c=$(b);a.clientY>window.innerHeight/2?(c.addClass("bottomAligned"),c.css("bottom",window.innerHeight-a.clientY),c.css("top","")):(c.css("top",a.clientY),
c.css("bottom",""));c.css("left",a.clientX);c.show();return c};a.buildErrorMessage=function(a,b){if(null!==a){for(;a.firstChild;)a.removeChild(a.firstChild);for(var c=0,e=b.length;c<e;++c){var f=document.createElement("p"),g=document.createElement("span");g.textContent="ERROR: ";f.appendChild(g);f.appendChild(document.createTextNode(b[c]));a.appendChild(f)}}};a.buildErrorElement=function(d){var b=$(a.createElement("div","errorContainer")),c=$(a.createElement("div","dialogErrorWrapper")),e=a.createElement("div",
"dialogError");a.getOption(d,"alignTop",!1)?(c.append(e),c.append(a.createElement("div","errorTooltip")),c.addClass("alignTop")):(c.append(a.createElement("div","errorTooltip")),c.append(e));var f=a.getOption(d,"collection",null),g=f.find("input, select").add(f.filter("input, select"));b.insertBefore(f.first());b.append(f);b.append(c);a.getOption(d,"static",!1)?(c.addClass("staticError"),c.show()):(g.bind("focus.error",function(a){c.show();$(a.target).removeClass("errorInput")}),g.bind("blur.error",
function(a){c.hide();$(a.target).addClass("errorInput")}));b=0;for(f=g.length;b<f;++b){var h=$(g.get(b));h.prop("disabled")||h.addClass("errorInput")}g.bind("change.error",function(){d.dialog.performValidate(d.dialog.getData(!1))});return e};a.removeErrorElements=function(a){if(a){var b=a.parentElement;a=b.parentElement;var c=$(a).find("input, select");c.unbind("focus.error");c.unbind("blur.error");c.unbind("change.error");c.removeClass("errorInput");a.removeChild(b);for(b=a.parentElement;a.firstChild;)b.insertBefore(a.firstChild,
a);b.removeChild(a)}};a.getProperties=function(a){var b=[],c;for(c in a)b.push(c);return b};var l=function(d,b,c){return function(){"function"===typeof d&&d();a.openAlerts(b,c)}};a.openAlerts=function(a,b){if(0<a.length){var c=a.shift();$.extend(c,{handler:l(c.handler,a,b),closeHandler:l(c.closeHandler,a,b)});dialogs[c.type].open(c)}else b&&b()};a.buildDialogItemContainer=function(d){for(var b=a.createElement("div","dialogItemContainer noSelect"),c={display:VaultItemBaseDisplay.prototype.DISPLAY_LIST,
allowDrag:!1,additionalItemClasses:"dialogItem noItemButtons"},e=0,f=d.length;e<f;++e){var g=d[e].newDisplayObject();b.appendChild(g.build(c))}return b};a.get_gmt_timestamp=function(){var a=(new Date).getTime();return parseInt(a/1E3)};a.ContextMenuItem=function(d,b){this.getAction=function(){return d};this.build=function(c,e,f){var g=void 0!==b&&"undefined"!==typeof b.submenu&&b.submenu,h=null;void 0!==b&&("undefined"!==typeof b.divider&&b.divider)&&(h="divider");g&&(h+=" subMenuOption");h=a.createElement("li",
{"class":h,vaultaction:d});h.textContent=void 0===b||"undefined"===typeof b.text?Strings.Vault[Constants.CONTEXT_MENU_ITEMS[d]]:b.text;c.appendChild(h);if(g){h.appendChild(a.createElement("div"));e=a.createElement("ul","subMenu");h.appendChild(e);var g=$(h),k=$(e),j=null,m=!1,l=function(){m&&(k.hide("fast"),a.addKeyBoardNavigation(c.children),Topics.get(Topics.LEFT_ARROW).unsubscribe(l))},u=function(a){m=!0;f(a);Topics.get(Topics.LEFT_ARROW).subscribe(l)};g.bind("click",u);g.bind("mouseenter",function(a){j=
setTimeout(function(){u(a)},200)});g.bind("mouseleave",function(){j&&clearTimeout(j);l()})}else LPPlatform.addEventListener(h,"click",e)}};a.parseUserSpecificMenu=function(d,b){for(var c=d.firstElementChild;c;){var e=c.getAttribute("user");if(null!==e){for(var e=e.split("|"),f=!0,g=0,h=e.length;g<h;++g)if(b===e[g]){f=!1;break}f?$(c).hide():c.removeAttribute("style")}a.parseUserSpecificMenu(c,b);c=c.nextElementSibling}};a.buildSentShareItems=function(a,b){var c=[];if(b)for(var e=0,f=b.length;e<f;++e){var g=
b[e];"1"===g.state?c.push(new AcceptedSentSharedItem(a,g)):"2"===g.state?c.push(new DeclinedSentSharedItem(a,g)):c.push(new PendingSentSharedItem(a,g))}return c};a.openShareDialog=function(d,b){if(d&&1===d.length&&void 0===b)LPProxy.makeDataRequest(LPProxy.getItemShareData,{parameters:d[0].getID(),requestSuccessOptions:{closeDialog:!1},success:function(b){a.openShareDialog(d,b)},error:function(){Topics.get(Topics.DIALOG_LOADED).publish()}}),Topics.get(Topics.DIALOG_LOADING).publish();else if(b&&!dialogs.share.loadedJS())dialogs.share.loadJS(function(){a.openShareDialog(d,
b)});else{var c=b?a.buildSentShareItems(d[0],b.sent[d[0].getID()]):null;dialogs.share.open(d,c,b?b.friends:null)}};a.objectsToArray=function(){for(var a=[],b=0,c=arguments.length;b<c;++b){var e=arguments[b],f;for(f in e)a.push(e[f])}return a};a.createEventHandler=function(a){return function(b){a.handleEvent(b)}};a.getAttribute=function(a,b,c){for(var e=b.getAttribute(c);null===e&&b!==a;)if(b=b.parentElement,null!==b)e=b.getAttribute(c);else break;return e};a.removeDOMChildren=function(a){if(a)for(var b=
a.childNodes.length;b--;)a.removeChild(a.lastChild)};a.removeDOMChildrenFrom=function(a,b){if(a)for(;b;){var c=b;b=b.nextElementSibling;a.removeChild(c)}};var q,v=function(a,b){switch(a.type){case "password":a.type="text";b.setAttribute("title",Strings.Vault.HIDE_PASSWORD);break;case "text":a.type="password",b.setAttribute("title",Strings.Vault.SHOW_PASSWORD)}$(b).toggleClass("selected")};q=function(a,b){var c=a.target.previousElementSibling;"password"===c.type&&b?b(function(){v(c,a.target)}):v(c,
a.target)};a.addPasswordEye=function(d,b){var c=a.createElement("div","relative");null!==d.parentElement&&d.parentElement.insertBefore(c,d);c.appendChild(d);var e=a.createElement("button",{"class":"showPassword iconButton",title:Strings.Vault.SHOW_PASSWORD});LPPlatform.addEventListener(e,"click",function(a){q(a,b)});c.appendChild(e);$(d).addClass("password");return c};a.addSearchHandlers=function(d,b,c){var e=a.createElement("div","searchInputContainer");d.parentElement.insertBefore(e,d);e.appendChild(d);
var f="searchCloseButton";b&&(f+=" "+b);b=a.createElement("div",{"class":f,title:Strings.translateString("Clear Search")});e.appendChild(b);d=$(d);var e=$(e),g=function(a){0<a.length?e.addClass("populated"):e.removeClass("populated")},h,j=function(a){clearTimeout(h);h=setTimeout(function(){try{c(a)}catch(b){LPPlatform.logException(b)}},150)};$(b).bind("click",function(a){d.val("");g("");j("");a.stopPropagation();a.preventDefault()});var k=function(a){a=a.which;31<a&&(a=d.val()+String.fromCharCode(a),
g(a),j(a))};d.bind("keypress",k);var l=function(a){a=a.keyCode||a.which;if(8===a||46===a)a=d.val(),g(a),j(a)};d.bind("keyup",l);var m=function(){d.unbind("keypress",k);d.unbind("keyup",l);d.unbind("input",m)};d.bind("input",m);d.bind("input",function(){var a=d.val();g(a);j(a)})};a.createElement=function(a,b,c){a=document.createElement(a);if("string"===typeof b)a.setAttribute("class",b);else if(b instanceof Array)a.setAttribute("class",b.join(" "));else if("object"===typeof b)for(var e in b){var f=
b[e];f&&a.setAttribute(e,f)}void 0!==c&&(a.textContent=c);return a};a.addClass=function(a,b){if(null!==a){b instanceof Array&&(b=b.join(" "));var c=a.getAttribute("class");c&&(b=c+" "+b);a.setAttribute("class",b)}};a.getOption=function(a,b,c){a&&void 0!==a[b]&&(c=a[b]);return c};var k=null,j=-1,s=null,t=null,w=null,n=null,p=function(a){return k&&-1<a&&a<k.length?k[a]:null},r=function(a){var b=p(j);b&&b.removeClass("hover");j=a;(b=p(j))&&b.addClass("hover")},x=function(){n=!0;$(document.body).unbind("mousemove",
x)};a.disableMouse=function(){n&&(n=!1,$(document.body).bind("mousemove",x))};var y=function(a){n&&(a=$(a.target),r(parseInt(a.closest("[navindex]").attr("navindex"))))},z=function(a){var b=a.offsetParent();b.scrollTop(Math.max(b.scrollTop()+b.height(),b.scrollTop()+a.position().top+a.outerHeight())-b.height())},A=function(a){var b=a.offsetParent();b.scrollTop(Math.min(b.scrollTop(),b.scrollTop()+a.position().top))},B=function(d){var b=null;j===k.length-1?(b=0,A(k[b])):(b=j+1,z(k[b]));r(b);a.disableMouse();
d.preventDefault();d.stopPropagation()},C=function(d){var b=null;1>j?(b=k.length-1,z(k[b])):(b=j-1,A(k[b]));r(b);a.disableMouse();d.preventDefault();d.stopPropagation()},D=function(){var d=p(j);if(d){if(t){var b=d.find(t);b.length&&(d=b)}d&&d.trigger(s);a.disableMouse()}return!1},E=function(){var a=p(j);a&&a.trigger(s);return!1};a.setNavIndex=function(a){r(a);(a=p())&&a.get(0).scrollIntoView()};a.getNavIndex=function(){return j};a.addKeyBoardNavigation=function(d,b){if(0<d.length){k=[];j=-1;null===
n&&(n=!0);s=a.getOption(b,"mouseEvent","click");t=a.getOption(b,"rightArrowSelector",null);w=a.getOption(b,"useRightArrow",!0);for(var c=0,e=d.length;c<e;++c){var f=$(d[c]);f.attr("navindex",c);f.unbind("mouseenter",y);f.bind("mouseenter",y);f.hasClass("hover")&&(j=c);k.push(f)}Topics.get(Topics.DOWN_ARROW).subscribe(B);Topics.get(Topics.UP_ARROW).subscribe(C);Topics.get(Topics.ENTER).subscribeFirst(E);w&&Topics.get(Topics.RIGHT_ARROW).subscribe(D);a.getOption(b,"selectFirst",!1)&&a.setNavIndex(0)}else a.removeKeyBoardNavigation()};
a.removeKeyBoardNavigation=function(){k=null;Topics.get(Topics.DOWN_ARROW).unsubscribe(B);Topics.get(Topics.UP_ARROW).unsubscribe(C);Topics.get(Topics.RIGHT_ARROW).unsubscribe(D);Topics.get(Topics.ENTER).unsubscribe(E)};a.addZebraStriping=function(a){a=$(a).find("tr");for(var b=0,c=a.length;b<c;++b)0!==b%2?$(a[b]).addClass("odd"):$(a[b]).removeClass("odd")};a.callFunction=function(a,b){for(var c=window,e=a.split("."),f=0,g=e.length-1;f<g;++f){var h=e[f];void 0!==c[h]&&(c=c[h])}if(e=c[e[e.length-1]])return e.apply(c,
b)};var F=function(a){a=a.target.previousElementSibling;a.checked=!a.checked};a.buildCheckbox=function(d,b){var c=b?b.checkboxAttributes:void 0,c=$.extend(c,{"class":"checkbox",type:"checkbox"}),c=a.createElement("input",c),e=a.createElement("label",d,a.getOption(b,"text",void 0));a.getOption(b,"addClickHandler",!0)&&LPPlatform.addEventListener(e,"click",F);var f=a.createElement("div");f.appendChild(c);f.appendChild(e);return f};a.buildRadioButton=function(d,b,c){d=a.createElement("input",{"class":"radio",
type:"radio",name:d});b=a.createElement("label",b,c);LPPlatform.addEventListener(b,"click",F);c=a.createElement("div");c.appendChild(d);c.appendChild(b);return c};a.hasProperties=function(a){if(a)for(var b in a)return!0;return!1};a.createSelectElement=function(d,b){var c=a.createElement("select",b);$(c).addClass("dialogInput selectDropdown");a.setSelectOptions(c,d);return c};a.setSelectOptions=function(d,b){a.removeDOMChildren(d);for(var c=0,e=b.length;c<e;++c){var f=b[c],g="object"===typeof f?f.value:
f;d.appendChild(a.createElement("option",{value:g},"object"===typeof f&&f.label?f.label:g))}};var G=[{value:"-12:00,0",label:"(-12:00) "+Strings.translateString("International Date Line West")},{value:"-11:00,0",label:"(-11:00) "+Strings.translateString("Midway Island, Samoa")},{value:"-10:00,0",label:"(-10:00) "+Strings.translateString("Hawaii")},{value:"-09:00,1",label:"(-09:00) "+Strings.translateString("Alaska")},{value:"-08:00,1",label:"(-08:00) "+Strings.translateString("Pacific Time (US & Canada)")},
{value:"-07:00,0",label:"(-07:00) "+Strings.translateString("Arizona")},{value:"-07:00,1",label:"(-07:00) "+Strings.translateString("Mountain Time (US & Canada)")},{value:"-06:00,0",label:"(-06:00) "+Strings.translateString("Central America, Saskatchewan")},{value:"-06:00,1",label:"(-06:00) "+Strings.translateString("Central Time (US & Canada), Guadalajara, Mexico City")},{value:"-05:00,0",label:"(-05:00) "+Strings.translateString("Indiana, Bogota, Lima, Quito, Rio Branco")},{value:"-05:00,1",label:"(-05:00) "+
Strings.translateString("Eastern Time (US & Canada)")},{value:"-04:30,0",label:"(-04:30) "+Strings.translateString("Caracas")},{value:"-04:00,1",label:"(-04:00) "+Strings.translateString("Atlantic Time (Canada), Manaus, Santiago")},{value:"-04:00,0",label:"(-04:00) "+Strings.translateString("La Paz")},{value:"-03:30,1",label:"(-03:30) "+Strings.translateString("Newfoundland")},{value:"-03:00,1",label:"(-03:00) "+Strings.translateString("Greenland, Brasilia, Montevideo")},{value:"-03:00,0",label:"(-03:00) "+
Strings.translateString("Buenos Aires, Georgetown")},{value:"-02:00,1",label:"(-02:00) "+Strings.translateString("Mid-Atlantic")},{value:"-02:00,0",label:"(-02:00) "+Strings.translateString("South Georgia")},{value:"-01:00,1",label:"(-01:00) "+Strings.translateString("Azores")},{value:"-01:00,0",label:"(-01:00) "+Strings.translateString("Cape Verde Is.")},{value:"00:00,0",label:"(00:00) "+Strings.translateString("Casablanca, Monrovia, Reykjavik")},{value:"00:00,1",label:"(00:00) "+Strings.translateString("GMT: Dublin, Edinburgh, Lisbon, London")},
{value:"+01:00,1",label:"(+01:00) "+Strings.translateString("Amsterdam, Berlin, Rome, Vienna, Prague, Brussels")},{value:"+01:00,0",label:"(+01:00) "+Strings.translateString("West Central Africa")},{value:"+02:00,1",label:"(+02:00) "+Strings.translateString("Amman, Athens, Istanbul, Beirut, Cairo, Jerusalem")},{value:"+02:00,0",label:"(+02:00) "+Strings.translateString("Harare, Pretoria")},{value:"+03:00,1",label:"(+03:00) "+Strings.translateString("Baghdad")},{value:"+03:00,0",label:"(+03:00) "+
Strings.translateString("Kuwait, Riyadh, Nairobi, Moscow, St. Petersburg, Volgograd")},{value:"+03:30,1",label:"(+03:30) "+Strings.translateString("Tehran")},{value:"+04:00,0",label:"(+04:00) "+Strings.translateString("Abu Dhabi, Muscat, Tbilisi, Izhevsk")},{value:"+04:00,1",label:"(+04:00) "+Strings.translateString("Baku, Yerevan")},{value:"+04:30,0",label:"(+04:30) "+Strings.translateString("Kabul")},{value:"+05:00,1",label:"(+05:00) "+Strings.translateString("GMT+5")},{value:"+05:00,0",label:"(+05:00) "+
Strings.translateString("Islamabad, Karachi, Tashkent, Ekaterinburg")},{value:"+05:30,0",label:"(+05:30) "+Strings.translateString("Chennai, Kolkata, Mumbai, New Delhi, Sri Jayawardenepura")},{value:"+05:45,0",label:"(+05:45) "+Strings.translateString("Kathmandu")},{value:"+06:00,0",label:"(+06:00) "+Strings.translateString("Astana, Dhaka, Novosibirsk")},{value:"+06:00,1",label:"(+06:00) "+Strings.translateString("Almaty")},{value:"+06:30,0",label:"(+06:30) "+Strings.translateString("Yangon (Rangoon)")},
{value:"+07:00,1",label:"(+07:00) "+Strings.translateString("GMT+7")},{value:"+07:00,0",label:"(+07:00) "+Strings.translateString("Bangkok, Hanoi, Jakarta, Krasnoyarsk")},{value:"+08:00,0",label:"(+08:00) "+Strings.translateString("Beijing, Hong Kong, Singapore, Taipei, Irkutsk")},{value:"+08:00,1",label:"(+08:00) "+Strings.translateString("Ulaan Bataar, Perth")},{value:"+09:00,1",label:"(+09:00) "+Strings.translateString("GMT+9")},{value:"+09:00,0",label:"(+09:00) "+Strings.translateString("Seoul, Osaka, Sapporo, Tokyo, Yakutsk")},
{value:"+09:30,0",label:"(+09:30) "+Strings.translateString("Darwin")},{value:"+09:30,1",label:"(+09:30) "+Strings.translateString("Adelaide")},{value:"+10:00,0",label:"(+10:00) "+Strings.translateString("Brisbane, Guam, Port Moresby, Vladivostok")},{value:"+10:00,1",label:"(+10:00) "+Strings.translateString("Canberra, Melbourne, Sydney, Hobart")},{value:"+11:00,0",label:"(+11:00) "+Strings.translateString("Magadan, Solomon Is., New Caledonia")},{value:"+12:00,1",label:"(+12:00) "+Strings.translateString("Auckland, Wellington")},
{value:"+12:00,0",label:"(+12:00) "+Strings.translateString("Fiji, Kamchatka, Marshall Is.")},{value:"+13:00,0",label:"(+13:00) "+Strings.translateString("Nuku'alofa")}];a.createTimezoneSelect=function(d){return a.createSelectElement(G,d)}})(LPTools);
Constants={ACTION_OPEN_MOVE_TO_SUB_FOLDER_MENU:"openMoveToSubFolderMenu",ACTION_OPEN_MOVE_TO_FOLDER_MENU:"openMoveToFolderMenu",ACTION_MOVE_TO_FOLDER:"moveToFolder",ACTION_SAVE:"save",ACTION_DELETE:"delete",ACTION_SHARE:"share",ACTION_COPY_USERNAME:"copyUsername",ACTION_COPY_PASSWORD:"copyPassword",ACTION_COPY_URL:"copyURL",ACTION_EDIT:"edit",ACTION_LAUNCH:"launch",ACTION_GO_TO_URL:"goToURL",ACTION_TOGGLE_OPEN:"toggleOpen",ACTION_RENAME:"rename",ACTION_ACCEPT:"acceptShare",ACTION_REJECT:"rejectShare",
ACTION_ENABLE:"enable",ACTION_TOGGLE_SELECT:"toggleSelect",ACTION_CREATE_SUB_FOLDER:"createSubFolder",ACTION_OPEN_ALL:"openAll",ACTION_OPEN_MORE_OPTIONS:"openMoreOptions",ACTION_COPY_NOTE:"copyNote",ACTION_FILL:"fillForm",ACTION_OPEN:"open",ACTION_REVOKE:"revoke",ACTION_EMAIL:"email",ACTION_CANCEL:"cancel",ACTION_REMOVE:"remove",ACTION_PURGE:"purge",ACTION_PURGE_SHARED_FOLDER:"purgeSharedFolder",ACTION_RESTORE:"restore",ACTION_RESTORE_SHARED_FOLDER:"restoreSharedFolder",ACTION_UNLINK:"unlink",ACTION_STOP_DOWNLOADING:"stopDownloading",
ACTION_START_DOWNLOADING:"startDownloading",ACTION_FILL_SITE:"fillSite",ACTION_CLONE:"clone",ACTION_ADD:"add",ACTION_MANAGE:"manage",ACTION_ACCESS:"access",ACTION_COPY_KEY:"copyKey",USER_FREE:"Free User",USER_PREMIUM:"Premium User",USER_ENTERPRISE:"Enterprise User",USER_ENTERPRISE_ADMIN:"Enterprise Admin"};
(function(a){a.ACTION_BUTTONS={};a.ACTION_BUTTONS[a.ACTION_EDIT]={title:"EDIT",css:a.ACTION_EDIT};a.ACTION_BUTTONS[a.ACTION_SHARE]={title:"SHARE",css:a.ACTION_SHARE};a.ACTION_BUTTONS[a.ACTION_DELETE]={title:"DELETE",css:a.ACTION_DELETE};a.ACTION_BUTTONS[a.ACTION_ACCEPT]={title:"ACCEPT",css:a.ACTION_ACCEPT};a.ACTION_BUTTONS[a.ACTION_REJECT]={title:"REJECT",css:a.ACTION_REJECT};a.ACTION_BUTTONS[a.ACTION_LAUNCH]={title:"LAUNCH",css:null};a.ACTION_BUTTONS[a.ACTION_ENABLE]={title:"ENABLE",css:null};a.ACTION_BUTTONS[a.ACTION_ACCESS]=
{title:"REQUEST_ACCESS",css:null};a.ACTION_BUTTONS[a.ACTION_REVOKE]={title:"REVOKE",css:a.ACTION_REJECT};a.ACTION_BUTTONS[a.ACTION_EMAIL]={title:"RESEND",css:a.ACTION_EMAIL};a.ACTION_BUTTONS[a.ACTION_CANCEL]={title:"CANCEL_INVITE",css:a.ACTION_REJECT};a.ACTION_BUTTONS[a.ACTION_REMOVE]={title:"REMOVE",css:a.ACTION_REJECT};a.ACTION_BUTTONS[a.ACTION_PURGE]={title:"PURGE",css:a.ACTION_DELETE};a.ACTION_BUTTONS[a.ACTION_PURGE_SHARED_FOLDER]={title:"PURGE",css:a.ACTION_DELETE};a.ACTION_BUTTONS[a.ACTION_RESTORE]=
{title:"RESTORE",css:a.ACTION_RESTORE};a.ACTION_BUTTONS[a.ACTION_RESTORE_SHARED_FOLDER]={title:"RESTORE",css:a.ACTION_RESTORE};a.ACTION_BUTTONS[a.ACTION_MANAGE]={title:"MANAGE",css:a.ACTION_EDIT};a.ACTION_BUTTONS[a.ACTION_UNLINK]={title:"UNLINK",css:a.ACTION_DELETE};a.CONTEXT_MENU_ITEMS={};a.CONTEXT_MENU_ITEMS[a.ACTION_EDIT]="EDIT";a.CONTEXT_MENU_ITEMS[a.ACTION_SHARE]="SHARE";a.CONTEXT_MENU_ITEMS[a.ACTION_DELETE]="DELETE";a.CONTEXT_MENU_ITEMS[a.ACTION_GO_TO_URL]="GO_TO_URL";a.CONTEXT_MENU_ITEMS[a.ACTION_COPY_USERNAME]=
"COPY_USERNAME";a.CONTEXT_MENU_ITEMS[a.ACTION_COPY_PASSWORD]="COPY_PASSWORD";a.CONTEXT_MENU_ITEMS[a.ACTION_COPY_URL]="COPY_URL";a.CONTEXT_MENU_ITEMS[a.ACTION_OPEN_MOVE_TO_FOLDER_MENU]="MOVE_TO_FOLDER";a.CONTEXT_MENU_ITEMS[a.ACTION_OPEN_MOVE_TO_SUB_FOLDER_MENU]="MOVE_TO_SUB_FOLDER";a.CONTEXT_MENU_ITEMS[a.ACTION_ACCEPT]="ACCEPT";a.CONTEXT_MENU_ITEMS[a.ACTION_REJECT]="REJECT";a.CONTEXT_MENU_ITEMS[a.ACTION_ENABLE]="ENABLE";a.CONTEXT_MENU_ITEMS[a.ACTION_RENAME]="RENAME_FOLDER";a.CONTEXT_MENU_ITEMS[a.ACTION_CREATE_SUB_FOLDER]=
"CREATE_SUB_FOLDER";a.CONTEXT_MENU_ITEMS[a.ACTION_OPEN_ALL]="OPEN_ALL";a.CONTEXT_MENU_ITEMS[a.ACTION_COPY_NOTE]="COPY_NOTE";a.CONTEXT_MENU_ITEMS[a.ACTION_COPY_KEY]="COPY_KEY";a.CONTEXT_MENU_ITEMS[a.ACTION_FILL]="FILL";a.CONTEXT_MENU_ITEMS[a.ACTION_OPEN]="OPEN";a.CONTEXT_MENU_ITEMS[a.ACTION_SAVE]="SAVE";a.CONTEXT_MENU_ITEMS[a.ACTION_REVOKE]="REVOKE";a.CONTEXT_MENU_ITEMS[a.ACTION_EMAIL]="RESEND";a.CONTEXT_MENU_ITEMS[a.ACTION_CANCEL]="CANCEL_INVITE";a.CONTEXT_MENU_ITEMS[a.ACTION_REMOVE]="REMOVE";a.CONTEXT_MENU_ITEMS[a.ACTION_PURGE]=
"PURGE";a.CONTEXT_MENU_ITEMS[a.ACTION_PURGE_SHARED_FOLDER]="PURGE";a.CONTEXT_MENU_ITEMS[a.ACTION_RESTORE]="RESTORE";a.CONTEXT_MENU_ITEMS[a.ACTION_RESTORE_SHARED_FOLDER]="RESTORE";a.CONTEXT_MENU_ITEMS[a.ACTION_UNLINK]="UNLINK_PERSONAL";a.CONTEXT_MENU_ITEMS[a.ACTION_STOP_DOWNLOADING]="STOP_DOWNLOADING";a.CONTEXT_MENU_ITEMS[a.ACTION_START_DOWNLOADING]="START_DOWNLOADING";a.CONTEXT_MENU_ITEMS[a.ACTION_FILL_SITE]="AUTO_FILL";a.CONTEXT_MENU_ITEMS[a.ACTION_CLONE]="CLONE";a.CONTEXT_MENU_ITEMS[a.ACTION_MANAGE]=
"MANAGE_FOLDER";a.CONTEXT_MENU_ITEMS[a.ACTION_ACCESS]="REQUEST_ACCESS";a.HISTORY_TYPES={PASSWORD:0,USERNAME:1,NOTE:2}})(Constants);(function(a){a.fn.extend({LP_show:function(){this.removeClass("displaynone")},LP_hide:function(){this.addClass("displaynone")},LP_removeAttr:function(a){for(var l=0,q=this.length;l<q;++l)this.get(l).removeAttribute(a)}})})(jQuery);NotifyException=function(a){Topics.get(Topics.ERROR).publish(a);this.message=a;this.stack=Error().stack};NotifyException.prototype=Object.create(Error.prototype);
NotifyException.prototype.name="InvalidArgumentException";NotifyException.prototype.constructor=NotifyException;AttachmentKeyException=function(){NotifyException.call(this,Strings.translateString("Could not decrypt attachment key."))};AttachmentKeyException.prototype=Object.create(NotifyException.prototype);AttachmentKeyException.prototype.name="AttachmentKeyException";AttachmentKeyException.prototype.constructor=AttachmentKeyException;
