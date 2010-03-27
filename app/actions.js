include('ringo/webapp/response');

module.shared = true;

var Bayeux = org.cometd.Bayeux;
var client;
var channel;
var listener = new org.cometd.MessageListener.Asynchronous({
    deliver: function(from, to, message) {
        print("got message: " + message);
    }
});

exports.index = function index(req) {
    var sreq = req.env["jsgi.servlet_request"];
    var cx = sreq.getServletContext().getContext("/cometd/");
    var bayeux = cx.getAttribute(Bayeux.ATTRIBUTE);
    if (bayeux && !client) {
        print("initializing client");
        client = bayeux.newClient("chat");
        client.addListener(listener);
    }
    if (bayeux && !channel) {
        print("subscribing to channel");
        channel = bayeux.getChannel("/chat/**", true);
        channel.subscribe(client);
    }
    print("subscribers: " + channel.getSubscriberCount());
    return skinResponse('skins/chat.html', {});
};

