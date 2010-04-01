include('ringo/webapp/response');

exports.index = function index(req) {
    return skinResponse('skins/chat.html', {});
};

