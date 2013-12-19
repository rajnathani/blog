var express = require('express');
var http = require('http');
var path = require('path');
var redis = require('redis');

var secret = require('./helpers/secret');
var app = express();


app.set('port', parseInt(process.argv[2]));
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.enable('trust proxy');


app.use(express.logger('dev'));
app.use(express.limit('20mb'));
app.use(express.bodyParser({uploadDir: '/tmp'}));
app.use(express.methodOverride());
app.use(express.cookieParser(secret.cookieHash));
app.use(app.router);
//app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}


redisKey = function (db, key) {
  return "blog:" + db + (key ? (":" + key) : "");
};

function increaseActivity(ip, amount, redis_con) {
  redis_con.get(redisKey("activity", ip), function (err, resp) {
    if (!err) {
      if (resp) {
        redis_con.incrby(redisKey("activity", ip), amount);
        if (parseInt(resp) + amount > 400) {
          redis_con.setex(redisKey("blocked", ip), 120, true)
        }
      } else {
        redis_con.setex(redisKey("activity", ip), 60, amount);
      }
    }
    redis_con.quit();

  });
}


function blockProtector(req, res, cb) {
  var redis_con = redis.createClient();
  redis_con.get(redisKey('blocked', req.ips[0]), function (err, result) {
    if (err) {
      redis_con.end();
      return res.send(500);
    }

    if (result) {
      redis_con.end();
      return res.send("Baah! Too many requests! Wait a few seconds!", 429);
    } else {
      return cb(redis_con);
    }
  });
}

function add_route(route, verb, action, activity_level) {


  // the activity level of the route requested by the user,
  // default value is 1.
  activity_level = activity_level ? activity_level : 1;

  var final_action = action;
  if (route.match(/^\/control-panel/)) {
    final_action = function (req, res) {
      return blockProtector(req, res, function (redis_con) {
        if (!session_key || req.signedCookies.relfor !== session_key) {
          increaseActivity(req.ips[0], 10, redis_con);
          return res.redirect('/login');
        } else {
          increaseActivity(req.ips[0], activity_level, redis_con);
          return action(req, res, redis_con);
        }
      });

    }
  } else {
    final_action = function (req, res) {
      return blockProtector(req, res, function (redis_con) {
        increaseActivity(req.ips[0], activity_level, redis_con);
        return action(req, res);
      });
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


session_key = undefined;
live = !__dirname.match(/Users/);


var home = require('./routes/home');
var article = require('./routes/article');
var verify = require('./routes/verify');
var category = require('./routes/category');
var search = require('./routes/search');
var login = require('./routes/login');
var control_panel = require('./routes/control-panel');

add_route('/', 'GET', home.get);
add_route('/_', 'GET', home.infiniteScroll);

add_route('/article/:link', 'GET', article.get, 4);
add_route('/article/:link/_comments', 'GET', article.loadComments, 4);
add_route('/article/:link/_comments', 'POST', article.comment, 50);

add_route('/verify/comment', 'GET', verify.comment, 20);

add_route('/_search', 'GET', search.searchSuggestion);
add_route('/search', 'GET', search.get);

add_route('/category/:name', 'GET', category.get, 3);

add_route('/login', 'GET', login.get, 10);
add_route('/login', 'POST', login.post, 20);
add_route('/control-panel', 'GET', control_panel.get);

add_route('/control-panel/articles', 'GET', control_panel.articles);
add_route('/control-panel/article/create', 'GET', control_panel.article_editor.new);
add_route('/control-panel/_articles', 'POST', control_panel.article_editor.post);
add_route('/control-panel/article/:link/edit', 'GET', control_panel.article_editor.existing);
add_route('/control-panel/_article/:link', 'PATCH', control_panel.article_editor.save);
add_route('/control-panel/_article/:link/publish', 'PATCH', control_panel.article.changePublishStatus);
add_route('/control-panel/_article/:link/unpublish', 'PATCH', control_panel.article.changePublishStatus);
add_route('/control-panel/_article/:link', 'DELETE', control_panel.article.delete);


add_route('/control-panel/categories', 'GET', control_panel.categories);
add_route('/control-panel/_categories', 'POST', control_panel.category.post);
add_route('/control-panel/_category/:name', 'DELETE', control_panel.category.delete);

add_route('/control-panel/pictures', 'GET', control_panel.pictures);
add_route('/control-panel/pictures/_upload', 'POST', control_panel.picture.upload);

add_route('/logout', 'GET', function (req, res) {
  res.clearCookie('relfor', {});
  res.redirect('/')
});

http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));

});