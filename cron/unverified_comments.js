var etc = require('../helpers/etc');

// We will cache the current timestamp so as to
// save the stack which would otherwise call it
// repeatedly for every verification check.

var current_timestamp = etc.currentTimestamp();

etc.startMongoDB('ArticleComments', function (err, ArticleComments, db) {
    if (err) {
        if (db) db.close();
        return;
    }
    ArticleComments.find({}).toArray(function(err,articles){
        if (err) return db.close();
        var article;
        var total_articles = articles.length;
        var articles_checked = 0;
        for (var i=0; i < articles.length; i++){
            article = articles[i];
            deleteUnverifiedComments(article.comments);
            ArticleComments.save(article, function(err){
                articles_checked++;
                if (articles_checked === total_articles) {
                    db.close();
                }
            })

        }
    })

});

function deleteUnverifiedComments(comments){
    var cur_comment, replies;
    for (var i=0; i < comments.length; i++){
        cur_comment = comments[i];
        if (unverifiedComment(cur_comment)) {
            comments.splice(i,1);
            i--;
        } else {
            replies = cur_comment.replies;
            for (var j=0; j < replies.length; j++ ){
                if (unverifiedComment(replies[j])){
                    replies.splice(j,1);
                }
            }
        }
    }
}

function unverifiedComment(comment){
    return (!comment.verified && (current_timestamp - comment.created) > 7200);
}