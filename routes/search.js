var _ = require('underscore');

var etc = require('../helpers/etc');
var AirForm = require('../helpers/air-form');


exports.get = function(req,res){


}


exports.searchSuggestion = function (req, res) {
    var af = new AirForm(req);
    var last_keyword = af.xvalidate('last_keyword', 'query', {size: [1, 20], optional:true});

    var other_keywords = [];
    if (req.query.other_keywords) {
        other_keywords = af.xvalidate('other_keywords', 'query', {type: 'array'});
    }


    if (!af.isValid()) {
        return res.send(403);
    }
    fetchResults(other_keywords, last_keyword, 7, function (err, results) {
        if (err) return res.send(500);
        return res.json({suggestions: results});
    })

};

function fetchResults(keywords, last_keyword, max, callback) {
    etc.startMongoDB('SearchIndex', function (err, SearchIndex, db) {
        if (err) { if(db){db.close();} return callback(err, null);}
        SearchIndex.find({$or: [
            {_id: {$in: keywords}},
            {_id: new RegExp("^" + last_keyword)}
        ]}).toArray(function (err, results) {
                if (err) {db.close();return callback(err, null);}
                var details =  mergeResults(results, max);
                var sorted = details[0];
                var articles_found = details[1];

                db.collection('Articles', function(err,Articles){
                   if (err) {db.close();return callback(err, null);}
                    Articles.find({_id:{$in:articles_found}},{title:1}).toArray(function(err,article_names){
                        if (err) {db.close();return callback(err, null);}
                        var title_dict = etc.mongoArrayToShortDict(article_names, 'title')
                        for (var i=0; i < sorted.length; i++){
                            if (sorted[i][1] === 'a'){
                                sorted[i][2] = title_dict[sorted[i][0]];
                            } else {
                                sorted[i][2] = sorted[i][0];
                            }
                        }
                        db.close();
                        return callback(null, sorted);
                    })
                });

            })

    })
}


function mergeResults(results, max) {
    var found = {};
    var result, entity, entity_hash;
    var articles_found = [];

    for (var i = 0; i < results.length; i++) {
        result = results[i].list;
        for (var j = 0; j < Math.min(result.length, max); j++) {
            entity = result[j];
            entity_hash = entity[0] + "*" + entity[1];
            if (!found[entity_hash]) {
                found[entity_hash] = entity[2];
            } else {
                found[entity_hash] += entity[2];
            }
        }
    }


    // special thanks to: http://dregsoft.com/blog/?p=99

    var mapped = []
    var entitiy_hash_split;
    for (var entity in found) {
        entitiy_hash_split = entity.split('*');
        if (entitiy_hash_split[1] === 'a'){
            articles_found.push(entitiy_hash_split[0])
        }
        mapped.push([entitiy_hash_split[0], entitiy_hash_split[1], found[entity]]);
    }

    var sorted = _.sortBy(mapped, function(tup){return tup[2]}).reverse();

    return [sorted, articles_found];


}


function make_keywords(query){
    //console.log('before: ' + query);
    query = query.replace(/[\W]/g, ' ');
    //console.log('middle: ' + query);
    query = query.replace(/\s+/g, ' ');
    //console.log('after: ' + query);
    var raw_keywords = query.split(' ');
    var refined_keywords = [];

    var exclude_last_word = 1;

    if (query[query.length-1] === " "){
        exclude_last_word = 0;
    }

    for (var i =0; i < raw_keywords.length -exclude_last_word; i++){
        if ((raw_keywords[i].length > 1 )
            && (refined_keywords.indexOf(raw_keywords[i]) === -1)) {
            refined_keywords.push(raw_keywords[i]);
        }
    }
    if (exclude_last_word == 1){
        return {'other_keywords': refined_keywords, 'last_keyword':raw_keywords.pop()};
    } else{
        return {'other_keywords': refined_keywords, 'last_keyword':''};
    }
}
