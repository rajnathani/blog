

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
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser(secret.cookieHash));
app.use(app.router);
//app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

function add_route(route, verb, action){


    //var final_action = etc.blockProtector(action);
    var final_action = action;

    switch(verb.toLowerCase()){
        case 'get':
                app.get(route, final_action);
            break;
        case 'post':
                app.post(route, final_action);
            break;
        case 'delete':
                app.delete(route,final_action);
            break;
        case 'patch':
                app.patch(route,final_action);
            break;
    }
}


var home = require('./routes/home');
var article = require('./routes/article');


add_route('/', 'GET', home.get);
add_route('/_', 'GET', home.infiniteScroll);

add_route('/article/:link', 'GET', article.get);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));

});