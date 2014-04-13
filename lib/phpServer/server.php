<?php
/* 
 * mdRwd -  A jQuery/PHP framework for development of Web applications 
 *          partitioned in different communicating devices.
 * v0.1.0 - 2014-04-13
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

//prevent the server from timing out
set_time_limit(0);

//include the main configuration file
require_once 'server.config.php';

//include the WebSockets server script (the server is started at the far bottom of this file)
require_once 'class.PHPWebSocket.php';

//global variabales
//create the WebSocket server
$server = new PHPWebSocket();
//available commands
$avlbCmds = array(
                "NEW_VC" => "newVc", //create new virtual channel
                "CONN_VC" => "connVc", //connect to a virtual channel
                "TRIGGER_VC_EVENT" => "triggerVcEvent", //trigger event into a virtual channel
                "SET_VC_COMP_STATE" => "setVcCompState" //set a component state inside a virtual channel
            );
//available destinations
$avlbDests = array(
                "ME" => "me", //send message to myself
                "ALL_WS" => "allWs", //send message to all WebSocket clients except to myself
                "ALL_WS_NOT_VCS" => "allWsNotVcs", //send message to all WebSocket clients that are not connected to any virtual channel except to myself
                "ALL_WS_NOT_VC" => "allWsNotVc", //send message to all WebSocket clients that are not connected to a virtual channel except to myself
                "ALL_VCS" => "allVcs", //send message to all WebSocket clients that are connected a virtual channel except to myself
                "ALL_VC" => "allVc" //send message to all WebSocket clients that are connected to a virtual channel except to myself
            );

//when a client sends data to the server
function wsOnMessage($clientId, $message, $messageLength, $binary) {
    global $server, $avlbCmds;

    $message = json_decode($message, true);
    
    //if the received message is valid
    if($message && validMessage($clientId, $message)){
        
        //add timeStamp message parameter
        $message["timeStamp"] = time();
        //add clientId message parameter
        $message["client"]["id"] = (int) $clientId;
        //add clientIp message parameter
        $message["client"]["ip"] = (string) long2ip($server->wsClients[$clientId][6]);

        switch ($message["cmd"]) {
            case $avlbCmds["NEW_VC"]:
                newVcHandler($message);
                break;
            case $avlbCmds["CONN_VC"]:
                connVcHandler($message);
                break;
            case $avlbCmds["TRIGGER_VC_EVENT"]:
                triggerVcEventHandler($message);
                break;
            case $avlbCmds["SET_VC_COMP_STATE"]:
                setVcCompStateHandler($message);
                break;
        }
    }
}

function validMessage($clientId, $message){
    global $server, $avlbCmds;
    
    $checkMessage = true;
    if(
        isset($message["cmd"]) && in_array($message["cmd"], $avlbCmds) &&
        isset($message["vcId"]) &&
        isset($message["client"]) && isset($message["client"]["layout"]) && isset($message["client"]["layout"]["id"]) &&
        ((STATEFUL && isset($message["client"]["layout"]["components"])) || !STATEFUL)
    ){
        switch ($message["cmd"]) {
            case $avlbCmds["NEW_VC"]:
                if(STATEFUL && !isset($message["initComponents"]))
                    $checkMessage = false;
                elseif(STATEFUL && isset($message["initComponents"]))
                    $message["initComponents"] = (array) $message["initComponents"];
                break;
            case $avlbCmds["CONN_VC"]:
                if(!isset($message["changeLayout"]))
                    $checkMessage = false;
                else
                    $message["changeLayout"] = (bool) $message["changeLayout"];
                break;
            case $avlbCmds["TRIGGER_VC_EVENT"]:
                if(!isset($message["event"]) || !isset($message["event"]["affectedComponents"])){
                    $checkMessage = false;
                }else{
                    $message["event"] = (array) $message["event"];
                    $message["event"]["affectedComponents"] = (array) $message["event"]["affectedComponents"];
                }
                break;
            case $avlbCmds["SET_VC_COMP_STATE"]:
                if(!isset($message["componentState"]))
                    $checkMessage = false;
                else
                    $message["componentState"] = (array) $message["componentState"];
                break;
        }
        $message["cmd"] = (string) $message["cmd"];
        $message["vcId"] = (string) $message["vcId"];
        $message["client"] = (array) $message["client"];
        $message["client"]["layout"] = (array) $message["client"]["layout"];
        $message["client"]["layout"]["id"] = (string) $message["client"]["layout"]["id"];
        if(STATEFUL)
            $message["client"]["layout"]["components"] = (array) $message["client"]["layout"]["components"];
    }else{
        $checkMessage = false;
    }
    
    if(!$checkMessage){
        rmClient($clientId, WS_STATUS_INVALID_MESSAGE);
        serverLog('invalid message received from client "' . $clientId . '"');
    }
    
    return $checkMessage;
}

function newVcHandler($message) {
    global $server, $avlbDests;
    
    $maxStatusCode = checkWsMaximums($message["client"]["id"]);
    if ($maxStatusCode == -1) {
        //create unique virtual channel id
        do{
            //add vcId to the message
            $message["vcId"] = (string) str_pad(rand(0, pow(10, NUM_VC_ID_CHARS) - 1), NUM_VC_ID_CHARS, '0', STR_PAD_LEFT); 
        }while (isset($server->wsVcs[$message["vcId"]]));
        //create virtual channel
        $server->wsVcs[$message["vcId"]] = array();
        if (STATEFUL) {
            //add components to the virtual channel
            $server->wsVcs[$message["vcId"]]["components"] = $message["initComponents"];
        }
        //add client to the virtual channel
        $server->wsVcs[$message["vcId"]]["clients"][$message["client"]["id"]] = $message["client"];
        $server->wsVcsCount++;
        $server->wsVcsClientCount[$message["vcId"]] = 1;
        $server->wsVcsClientIPCount[$message["vcId"]][$server->wsClients[$message["client"]["id"]][6]] = 1;
        
        $message["statusCode"] = WS_STATUS_OK;
        
        sendMessage($message, $avlbDests["ME"]);

        serverLog('client "' . $message["client"]["id"] . '" created the virtual channel "' . $message["vcId"] . '"');
    } else {
        $message["statusCode"] = $maxStatusCode;
        sendMessage($message, $avlbDests["ME"]);
    }
}

function connVcHandler($message){
    global $server, $avlbDests;
    
    //if virtual channel exists 
    if (isset($server->wsVcs[$message["vcId"]])) {
        //if current client is not connected yet to the virtual channel
        if (!isset($server->wsVcs[$message["vcId"]]["clients"][$message["client"]["id"]]) || $message["changeLayout"]) {
            $maxStatusCode = checkWsMaximums($message["client"]["id"], $message["vcId"]);
            if ($maxStatusCode == -1) {
                if (STATEFUL) {
                    $lock = false;
                    foreach ($message["client"]["layout"]["components"] as $index => $component) {
                        if (isset($server->wsVcs[$message["vcId"]]["components"][$component]["lock"])) {
                            if (($message["timeStamp"] - $server->wsVcs[$message["vcId"]]["components"][$component]["lock"]) > LOCK_TIMEOUT) {
                                unset($server->wsVcs[$message["vcId"]]["components"][$component]["lock"]);
                            } else {
                                $lock = true;
                                break;
                            }
                        }
                    }
                }

                if (STATEFUL && $lock) {
                    $message["statusCode"] = WS_STATUS_COMPONENT_LOCK;
                    $message["lock"] = $lock;
                    
                    sendMessage($message, $avlbDests["ME"]);

                    serverLog('client "' . $message["client"]["id"] . '" waiting component lock inside the virtual channel "' . $message["vcId"] . '" ' . ($message["changeLayout"] ? '(changeLayout)' : ''));
                }else{
                    if (!$message["changeLayout"]) {
                        //remove the temporary virtual channel created by this client (newVc command)
                        $tmpVcId = getVcClient($message["client"]["id"]);
                        if ($tmpVcId != -1) 
                            rmVc($tmpVcId);
                        //add client to the virtual channel
                        $server->wsVcs[$message["vcId"]]["clients"][$message["client"]["id"]] = $message["client"];
                        $server->wsVcsClientCount[$message["vcId"]] ++;
                        //if there is another client connected to the virtual channel with the same IP
                        if (isset($server->wsVcsClientIPCount[$message["vcId"]][$server->wsClients[$message["client"]["id"]][6]]))
                            $server->wsVcsClientIPCount[$message["vcId"]][$server->wsClients[$message["client"]["id"]][6]] ++;
                        else
                            $server->wsVcsClientIPCount[$message["vcId"]][$server->wsClients[$message["client"]["id"]][6]] = 1;
                    }
                    
                    if(STATEFUL){
                        $message["lock"] = $lock;
                        //add components to message
                        $message["componentsFromServer"] = array();
                        foreach ($message["client"]["layout"]["components"] as $index => $component) {
                            $message["componentsFromServer"][$component] = $server->wsVcs[$message["vcId"]]["components"][$component];
                        }
                    }
                    
                    $message["statusCode"] = WS_STATUS_OK;
                    
                    sendMessage($message, $avlbDests["ME"]);
                    
                    unset($message["componentsFromServer"]);
                    
                    sendMessage($message, $avlbDests["ALL_VC"]);

                    serverLog('client "' . $message["client"]["id"] . '" connected to the virtual channel "' . $message["vcId"] . '" ' . ($message["changeLayout"] ? '(changeLayout)' : ''));
                }
            }else {
                $message["statusCode"] = $maxStatusCode;
                sendMessage($message, $avlbDests["ME"]);
            }
        } else {
            $message["statusCode"] = WS_STATUS_CLIENT_ALREADY_IN_VC;
            sendMessage($message, $avlbDests["ME"]);
        }
    } else {
        $message["statusCode"] = WS_STATUS_UNKNOWN_VC;
        sendMessage($message, $avlbDests["ME"]);
    }
}

function triggerVcEventHandler($message){
    global $server, $avlbDests;
        
    //if virtual channel exists
    if (isset($server->wsVcs[$message["vcId"]])) {
        //if client is connected to the current virtual channel
        if (isset($server->wsVcs[$message["vcId"]]["clients"][$message["client"]["id"]])) {

            if (STATEFUL) {
                //add lock to all affected components
                foreach ($message["event"]["affectedComponents"] as $component) {
                    $server->wsVcs[$message["vcId"]]["components"][$component]["lock"] = $message["timeStamp"];
                }
            }

            $message["statusCode"] = WS_STATUS_OK;
            
            sendMessage($message, $avlbDests["ALL_VC"]);
            
            serverLog('client "' . $message["client"]["id"] . '" triggered the event "' . $message["event"]["type"] . '" into the virtual channel "' . $message["vcId"] . '"');
        }else {
            $message["statusCode"] = WS_STATUS_CLIENT_NOT_IN_VC;
            sendMessage($message, $avlbDests["ME"]);
        }
    } else {
        $message["statusCode"] = WS_STATUS_UNKNOWN_VC;
        sendMessage($message, $avlbDests["ME"]);
    }
}

function setVcCompStateHandler($message){
    global $server;

    //if the application is stateful
    if (STATEFUL) {        
        //if virtual channel exists
        if (isset($server->wsVcs[$message["vcId"]])) {
            //if client is connected to the current virtual channel
            if (isset($server->wsVcs[$message["vcId"]]["clients"][$message["client"]["id"]])) {

                $server->wsVcs[$message["vcId"]]["components"][$message["componentState"]["id"]]["state"] = $message["componentState"]["state"];
                //if component lock exists, release it 
                if (isset($server->wsVcs[$message["vcId"]]["components"][$message["componentState"]["id"]]["lock"]))
                    unset($server->wsVcs[$message["vcId"]]["components"][$message["componentState"]["id"]]["lock"]);

                serverLog('client "' . $message["client"]["id"] . '" set the state of the component "' . $message["componentState"]["id"] . '" inside the virtual channel "' . $message["vcId"] . '"');
            }else 
                $message["statusCode"] = WS_STATUS_CLIENT_NOT_IN_VC;
        } else 
            $message["statusCode"] = WS_STATUS_UNKNOWN_VC;
    } else 
        $message["statusCode"] = WS_STATUS_APP_NOT_STATEFUL;
    
}

//check WebSocket capacity limits
function checkWsMaximums($clientId, $vcId = NULL) {
    global $server;

    if (!isset($vcId)) {
        if ($server->wsVcsCount == WS_MAX_VCS) 
            return WS_STATUS_MAX_VCS;
    } else {
        if ($server->wsVcsClientCount[$vcId] == WS_MAX_VC_CLIENTS) 
            return WS_STATUS_MAX_VC_CLIENTS;
        if (isset($server->wsVcsClientIPCount[$vcId][$server->wsClients[$clientId][6]]) && $server->wsVcsClientIPCount[$vcId][$server->wsClients[$clientId][6]] == WS_MAX_VC_CLIENTS_PER_IP) 
            return WS_STATUS_MAX_VC_CLIENTS_PER_IP;
    }

    return -1;
}

//when a client connects
function wsOnOpen($clientId) {
    global $server;

    serverLog('client "' . $clientId . '" connected to the WebSocket server');
}

//when a client closes or lost connection
function wsOnClose($clientId, $statusCode) {
    global $server;
    
    rmClient($clientId, $statusCode);
}

//remove client from WebSocket virtual channel connection
function rmClient($clientId, $statusCode) {
    global $server, $avlbDests;
    
    $vcId = getVcClient($clientId);
    if ($vcId != -1) {
        $message = array();
        $message["cmd"] = "rmVcClient";
        $message["vcId"] = $vcId;
        $message["client"] = $server->wsVcs[$vcId]["clients"][$clientId];
        $message["timeStamp"] = time();
        
        if (isset($server->wsVcsClientIPCount[$vcId][ip2long($message["client"]["ip"])])) 
            $server->wsVcsClientIPCount[$vcId][ip2long($message["client"]["ip"])]--;
        
        unset($server->wsVcs[$vcId]["clients"][$clientId]);
        $server->wsVcsClientCount[$vcId]--;
        
        sendMessage($message, $avlbDests["ALL_VC"]);
        
        serverLog('client "' . $clientId . '" removed from the virtual channel "' . $vcId . '"');
        
        //if there are no more clients into the virtual channel
        if (empty($server->wsVcs[$vcId]["clients"])) 
            //remove the virtual channel
            rmVc($vcId);
    }

    if (isset($server->wsClients[$clientId])) {
        //remove WebSocket client
        $server->wsSendClientClose($clientId, $statusCode);

        serverLog('client "' . $clientId . '" removed from the WebSocket server');
    }
}

//remove virtual channel
function rmVc($vcId) {
    global $server;

    if(isset($server->wsVcs[$vcId])){
        unset($server->wsVcs[$vcId]);
        $server->wsVcsCount--;
    }
    
    serverLog('virtual channel "' . $vcId . '" removed from the WebSocket server');
}

//server log
function serverLog($message){
    global $server;
    
    if (DEBUG)
        $server->log($message);
}

//start the WebSocket server
function startWsServer() {
    global $server;

    //bind the client connection events to personal functions
    $server->bind("message", "wsOnMessage");
    $server->bind("open", "wsOnOpen");
    $server->bind("close", "wsOnClose");
    //start the WebSocket server
    $server->wsStartServer(WS_SERVER_IP, WS_SERVER_PORT);
}

//get the virtual channel id in which the passed client is connected, if not connected to any virtual channel return -1
function getVcClient($clientId) {
    global $server;

    $vcId = -1;
    //for each virtual channel
    foreach ($server->wsVcs as $tmpVcId => $vc) {
        //if the client is connected to the current virtual channel
        if (isset($vc["clients"][$clientId]))
            $vcId = $tmpVcId;
    }
    return $vcId;
}

//send message to specific destination
function sendMessage($message, $destination) {
    global $server, $avlbDests;

    $message["client"]["isMe"] = $destination == $avlbDests["ME"];
    
    $jsonMessage = json_encode($message);
    switch ($destination) {
        case $avlbDests["ME"]:
            $server->wsSend($message["client"]["id"], $jsonMessage);
            break;
        case $avlbDests["ALL_WS"]:
            foreach ($server->wsClients as $wsClientId => $wsClient) {
                if($message["client"]["id"] != $wsClientId){
                    $server->wsSend($wsClientId, $jsonMessage);
                }
            }
            break;
        case $avlbDests["ALL_WS_NOT_VCS"]:
            foreach ($server->wsClients as $wsClientId => $wsClient) {
                if($message["client"]["id"] != $wsClientId){
                    $tmpVcId = getVcClient($wsClientId);
                    if ($tmpVcId == -1) {
                        $server->wsSend($wsClientId, $jsonMessage);
                    }
                }
            }
            break;
        case $avlbDests["ALL_WS_NOT_VC"]:
            foreach ($server->wsClients as $wsClientId => $wsClient) {
                if($message["client"]["id"] != $wsClientId){
                    if (!isset($server->wsVcs[$message["vcId"]]["clients"][$wsClientId])) {
                        $server->wsSend($wsClientId, $jsonMessage);
                    }
                }
            }
            break;
        case $avlbDests["ALL_VCS"]:
            foreach ($server->wsVcs as $vc) {
                foreach ($vc["clients"] as $vcClientId => $vcClient) {
                    if($message["client"]["id"] != $vcClientId){
                        $server->wsSend($vcClientId, $jsonMessage);
                    }
                }
            }
            break;
        case $avlbDests["ALL_VC"]:
            foreach ($server->wsVcs[$message["vcId"]]["clients"] as $vcClientId => $vcClient) {
                if($message["client"]["id"] != $vcClientId){
                    $server->wsSend($vcClientId, $jsonMessage);
                }
            }
            break;
    }
}

startWsServer();
?>