var etc = require('../helpers/etc');
var AirForm = require('../helpers/air-form');

exports.get = function (req, res) {
    var af = new AirForm(req);
    // The max of 500 is arbitrary as of now
    var link = af.xvalidate('link', 'params', {size: [1, 500]});

    if (af.nullExists([af, link])) {
        return res.send(404, etc.msg.string['404']);
    }

    etc.startMongoDB('Articles', function (err, Articles, db) {
            if (err){
                return res.send(500, etc.msg.string.server_problem);
            }
            Articles.findOne({_id:link}, function(err,article){
                return res.render('article.jade', {article:article});
            })
        }
    );
};