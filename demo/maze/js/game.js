var maze, gamePlayers, multiDevice, maxPlayers, numPlayersInGame, playersColors, pulseRange, payerPulseVelocity, gamePaused;

function game_initGame() {
    numPlayersInGame = 0;
    maxPlayers = 5;
    gamePaused = false;
    multiDevice = false;
    helpArrows = false;
    helpTouch = false;
    gamePlayers = [];
    playersColors = {
        "0": {"color": "red", "hex": "#FF1100"},
        "1": {"color": "blue", "hex": "#1155FF"},
        "2": {"color": "yellow", "hex": "#FFEE00"},
        "3": {"color": "green", "hex": "#00CC22"},
        "4": {"color": "grey", "hex": "#DDDDDD"}
    };
    var i;
    for (i = 0; i < maxPlayers; i++) {
        gamePlayers[i] = -1;
    }
    payerPulseVelocity = 200;
    pulseRange = 5;
    game_setGameMode("monoDevice");
    game_closeWinWindowListener();
    game_closeHelpWindowListener();
}

function game_newGame(event){
    game_setGameId(event.vcId);
    game_setGameState();
}

function game_clientConnection(event) {
    switch (event.client.layout.id) {
        case "game":
            if(event.client.isMe){
                game_getGameState();
                game_setGameId(event.vcId);
            }
            break;
        case "control":
            game_addPlayerToGame(event.client.id, true);
            break;
    }
}

function game_clientDisconnection(event) {
    switch (event.client.layout.id) {
        case "control":
            game_removePlayerFromGame(event.client.id);
            break;
    }
}

function game_showHelp() {
    if (window.screen.width >= 1025 && window.screen.width <= Number.POSITIVE_INFINITY) {
        if (multiDevice && !helpTouch) {
            game_pauseGame();
            helpTouch = true;
            $("#helpText").html('Multi-Device Mode<br/>Move your ball using<br/>touch gestures');
            $("#helpImg img").attr('src', 'img/touchMotion.png');
            $("#helpWindow").fadeIn('fast');
        } else if(!helpArrows) {
            game_pauseGame();
            helpArrows = true;
            $("#helpText").html('Mono-Device Mode<br/>Move your ball using<br/>arrow keys');
            $("#helpImg img").attr('src', 'img/arrowKeysMotion.png');
            $("#helpWindow").fadeIn('fast');
        }
    }
}

function game_pauseGame() {
    gamePaused = true;
}

function game_playGame() {
    gamePaused = false;
}

function game_setGameId(vcId) {
    $("#mazeId").html(vcId);
}

function game_clearGameId() {
    $("#mazeId").html("");
}

function game_setGameMode(gameMode) {
    if (gameMode == "monoDevice") {
        game_clearGameId();
        if (gamePlayers) {
            $.each(gamePlayers, function(index, playerObj) {
                if (playerObj && playerObj != -1) {
                    if ($("#player" + playerObj.playerId).length && !$("#player" + playerObj.playerId).hasClass("monoDevicePlayer")) {
                        $("#player" + playerObj.playerId).remove();
                        gamePlayers[index] = -1;
                    } else {
                        gamePlayers[index].playerId = 0;
                    }
                }
            });
        }

        $(".monoDevicePlayer").attr("id", "player0");

        multiDevice = false;

        game_addPlayerToGame(0, true);

        $(document).off("keydown");
        $(document).on("keydown", function(e) {
            e.client = {};
            e.client.id = 0;
            switch (e.which) {
                case 37:
                    game_moveLeft(e);
                    break;
                case 38:
                    game_moveUp(e);
                    break;
                case 39:
                    game_moveRight(e);
                    break;
                case 40:
                    game_moveDown(e);
                    break;
            }
        });
    } else if (gameMode == "multiDevice") {
        multiDevice = true;
        $(document).off("keydown");
    }
    game_showHelp();
}

function game_shakeBall(event) {
    $("#player" + event.client.id).effect("shake", {"direction": "left", "times": event.eventData.numShakes, "distance": 5}, 300);
}

