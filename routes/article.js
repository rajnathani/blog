var etc = require('../helpers/etc');
var gravatar = require('gravatar');
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
    var parent_comment_id = af.xvalidate('parent_comment_id', 'body', {'has to be': ['int'], optional: true});


    if (!af.isValid()) {
        console.log('noval');
        return res.json(etc.json.fishy);
    }

    // Read the docstring above
    var reply_comment = isReplyComment(parent_comment_id);

    etc.startMongoDB('ArticleComments', function (err, ArticleComments, db) {
        ArticleComments.findOne({_id: link}, function (err, result) {
            if (err)
                return res.json(etc.json.server_problem);
            if (!result)
                return res.json(etc.json.fishy);

            var comments = result.comments;


            if (reply_comment && !listHasCommentID(comments, parent_comment_id))
                return res.json(etc.json.fishy);

            var comment_id = generateCommentID(comments, parent_comment_id);
            var common_comment_dict = {comment_id: comment_id, name: name,
                email: email, website: website, content: content, img: gravatar.url(email, {s: 70}),
                created: etc.currentTimestamp()};
            if (reply_comment) {
                comments[comments.indexOf(listHasCommentID(comments, parent_comment_id))].replies.push(common_comment_dict);
            } else {
                common_comment_dict.replies = [];
                comments.push(common_comment_dict);
            }
            ArticleComments.update({'_id': link}, {comments: comments}, {w: 1}, function (err) {
                if (err)
                    return res.json(500, {});

                delete common_comment_dict.content;
                delete common_comment_dict.email;
                delete common_comment_dict.name;
                delete common_comment_dict.website;
                delete common_comment_dict.created;
                delete common_comment_dict.parent_comment_id;

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
        return maxCommentID(listHasCommentID(comments, parent_comment_id)) + 1;
    } else {
        return maxCommentID(comments) + 1;
    }

}

function listHasCommentID(list, comment_id) {
    for (var i = 0; i < list.length; i++) {
        if (list[i].comment_id === comment_id) {
            return list[i];
        }
    }
    return false;
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


