var etc = require('../helpers/etc');
var AirForm = require('../helpers/air-form');


exports.get = function (req, res) {
    var category_name = req.params.name;
    etc.startMongoDB('Categories', function (err, Categories, db) {
        if (err) {
            db.close();
            return res.send(500, etc.msg.server_problem);
        }
        Categories.findOne({_id: category_name}, function (err, category_doc) {
            if (err) {
                db.close();
                return res.send(500, etc.msg.server_problem);
            }
            var article_links = category_doc.articles;
            db.collection('Articles', function (err, Articles) {
                if (err) {
                    db.close();
                    return res.send(500, etc.msg.server_problem);
                }
                Articles.find({_id: {$in: article_links}, published: true}, {markdown: false}, { sort: {
                    'created': -1
                }}).toArray(function (err, articles) {
                        if (err) {
                            db.close();
                            return res.send(500, etc.msg.server_problem);
                        }
                        return res.render('category', {name: category_name, articles: articles});

                    })
            });


        })
    })
};