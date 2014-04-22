<?php
/* 
 * mdRwd -  A framework for development of Web applications 
 *          partitioned in different communicating devices.
 * v0.1.1 - 2014-04-22
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

    //debug flag, if true a server log will be outputted in the server console
    define("DEBUG", true);
    //stateful flag that determines whether the Web application is stateful or not
    define("STATEFUL", true);
    //timeout in seconds for the component state lock
    define("LOCK_TIMEOUT", 5);
    //WebSocket server IP
    define("WS_SERVER_IP", "149.132.157.136");
    //WebSocket server port
    define("WS_SERVER_PORT", 9000);
    //maximum amount of virtual channels
    define("WS_MAX_VCS", 10);
    //maximum amount of clients that can be connected at one time in the same virtual channel
    define("WS_MAX_VC_CLIENTS", 5);
    //maximum amount of clients that can be connected at one time in the same virtual channel on the same ip v4 address
    define("WS_MAX_VC_CLIENTS_PER_IP", 4);
    //maximum amount of clients + 1 that can be connected at one time (leave this expression as it is)
    define("WS_MAX_CLIENTS", WS_MAX_VCS * WS_MAX_VC_CLIENTS + 1);
    //maximum amount of clients + 1 that can be connected at one time (leave this expression as it is)
    define("WS_MAX_CLIENTS_PER_IP", WS_MAX_VCS * WS_MAX_VC_CLIENTS_PER_IP + 1);
    //number of characters for the virtual channels ids
    define("NUM_VC_ID_CHARS", 4);
    //WebSoccket server allowed client origins
    $ALLOWED_ORIGINS = array(
        "http://".WS_SERVER_IP,
        "http://mdrwd.org", "http://www.mdrwd.org",
        "http://mdrwd.net", "http://www.mdrwd.net",
        "http://mdrwd.com", "http://www.mdrwd.com"
    );
    //closure status codes
    //WebSocket protocol reserved status codes
    define("WS_STATUS_NORMAL_CLOSURE"              ,       1000);
    define("WS_STATUS_GONE_AWAY"                   ,       1001);
    define("WS_STATUS_PROTOCOL_ERROR"              ,       1002);
    define("WS_STATUS_UNSUPPORTED_MESSAGE_TYPE"    ,       1003);
    define("WS_STATUS_RESERVED"                    ,       1004);
    define("WS_STATUS_NO_STATUS_RCVD"              ,       1005);
    define("WS_STATUS_ABNORMAL_CLOSURE"            ,       1006);
    define("WS_STATUS_INVALID_FRAME_PAYLOAD_DATA"  ,       1007);
    define("WS_STATUS_POLICY_VIOLATION"            ,       1008);
    define("WS_STATUS_MESSAGE_TOO_BIG"             ,       1009);
    define("WS_STATUS_MANDADORY_EXT"               ,       1010);
    define("WS_STATUS_TIMEOUT"                     ,       3000);
    //mdRwd reserved status codes
    //mdRwd ok status code
    define("WS_STATUS_OK"                          ,       5000);   
    //mdRwd error status codes
    define("WS_STATUS_INVALID_MESSAGE"             ,       6000);  
    define("WS_STATUS_CLIENT_NOT_IN_VC"            ,       6001);  
    define("WS_STATUS_APP_NOT_STATEFUL"            ,       6002);  
    //mdRwd warning status codes
    define("WS_STATUS_UNKNOWN_VC"                  ,       7000);  
    define("WS_STATUS_CLIENT_ALREADY_IN_VC"        ,       7001);  
    define("WS_STATUS_MAX_VCS"                     ,       7002); 
    define("WS_STATUS_MAX_VC_CLIENTS"              ,       7003); 
    define("WS_STATUS_MAX_VC_CLIENTS_PER_IP"       ,       7004); 
    define("WS_STATUS_COMPONENT_LOCK"              ,       7005); 
    //you can set your own custom status codes, the range must be greater then 5000 because status codes below 5000 are reserved to the WebSocket protocol

?>