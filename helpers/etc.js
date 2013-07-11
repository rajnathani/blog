var util = require('util');
var _ = require('underscore');
var mongodb = require('mongodb');
var AmazonSES = require('amazon-ses');


var secret = require('../helpers/secret');

function inSandbox() {
    return (__dirname.indexOf('Users') !== -1);
}

exports.startMongoDB = function (collection_name, callback) {
    var Db = mongodb.Db;
    var Server = mongodb.Server;

    var db = new Db('blog', new Server('127.0.0.1', 27017, { auto_reconnect: true}), {safe:true});
    db.open(function (err) {
        if (err){return callback(err,null)}
        if (collection_name.substring) {
            db.collection(collection_name, function (err, collection) {
                callback(err, collection, db)
            });
        } else {
            callback(null,db);
        }

    });
};


exports.msg = {

    server_problem: 'The server failed. Sorry, try again sometime later.',
    fishy: 'Something went wrong!',
    404: 'Not Found',
    did_not_request_email: 'If you did not request this for your email address then please ignore this email or reply back with a complaint.',
    empty: "."

};

exports.json = {
        server_problem: {'error': exports.msg.server_problem},
        fishy: {'error': exports.msg.fishy},
        empty: {'empty': exports.msg.empty}
    };


/**
 * Generate a random decimal number within the
 * range 0 till 'range' (excluding 'range').
 * If 'range' isn't supplied, the range will
 * default to 10.
 * @param range (the range of digits)
 * @returns {number} random decimal digit
 */
exports.randomDecimalDigit = function (range) {
    if (range === undefined) {
        range = 10;
    }
    return Math.floor(Math.random() * range);
};

exports.generateGUID = function () {
    return Math.random().toString(36).substr(2) +
        Math.random().toString(36).substr(2);
};


exports.error = {
    duplicate: 11000
};

exports.currentTimestamp = function () {
    return parseInt(Date.now() / 1000)
};

exports.primaryKeysList = function(dict_array){
  return _.map(dict_array, function(cur){
      return cur._id;
  });
};

exports.redisKey = function(db, key){
    return "blog:" + db + (key ? (":" + key) : "");
};


exports.mongoArrayToShortDict = function (mongo_array, target) {
    var dict = {};
    var item;
    for (var i = 0; i < mongo_array.length; i++) {
        item = mongo_array[i];
        dict[item._id] = item[target];
    }

    return dict;
};


 exports.redisKeyComment = function(link, comment_id, parent_comment_id){
     return redisKey('verify:comment:' +
         (parent_comment_id ? ('reply') : ('nonreply')) +
         ":" + link,
         (parent_comment_id ? (parent_comment_id + ":") : ('')) +
          comment_id);
 };


exports.listHasCommentID = function(list, comment_id) {
    for (var i = 0; i < list.length; i++) {

        if (list[i].comment_id === comment_id) {
            return list[i];
        }
    }
    return false;
};





exports.email = function (to, subject, body, callback, extras) {
    if (!extras) extras = {};
    var ses = new AmazonSES(secret.aws.access_key_id, secret.aws.secret_access_key);
    ses.send({
        from: 'Relfor\'s Blog <me@relfor.co>',
        to: to.substring ? [to] : to,
        subject: subject,
        replyTo: extras.reply_to ? (extras.reply_to.substring ? [extras.reply_to] : extras.reply_to) : undefined,
        body: {
            html: body
        }
    }, function (err, data) {
        if (err) {
            return console.log(err.message);
        }

        if (callback !== undefined) {
            callback();
        }
    });
};
