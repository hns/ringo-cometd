var {Response} = require('ringo/webapp/response');

exports.index = function index(req) {
    return Response.skin('skins/chat.html', {
        title: "CometD Chat (RingoJS version)",
        contextPath: req.rootPath.slice(1)
    });
};

