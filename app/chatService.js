var {addListener, publish, send, BayeuxService} = require("ringo/cometd");

export("serverStarted");

module.shared = true;

var service;
var rooms = {};

function handleMembership(clientId, data) {
    var members = rooms[data.room];
    if (!members) {
        members = rooms[data.room] = {};
    }
    members[data.user] = clientId;
    function broadcastMembers() {
        publish("/chat/members", service.getId(), Object.keys(members));
    }
    addListener("removed", function(id) {
        for (var i in members) {
            if (members[i] == id) delete members[i];
        }
        broadcastMembers();
    }, clientId);
    broadcastMembers();
}

function privateChat(clientId, data) {
    var members = rooms[data.room];
    var peers = data.peer.split(",").map(function(name) {
        return members[name];
    });
    var message = {
        chat: data.chat,
        user: data.user,
        scope: "private"
    };
    peers.forEach(function(peer) {
        if (peer) {
            send(clientId, peer, data.room, message)
        }
    });
    send(clientId, clientId, data.room, message);
}

function serverStarted(server) {
    service = new BayeuxService("chat");
    service.subscribe("/service/members", handleMembership);
    service.subscribe("/service/privatechat", privateChat);
    /* addListener("channelAdded", function(c) {
        print(" *********** CHANNEL ADDED: " + c);
    }); */
}
