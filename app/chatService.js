var {getBayeux, BayeuxService} = require("ringo/cometd");

export("serverStarted");

module.shared = true;

var bayeux;
var service;
var rooms = {};

function handleMembership(client, data) {
    var members = rooms[data.room];
    if (!members) {
        members = rooms[data.room] = {};
    }
    members[data.user] = client.getId();
    client.addListener("removed", function(id) {
        for (var i in members) {
            if (members[i] == id) delete members[i];
        }
        broadcastMembers(members);
    });
    broadcastMembers(members);
}

function broadcastMembers(members) {
    var channel = bayeux.getChannel("/chat/members");
    if (channel) {
        channel.publish(service.getClient(), Object.keys(members), null);
    }
}

function privateChat(client, data) {
    var members = rooms[data.room];
    var peers = data.peer.split(",").map(function(name) {
        return bayeux.getClient(members[name]);
    });
    var message = {
        chat: data.chat,
        user: data.user,
        scope: "private"
    };
    peers.forEach(function(peer) {
        if (peer) {
            peer.deliver(client, data.room, message)
        }
    })
}

function serverStarted(server) {
    bayeux = getBayeux();
    service = new BayeuxService("chat");
    service.subscribe("/service/members", handleMembership);
    service.subscribe("/service/privatechat", privateChat);
    /* getBayeux().addListener("channelAdded", function(c) {
        print(" *********** CHANNEL ADDED: " + c);
    }); */
}
