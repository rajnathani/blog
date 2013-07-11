var AirForm = require('../helpers/air-form');
var etc = require('../helpers/etc');

var redis = require('redis');




exports.comment = function (req, res) {
    var af = new AirForm(req);
    var link = af.xvalidate('link', 'query', {size: [1, 500]});
    var comment_id = parseInt(af.xvalidate('comment_id', 'query', {'has to be': ['number-like']}));
    var token = af.xvalidate('token', 'query', {size: [30, 36]});

    var is_reply = Boolean(req.query.parent_comment_id);
    var comment_to_fetch = comment_id;
    if (is_reply) {
        // parent comment id
        var parent_comment_id = parseInt(af.xvalidate('parent_comment_id', 'query', {'has to be': ['number-like']}));
        comment_to_fetch = parent_comment_id;
    }

    if (!af.isValid()){
        return res.send(403, etc.msg.fishy);
    }

    var redis_con = redis.createClient();
    redis_con.get(etc.redisKeyComment(link, comment_id, parent_comment_id), function (err, got_token) {
        redis_con.end();
        if (err) return res.send(500, etc.msg.server_problem);
        else if (!got_token) return res.send(200, 'Sorry, your confirmation tokens seems to have expired.');
        else if (token !== got_token) return res.send(403, 'Sorry, your verification token did not seem to match that of your comment.')

        etc.startMongoDB('ArticleComments', function (err, ArticleComments, db) {
            if (err) return res.send(500, etc.msg.server_problem);
            ArticleComments.findOne({_id:link}, function(err, article){
                if (err) {db.close();return res.send(500, etc.msg.server_problem);}
                if (!article){db.close(); return res.send(404, 'Sorry, the article you commented on doesn\'t seem to exist anymore.');}

                var fetched_comment = etc.listHasCommentID(article.comments, comment_to_fetch);
                if (!fetched_comment) {db.close();return res.send(404,'Sorry, your comment ceases to exist.');}
                if (!is_reply) {
                    fetched_comment.verified = true;
                } else {
                    var reply_comment = etc.listHasCommentID(fetched_comment.replies, comment_id);
                    if (!reply_comment) {db.close();return res.send(404,'Sorry, the comment which you replied to ceases to exist');}
                    reply_comment.verified = true;
                }
                ArticleComments.update({_id:link}, {$set:{comments:article.comments}}, function(err){
                    db.close();
                    if (err)  return res.send(500, etc.msg.server_problem)
                    return res.send(200, 'Your comment has been successfully verified! Thank you!\n' +
                    'The article can be found here: relfor.co/article/' + link);
                })

            })
        })

    });


};

