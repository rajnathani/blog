var express = require('express');
var http = require('http');
var path = require('path');

var secret = require('./helpers/secret');
var app = express();


app.set('port', parseInt(process.argv.splice(2)[0]));
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.enable('trust proxy');


app.use(express.logger('dev'));
app.use(express.limit('20mb'));
app.use(express.bodyParser({uploadDir:'/tmp'}));
app.use(express.methodOverride());
app.use(express.cookieParser(secret.cookieHash));
app.use(app.router);
//app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

function add_route(route, verb, action) {


    //var final_action = etc.blockProtector(action);
    var final_action = action;
    if (route.match(/^\/control-panel/)){

        final_action = function(req,res){
            if (!session_key || req.signedCookies.relfor !== session_key) {

                return res.redirect('/login');
            } else {

                return action(req,res);
            }
        }
    }

    switch (verb.toLowerCase()) {
        case 'get':
            app.get(route, final_action);
            break;
        case 'post':
            app.post(route, final_action);
            break;
        case 'delete':
            app.delete(route, final_action);
            break;
        case 'patch':
            app.patch(route, final_action);
            break;
    }
}


session_key=undefined;

var home = require('./routes/home');
var article = require('./routes/article');
var login = require('./routes/login');
var control_panel = require('./routes/control-panel');




add_route('/'                                       ,  'GET'   ,  home.get);
add_route('/_'                                      ,  'GET'   ,  home.infiniteScroll);

add_route('/article/:link'                          ,  'GET'   ,  article.get);
add_route('/article/:link/_comments'                ,  'GET'   ,  article.loadComments);
add_route('/article/:link/_comments'                ,  'POST'  ,  article.comment);

add_route('/login'                                  ,  'GET'  ,  login.get);
add_route('/login'                                  ,  'POST'  ,  login.post);
add_route('/control-panel'                          ,  'GET'   ,  control_panel.get);

add_route('/control-panel/articles'                 ,  'GET'   ,  control_panel.articles);
    add_route('/control-panel/article/create'           ,  'GET'   ,  control_panel.article_editor.new);
    add_route('/control-panel/_articles'                ,  'POST'  ,  control_panel.article_editor.post);
    add_route('/control-panel/article/:link/edit'       ,  'GET'   ,  control_panel.article_editor.existing);
    add_route('/control-panel/_article/:link'           ,  'PATCH' ,  control_panel.article_editor.save);
    add_route('/control-panel/_article/:link/publish'   ,  'PATCH' ,  control_panel.article.changePublishStatus);
    add_route('/control-panel/_article/:link/unpublish' ,  'PATCH' ,  control_panel.article.changePublishStatus);
    add_route('/control-panel/_article/:link'           ,  'DELETE',  control_panel.article.delete);


add_route('/control-panel/categories'               ,  'GET'   ,  control_panel.categories);
    add_route('/control-panel/_categories'              ,  'POST'  ,  control_panel.category.post);
    add_route('/control-panel/_category/:name'          ,  'DELETE',  control_panel.category.delete);

add_route('/control-panel/pictures'                 ,  'GET'   ,  control_panel.pictures);
    add_route('/control-panel/pictures/_upload'         ,  'POST'  , control_panel.picture.upload);

add_route('/logout'                                 ,  'GET'   , function(req,res){res.clearCookie('relfor', {}); res.redirect('/')});

http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));

});