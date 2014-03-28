var url = require('url');
var util = require('util');
var _ = require('underscore');
var gravatar = require('gravatar');
var redis = require('redis');

var etc = require('../helpers/etc');
var AirForm = require('../helpers/air-form');


exports.get = function (req, res) {
    var af = new AirForm(req);
    // The max of 200 is arbitrary as of now
    var link = af.xvalidate('link', 'params', {size: [1, 200]});

    if (af.nullExists([link])) {
        return res.send(404, etc.msg['404']);
    }
    etc.startMongoDB('Articles', function (err, Articles, db) {
            if (err) {
                db.close();
                return res.send(500, etc.msg.server_problem);
            }
            Articles.findOne({_id: link, published: true}, function (err, article) {
                db.close();
                if (err) return res.send(500, etc.msg.server_problem);
                if (!article) return res.send(404, etc.msg['404']);
                article.str_categories = article.categories.toString();
                return res.render('article.jade', {article: article});
            })
        }
    );
};

exports.loadComments = function (req, res) {
    var af = new AirForm(req);
    // The max of 200 is arbitrary as of now
    var link = af.xvalidate('link', 'params', {size: [1, 200]});

    if (!af.isValid()) {
        return res.send(404, etc.json.empty);
    }

    etc.startMongoDB('Articles', function (err, Articles, db) {
        Articles.findOne({_id: link, published: true}, function (err, result) {
            if (err) return res.json(etc.json.server_problem);
            if (!result) return res.json(etc.json.fishy);

            db.collection('ArticleComments', function (err, ArticleComments) {
                ArticleComments.findOne({_id: link}, {email: 0}, function (err, comments_dict) {
                    if (err) return res.json(404, etc.json.empty);
                    return res.json(comments_dict);
                })
            })
        });
    });
};


/* The comment can either be a reply to an existing
 comment, or a new comment independently, if the
 former is the case then the comment id will be
 available as an integer.
 */
exports.comment = function (req, res) {

    var af = new AirForm(req);
    // The max of 200 is arbitrary as of now
    var link = af.xvalidate('link', 'params', {size: [1, 200]});

    var name = af.xvalidate('name', 'body', {size: [1, 100]});
    var email = af.xvalidate('email', 'body', {size: [1, 255], 'has to be': ['email']   });
    var website = af.xvalidate('website', 'body', {size: [1, 100], optional: true});
    var content = af.xvalidate('content', 'body', {size: [1, 2000]});
    var parent_comment_id = af.xvalidate('parent_comment_id', 'body', {'type': 'number', optional: true});


    if (!af.isValid()) {
        return res.json(etc.json.fishy);
    }
    email = email.toLowerCase();

    // Read the docstring above
    var reply_comment = isReplyComment(parent_comment_id);

    etc.startMongoDB('ArticleComments', function (err, ArticleComments, db) {
        ArticleComments.findOne({_id: link}, function (err, result) {

            if (err)
                return res.send(500);
            if (!result)
                return res.send(403);

            var comments = result.comments;


            if (reply_comment && !etc.listHasCommentID(comments, parent_comment_id))
                return res.send(403);

            var comment_id = generateCommentID(comments, parent_comment_id);
            var common_comment_dict = {comment_id: comment_id, name: name,
                email: email, website: website, content: content, img: gravatar.url(email, {s: 70}),
                created: etc.currentTimestamp(), verified: false};

            if (_.contains(['relfor@outlook.com', 'me@relfor.co'], email)) {
                common_comment_dict.relfor = true;
                common_comment_dict.name = 'Relfor';
            }

            if (reply_comment) {
                comments[comments.indexOf(etc.listHasCommentID(comments, parent_comment_id))].replies.push(common_comment_dict);
            } else {
                common_comment_dict.replies = [];
                comments.push(common_comment_dict);
            }
            ArticleComments.update({'_id': link}, {comments: comments}, {w: 1}, function (err) {
                if (err) return res.send(500);

                delete common_comment_dict.content;
                delete common_comment_dict.email;
                delete common_comment_dict.name;
                delete common_comment_dict.website;
                delete common_comment_dict.created;
                delete common_comment_dict.parent_comment_id;

                var generated_token = etc.generateGUID();
                var redis_con = redis.createClient();

                redis_con.setex(etc.redisKeyComment(link, comment_id, parent_comment_id), 7200,
                    generated_token);
                redis_con.quit();

                var verification_link_url = url.format({protocol: 'http',
                    hostname: 'relfor.co', pathname: '/verify/comment',
                    query: {token: generated_token, link: link, comment_id: comment_id, parent_comment_id: parent_comment_id}
                });

                var email_body = util.format(
                    'To verify your comment:<br>' +
                        "'%s'<br><br>" +
                        'Click this link: <a href="%s">%s</a><br><br>'+
                        'The above link will only last for 2 hours.<br><br>' +
                        'Thanks for commenting!<br>' +
                        '-Relfor',
                    content, verification_link_url, verification_link_url
                );
                etc.email(email, 'Comment Confirmation',email_body);

                return res.json(common_comment_dict);
            })
        });
    });

};


function isReplyComment(parent_comment_id) {
    return parent_comment_id !== "";
}

function generateCommentID(comments, parent_comment_id) {

    var reply_comment = isReplyComment(parent_comment_id);
    if (reply_comment) {
        return maxCommentID(etc.listHasCommentID(comments, parent_comment_id)) + 1;
    } else {
        return maxCommentID(comments) + 1;
    }

}


/*
 Precondition: The lowest possible comment_id is 1
 */
function maxCommentID(list) {

    var max = 0;
    for (var i in list) {
        if (list[i].comment_id > max) {
            max = list[i].comment_id;
        }
    }
    return max;
}