function game_payerCanMoveThisWay(playerObj, direction) {
    var playerLeft = playerObj.offset().left;
    var playerTop = playerObj.offset().top;
    var fix = $(document).scrollTop() > 0 ? $(document).scrollTop() - 25 : 0;
    var cell = $(document.elementFromPoint(playerLeft, playerTop - fix));
    switch (direction) {
        case "up":
            var upCell = $(cell.parent().prev().find(".cell")[cell.parent().find(".cell").index(cell)]);
            if (cell.hasClass("top") || upCell.hasClass("bottom") || cell.parent().prev().attr("id") == "start") {
                return false;
            }
            return true;
            break;
        case "right":
            if (cell.hasClass("right")) {
                return false;
            }
            return true;
            break;
        case "down":
            if (cell.hasClass("bottom")) {
                return false;
            }
            return true;
            break;
        case "left":
            var leftCell = cell.prev(".cell");
            if (cell.hasClass("left") || leftCell.hasClass("right")) {
                return false;
            }
            return true;
            break;
        default:
            break;
    }
}

function game_playerWins(playerObj, playerId) {
    var playerLeft = playerObj.offset().left;
    var playerTop = playerObj.offset().top;
    var fix = $(document).scrollTop() > 0 ? $(document).scrollTop() - 25 : 0;
    var cell = $(document.elementFromPoint(playerLeft, playerTop - fix));
    if (cell.attr("id") == "finish") {
        var playerColor = "";
        $.each(gamePlayers, function(index, currPlayerObj) {
            if (currPlayerObj && currPlayerObj != -1) {
                gamePlayers[index].playerPosition = {"top": 10, "left": 10};
                $("#player" + currPlayerObj.playerId).css(gamePlayers[index].playerPosition);
                if (gamePlayers[index].playerId == playerId) {
                    playerColor = gamePlayers[index].playerColor;
                    $("#winText").html('Player ' + playerColor.color + ' wins!');
                    $.each(gamePlayers[index].playerColorCss, function(index, property) {
                        $("#ball").css(property);
                    });
                    $("#winWindow").fadeIn('fast');
                    game_pauseGame();
                }
            }
        });
        if (multiDevice)
            game_setGameState();
    }
}

function game_closeWinWindow() {
    $("#winWindow:not(:hidden)").fadeOut('fast');
    game_playGame();
}

function game_closeWinWindowListener() {
    $(document).off("click touchstart", "#winWindow");
    $(document).on("click touchstart", "#winWindow", function() {
        game_closeWinWindow();
        var closeWinWindow = {
            "type": "closeWinWindow",
            "eventData": {}
        };
        if(mdRwd) mdRwd.triggerVcEvent(closeWinWindow);
    });
}

function game_closeHelpWindow() {
    $("#helpWindow:not(:hidden)").fadeOut('fast');
    game_playGame();
}

function game_closeHelpWindowListener() {
    $(document).off("click touchstart", "#helpWindow");
    $(document).on("click touchstart", "#helpWindow", function() {
        game_closeHelpWindow();
        var closeHelpWindow = {
            "type": "closeHelpWindow",
            "eventData": {}
        };
        if(mdRwd) mdRwd.triggerVcEvent(closeHelpWindow);
    });
}

function game_moveUp(event) {
    if (game_payerCanMoveThisWay($("#player" + event.client.id), "up") && !gamePaused) {
        $("#player" + event.client.id).css({
            "top": "-=50"
        }).promise().done(function() {
            game_setPlayerPosition(event.client.id);
            game_playerWins($("#player" + event.client.id), event.client.id);
        });
    }
    if (multiDevice)
        game_setGameState();
}

function game_moveRight(event) {
    if (game_payerCanMoveThisWay($("#player" + event.client.id), "right") && !gamePaused) {
        $("#player" + event.client.id).css({
            "left": "+=50"
        }).promise().done(function() {
            game_setPlayerPosition(event.client.id);
            game_playerWins($("#player" + event.client.id), event.client.id);
        });
        if (multiDevice)
            game_setGameState();
    }
}

function game_moveDown(event) {
    if (game_payerCanMoveThisWay($("#player" + event.client.id), "down") && !gamePaused) {
        $("#player" + event.client.id).css({
            "top": "+=50"
        }).promise().done(function() {
            game_setPlayerPosition(event.client.id);
            game_playerWins($("#player" + event.client.id), event.client.id);
        });
        if (multiDevice)
            game_setGameState();
    }
}

