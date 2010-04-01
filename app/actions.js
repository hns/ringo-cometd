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
    return skinResponse('skins/chat.html', {});
};

