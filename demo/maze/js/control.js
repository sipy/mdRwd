function control_clientConnection(event) {
    switch (event.client.layout.id) {
        case "control":
            if(event.client.isMe){
                control_shakeDeviceListener();
            }
            break;
    }
}

function control_shakeDeviceListener() {
    $(window).on("shake", function(ev) {
        var motionEvent = {
            "type": "shakeDevice",
            "eventData": {
                "timeStamp": ev.timeStamp,
                "numShakes": 3
            }
        };
        if(mdRwd) mdRwd.triggerVcEvent(motionEvent);
    });
}