/* 
 * mdRwd -  A framework for development of Web applications 
 *          partitioned in different communicating devices.
 * http://www.mdRwd.org/
 * Copyright (C) 2014  Simeon Ivaylov Petrov, Alessio Bellino, Flavio De Paoli
 * 
 * This file is part of mdRwd.
 * 
 * mdRwd is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * mdRwd is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see http://www.gnu.org/licenses/agpl-3.0.html.
*/

;
(function($) {

    $.fn.mdRwd = function(options) {
	
	    //mdRwdButton obj
	    var mdRwdButton = $(this);
	    var mdRwdButtonId = "#" + mdRwdButton.attr("id");

	    //all available events
	    var events = {
		"mdRwd":    ["newVc", "connVc", "changeLayout", "triggerVcEvent", "rmVcClient", "rmVc"],
		"keyboard": ["keydown", "keypress", "keyup"],
		"mouse":    ["click", "dblclick",
			     "mousedown", "mouseenter", "mouseleave", "mousemove", "mouseout", "mouseover", "mouseup"],
		"touch":    ["hold",
			     "tap", "doubletap",
			     "drag", "dragstart", "dragend", "dragup", "dragdown", "dragleft", "dragright",
			     "swipe", "swipeup", "swipedown", "swipeleft", "swiperight",
			     "transform", "transformstart", "transformend",
			     "rotate",
			     "pinch", "pinchin", "pinchout",
			     "touch",
			     "release"],
		"custom":   []
	    };

	    //default parameters 
	    var defaults = {
		"ip": "",
		"port": "",
                "debug": false,
                "stateful": false,
                "connVcInterval": 500,
                "connVcTimeout": 10000,
		"mdRwdOnInit": function(){},
		"mdRwdOnDestroy": function(){},
		"mdRwdOnWindowShow": function(){},
		"mdRwdOnWindowHide": function(){},
		"mdRwdOnMultiDeviceMode": function(){},
		"mdRwdOnMonoDeviceMode": function(){},
		"mdRwdOnWarning": function(statusCode){},
		"mdRwdOnWsOpen": function(ev){},
		"mdRwdOnWsMessage": function(ev){},
		"mdRwdOnWsError": function(ev){},
		"mdRwdOnWsClose": function(statusCode, ev){},
                "html": {
                    "connectButton": "Connect device",
                    "disconnectButton": "Disconnect device",
                    "window": {
                        "header": {
                            "title": "Connect device",
                            "close": "Close"
                        },
                        "content": {
                            "layoutsLabel": "Select layout",
                            "vcLabel": "Your ID",
                            "loadingImgPath": "../../lib/img/loading.gif",
                            "connectVcLabel": "Connect to another ID",
                            "connectVcButton": "Connect",
                            "warningBackButton": "Try again",
                            "warningMessages": {
                                "1006":    "Server connection failed<br/>Please try again later<br/>(check: server activity, server ip, server port, firewall outbound rules, client origin)",
                                "7000":    "The virtual channel does not exist",
                                "7001":    "You are allready conncetd to this virtual channel<br/>Try again",
                                "7002":    "There is no available virtual channel<br/>Please try again later",
                                "7003":    "The virtual channel is full<br/>Please try again later",
                                "7004":    "The virtual channel for current IP is full<br/>Please try again later",
                                "7005":    "The virtual channel is currently busy<br/>Please try again later",
                                "7006":    "The virtual channel for current layout is full<br/>Please try again later"
                            }
                        }
                    }
                },
		"devices":{
		    "smartphone":{
			"minWidth": 320,
			"maxWidth": 568
		    },
		    "tablet":{
			"minWidth": 569,
			"maxWidth": 1024
		    },
		    "desktop":{
			"minWidth": 1025,
			"maxWidth": 4096
		    }
		},
                "components": {},
		"layouts": {}
	    };

	    //global vars
            
            //override defaults with user parameters
            var opts = $.extend(true, {}, defaults, options);
            
	    var device = {};
            var mdRwdNameSpace = "mdRwd";
            
            var
            opts,
	    ws,
	    wsMessage,
	    device,
	    layout,
	    eventsAffectedComponents,
	    vcId,
            clientId,
            monoDeviceMode,
            multiDeviceMode,
            mdRwdAppMode,
            firstConnVcOccurred,
            mdRwdStatusCodeOk,
	    mdRwdNameSpace,
	    firstConnVcFailed,
	    timeConnVcFail,
	    timeFirtsConnVcFail;

	    _mdRwdInit();
            
	    //private functions
	    function _mdRwdInit() {
                _mdRwdInitGlobalVars();
		_mdRwdInitDevices();
                _mdRwdInitComponents();
		_mdRwdInitLayouts();
                _mdRwdDetectDevice();
		_mdRwdBuildWindow();
                _mdRwdButtonConnect();
	    }
            
            function _mdRwdInitGlobalVars() {
                opts.connectionTypesArray = ["newVc", "connVc"];
                opts.componentsArray = Object.keys(opts.components);
                opts.devicesArray = Object.keys(opts.devices);
                opts.layoutsArray = Object.keys(opts.layouts);
                ws = {};
                wsMessage = {};
                layout = {};
                eventsAffectedComponents = {};
                vcId = null;
                clientId = null;
                monoDeviceMode = "monoDevice";
                multiDeviceMode = "multiDevice";
                mdRwdAppMode = monoDeviceMode;
                firstConnVcOccurred = false;
                mdRwdStatusCodeOk = 5000;
                firstConnVcOccurred = false;
                firstConnVcFailed = false;
                timeConnVcFail = null;
                timeFirtsConnVcFail = null;
            }
             	    
	    function _mdRwdDestroy(){
                if(!$.isEmptyObject(ws)){
                    ws.close();
                }
                _mdRwdDestroyHelper();
	    }
            
            function _mdRwdDestroyHelper(){
                _mdRwdButtonConnect();
                _mdRwdDestroyWindowListeners();
                _mdRwdButtonConnect();
                if(firstConnVcOccurred){
                    $("link[href='"+layout.css+"']").remove();
                    _mdRwdShowMonoDeviceComps();
                    _mdRwdDestroyEventsListeners();
                    _mdRwdDestroyEventsCallbacks();
                    _mdRwdWindowHide(function(){
                        opts.mdRwdOnMonoDeviceMode();
                        layout.mdRwdOnMonoDeviceMode();
                    });
                }else{
                    _mdRwdWindowHide();
                }
                _mdRwdInitGlobalVars();
                opts.mdRwdOnDestroy();
            }
            
            function _mdRwdButtonConnect(){
                mdRwdButton.html(opts.html.connectButton);
                $(document).off("click", mdRwdButtonId);
                $(document).on("click", mdRwdButtonId, function(){
                    opts.mdRwdOnInit();
                    _mdRwdWindowShow();
                    _mdRwdWindowChooseLayout();
                    return false;
                });
            }
            
            function _mdRwdButtonDisconnect(){
                mdRwdButton.html(opts.html.disconnectButton);
                $(document).off("click", mdRwdButtonId);
                $(document).on("click", mdRwdButtonId, function(){
                    _mdRwdDestroy();
                });
            }
            
            function _mdRwdError(message){
                _mdRwdDestroy();
                if(opts.debug){
                    $.error('mdRwd => ' + message);
                }
            }
	    
	    function _mdRwdDetectDevice(){
                $.each(opts.devices, function(currDevice, deviceDetails){
                    if(deviceDetails.minWidth && deviceDetails.maxWidth){
                        if(window.screen.width >= deviceDetails.minWidth && window.screen.width <= deviceDetails.maxWidth){
                            device = deviceDetails;
                            device.screenWidth = window.screen.width;
                            device.screenHeight = window.screen.height;
                        } 
                    }else{
                        _mdRwdError('The device "' + currDevice + '" must have "minWidh" and "maxWidth" properties');
                        return false;
                    }
                });
	    }
	    
	    function _mdRwdInitDevices(){
                var defaultsDevice = {
                    "id": "",
                    "minWidth": 0,
                    "maxWidth": 0
                };
                $.each(opts.devices, function(currDevice, deviceDetails){
                    //override defaults with user parameters
                    defaultsDevice.id = currDevice;
                    opts.devices[currDevice] = $.extend(true, {}, defaultsDevice, deviceDetails);
                });
            }
	    
	    function _mdRwdInitComponents(){
                if(!$.isEmptyObject(opts.components)){
                    var defaultsComponent = {
			"id": "",
			"selector": "",
			"monoDeviceVisible": true
		    };
                    if(opts.stateful){
                        defaultsComponent.state = {};
                    }
                    $.each(opts.components, function(currComponent, componentDetails){
                        //override defaults with user parameters
                        defaultsComponent.id = currComponent;
                        defaultsComponent.monoDeviceVisible = !$(componentDetails.selector).is(":hidden");
                        opts.components[currComponent] = $.extend(true, {}, defaultsComponent, componentDetails);
                    });
                }else{
                    _mdRwdError('You must define at least one component');
                    return false;
                }
            }
            
	    function _mdRwdInitLayouts(){
		var outgoing = {};
		var incoming = {};
                incoming.mdRwd = {};
                $.each(events.mdRwd, function(index, event){
                    incoming.mdRwd[event] = function(){};
                 });
                var defaultsLayout = {
                    "id": "",
                    "name": "",
                    "description": "",
                    "connectionTypes": "newVc, connVc",
                    "devices": "",
                    "components": "",
                    "css": "",
                    "maxInstances": -1,
                    "hidden": false,
                    "events":{
                        "outgoing": outgoing,
                        "incoming": incoming
                    },
                    "mdRwdOnMultiDeviceMode": function(){},
                    "mdRwdOnMonoDeviceMode": function(){},
                    "mdRwdOnWarning": function(statusCode){},
                    "mdRwdOnWsOpen": function(ev){},
                    "mdRwdOnWsMessage": function(ev){},
                    "mdRwdOnWsError": function(ev){},
                    "mdRwdOnWsClose": function(statusCode, ev){}
                };
                if(!$.isEmptyObject(opts.layouts)){
                    $.each(opts.layouts, function(currLayout, layoutDetails){
                        //override defaults with user parameters
                        defaultsLayout.id = currLayout;
                        opts.layouts[currLayout] = $.extend(true, {}, defaultsLayout, layoutDetails);
                    });
                    //validate user parameters
                    $.each(opts.layouts, function(currLayout, layoutDetails){
                        layoutDetails.connectionTypesArray = $.map(layoutDetails.connectionTypes.split(","), $.trim);
                        if($.trim(layoutDetails.connectionTypesArray) != ""){
                            $.each(layoutDetails.connectionTypesArray, function(index, connectionType){
                                if($.inArray(connectionType, opts.connectionTypesArray) == -1){
                                    _mdRwdError('The connection type "' + connectionType + '" of the layout "' + currLayout + '" does not exist (available connection types: "newVc", "connVc")');
                                    return false;
                                }
                            });
                        }else{
                            _mdRwdError('You must list at least one connection type for the layout "' + currLayout + '"');
                            return false;
                        }
                        layoutDetails.devicesArray = $.map(layoutDetails.devices.split(","), $.trim);
                        if($.trim(layoutDetails.devices) != ""){
                            $.each(layoutDetails.devicesArray, function(index, device){
                                if($.inArray(device, opts.devicesArray) == -1){
                                    _mdRwdError('The device "' + device + '" of the layout "' + currLayout + '" does not exist (available devices: "' + opts.devicesArray.join('", "') + '")');
                                    return false;
                                }
                            });
                        }else{
                            _mdRwdError('You must list at least one device for the layout "' + currLayout + '"');
                            return false;
                        }
                        layoutDetails.componentsArray = $.map(layoutDetails.components.split(","), $.trim);
                        if($.trim(layoutDetails.componentsArray) != ""){
                            $.each(layoutDetails.componentsArray, function(index, component){
                                if($.inArray(component, opts.componentsArray) == -1){
                                    _mdRwdError('The component "' + component + '" of the layout "' + currLayout + '" does not exist (available components: "' + opts.componentsArray.join('", "') + '")');
                                    return false;
                                }
                            });
                        }else{
                            _mdRwdError('You must list at least one component for the layout "' + currLayout + '"');
                            return false;
                        }
                        $.each(layoutDetails.events.outgoing, function(typeEvents, outgoingEventsStr){
                            layoutDetails.events.outgoing[typeEvents+"Obj"] = {};
                            var tmpObj = {};
                            if(outgoingEventsStr.match(/(?:[^,(]|\([^)]*\))+/g) != null){
                                $.each(outgoingEventsStr.match(/(?:[^,(]|\([^)]*\))+/g), function(index, strToParse){
                                    tmpObj = _mdRwdParseOutEvent(currLayout, typeEvents, strToParse);
                                    layoutDetails.events.outgoing[typeEvents+"Obj"][tmpObj.event] = {};
                                    if(opts.stateful){
                                        layoutDetails.events.outgoing[typeEvents+"Obj"][tmpObj.event].affectedComponents = tmpObj.affectedComponents;
                                    }
                                });
                            }else{
                                _mdRwdError('You must list at least one outgoing event of type "' + typeEvents + '" for the layout "' + currLayout + '"');
                                return false;
                            }
                        });
                    });
                }else{
                    _mdRwdError('You must define at least one layout');
                    return false;
                }
	    }

	    function _mdRwdShowLayout(){
                $('<link href="'+layout.css+'" rel="stylesheet" type="text/css" media="screen">').appendTo("head");
                $("body").animate({"scrollTop":0}, "fast");
                $.each(opts.components, function(currComponent, componentDetails){
                    if($.inArray(currComponent, layout.componentsArray)>-1){
                        $(componentDetails.selector).show();
                    }else{
                        $(componentDetails.selector).hide();
                    } 
                });
	    }
            
            function _mdRwdShowMonoDeviceComps(){
                $.each(opts.components, function(currComponent, componentDetails){
                    if(componentDetails.monoDeviceVisible){
                        $(componentDetails.selector).show();
                    }else{
                        $(componentDetails.selector).hide();
                    } 
                });
            }

	    function _mdRwdBuildWindow(){
	       var mdRwdOverlayHtml = '';
	       mdRwdOverlayHtml = '<div id="mdRwdOverlay"></div>';
	       var mdRwdWindowHtml = '';
	       mdRwdWindowHtml += '<div id="mdRwdWindow">';
	       mdRwdWindowHtml += '	<div id="mdRwdWindowHeader">';
	       mdRwdWindowHtml += '	    <div id="mdRwdWindowTitle">' + opts.html.window.header.title + '</div>';
	       mdRwdWindowHtml += '	    <div id="mdRwdWindowClose">' + opts.html.window.header.close + '</div>';
	       mdRwdWindowHtml += '	</div>';
	       mdRwdWindowHtml += '	<div id="mdRwdWindowContent"></div>';
	       mdRwdWindowHtml += '	<img src="' + opts.html.window.content.loadingImgPath + '" style="display:none;"/>';
	       mdRwdWindowHtml += '</div>';
	       $("body").append(mdRwdOverlayHtml);
	       $("body").append(mdRwdWindowHtml);
	    }
	    
	    function _mdRwdWindowShow(){
		if($("#mdRwdWindow").is(":hidden")){
                    $("#mdRwdWindow").slideDown("fast");
                    $("#mdRwdOverlay").fadeIn("fast").promise().done(function() {
                        opts.mdRwdOnWindowShow();
                        $(document).off("click", "#mdRwdWindowClose, #mdRwdOverlay");
                        $(document).on("click", "#mdRwdWindowClose, #mdRwdOverlay", function(){
                           _mdRwdDestroy();
                       });
                   });
               }
	    }
	     
	    function _mdRwdWindowHide(callback){
		if(!$("#mdRwdOverlay").is(":hidden")){
                    $("#mdRwdOverlay").fadeOut("fast");
                    $("#mdRwdWindow").slideUp("fast").promise().done(function() {
                        opts.mdRwdOnWindowHide();
                        $("#mdRwdVcId").html("");
                        $(".mdRwdWarningMessage").html("");
                        if(callback)callback();
                    });
                }else{
                    if(callback)callback();
                }
	    }
	    
	    function _mdRwdWindowChooseLayout(){
		var deviceLayoutsIds = [];
                $.each(opts.layouts, function(currLayout, currLayoutDetails){
                    if($.inArray(device.id, currLayoutDetails.devicesArray) > -1 && !currLayoutDetails.hidden){
                        deviceLayoutsIds.push(currLayout);
                    }
                });
                var mdRwdWindowContentHtml = '';
                if(deviceLayoutsIds.length > 1){
                    mdRwdWindowContentHtml += '<div id="mdRwdLayoutsCell">';
                    mdRwdWindowContentHtml += '	    <div id="mdRwdLayoutsBox">';
                    mdRwdWindowContentHtml += '             <div class="mdRwdLoadingBox">';
                    mdRwdWindowContentHtml += '                 <img src="' + opts.html.window.content.loadingImgPath + '" class="mdRwdLoadingImg"/>';		
                    mdRwdWindowContentHtml += '             </div>';
                    mdRwdWindowContentHtml += '             <div id="mdRwdLayoutChoice">';
                    mdRwdWindowContentHtml += '                 <div id="mdRwdLayoutLabel">' + opts.html.window.content.layoutsLabel + '</div>';
                    mdRwdWindowContentHtml += '                 <div id="mdRwdLayouts">';
                    $.each(deviceLayoutsIds, function(index, layoutId){
                        var currLayout = opts.layouts[layoutId];
                        mdRwdWindowContentHtml += '             <div class="mdRwdLayout mdRwdButton" layoutId="'+layoutId+'">';
                        mdRwdWindowContentHtml += '                 <div class="mdRwdLayoutName">'+currLayout.html.name+'</div>';
                        mdRwdWindowContentHtml += '                 <div class="mdRwdLayoutDescription">'+currLayout.html.description+'</div>';
                        mdRwdWindowContentHtml += '             </div>';
                    });
                    mdRwdWindowContentHtml += '                 </div>';
                    mdRwdWindowContentHtml += '		</div>';
                    mdRwdWindowContentHtml += '	    </div>';
                    mdRwdWindowContentHtml += '</div>';
                    $("#mdRwdWindowContent").html(mdRwdWindowContentHtml);
                    $(document).off("click", ".mdRwdLayout");
                    $(document).on("click", ".mdRwdLayout", function(){
                        layout = opts.layouts[$(this).attr("layoutId")];
                        _mdRwdCreateConnection();
                    });
                }else if(deviceLayoutsIds.length == 1){
                    mdRwdWindowContentHtml += '<div id="mdRwdLayoutsCell">';
                    mdRwdWindowContentHtml += '	    <div id="mdRwdLayoutsBox">';
                    mdRwdWindowContentHtml += '             <div class="mdRwdLoadingBox">';
                    mdRwdWindowContentHtml += '                 <img src="' + opts.html.window.content.loadingImgPath + '" class="mdRwdLoadingImg"/>';		
                    mdRwdWindowContentHtml += '             </div>';
                    mdRwdWindowContentHtml += '             <div id="mdRwdLayoutChoice">';
                    mdRwdWindowContentHtml += '             </div>';
                    mdRwdWindowContentHtml += '         </div>';
                    mdRwdWindowContentHtml += '</div>';
                    $("#mdRwdWindowContent").html(mdRwdWindowContentHtml);
                    layout = opts.layouts[deviceLayoutsIds[0]];
                    _mdRwdCreateConnection();
                }else{
                    _mdRwdError('The "' + device.id + '" device has no associated visibile layouts');
                    return false;
                }		
	    }
	    
	    function _addNameSpaceAndTrim(item){
		return $.trim(item) + "." + mdRwdNameSpace;
	    }     
            
            function _mdRwdParseOutEvent(currlayout, eventType, strToParse){
                var affectedComponentsMatch = strToParse.match(/\((.*?)\)/g);
                var affectedComponents = [];
                var event = $.trim(strToParse);
                var returnObj = {};
                if(affectedComponentsMatch){
                    affectedComponents = $.trim(strToParse.match(/\((.*?)\)/g)[0]);
                    affectedComponents = affectedComponents.slice(1,-1);
                    event = $.trim(strToParse.replace("("+affectedComponents+")", ""));
                    affectedComponents = $.map(affectedComponents.split(","), $.trim);
                    $.each(affectedComponents, function(index, component){
                        if($.inArray(component, opts.componentsArray) == -1){
                            _mdRwdError('The affected component "' + component + '" by the outgoing event "' + event + '" of the layout "' + currlayout + '" does not exist');
                            return false;
                        }
                    });
                }
                if(eventType != "custom" && $.inArray(event, events[eventType]) == -1){
                    _mdRwdError('The outgoing event "' + event + '" of the layout "' + currlayout + '" does not exist in the default "' + eventType + '" events');
                    return false;
                }
                returnObj.event = event; 
                returnObj.affectedComponents = affectedComponents; 
                return returnObj;
            }
	    
	    function _mdRwdInitEventsListeners() {
		_mdRwdInitKeyboardListener();
		_mdRwdInitMouseListener();
		_mdRwdInitTouchListener();
		_mdRwdInitCustomListener();
	    }

	    function _mdRwdInitEventsCallbacks() {
		_mdRwdInitKeyboardCallbacks();
		_mdRwdInitMouseCallbacks();
		_mdRwdInitTouchCallbacks();
		_mdRwdInitCustomCallbacks();
	    }
            
            function _mdRwdDestroyWindowListeners() {
                $(document).off("click", "#mdRwdWindowClose, #mdRwdOverlay");
                $(document).off("click", ".mdRwdLayout");
                $(document).off("keydown", "#mdRwdConnectVcId");
                $(document).off("click", "#mdRwdConnectVcButton");
                $(document).off("click", "#mdRwdVcBox .mdRwdWarningBackButton");
                $(document).off("click", "#mdRwdConnectVcBox .mdRwdWarningBackButton");
	    }
	    
	    function _mdRwdDestroyEventsListeners() {
		_mdRwdDestroyKeyboardListener();
		_mdRwdDestroyMouseListener();
		_mdRwdDestroyTouchListener();
		_mdRwdDestroyCustomListener();
	    }

	    function _mdRwdDestroyEventsCallbacks() {
		_mdRwdDestroyKeyboardCallbacks();
		_mdRwdDestroyMouseCallbacks();
		_mdRwdDestroyTouchCallbacks();
		_mdRwdDestroyCustomCallbacks();
	    }

	    function _mdRwdOnGenericEvent(ev) {
		wsMessage = { "cmd": "triggerVcEvent", "vcId": vcId, "event": ev,  "client": {"device": device, "layout":  {"id": layout.id}}};
		if(opts.stateful){
                    wsMessage.client.layout.components = layout.componentsArray;
                }
                _wsSend(wsMessage);
	    }

	    function _mdRwdInitKeyboardListener() {
		var keyboardEvents = layout.events.outgoing.keyboard;
		if (keyboardEvents) {
		    if (keyboardEvents == "all") {
			keyboardEvents = $.map(events.keyboard.join(" "), _addNameSpaceAndTrim);
		    }else{
			keyboardEvents = $.map(Object.keys(layout.events.outgoing.keyboardObj), _addNameSpaceAndTrim).join(" ");
		    }
		    $(document).on(keyboardEvents, function(ev) {
			if(!ev.namespace || ev.namespace != mdRwdNameSpace){
			    var keyboardEvent = {
				"type": ev.type,
                                "eventData":{
                                    "timeStamp": ev.timeStamp,
                                    "screenDim": {"height": window.screen.height, "width": window.screen.width},
                                    "altKey": ev.altKey,
                                    "shiftKey": ev.shiftKey,
                                    "ctrlKey": ev.ctrlKey,
                                    "metaKey": ev.metaKey,
                                    "charCode": ev.charCode,
                                    "keyCode": ev.keyCode
                                }
			    };
                            if(opts.stateful){
                                keyboardEvent.affectedComponents = layout.events.outgoing.keyboardObj[ev.type].lenght>0?layout.events.outgoing.keyboardObj[ev.type].join(", "):"";
                            }
			    _mdRwdOnGenericEvent(keyboardEvent);
			}
		    });
		}
	    }
	    
	    function _mdRwdDestroyKeyboardListener() {
		var keyboardEvents = layout.events.outgoing.keyboard;
		if (keyboardEvents) {
		    if (keyboardEvents == "all") {
			keyboardEvents = $.map(events.keyboard.join(" "), _addNameSpaceAndTrim);
		    }else{
                        keyboardEvents = $.map(Object.keys(layout.events.outgoing.keyboardObj), _addNameSpaceAndTrim).join(" ");
		    }
		    $(document).off(keyboardEvents);
		}
	    }

	    function _mdRwdInitKeyboardCallbacks() {
		if(layout.events.incoming.keyboard){
		    $.each(layout.events.incoming.keyboard, function(keyboardEvent, keyboardCallback) {
			$(document).on(_addNameSpaceAndTrim(keyboardEvent), keyboardCallback);
		    });
		}
	    }
	    
	    function _mdRwdDestroyKeyboardCallbacks() {
		if(layout&&layout.events&&layout.events.incoming&&layout.events.incoming.keyboard){
		    $.each(layout.events.incoming.keyboard, function(keyboardEvent, keyboardCallback) {
			$(document).off(_addNameSpaceAndTrim(keyboardEvent));
		    });
		}
	    }

	    function _mdRwdInitMouseListener() {
		var mouseEvents = layout.events.outgoing.mouse;
		if (mouseEvents) {
		    if (mouseEvents == "all") {
			mouseEvents = $.map(events.mouse.join(" "), _addNameSpaceAndTrim);
		    }else{
                        mouseEvents = $.map(Object.keys(layout.events.outgoing.mouseObj), _addNameSpaceAndTrim).join(" ");
		    }
		    $(document).on(mouseEvents, function(ev) {
			if(!ev.namespace || ev.namespace != mdRwdNameSpace){
			    var mouseEvent = {
				"type": ev.type,
                                "eventData":{
                                    "timeStamp": ev.timeStamp,
                                    "screenDim": {"height": window.screen.height, "width": window.screen.width},
                                    "altKey": ev.altKey,
                                    "shiftKey": ev.shiftKey,
                                    "ctrlKey": ev.ctrlKey,
                                    "metaKey": ev.metaKey,
                                    "button": ev.button,
                                    "center": {"pageX": ev.pageX, "pageY": ev.pageY},
                                    "target": {"id": ev.target.id, "classes": ev.target.className.split(" ")}
                                }
			    };
                            if(opts.stateful){
                                mouseEvent.affectedComponents = layout.events.outgoing.mouseObj[ev.type].affectedComponents.length>0?layout.events.outgoing.mouseObj[ev.type].affectedComponents:[];
                            }
			    _mdRwdOnGenericEvent(mouseEvent);
			}
		    });
		}
	    }
	    
	    function _mdRwdDestroyMouseListener() {
		var mouseEvents = layout.events.outgoing.mouse;
		if (mouseEvents) {
		    if (mouseEvents == "all") {
			mouseEvents = $.map(events.mouse.join(" "), _addNameSpaceAndTrim);
		    }else{
                        mouseEvents = $.map(Object.keys(layout.events.outgoing.mouseObj), _addNameSpaceAndTrim).join(" ");
		    }
		    $(document).off(mouseEvents);
		}
	    }

	    function _mdRwdInitMouseCallbacks() {
		if(layout.events.incoming.mouse){
		    $.each(layout.events.incoming.mouse, function(mouseEvent, mouseCallback) {
			$(document).on(_addNameSpaceAndTrim(mouseEvent), mouseCallback);
		    });
		}
	    }

	    function _mdRwdDestroyMouseCallbacks() {
		if(layout&&layout.events&&layout.events.incoming&&layout.events.incoming.mouse){
		    $.each(layout.events.incoming.mouse, function(mouseEvent, mouseCallback) {
			$(document).off(_addNameSpaceAndTrim(mouseEvent));
		    });
		}
	    }

	    function _mdRwdInitTouchListener() {
		var touchEvents = layout.events.outgoing.touch;
		if (touchEvents) {
		    if (touchEvents == "all") {
			touchEvents = $.map(events.touch.join(" "), _addNameSpaceAndTrim);
		    }else{
                        touchEvents = $.map(Object.keys(layout.events.outgoing.touchObj), _addNameSpaceAndTrim).join(" ");
		    }
		    $(document).hammer().on(touchEvents, function(ev) {
                        ev.gesture.preventDefault();
			if(!ev.namespace || ev.namespace != mdRwdNameSpace){
			    var touches = [];
			    var touchEvent = {};
			    var startEvent = {};
			    if (ev.gesture) {
				if(ev.gesture.startEvent.touches){
				    $.each(ev.gesture.startEvent.touches, function(index, touch) {
					touches.push({
					    "type": touch.type,
                                            "eventData":{
                                                "center": {"pageX": touch.pageX, "pageY": touch.pageY},
                                                "parentOffsetX": touch.offsetX,
                                                "parentOffsetY": touch.offsetY,
                                                "target": {"id": touch.target.id, "classes": touch.target.className.split(" ")}
                                            }
					});
				    });
				}
				startEvent = {
				    "type": ev.type,
                                    "eventData":{
                                        "timeStamp": ev.gesture.startEvent.timeStamp,
                                        "target": {"id": ev.gesture.target.id, "classes": ev.gesture.target.className.split(" ")},
                                        "center": ev.gesture.startEvent.center,
                                        "pointerType": ev.gesture.startEvent.pointerType,
                                        "eventType": ev.gesture.startEvent.eventType,
                                        "srcEventType": ev.gesture.startEvent.srcEvent.type,
                                        "touches": touches
                                    }
				};
				if(ev.gesture.touches){
				    touches = [];
				    $.each(ev.gesture.touches, function(index, touch) {
					touches.push({
					    "type": touch.type,
                                            "eventData":{
                                                "center": {"pageX": touch.pageX, "pageY": touch.pageY},
                                                "parentOffsetX": touch.offsetX,
                                                "parentOffsetY": touch.offsetY,
                                                "target": {"id": touch.target.id, "classes": touch.target.className.split(" ")}
                                            }
					});
				    });
				}
				touchEvent = {
				    "type": ev.type,
                                    "eventData":{
                                        "timeStamp": ev.gesture.timeStamp,
                                        "screenDim": {"height": window.screen.height, "width": window.screen.width},
                                        "target": {"id": ev.gesture.target.id, "classes": ev.gesture.target.className.split(" ")},
                                        "center": ev.gesture.center,
                                        "pointerType": ev.gesture.pointerType,
                                        "deltaTime": ev.gesture.deltaTime,
                                        "deltaX": ev.gesture.deltaX,
                                        "deltaY": ev.gesture.deltaY,
                                        "velocityX": ev.gesture.velocityX,
                                        "velocityY": ev.gesture.velocityY,
                                        "angle": ev.gesture.angle,
                                        "direction": ev.gesture.direction,
                                        "distance": ev.gesture.distance,
                                        "scale": ev.gesture.scale,
                                        "rotation": ev.gesture.rotation,
                                        "eventStatus": ev.gesture.eventType,
                                        "srcEventType": ev.gesture.srcEvent.type,
                                        "startEvent": startEvent,
                                        "touches": touches
                                    }
				};
                                if(opts.stateful){
                                    touchEvent.affectedComponents = layout.events.outgoing.touchObj[ev.type].affectedComponents.length>0?layout.events.outgoing.touchObj[ev.type].affectedComponents:[];
                                }
			    }
			    _mdRwdOnGenericEvent(touchEvent);
			}
		    });
		}
	    }

	    function _mdRwdDestroyTouchListener() {
		var touchEvents = layout.events.outgoing.touch;
		if (touchEvents) {
		    if (touchEvents == "all") {
			touchEvents = $.map(events.touch.join(" "), _addNameSpaceAndTrim);
		    }else{
                        touchEvents = $.map(Object.keys(layout.events.outgoing.touchObj), _addNameSpaceAndTrim).join(" ");
		    }
		    $(document).hammer().off(touchEvents);
		}
	    }

	    function _mdRwdInitTouchCallbacks() {
		if(layout.events.incoming.touch){
		    $.each(layout.events.incoming.touch, function(touchGestureEvent, touchGestureCallback) {
			$(document).on(_addNameSpaceAndTrim(touchGestureEvent), touchGestureCallback);
		    });
		}
	    }

	    function _mdRwdDestroyTouchCallbacks() {
		if(layout&&layout.events&&layout.events.incoming&&layout.events.incoming.touch){
		    $.each(layout.events.incoming.touch, function(touchGestureEvent, touchGestureCallback) {
			$(document).off(_addNameSpaceAndTrim(touchGestureEvent));
		    });
		}
	    }

	    function _mdRwdInitCustomListener() {
		var customEvents = layout.events.outgoing.custom;
		if (customEvents) {
                    customEvents = $.map(Object.keys(layout.events.outgoing.customObj), _addNameSpaceAndTrim).join(" ");
                    $(document).on(customEvents, function(ev) {
			if(!ev.namespace || ev.namespace != mdRwdNameSpace){
                            var defaultCustomEventData = {
                                "timestamp": ev.timeStamp,
                                "screenDim": {"height": window.screen.height, "width": window.screen.width}
                            };
			    var customEvent = {
                                "type": ev.type,
                                "eventData": $.extend(true, {}, defaultCustomEventData, ev.eventData)
                            };
                            if(opts.stateful){
                                customEvent.affectedComponents = layout.events.outgoing.customObj[ev.type].affectedComponents.length>0?layout.events.outgoing.customObj[ev.type].affectedComponents:[];
                            }
			    _mdRwdOnGenericEvent(customEvent);
			}
		    });
		}
	    }

	    function _mdRwdDestroyCustomListener() {
		var customEvents = layout.events.outgoing.custom;
		if (customEvents) {
                    customEvents = $.map(Object.keys(layout.events.outgoing.customObj), _addNameSpaceAndTrim).join(" ");
		    $(document).off(customEvents);
		}
	    }

	    function _mdRwdInitCustomCallbacks() {
		if(layout.events.incoming.custom){
		    $.each(layout.events.incoming.custom, function(customEvent, customEventCallback) {
			$(document).on(_addNameSpaceAndTrim(customEvent), customEventCallback);
		    });
		}
	    }

	    function _mdRwdDestroyCustomCallbacks() {
		if(layout&&layout.events&&layout.events.incoming&&layout.events.incoming.custom){
		    $.each(layout.events.incoming.custom, function(customEvent, customEventCallback) {
			$(document).off(_addNameSpaceAndTrim(customEvent));
		    });
		}
	    }

	    function _mdRwdCreateConnection() {
		if (window.WebSocket) {
                    if($.isEmptyObject(ws)){
                        ws = new WebSocket("ws://" + opts.ip + ":" + opts.port + "/");
                        ws.onopen = _wsOnOpen;
                        ws.onmessage = _wsOnMessage;
                        ws.onerror = _wsOnError;
                        ws.onclose = _wsOnClose;
                        $("#mdRwdLayoutsBox .mdRwdLoadingBox").show();
                        $("#mdRwdLayoutChoice").hide();
                    }else{
                        _mdRwdError("Waiting for WebSocket connection");
                        return false;
                    }
		} else {
		    _mdRwdError("The current browser does not support WebSockets");
                    return false;
		}
	    }
	    
	    function _wsSend(wsMessage) {
                wsMessage = JSON.stringify(wsMessage);
                if(ws.readyState === 1){
                    ws.send(wsMessage);
                }else{
                    _mdRwdError('WebSocket connection has been lost');
                    return false;
                }
            }
	    
	    function _wsOnOpen(ev) {
                _mdRwdDisplayConnTypes();
		opts.mdRwdOnWsOpen(ev);
		layout.mdRwdOnWsOpen(ev);
	    }
	    
	    function _wsOnError(ev) {
		opts.mdRwdOnWsError(ev);
                if(!$.isEmptyObject(layout)){
                    layout.mdRwdOnWsError(ev);
                }
	    }

	    function _wsOnClose(ev) {
                if(ev.code===1006){
                    $("#mdRwdLayoutsBox .mdRwdLoadingBox").hide();
                    $("#mdRwdLayoutChoice").html('<div class="mdRwdWarningMessage">' + opts.html.window.content.warningMessages[ev.code] + '</div>');
                    $("#mdRwdLayoutChoice").show();
                }
		opts.mdRwdOnWsClose(ev.code, ev);
                if(!$.isEmptyObject(layout)){
                    layout.mdRwdOnWsClose(ev.code, ev);
                }
	    }
	    
	    function _wsOnMessage(ev) {
		var wsMessage = JSON.parse(ev.data);
                switch (wsMessage.cmd) {
                    case "newVc":
                        _newVcHandler(wsMessage);
                        break;
                    case "connVc":
                        _connVcHandler(wsMessage);
                        break;
                    case "changeLayout":
                        _changeLayoutHandler(wsMessage);
                        break;
                    case "triggerVcEvent":
                        _triggerVcEventHandler(wsMessage);
                        break;
                    case "rmVcClient":
                        _rmVcClientHandler(wsMessage);
                        break;
                    case "rmVc":
                        _rmVcHandler(wsMessage);
                        break;
                    default:
                        break;
                }
		opts.mdRwdOnWsMessage(wsMessage);
		layout.mdRwdOnWsMessage(wsMessage);
	    }
             
            function _mdRwdDisplayConnTypes(){
                var mdRwdWindowContentHtml = '';
                mdRwdWindowContentHtml += _mdRwdConnTypeNewVc();
                mdRwdWindowContentHtml += _mdRwdConnTypeConnVc();
                $("#mdRwdWindowContent").html(mdRwdWindowContentHtml);
                if($("#mdRwdConnectVcId").length){
                    $("#mdRwdConnectVcId").focus();
                }
            } 
            
            function _mdRwdConnTypeNewVc(){
                var mdRwdWindowContentHtml = '';
                if($.inArray("newVc", layout.connectionTypesArray) > -1){
                    _newVc();
                    mdRwdWindowContentHtml += '<div id="mdRwdVcCell" ' + (layout.connectionTypesArray.length==1?'class="mdRwdMaxyCell"':'') + '>';
                    mdRwdWindowContentHtml += '	<div id="mdRwdVcBox">';
                    mdRwdWindowContentHtml += '	    <div id="mdRwdVcLabel">' + opts.html.window.content.vcLabel + '</div>';
                    mdRwdWindowContentHtml += '         <div class="mdRwdLoadingBox">';
                    mdRwdWindowContentHtml += '             <img src="' + opts.html.window.content.loadingImgPath + '" class="mdRwdLoadingImg"/>';		
                    mdRwdWindowContentHtml += '         </div>';
                    mdRwdWindowContentHtml += '	    <div id="mdRwdVcId"></div>';
                    mdRwdWindowContentHtml += '	</div>';
                    mdRwdWindowContentHtml += '</div>';
                }
                return mdRwdWindowContentHtml;
            }
            
            function _mdRwdConnTypeConnVc(){
                var mdRwdWindowContentHtml = '';
                if($.inArray("connVc", layout.connectionTypesArray) > -1){
                    mdRwdWindowContentHtml += '<div id="mdRwdConnectVcCell" ' + (layout.connectionTypesArray.length==1?'class="mdRwdMaxyCell"':'') + '>';
                    mdRwdWindowContentHtml += '	<div id="mdRwdConnectVcBox">';
                    mdRwdWindowContentHtml += '	    <div id="mdRwdConnectVcLabel">' + opts.html.window.content.connectVcLabel + '</div>';
                    mdRwdWindowContentHtml += '         <div class="mdRwdLoadingBox">';
                    mdRwdWindowContentHtml += '             <img src="' + opts.html.window.content.loadingImgPath + '" class="mdRwdLoadingImg"/>';		
                    mdRwdWindowContentHtml += '         </div>';
                    mdRwdWindowContentHtml += '	    <div id="mdRwdConnectVc"><input type="text" pattern="[0-9]*" id="mdRwdConnectVcId"/><button id="mdRwdConnectVcButton">' + opts.html.window.content.connectVcButton + '</button></div>';
                    mdRwdWindowContentHtml += '	</div>';
                    mdRwdWindowContentHtml += '</div>';
                    $(document).off("keydown", "#mdRwdConnectVcId");
                    $(document).on("keydown", "#mdRwdConnectVcId", function(event){
                        if(event.keyCode == 13) {
                           $("#mdRwdConnectVcButton").trigger("click");
                        }
                    });
                    $(document).off("click", "#mdRwdConnectVcButton");
                    $(document).on("click", "#mdRwdConnectVcButton", function(){
                        vcId = $("#mdRwdConnectVcId").val();
                        _connVc();
                    });
                }
                return mdRwdWindowContentHtml;
            }
             
            function _newVc(){
                $("#mdRwdVcId").hide();
                $("#mdRwdVcBox .mdRwdLoadingBox").show();
		wsMessage = {"cmd": "newVc", "vcId": "", "client": {"device": device, "layout": {"id": layout.id}}};
		if(opts.stateful){
                    wsMessage.initComponents = {};
                    $.each(opts.components, function(currComp, compDetails){
                        wsMessage.initComponents[currComp] = {};
                        wsMessage.initComponents[currComp].id = compDetails.id;
                        wsMessage.initComponents[currComp].state = compDetails.state;
                    });
                    wsMessage.client.layout.components = opts.componentsArray;
                }
                wsMessage.initLayouts = {};
                $.each(opts.layouts, function(currLayout, layoutDetails){
                    wsMessage.initLayouts[currLayout] = {};
                    wsMessage.initLayouts[currLayout].id = layoutDetails.id;
                    wsMessage.initLayouts[currLayout].maxInstances = layoutDetails.maxInstances;
                    wsMessage.initLayouts[currLayout].instances = [];
                });
                _wsSend(wsMessage);
            }     
            
            function _connVc(){
                $("#mdRwdConnectVc").hide();
                $("#mdRwdConnectVcBox .mdRwdLoadingBox").show();
                wsMessage = {"cmd": "connVc", "vcId": vcId, "client": {"device": device, "layout":  {"id": layout.id}}};
                if(opts.stateful){
                    wsMessage.client.layout.components = layout.componentsArray;
                }
                _wsSend(wsMessage);
            }
            
            function _changeLayout(layoutId){
                if(opts.layouts[layoutId]){
                    if(layoutId != layout.id){
                        if($.inArray(device.id, opts.layouts[layoutId].devicesArray)>-1){
                            var oldLayout = layout;
                            var newLayout = opts.layouts[layoutId];
                            layout = newLayout;
                            wsMessage = {"cmd": "changeLayout", "vcId": vcId, "client": {"device": device, "layout":  {"id": layout.id}, "oldLayout": {"id": oldLayout.id}}};
                            if(opts.stateful){
                                wsMessage.client.layout.components = layout.componentsArray;
                            }
                            _wsSend(wsMessage);
                        }else{
                            _mdRwdError('The layout "' + layoutId + '"  is not associated with the current "' + device.id + '" device');
                            return false;
                        }
                    }else{
                        _mdRwdError('The layout "' + layoutId + '" is the current layout');
                        return false;
                    }
                }else{
                    _mdRwdError('The layout "' + layoutId + '" does not exist');
                    return false;
                }
            }
                                  
	    function _newVcHandler(wsMessage){
                var event = {
                    "namespace": mdRwdNameSpace,
                    "timeStamp": wsMessage.timeStamp,
                    "type": wsMessage.cmd,
                    "eventData": {},
                    "client": wsMessage.client,
                    "vcId": wsMessage.vcId,
                    "vcClients": wsMessage.vcClients,
                    "vcLayouts": wsMessage.vcLayouts
                };
                $("#mdRwdVcBox .mdRwdLoadingBox").hide();
                $("#mdRwdVcId").show();
                vcId = wsMessage.vcId;
                if(clientId == null && wsMessage.client.isMe){
                    clientId = wsMessage.client.id;
                }
		if(wsMessage.statusCode!=mdRwdStatusCodeOk){
                    opts.mdRwdOnWarning(wsMessage.statusCode);
                    layout.mdRwdOnWarning(wsMessage.statusCode);
                    var mdRwdWindowWarningHtml = '';
                    mdRwdWindowWarningHtml += '<div class="mdRwdWarning">';
                    mdRwdWindowWarningHtml += ' <div class="mdRwdWarningMessage">' + opts.html.window.content.warningMessages[wsMessage.statusCode] + '</div>';
                    mdRwdWindowWarningHtml += ' <div class="mdRwdWarningBackButton">' + opts.html.window.content.warningBackButton + '</div>';
                    mdRwdWindowWarningHtml += '</div>';
                    $("#mdRwdVcId").html(mdRwdWindowWarningHtml);
                    $(document).off("click", "#mdRwdVcBox .mdRwdWarningBackButton");
                    $(document).on("click", "#mdRwdVcBox .mdRwdWarningBackButton", function(){
                        $("#mdRwdVcId").hide();
                        $("#mdRwdVcBox .mdRwdLoadingBox").show();
                        var mdRwdWindowContentHtml = '';
                        mdRwdWindowContentHtml += _mdRwdConnTypeNewVc();
                        $("#mdRwdVcCell").replaceWith(mdRwdWindowContentHtml);
                    });
		}else{
                    $("#mdRwdVcId").html(vcId);
                    layout.events.incoming.mdRwd.newVc(event, wsMessage);
		}
	    }
            
	    function _connVcHandler(wsMessage){
                var event = {
                    "namespace": mdRwdNameSpace,
                    "timeStamp": wsMessage.timeStamp,
                    "type": wsMessage.cmd,
                    "eventData": {},
                    "client": wsMessage.client,
                    "vcId": wsMessage.vcId,
                    "vcClients": wsMessage.vcClients,
                    "vcLayouts": wsMessage.vcLayouts
                };
                if(clientId == null && wsMessage.client.isMe){
                    clientId = wsMessage.client.id;
                }
		if(wsMessage.statusCode != mdRwdStatusCodeOk){
                    if(wsMessage.lock){
                        timeConnVcFail = Date.now();
                        if(!firstConnVcFailed){
                            firstConnVcFailed = true;
                            timeFirtsConnVcFail = timeConnVcFail;
                        }
                        if(timeConnVcFail - timeFirtsConnVcFail > opts.connVcTimeout){
                            opts.mdRwdOnWarning(wsMessage.statusCode);
                            layout.mdRwdOnWarning(wsMessage.statusCode);
                            firstConnVcFailed = false;
                            $("#mdRwdConnectVcBox .mdRwdLoadingBox").hide();
                            $("#mdRwdConnectVc").show();
                            var mdRwdWindowWarningHtml = '';
                            mdRwdWindowWarningHtml += '<div class="mdRwdWarning">';
                            mdRwdWindowWarningHtml += ' <div class="mdRwdWarningMessage">' + opts.html.window.content.warningMessages[wsMessage.statusCode] + '</div>';
                            mdRwdWindowWarningHtml += ' <div class="mdRwdWarningBackButton">' + opts.html.window.content.warningBackButton + '</div>';
                            mdRwdWindowWarningHtml += '</div>';
                            $("#mdRwdConnectVc").html(mdRwdWindowWarningHtml);
                            $(document).off("click", "#mdRwdConnectVcBox .mdRwdWarningBackButton");
                            $(document).on("click", "#mdRwdConnectVcBox .mdRwdWarningBackButton", function(){
                                var mdRwdWindowContentHtml = '';
                                mdRwdWindowContentHtml += _mdRwdConnTypeConnVc();
                                $("#mdRwdConnectVcCell").replaceWith(mdRwdWindowContentHtml);
                                $("#mdRwdConnectVcId").focus();
                            });
                        }else{
                            setTimeout(function(){_connVc()}, opts.connVcInterval);
                        }
                    }else{
                        opts.mdRwdOnWarning(wsMessage.statusCode);
                        layout.mdRwdOnWarning(wsMessage.statusCode);
                        $("#mdRwdConnectVcBox .mdRwdLoadingBox").hide();
                        $("#mdRwdConnectVc").show();
                        var mdRwdWindowWarningHtml = '';
                        mdRwdWindowWarningHtml += '<div class="mdRwdWarning">';
                        mdRwdWindowWarningHtml += ' <div class="mdRwdWarningMessage">' + opts.html.window.content.warningMessages[wsMessage.statusCode] + '</div>';
                        mdRwdWindowWarningHtml += ' <div class="mdRwdWarningBackButton">' + opts.html.window.content.warningBackButton + '</div>';
                        mdRwdWindowWarningHtml += '</div>';
                        $("#mdRwdConnectVc").html(mdRwdWindowWarningHtml);
                        $(document).off("click", "#mdRwdConnectVcBox .mdRwdWarningBackButton");
                        $(document).on("click", "#mdRwdConnectVcBox .mdRwdWarningBackButton", function(){
                            var mdRwdWindowContentHtml = '';
                            mdRwdWindowContentHtml += _mdRwdConnTypeConnVc();
                            $("#mdRwdConnectVcCell").replaceWith(mdRwdWindowContentHtml);
                            $("#mdRwdConnectVcId").focus();
                        });
                    }
		}else{
                    if(!firstConnVcOccurred){
                        firstConnVcOccurred = true;
                        $("#mdRwdConnectVcBox .mdRwdLoadingBox").hide();
                        if(opts.stateful){
                            if(wsMessage.client.isMe){
                                _setLocalLayoutState(wsMessage.componentsFromServer);
                            }
                        }
                        mdRwdButton.focus();
                        _mdRwdShowLayout();
                        _mdRwdInitEventsListeners();
                        _mdRwdInitEventsCallbacks();
                        _mdRwdButtonDisconnect();
                        _mdRwdWindowHide(function(){
                            layout.events.incoming.mdRwd.connVc(event, wsMessage);
                            opts.mdRwdOnMultiDeviceMode();
                            layout.mdRwdOnMultiDeviceMode();
                            mdRwdAppMode = multiDeviceMode;
                        });
                    }else{
                        layout.events.incoming.mdRwd.connVc(event, wsMessage);
                    }
		}
	    }
            
            function _changeLayoutHandler(wsMessage){
                var event = {
                    "namespace": mdRwdNameSpace,
                    "timeStamp": wsMessage.timeStamp,
                    "type": wsMessage.cmd,
                    "eventData": {},
                    "client": wsMessage.client,
                    "vcId": wsMessage.vcId,
                    "vcClients": wsMessage.vcClients,
                    "vcLayouts": wsMessage.vcLayouts
                };
		if(wsMessage.statusCode != mdRwdStatusCodeOk){
                    opts.mdRwdOnWarning(wsMessage.statusCode);
                    layout.mdRwdOnWarning(wsMessage.statusCode);
		}else{
                    if(wsMessage.client.isMe){
                        $("link[href='" + opts.layouts[wsMessage.client.oldLayout.id].css + "']").remove();
                        _mdRwdDestroyEventsListeners();
                        _mdRwdDestroyEventsCallbacks();
                        eventsAffectedComponents = {};
                        if(opts.stateful){
                            _setLocalLayoutState(wsMessage.componentsFromServer);
                        }
                        _mdRwdShowLayout();
                        _mdRwdInitEventsListeners();
                        _mdRwdInitEventsCallbacks();
                    }
                    layout.events.incoming.mdRwd.changeLayout(event, wsMessage);
		}
            }
            
	    function _triggerVcEventHandler(wsMessage){
                var event = {
                    "namespace": mdRwdNameSpace,
                    "timeStamp": wsMessage.timeStamp,
                    "type": wsMessage.event.type,
                    "eventData": wsMessage.event.eventData,
                    "client": wsMessage.client,
                    "vcId": wsMessage.vcId
                };
                if(opts.stateful){
                    event.affectedComponents = wsMessage.event.affectedComponents;
                }
                _triggerVcEvent(event);
                layout.events.incoming.mdRwd.triggerVcEvent(event, wsMessage);
	    }	    
	    
            function _rmVcClientHandler(wsMessage){
                var event = {
                    "namespace": mdRwdNameSpace,
                    "timeStamp": wsMessage.timeStamp,
                    "type": wsMessage.cmd,
                    "eventData": {},
                    "client": wsMessage.client,
                    "vcId": wsMessage.vcId
                };
                layout.events.incoming.mdRwd.rmVcClient(event, wsMessage);
            }
            
            function _rmVcHandler(wsMessage){
                var event = {
                    "namespace": mdRwdNameSpace,
                    "timeStamp": wsMessage.timeStamp,
                    "type": wsMessage.cmd,
                    "eventData": {},
                    "client": wsMessage.client,
                    "vcId": wsMessage.vcId
                };
                layout.events.incoming.mdRwd.rmVc(event, wsMessage);
            }
            
	    function _triggerVcEvent(event){
		$(document).trigger(event);
	    }	    

            function _setLocalLayoutState(components){
                if(components){
                    $.each(components, function(currComp, compDetails){
                        opts.components[currComp].state = $.extend(true, opts.components[currComp].state, compDetails.state); 
                    });
                }
            }

            function _setLocalVcCompState(compId, state){
                if(opts.components[compId]){
                    opts.components[compId].state = state;  
                    if(vcId != null){
                        _setServerVcCompState(compId);
                    }
                }else{
                    _mdRwdError('The component "' + compId + '" does not exist');
                    return false;
                }
            }
            
            function _setServerVcCompState(compId){
                var componentState = {};
                componentState.id = opts.components[compId].id;
                componentState.state = opts.components[compId].state;
                wsMessage = {"cmd": "setVcCompState", "vcId": vcId, "componentState":  componentState, "client": {"device": device, "layout": {"id":layout.id, "components": layout.componentsArray}}};
                _wsSend(wsMessage);
            }

            function _getLocalVcCompState(compId){
                if(opts.components[compId]){
                    return opts.components[compId].state;
                }else{
                    _mdRwdError('The component "' + compId + '" does not exist');
                    return false;
                }
            }
            
            function _getMyId(){
                return clientId;
            }
            
            function _getMyVc(){
                return vcId;
            }
            
            function _getMyDevice(){
                return device;
            }
            
            function _getMyLayout(){
                return layout;
            }

            function _getMyAppMode(){
                return mdRwdAppMode;
            }
            
            //public methods
            var publicMethods = {};
            publicMethods =  {
                "triggerVcEvent": _triggerVcEvent,
                "changeLayout": _changeLayout,
                "destroy": _mdRwdDestroy,
                "getMyId": _getMyId,
                "getMyVc": _getMyVc,
                "getMyDevice": _getMyDevice,
                "getMyLayout": _getMyLayout,
                "getMyAppMode": _getMyAppMode
            };
            
	    if(opts.stateful){
                publicMethods.setVcCompState = _setLocalVcCompState;
                publicMethods.getVcCompState = _getLocalVcCompState;
            }
            
            return publicMethods;
            
	};
	
})(jQuery);