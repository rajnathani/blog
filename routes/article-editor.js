var etc = require('../helpers/etc');
var AirForm = require('../helpers/air-form');
var redis = require('redis');


var _ = require('underscore');
var marked = require('marked');



function linkify(title) {
    return title.replace(/[^\w \-]/g, " ").
        replace(/[\s]+/g, " ").replace(/ /g, "-");
}

/*
 fetches all the categories of the blog
 parameters:
 callback -> [function] callback of type:
 callback(error,categories,db)
 error -> error from mongodb
 categories -> array of categories
 Categories -> the mongodb collection: Categories
 db -> mongodb db connection
 */
function allCategories(callback) {
    etc.startMongoDB('Categories', function (err, Categories, db) {
        if (err) return callback(err, null, null, null);
        Categories.find({}, {'_id': 1}).toArray(function (err, categories) {
            if (err) return callback(err, null, Categories, db);
            return callback(err, etc.primaryKeysList(categories), Categories, db);
        });
    });
}

function uniqueLink(generated_link, similar_links_dict_array) {

    var similar_links = etc.primaryKeysList(similar_links_dict_array);
    // Check if either (1) there are no similar links (2) the generated
    // link is not contained in the similar links. In any of these cases
    // the generated link is unique
    if (!similar_links.length || !_.contains(similar_links, generated_link))
        return generated_link;

    // Attempting to make the generated link unique by added
    // a hyphen and number (1 to infinite) appended to it
    var attempt;
    for (var i = 2; ; i++) {
        attempt = generated_link + "-" + i;
        if (!_.contains(similar_links, attempt)) return attempt;
    }
}


exports.new = function (req, res) {
    allCategories(function (err, all_categories, Categories, db) {
        if (err) return res.send(etc.msg.server_problem);
        return res.render('article-editor', {article: {title: "", markdown: "", created: 0, updated: 0,
            published: false, categories: []}, all_categories: all_categories, article_created: false});
    });
};


exports.post = function (req, res) {
    var af = new AirForm(req);
    // The max of 200 is arbitrary as of now
    var title = af.xvalidate('title', 'body', {size: [1, 200]});
    var markdown = af.xvalidate('markdown', 'body', {size: [0, 999999999]});
    var categories = af.xvalidate('categories', 'body', {'type': 'array'});


    if (!af.isValid()) {
        console.log([title, markdown, categories]);
        return res.json(etc.json.fishy);
    }


    var generated_link = linkify(title);

    allCategories(function (err, all_categories, Categories, db) {
        if (err) return res.json(etc.json.server_problem);
        if (_.difference(categories, all_categories).length) {
            return res.json({'error': 'unidentified categories found'})
        }
        db.collection('Articles', function (err, Articles) {
            if (err) {
                db.close();
                return res.send(500)
            }
            Articles.find({_id: new RegExp('^' + generated_link)}, {_id: 1}).toArray(function (err, similar_links_dict_array) {
                console.log(similar_links_dict_array);
                if (err) {
                    db.close();
                    return res.send(500)
                }
                var unique_link = uniqueLink(generated_link, similar_links_dict_array);
                marked(markdown, {}, function (err, content) {
                    if (err) {
                        db.close();
                        return res.send( 500)
                    }
                    Articles.insert({_id: unique_link, title: title, markdown: markdown, categories: categories,
                            content: content, published: false,
                            created: etc.currentTimestamp(), updated: etc.currentTimestamp()},
                        function (err) {
                            if (err) {
                                db.close();
                                return res.json(500);
                            }
                            db.collection('ArticleComments', function (err, ArticleComments) {
                                if (err) {
                                    db.close();
                                    return res.json(500);
                                }
                                ArticleComments.insert({_id: unique_link, 'comments': []}, function (err) {
                                    if (err) {
                                        db.close();
                                        return res.json(500);
                                    }
                                    updateCategoriesCollection(unique_link, categories, Categories);
                                    var redis_con = redis.createClient();
                                    redis_con.sadd(redisKey('index', 'articles'), unique_link, function(){redis_con.end()});
                                    return res.json({link: unique_link});

                                })
                            })

                        });

                });
            })

        });
    });
};

exports.existing = function (req, res) {
    var af = new AirForm(req);
    // The max of 500 is arbitrary as of now
    var link = af.xvalidate('link', 'params', {size: [1, 200]});

    if (!af.isValid()) {
        return res.send(404, etc.msg['404']);
    }

    allCategories(function (err, all_categories, Categories, db) {
        if (err) {
            db.close();
            return res.send(500, "");
        }


        db.collection('Articles', function (err, Articles) {
            if (err) {
                db.close();
                return res.send(500, "");
            }


            Articles.findOne({_id: link}, {content: 0}, function (err, article) {
                if (err) {
                    db.close();
                    return res.send(500, "");
                }

                if (!article) return res.send(404, etc.msg['404']);

                return res.render('article-editor', {article: article, all_categories: all_categories, article_created: true});

            });
        });
    });


};

exports.save = function (req, res) {
    var af = new AirForm(req);

    // The max of 200 is arbitrary as of now
    var link = af.xvalidate('link', 'params', {size: [1, 200]});
    var title = af.xvalidate('title', 'body', {size: [1, 200]});
    var markdown = af.xvalidate('markdown', 'body', {size: [0, 999999999]});
    var categories = af.xvalidate('categories', 'body', {type: 'array'});

    if (!af.isValid()) {
        console.log([title, markdown, categories]);
        return res.json(etc.json.fishy);
    }

    allCategories(function (err, all_categories, Categories, db) {
        if (err) return res.json(etc.json.server_problem);
        if (_.difference(categories, all_categories).length) {
            return res.json({'error': 'unidentified categories found'})
        }
        db.collection('Articles', function (err, Articles) {
            if (err) {
                db.close();
                return res.json(500, {});
            }
            marked(markdown, {}, function (err, content) {
                if (err) {
                    db.close();
                    return res.send("", 500)
                }

                Articles.update({_id: link}, { $set: {title: title, markdown: markdown, categories: categories,
                        content: content,
                        updated: etc.currentTimestamp()}},

                    function (err) {

                        if (err) {
                            db.close();
                            return res.json(500);
                        }

                        updateCategoriesCollection(link, categories, Categories);

                        var redis_con = redis.createClient();
                        redis_con.sadd(redisKey('index', 'articles'), link, function(){redis_con.end()});
                        return res.json({});
                    });
            });

        })
    });
};

function updateCategoriesCollection(link, categories, Categories) {
    Categories.update({}, {$pull: {articles: link}}, function () {
        for (var i in categories) {
            Categories.update({_id: categories[i]}, {$addToSet: {articles: link}}, function (err) {
            });
        }
    });
}