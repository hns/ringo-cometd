
var {JavaEventAdapter} = require("ringo/cometd/event-adapter");
var {Session} = require("ringo/webapp/request");

export("BayeuxService",
       "addListener",
       "newClient",
       "createChannel",
       "hasChannel",
       "getChannels",
       "publish",
       "subscribe",
       "send",
       "getBayeux",
       "getCurrentSession",
       "serverStarted",
       "serverStopped");

var bayeux;

function BayeuxService(name) {
    if (!bayeux) {
        throw new Error("Bayeux service not available");
    }
    var client = bayeux.newClient(name);
    var callbacks = {};

    addListener("message", function(fromClient, toClient, message) {
        var callback = callbacks[message.channel];
        if (callback) {
            callback(fromClient, message.data, message.channel, message.id);
        }
    }, client);

    this.subscribe = function(channel, callback) {
        callbacks[channel] = callback;
        var chan = bayeux.getChannel(channel, true);
        chan.subscribe(client);
    };

    this.getId = function() {
        return client.getId();
    };
}

function newClient(name) {
    return bayeux.newClient(name).getId();
}

function createChannel(name) {
    bayeux.getChannel(name, true);
}

function hasChannel(name) {
    return bayeux.hasChannel(name);
}

function getChannels() {
    return bayeux.getChannels().toArray().map(function(chan) {
        return chan.getId();
    });
}

function getCurrentSession() {
    var req = bayeux.getCurrentRequest();
    return req ? new Session(req) : null;
}

function publish(channelId, clientId, data, messageId) {
    var channel = bayeux.getChannel(channelId, true);
    var client = clientId ? bayeux.getClient(clientId) : null;
    channel.publish(client, data, messageId);
}

function subscribe(channelId, clientId) {
    var channel = bayeux.getChannel(channelId, true);
    var client = bayeux.getClient(clientId);
    channel.subscribe(client)
}


function send(senderId, receiverId, channelId, data, id) {
    var channel = channelId ? bayeux.getChannel(channelId, true) : null;
    var receiver = bayeux.getClient(receiverId);
    var sender = senderId ? bayeux.getClient(senderId) : null;
    receiver.deliver(sender, channel, data, id);
}

var ClientBayeuxListener = org.cometd.ClientBayeuxListener;
var ChannelBayeuxListener = org.cometd.ChannelBayeuxListener;
var SubscriptionListener = org.cometd.SubscriptionListener;
var MessageListener = org.cometd.MessageListener.Synchronous;
var RemoveListener = org.cometd.RemoveListener;

var adapter = new JavaEventAdapter();
adapter.addArgumentConverter(org.cometd.Channel, function(c) c.getId());
adapter.addArgumentConverter(org.cometd.Client, function(c) c.getId());
adapter.addArgumentConverter(org.cometd.Message, function(msg) {
    return {
        data: wrapData(msg.getData()),
        channel: msg.getChannel(),
        clientId: msg.getClientId(),
        id : msg.getId(),
        getExt: function(create) wrapData(msg.getExt(create)),
        unwrap: function() msg
    };
});

function addListener(event, callback, extra) {
    if (event == "channelAdded" || event == "channelRemoved") {
        adapter.addListener(bayeux, callback, ChannelBayeuxListener, event);
    } else if (event == "clientAdded" || event == "clientRemoved") {
        adapter.addListener(bayeux, callback, ClientBayeuxListener, event);
    } else if (event == "subscribed" || event == "unsubscribed") {
        var channel = bayeux.getChannel(extra, true) || missingArgument("channel");
        adapter.addListener(channel, callback, SubscriptionListener, event);
    } else if (event == "message") {
        var client = bayeux.getClient(extra) || missingArgument("client");
        adapter.addListener(client, callback, MessageListener, "deliver");
    } else if (event == "removed") {
        client = bayeux.getClient(extra) || missingArgument("client");
        adapter.addListener(client, callback, RemoveListener, event);
    } else {
        throw new Error("unsupported event: " + event);
    }
}

function getBayeux() {
    return bayeux;
}

function serverStarted(server) {
    var servlet = new org.cometd.server.continuation.ContinuationCometdServlet();
    // TODO make things configurable
    server.getDefaultContext().addServlet("/cometd/*", servlet);
    bayeux = servlet.getBayeux();
    if (!bayeux) {
        throw new Error("Could not create Bayeux service");
    }
    // make the current request available from the bayuex object
    // required for getting the HTTP session
    bayeux.setRequestAvailable(true);
}

function serverStopped(server) {
    bayeux = null;
}

function wrapData(obj) {
    if (obj instanceof java.util.Map) {
        return new ScriptableMap(obj);
    } else if (obj instanceof java.util.List) {
        return new ScriptableList(obj);
    } else {
        return obj;
    }
}

function missingArgument(name) {
    throw new Error("Event requires a '" + name + "' argument");
}
