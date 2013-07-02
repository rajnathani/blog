var etc = require('../helpers/etc');
var article_editor = require('../routes/article-editor');
var AirForm = require('../helpers/air-form');

var fs = require('fs');

exports.article_editor = article_editor;

exports.get = function (req, res) {
    return res.render('control-panel')
};


exports.articles = function (req, res) {
    etc.startMongoDB('Articles', function (err, Articles, db) {
        Articles.find({}, {content: 0, markdown: 0}, {sort: {created: 1}}).toArray(function (err, results) {
            if (err) res.send(etc.msg.server_problem);
            console.log(results);
            return res.render('manage-articles.jade', {articles: results});
        });
    });
};


exports.article = {
    changePublishStatus: function (req, res) {
        var publish = req.url.match(/\/publish\/?$/) ? true : false;
        var af = new AirForm(req);
        // 200 is arbitrary
        var link = af.xvalidate('link', 'params', {size: [1, 200]});

        if (!af.isValid()) return res.json(etc.json.fishy);

        etc.startMongoDB('Articles', function (err, Articles, db) {
            if (err) {
                db.close();
                return res.json(etc.json.server_problem);
            }
            Articles.update({_id: link}, {$set: {published: publish}}, function (err) {
                db.close();
                if (err) return res.json(etc.msg.server_problem);
                return res.json(etc.json.empty);
            });
        });
    },

    delete: function (req, res) {
        var af = new AirForm(req);
        var link = af.xvalidate('link', 'params', {size: [1, 200]});
        if (!link) return res.json(etc.json.fishy);

        var error_not_initiated = 'Deletion process could not be initiated';
        var error_only_comments_deleted = 'Deletion process left incomplete. Article comments deleted, remaining data still undeleted';

        etc.startMongoDB('ArticleComments', function (err, ArticleComments, db) {
            if (err) {
                db.close();
                return res.json({'error': error_not_initiated});
            }
            ArticleComments.remove({_id: link}, function (err) {
                if (err) {
                    db.close();
                    return res.json({'error': error_not_initiated});
                }
                db.collection('Articles', function (err, Articles) {
                    if (err) {
                        db.close();
                        return res.json({'error': error_only_comments_deleted});
                    }
                    Articles.remove({_id: link}, function (err) {
                        db.close();
                        if (err) return res.json({'error': error_only_comments_deleted});
                        return res.json(etc.json.empty);
                    });
                })
            })
        });

    }
};

exports.category = {
    post: function (req, res) {
        var af = new AirForm(req);
        var name = af.xvalidate('name', 'body', {size: [1, 40]});
        if (!name) return res.json(etc.json.fishy);
        etc.startMongoDB('Categories', function (err, Categories, db) {
            if (err) {
                db.close();
                return res.json(etc.json.server_problem);
            }
            Categories.insert({_id: name, articles: []}, function (err) {
                db.close();
                if (err) return res.json(etc.json.server_problem);
                return res.json({});
            });
        })

    },

    delete: function (req, res) {
        var af = new AirForm(req);
        var name = af.xvalidate('name', 'params', {size: [1, 40]});
        if (!name) return res.json(etc.json.fishy);
        etc.startMongoDB('Categories', function (err, Categories, db) {
            if (err) return res.json(etc.json.server_problem);
            Categories.remove({_id: name}, function (err) {
                if (err) return res.json(etc.json.server_problem);
                db.collection('Articles', function (err, Articles) {
                    if (err) return res.json({'etc': 'Server Problem: Deletion process incomplete, categories undeleted from articles'});
                    Articles.update({}, {$pull: {categories: name}}, {multi: true}, function (err) {
                        db.close();
                        if (err) return res.json({'etc': 'Server Problem: Deletion process incomplete, categories undeleted from articles'});
                        return res.json({});

                    });
                });
            });
        });
    }
};
exports.categories = function (req, res) {
    etc.startMongoDB('Categories', function (err, Categories, db) {
        if (err) return res.send(etc.msg.server_problem);
        Categories.find({}).toArray(function (err, categories) {
            if (err) return res.send(etc.msg.server_problem);
            return res.render('manage-categories', {categories: categories})
        })

    });
};

exports.pictures = function (req, res) {
    return res.render('manage-pictures', {pictures: []});
};

exports.picture = {
    upload: function (req, res) {
        console.log('uo');
        var type = req.files.image.type;
        var path = req.files.image.path;
        console.log(req.files);

        if (['image/jpeg', 'image/gif', 'image/png'].indexOf(type) === -1) {
            return res.json({'error': 'invalid image type'});
        }
        fs.open(path, 'r', function(err,fd){
            if (err) return res.json(etc.json.server_problem);
            console.log(fd);
        });
        /*fs.writeFile("/tmp/test", "Hey there!", function(err) {
         if(err) {
         console.log(err);
         } else {
         console.log("The file was saved!");
         }
         });*/

        return res.json({});
    }
};