function game_moveLeft(event) {
    if (game_payerCanMoveThisWay($("#player" + event.client.id), "left") && !gamePaused) {
        $("#player" + event.client.id).css({
            "left": "-=50"
        }).promise().done(function() {
            game_setPlayerPosition(event.client.id);
            game_playerWins($("#player" + event.client.id), event.client.id);
        });
        if (multiDevice)
            game_setGameState();
    }
}

function game_destroyGame() {
    game_clearGame();
    game_initGame();
}

function game_getGameState() {
    game_clearGame();
    if(mdRwd){
        gamePlayers = mdRwd.getVcCompState("maze").gamePlayers;
        helpArrows = mdRwd.getVcCompState("maze").helpArrows;
        helpTouch = mdRwd.getVcCompState("maze").helpTouch;
        if (gamePlayers) {
            $.each(gamePlayers, function(index, playerObj) {
                if (playerObj && playerObj != -1) {
                    game_addPlayerToGame(playerObj.playerId, false);
                }
            });
        }
    }
}

function game_clearGame() {
    if (gamePlayers) {
        $.each(gamePlayers, function(index, playerObj) {
            if (playerObj && playerObj != -1) {
                if ($("#player" + playerObj.playerId).length) {
                    $("#player" + playerObj.playerId).remove();
                }
            }
        });
    }
}

function game_setPlayerPosition(playerId) {
    $.each(gamePlayers, function(index, playerObj) {
        if (playerId == playerObj.playerId) {
            playerObj.playerPosition = $("#player" + playerId).position();
            return false;
        }
    });
}

function game_setGameState() {
    if(mdRwd) mdRwd.setVcCompState("maze", {"helpArrows": helpArrows, "helpTouch": helpTouch, "gamePlayers": gamePlayers}, true);
}

function game_removePlayerFromGame(playerId) {
    if ($("#player" + playerId).length) {
        if (!$("#player" + playerId).hasClass("monoDevicePlayer")) {
            $("#player" + playerId).remove();
            $.each(gamePlayers, function(index, playerObj) {
                if (playerId == playerObj.playerId) {
                    gamePlayers[index] = -1;
                    if (multiDevice)
                        game_setGameState();
                    numPlayersInGame--;
                    return false;
                }
            });
        } else {
            $("#player" + playerId).attr("id", "player0");
            $.each(gamePlayers, function(index, playerObj) {
                if (playerId == playerObj.playerId) {
                    gamePlayers[index].playerId = 0;
                    if (multiDevice)
                        game_setGameState();
                    return false;
                }
            });
        }
    }
}

function game_addPlayerToGame(playerId, newPlayer) {
    if (!$("#player" + playerId).length) {
        if ($("#player0").length) {
            $("#player0").attr("id", "player" + playerId);
            $.each(gamePlayers, function(index, playerObj) {
                if (playerObj.playerId == "0") {
                    gamePlayers[index].playerId = playerId;
                }
            });
            if (multiDevice)
                game_setGameState();
        } else {
            $("#mazeStructure").append('<div id="player' + playerId + '" class="player"></div>');
            $.each(gamePlayers, function(index, playerObj) {
                if (newPlayer) {
                    if (playerObj == -1) {
                        gamePlayers[index] = {};
                        gamePlayers[index].playerId = playerId;
                        gamePlayers[index].playerColor = playersColors[index];
                        gamePlayers[index].playerColorCss = [
                            {"background": playersColors[index].hex}
                        ];
                        gamePlayers[index].playerPosition = {"top": 10, "left": 10};
                        $("#player" + playerId).css(gamePlayers[index].playerPosition);
                        $.each(gamePlayers[index].playerColorCss, function(index, property) {
                            $("#player" + playerId).css(property);
                        });
                        if (!$("#player0").hasClass("monoDevicePlayer")) {
                            $("#player0").addClass("monoDevicePlayer");
                        }
                        if (multiDevice)
                            game_setGameState();
                        return false;
                    }
                } else {
                    if (playerId == playerObj.playerId) {
                        $("#player" + playerId).css(playerObj.playerPosition);
                        $.each(gamePlayers[index].playerColorCss, function(index, property) {
                            $("#player" + playerId).css(property);
                        });
                        if (!$("#player0").hasClass("monoDevicePlayer")) {
                            $("#player0").addClass("monoDevicePlayer");
                        }
                        return false;
                    }
                }
            });
            numPlayersInGame++;
        }
    }
}
