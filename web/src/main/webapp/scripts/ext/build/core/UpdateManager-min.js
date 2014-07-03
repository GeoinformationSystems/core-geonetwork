/*
 * Ext JS Library 2.3.0
 * Copyright(c) 2006-2009, Ext JS, LLC.
 * licensing@extjs.com
 * 
 * http://extjs.com/license
 */


Ext.Updater=Ext.extend(Ext.util.Observable,{constructor:function(el,forceNew){el=Ext.get(el);if(!forceNew&&el.updateManager){return el.updateManager;}
this.el=el;this.defaultUrl=null;this.addEvents("beforeupdate","update","failure");var d=Ext.Updater.defaults;this.sslBlankUrl=d.sslBlankUrl;this.disableCaching=d.disableCaching;this.indicatorText=d.indicatorText;this.showLoadIndicator=d.showLoadIndicator;this.timeout=d.timeout;this.loadScripts=d.loadScripts;this.transaction=null;this.refreshDelegate=this.refresh.createDelegate(this);this.updateDelegate=this.update.createDelegate(this);this.formUpdateDelegate=this.formUpdate.createDelegate(this);if(!this.renderer){this.renderer=this.getDefaultRenderer();}
Ext.Updater.superclass.constructor.call(this);},getDefaultRenderer:function(){return new Ext.Updater.BasicRenderer();},getEl:function(){return this.el;},update:function(url,params,callback,discardUrl){if(this.fireEvent("beforeupdate",this.el,url,params)!==false){var cfg,callerScope;if(typeof url=="object"){cfg=url;url=cfg.url;params=params||cfg.params;callback=callback||cfg.callback;discardUrl=discardUrl||cfg.discardUrl;callerScope=cfg.scope;if(typeof cfg.nocache!="undefined"){this.disableCaching=cfg.nocache;};if(typeof cfg.text!="undefined"){this.indicatorText='<div class="loading-indicator">'+cfg.text+"</div>";};if(typeof cfg.scripts!="undefined"){this.loadScripts=cfg.scripts;};if(typeof cfg.timeout!="undefined"){this.timeout=cfg.timeout;};}
this.showLoading();if(!discardUrl){this.defaultUrl=url;}
if(typeof url=="function"){url=url.call(this);}
var o=Ext.apply({},{url:url,params:(typeof params=="function"&&callerScope)?params.createDelegate(callerScope):params,success:this.processSuccess,failure:this.processFailure,scope:this,callback:undefined,timeout:(this.timeout*1000),disableCaching:this.disableCaching,argument:{"options":cfg,"url":url,"form":null,"callback":callback,"scope":callerScope||window,"params":params}},cfg);this.transaction=Ext.Ajax.request(o);}},formUpdate:function(form,url,reset,callback){if(this.fireEvent("beforeupdate",this.el,form,url)!==false){if(typeof url=="function"){url=url.call(this);}
form=Ext.getDom(form)
this.transaction=Ext.Ajax.request({form:form,url:url,success:this.processSuccess,failure:this.processFailure,scope:this,timeout:(this.timeout*1000),argument:{"url":url,"form":form,"callback":callback,"reset":reset}});this.showLoading.defer(1,this);}},refresh:function(callback){if(this.defaultUrl==null){return;}
this.update(this.defaultUrl,null,callback,true);},startAutoRefresh:function(interval,url,params,callback,refreshNow){if(refreshNow){this.update(url||this.defaultUrl,params,callback,true);}
if(this.autoRefreshProcId){clearInterval(this.autoRefreshProcId);}
this.autoRefreshProcId=setInterval(this.update.createDelegate(this,[url||this.defaultUrl,params,callback,true]),interval*1000);},stopAutoRefresh:function(){if(this.autoRefreshProcId){clearInterval(this.autoRefreshProcId);delete this.autoRefreshProcId;}},isAutoRefreshing:function(){return this.autoRefreshProcId?true:false;},showLoading:function(){if(this.showLoadIndicator){this.el.update(this.indicatorText);}},processSuccess:function(response){this.transaction=null;if(response.argument.form&&response.argument.reset){try{response.argument.form.reset();}catch(e){}}
if(this.loadScripts){this.renderer.render(this.el,response,this,this.updateComplete.createDelegate(this,[response]));}else{this.renderer.render(this.el,response,this);this.updateComplete(response);}},updateComplete:function(response){this.fireEvent("update",this.el,response);if(typeof response.argument.callback=="function"){response.argument.callback.call(response.argument.scope,this.el,true,response,response.argument.options);}},processFailure:function(response){this.transaction=null;this.fireEvent("failure",this.el,response);if(typeof response.argument.callback=="function"){response.argument.callback.call(response.argument.scope,this.el,false,response,response.argument.options);}},setRenderer:function(renderer){this.renderer=renderer;},getRenderer:function(){return this.renderer;},setDefaultUrl:function(defaultUrl){this.defaultUrl=defaultUrl;},abort:function(){if(this.transaction){Ext.Ajax.abort(this.transaction);}},isUpdating:function(){if(this.transaction){return Ext.Ajax.isLoading(this.transaction);}
return false;}});Ext.Updater.defaults={timeout:30,loadScripts:false,sslBlankUrl:(Ext.SSL_SECURE_URL||"javascript:false"),disableCaching:false,showLoadIndicator:true,indicatorText:'<div class="loading-indicator">Loading...</div>'};Ext.Updater.updateElement=function(el,url,params,options){var um=Ext.get(el).getUpdater();Ext.apply(um,options);um.update(url,params,options?options.callback:null);};Ext.Updater.BasicRenderer=function(){};Ext.Updater.BasicRenderer.prototype={render:function(el,response,updateManager,callback){el.update(response.responseText,updateManager.loadScripts,callback);}};Ext.UpdateManager=Ext.Updater;