var etc = require('../helpers/etc');
var article_editor = require('../routes/article-editor');
var AirForm = require('../helpers/air-form');

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
        var publish =  req.url.match(/\/publish\/?$/) ? true : false;
        var af = new AirForm(req);
        // 200 is arbitrary
        var link = af.xvalidate('link', 'params', {size: [1, 200]});

        if (!af.isValid()) return res.json(etc.json.fishy);

        etc.startMongoDB('Articles', function (err, Articles, db) {
            if (err) return res.json(etc.json.server_problem);
            Articles.update({_id: link}, {$set: {published: publish}}, function (err) {
                if (err) return res.json(etc.msg.server_problem);
                return res.json(etc.json.empty);
            });
        });
    }
};

exports.categories = function (req, res) {

};

exports.pictures = function (req, res) {

};