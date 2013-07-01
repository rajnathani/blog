var util = require('util');
var _ = require('underscore');

var secret = require('../helpers/secret');

function inSandbox() {
    return (__dirname.indexOf('Users') !== -1);
}

exports.startMongoDB = function (collection_name, callback) {
    var Db = require('mongodb').Db;
    var Server = require('mongodb').Server;


    var db = new Db('blog', new Server('127.0.0.1', 27017, { auto_reconnect: true}), {safe:true});
    db.open(function () {
        if (collection_name.substring) {
            db.collection(collection_name, function (err, collection) {
                callback(err, collection, db)
            });
        } else {
            callback(db);
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


exports.cookieJar = function (res, email) {
    res.cookie('cookie-jar', email, { maxAge: 172800000, httpOnly: false, signed: true});
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