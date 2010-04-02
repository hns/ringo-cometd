include('ringo/webapp/response');

exports.index = function index(req) {
    return skinResponse('skins/chat.html', {
        title: "CometD Chat (RingoJS version)",
        contextPath: req.rootPath.slice(1)
    });
};

