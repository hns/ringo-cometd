
var {JavaEventAdapter} = require("ringo/event-adapter");

export("serverStarted", "serverStopped", "getBayeux", "BayeuxService");

module.shared = true;

var bayeux;

function serverStarted(server) {
    var handlers = server.getJetty().getChildHandlers();
    for each (var handler in handlers) {
        if (typeof handler.getServletContext == "function") {
            var cx = handler.getServletContext();
            bayeux = cx.getAttribute(org.cometd.Bayeux.ATTRIBUTE);
            if (bayeux) {
                bayeux = new Bayeux(bayeux);
                return;
            }
        }
    }
    throw new Error("Bayeux service not found in Jetty context")
}

function getBayeux() {
    return bayeux;
}

function serverStopped(server) {
    bayeux = null;
}

function BayeuxService(name) {
    if (!bayeux) {
        throw new Error("Bayeux service not available");
    }
    var client = bayeux.newClient(name);
    var callbacks = {};

    client.addListener("message", function(fromClient, toClient, message) {
        var callback = callbacks[message.channel];
        if (callback) {
            var data = wrap(message.data);
            callback(fromClient, data, message.channel, message.id);
        }
    });

    this.subscribe = function(channel, callback) {
        var chan = bayeux.getChannel(channel, true);
        callbacks[channel] = callback;
        chan.subscribe(client);
    };

    this.getClient = function() {
        return client;
    };
}

// low level implementation

var ClientBayeuxListener = org.cometd.ClientBayeuxListener;
var ChannelBayeuxListener = org.cometd.ChannelBayeuxListener;
var SubscriptionListener = org.cometd.SubscriptionListener;
var MessageListener = org.cometd.MessageListener.Synchronous;
var RemoveListener = org.cometd.RemoveListener;

var adapter = new JavaEventAdapter();
adapter.addWrapper(org.cometd.Bayeux, Bayeux);
adapter.addWrapper(org.cometd.Channel, Channel);
adapter.addWrapper(org.cometd.Client, Client);
// adapter.addWrapper(org.cometd.Message, Message);

/**
 * @name Bayeux
 */
function Bayeux(bayeux) {

    this.addListener = function(event, callback) {
        if (event == "channelAdded" || event == "channelRemoved") {
            adapter.addListener(bayeux, callback, ChannelBayeuxListener, event);
        } else if (event == "clientAdded" || event == "clientRemoved") {
            adapter.addListener(bayeux, callback, ClientBayeuxListener, event);
        } else {
            throw new Error("unsupported event: " + event);
        }
    };

    this.getClient = function(id) {
        var c = bayeux.getClient(id);
        return c ? new Client(c) : null;
    };

    this.newClient = function(name) {
        return new Client(bayeux.newClient(name));
    };

    this.hasChannel = function(name) {
        return bayeux.hasChannel(name);
    };

    this.getChannel = function(name, create) {
        var c = bayeux.getChannel(name, Boolean(create));
        return c ? new Channel(c) : null;
    };

    this.getChannels = function() {
        return bayeux.getChannels().toArray().map(function(chan) {
            return new Channel(chan);
        });
    }
}

/**
 * @name Channel
 */
function Channel(channel) {
    this.addListener = function(event, callback) {
        if (event == "subscribed" || event == "unsubscribed") {
            adapter.addListener(channel, callback, SubscriptionListener, event);
        } else {
            throw new Error("unsupported event: " + event);
        }
    };

    this.publish = function(fromClient, data, messageId) {
        channel.publish(unwrap(fromClient), data, messageId);
    };

    this.subscribe = function(client) {
        channel.subscribe(unwrap(client))
    };

    this.unwrap = function() {
        return channel;
    };

    this.toString = function() {
        return String(channel);
    };
}

/**
 * @name Client
 */
function Client(client) {
    this.addListener = function(event, callback) {
        if (event == "message") {
            adapter.addListener(client, callback, MessageListener, "deliver");
        } else if (event == "removed") {
                adapter.addListener(client, callback, RemoveListener, event);
        } else {
            throw new Error("unsupported event: " + event);
        }
    };

    this.getId = function() {
        return client.getId();
    };

    this.deliver = function(fromClient, toChannel, data, id) {
        client.deliver(unwrap(fromClient), unwrap(toChannel), data, id);
    };

    this.toString = function() {
        return String(client);
    };

    this.unwrap = function() {
        return client;
    };
}

/* function Message(message) {
    this.toString = function() {
        return String(message);
    };
} */

function wrap(obj) {
    if (obj instanceof java.util.Map) {
        return new ScriptableMap(obj);
    } else if (obj instanceof java.util.List) {
        return new ScriptableList(obj);
    } else {
        return obj;
    }
}

function unwrap(obj) {
    return (obj && typeof obj.unwrap == "function") ?
            obj.unwrap() : obj;
}
