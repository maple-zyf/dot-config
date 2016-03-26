var CS_table=[];function CS_t(){}function getcsid(a,c){return("function"==typeof lp_sha256?lp_sha256:SHA256)(a+""+c)}function getcsinfo(a,c){if(null===a||null===c||"undefined"==typeof a||"undefined"==typeof c)return null;"number"==typeof a&&(a=a.toString());var b=getcsid(a,c);if(null===b)return null;b=CS_table[b];"undefined"==typeof b&&(b=null);return b}
function setcsinfo(a,c,b){if(null===a||null===c||!b||"undefined"==typeof a||"undefined"==typeof c||null===b.docnum||null===b.tabid||null===b.url)return null;"number"==typeof a&&(a=a.toString());a=getcsid(a,c);b.csid&&(a&&a!=b.csid)&&L("warn: csid!=obj.csid");if(null===b.csid||"undefined"==typeof b.csid)b.csid=a;b.last_ts=(new Date).getTime();"undefined"==typeof CS_table&&(CS_table=[]);CS_table[a]=b;return!0}
function register_new_cs(a,c,b,d,f,e){if(null===a||null===c||!b||"undefined"==typeof a||"undefined"==typeof c)return null;write_history({cmd:"register_new_cs",docnum:c,tabid:a,docstate:f});"undefined"==typeof f&&(f=null);"undefined"==typeof e&&(e=null);"number"==typeof a&&(a=a.toString());var h=0,g=new CS_t;return g?(g.docnum=c,g.tabid=a,g.url=b,g.aid=0,g.parent_docnum=d?c:g_CS_tops[a],g.docstate=f,g.flags=null,null!==e&&"object"==typeof e&&(g.flags=e,"undefined"!=typeof e.domain&&(g.domain=e.domain,
delete g.flags.domain),"undefined"!=typeof e.origin&&(g.origin=e.origin,delete g.flags.origin)),g.start_ts=(new Date).getTime(),g_cpwbot&&CPWbot_bg&&(h=CPWbot_bg.score_frame(a,{url:b,docnum:c})),g.importance=h,setcsinfo(a,c,g)):null}function delete_cs_for_docnum(a,c){if(null===a||null===c||"undefined"==typeof a||"undefined"==typeof c)return null;"number"==typeof a&&(a=a.toString());var b=!1,d;for(d in CS_table)CS_table.hasOwnProperty(d)&&d==getcsid(a,c)&&(b=!0,delete CS_table[d]);return b}
function delete_cs_for_tab(a){if(null===a||"undefined"==typeof a)return null;"number"==typeof a&&(a=a.toString());var c=!1,b;for(b in CS_table)if(CS_table.hasOwnProperty(b)){var d=CS_table[b];d&&d.tabid==a&&(c=!0,delete CS_table[b])}return c}
function update_cs_docstate(a,c){if(null===a||null===c||"undefined"==typeof a||"undefined"==typeof c)return null;"number"==typeof a&&(a=a.toString());var b=c.docnum;if(null===b||"undefined"==typeof b)return null;var d=c.docstate;if(null===d||"undefined"==typeof d)return null;var f=!1,e=getcsinfo(a,b);e&&(e.docstate=d,f=setcsinfo(a,b,e));return f}
function update_cs_timestamp(a,c){if(null===a||null===c||"undefined"==typeof a||"undefined"==typeof c)return null;"number"==typeof a&&(a=a.toString());var b=c.docnum;if(null===b||"undefined"==typeof b)return null;var d=getcsinfo(a,b);return d?setcsinfo(a,b,d):null}function count_cs_for_tabid(a){if(null===a||"undefined"==typeof a)return-1;"number"==typeof a&&(a=a.toString());var c=0,b,d;for(b in CS_table)CS_table.hasOwnProperty(b)&&(d=CS_table[b],d.tabid===a&&c++);return c}
function dumpinfo_for_tabid(a){if(!(null===a||"undefined"==typeof a)){"number"==typeof a&&(a=a.toString());var c,b,d;console.log("dumping info for tabid="+a);for(b in CS_table)CS_table.hasOwnProperty(b)&&(d=CS_table[b],c=(new Date).getTime(),d.tabid===a&&console.log("DUMPINFO [tabid:"+a+"][docnum:"+d.docnum+"] url="+d.url+" last_ts="+(c-d.last_ts)/1E3+"secs score="+d.importance+" killswitch?="+d.killswitch+" isTop?="+(d.parent_docnum==d.docnum?"true":"false")))}}
function find_docnum_for_tabid_by_url(a,c){if(null===a||null===c||"undefined"==typeof a||"undefined"==typeof c)return null;"number"==typeof a&&(a=a.toString());var b,d,f;for(b in CS_table)if(CS_table.hasOwnProperty(b)&&(f=CS_table[b],f.tabid===a&&f.url==c)){d=f.docnum;break}return d}
function set_killswitch_value(a,c,b){if(null===a||null===c||"undefined"==typeof a||"undefined"==typeof c)return null;"number"==typeof a&&(a=a.toString());var d=getcsinfo(a,c);return d?(d.killswitch=b,setcsinfo(a,c,d)):!1}function get_killswitch_value(a,c){if(null===a||null===c||"undefined"==typeof a||"undefined"==typeof c)return null;"number"==typeof a&&(a=a.toString());var b=getcsinfo(a,c),d=0;b&&(d=parseInt(b.killswitch),isNaN(d)&&(d=0));return d}
function skip_CS_by_score(a,c){if(null===a||null===c)return!0;var b=getcsinfo(a,c);if(!b)return!0;L("skip? [tabid="+a+"][docnum="+c+"] score="+b.importance);return-25>b.importance}function get_top_url(a){var c="";return c=g_CS_tops[a]}
function update_cs_docflags(a,c){if(null===a||null===c||"undefined"==typeof a||"undefined"==typeof c)return null;"number"==typeof a&&(a=a.toString());var b=c.docnum;if(null===b||"undefined"==typeof b)return null;var d=c.docflags,f=!1,e=getcsinfo(a,b);e&&"object"==typeof d&&(e.flags=d,"undefined"!=typeof d.domain&&(e.domain=d.domain,delete e.flags.domain),"undefined"!=typeof d.origin&&(e.origin=d.origin,delete e.flags.origin),f=setcsinfo(a,b,e));return f}
function getcsinfo_top(a,c){for(var b=null,d=-1,f=getcsinfo(a,c),e=null,h=0;10>h&&f;h++){if((e=getcsinfo(a,f.parent_docnum))&&f.parent_docnum==e.docnum){d=e.docnum;break}if(null==f.parent_docnum)break;f=e}0<=d&&(e=getcsinfo(a,d));e&&!isEmptyObject(e)&&(b=e);return b}
function update_cs_lastfill_aid(a,c){var b=!0;if(null===a||"undefined"==typeof a||"undefined"==typeof c)return!1;"number"==typeof a&&(a=a.toString());var d=get_top_url(a),f=getcsinfo(a,d);f&&(f.lastfill_aid=c,b=setcsinfo(a,d,f));return b};
