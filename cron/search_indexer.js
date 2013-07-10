var redis = require('redis');
var util = require('util');
var assert = require('assert');

var etc = require('../helpers/etc.js');

/*
 Reindex the search index queued in redis
 Includes (1) Articles (2) Categories
 IF:
 - The Article is not present in the Articles Collection (mongodb)
 OR
 - The Article is unpublished in the Articles Collection (mongodb)
 OR
 - The Category is not present in the Categories Collection (mongodb)
 THEN
 delete the entity from all the keywords in the search index
 ELSE
 add/update the entity into the search index

 */
function reIndex() {
    GLOBAL.redis_con = redis.createClient();
    redis_con.smembers(etc.redisKey('index', 'articles'), function (err, to_index_articles) {
        if (err) {
            return redis_con.end()
        }
        redis_con.smembers(etc.redisKey('index', 'categories'), function (err, to_index_categories) {
            if (!err) {

                // Perform the reindex process only if there are any articles
                // or categories to reindex
                if (to_index_categories.length + to_index_articles.length) {
                    etc.startMongoDB('Articles', function (err, Articles, db) {
                        if (err) {
                            redis_con.end();
                            if (db) {
                                db.close();
                            }
                            console.error('database problem');
                            process.exit(1);
                        }


                        Articles.find({_id: {$in: to_index_articles}, published: true}).toArray(function (err, article_results) {
                            if (err) {
                                redis_con.end();
                                return db.close()
                            }


                            var article_details = mongoArrayToDict(article_results);
                            delete article_results;

                            db.collection('Categories', function (err, Categories) {
                                if (err) {
                                    redis_con.end();
                                    return db.close()
                                }
                                Categories.find({_id: {$in: to_index_categories}}).toArray(function (err, category_results) {
                                    if (err) {
                                        redis_con.end();
                                        return db.close();
                                    }

                                    var category_details = mongoArrayToDict(category_results);
                                    delete category_results;

                                    var created_partial_index = createPartialIndex(to_index_articles, article_details,
                                        to_index_categories, category_details);
                                    var partial_index = created_partial_index[0];
                                    var entities_to_update = created_partial_index[1];
                                    var partial_index_keywords = [];
                                    for (keyword in partial_index) partial_index_keywords.push(keyword);

                                    db.collection('SearchIndex', function (err, SearchIndex) {
                                        if (err) {
                                            redis_con.end();
                                            return db.close()
                                        }
                                        SearchIndex.find({}).toArray(function (err, complete_index_array) {
                                            if (err) {
                                                redis_con.end();
                                                return db.close()
                                            }

                                            var complete_index_dict = mongoIndexArrayToDict(complete_index_array);
                                            delete complete_index_array;
                                            var latest_added_index = mergeIndices(complete_index_dict, partial_index, entities_to_update);


                                            // Create global references to the mongodb and redis connection, so
                                            // as to be able to close them when the reindexing process in completed.
                                            GLOBAL.db = db;
                                            GLOBAL.redis_con = redis_con;

                                            // Count the number of keywords to update
                                            // NOTE: this loop cannot be merged with the loop
                                            // below as the final value of `keywords_to_update`
                                            // must be known as the latter loop iterates.
                                            for (var keyword in latest_added_index) keywords_to_update++;

                                            if (!keywords_to_update) {
                                                checkReIndexCompleted()
                                            } else {
                                                for (var keyword in latest_added_index) {

                                                    SearchIndex.save({_id: keyword, list: latest_added_index[keyword]}, function (err) {
                                                        GLOBAL.total_keywords_updated++;
                                                        checkReIndexCompleted();
                                                    });
                                                }
                                            }

                                        })
                                    })


                                })
                            });

                        });
                    })
                } else {
                    redis_con.end()
                }
            }
        })


    });
}


function checkReIndexCompleted() {
    if (GLOBAL.total_keywords_updated === GLOBAL.keywords_to_update) {
        redis_con.del(etc.redisKey('index', 'articles'));
        redis_con.del(etc.redisKey('index', 'categories'));
        redis_con.quit();
        db.close();
    }
}


function mongoArrayToDict(mongo_array) {
    var dict = {};
    var item;
    for (var i = 0; i < mongo_array.length; i++) {
        item = mongo_array[i];
        dict[item._id] = item;
    }

    return dict;
}

function mongoIndexArrayToDict(mongo_array) {

    var dict = {};
    var item;
    for (var i = 0; i < mongo_array.length; i++) {
        item = mongo_array[i];
        dict[item._id] = item.list;
    }

    return dict;
}


/*
 Clone the array `list` one array
 deep within, eg: [[1,2],[3,4]]
 @param list -> Array
 */
function cloneArraySingleLevel(list) {

    var clone = [];
    for (var i = 0; i < list.length; i++) {
        clone.push([]);
        for (var j in list[i]) {
            clone[i].push(list[i][j]);
        }
    }
    return clone;
}

function mergeIndices(main_index, partial_index, entities_to_update) {
    var affected_keywords = [];
    var latest_added_index = {};
    for (var keyword in partial_index) {
        if (!partial_index.hasOwnProperty(keyword)) {
            continue
        }


        if (!main_index[keyword]) {

            main_index[keyword] = [];
            affected_keywords.push(keyword);
        }
    }


    for (var keyword in main_index) {

        if (!main_index.hasOwnProperty(keyword)) {
            continue
        }


        // cloning the keyword list to cross check if no update was
        // made to keyword list.

        var keyword_list_clone = cloneArraySingleLevel(main_index[keyword]);

        var keyword_list = removeEntitiesFromList(main_index[keyword], entities_to_update);


        if (partial_index[keyword]) {
            var last_insert_index, insert_status;
            var item;
            for (var i = 0; i < partial_index[keyword].length; i++) {
                item = partial_index[keyword][i];
                insert_status = insertIntoKeywordList(item[0], item[1], item[2], main_index[keyword], last_insert_index);
                last_insert_index = insert_status[0];
                keyword_list = insert_status[1];
            }

        }
        try {


            assert.deepEqual(keyword_list, keyword_list_clone);
        } catch (err) {
            affected_keywords.push(keyword);
            latest_added_index[keyword] = keyword_list;
        }
    }
    return latest_added_index;
}


function insertIntoKeywordList(link, type, worth, cur_list, start_pos) {

    var inserted_index = start_pos;
    for (var i = start_pos ? start_pos : 0; i < cur_list.length; i++) {
        if (cur_list[i][2] <= worth) {
            inserted_index = i;
            break;
        }
    }
    cur_list.splice(inserted_index, 0, [link, type, worth]);
    return [inserted_index, cur_list];
}


/*
 Return the index of `val` in the array
 `list`, with the search beginning from
 the left.
 @param val: -> array
 @return index:index of `val` -> int
 */
function arrayIndexOfArray(list, val) {
    var equal;
    for (var i in list) {
        equal = true;
        for (var j in val) {
            if (val[j] !== list[i][j]) {
                equal = false;
                break;
            }
        }
        if (equal) return i;
    }
    return -1;

}

function removeEntitiesFromList(list, entities) {
    var i = 0;

    while (i < list.length) {
        if (arrayIndexOfArray(entities, [list[i][0], list[i][1]]) !== -1) {
            list.splice(i, 1);
            i--;
        }
        i++;
    }
    return list;
}

function createPartialIndex(articles, article_details, categories, category_details) {

    var index_dict = {};
    var entities_to_update = [];
    var keywords_worth, title_tokens, content_tokens, categories_tokens;
    var article;


    for (var i = 0; i < articles.length; i++) {
        article = articles[i];

        if (article_details[article]) {
            title_tokens = indexFriendly(article_details[article].title).split(" ");
            content_tokens = indexFriendly(article_details[article].markdown).split(" ");
            categories_tokens = article_details[article].categories.join(" ").split(" ");
            keywords_worth = createArticleKeywordsWorth(title_tokens, content_tokens, categories_tokens);

            insertIntoIndex(article, "a", keywords_worth, index_dict);

        }
        entities_to_update.push([article, "a"]);
    }


    var category;
    for (var i = 0; i < categories.length; i++) {
        category = categories[i];

        if (category_details[category]) {
            insertIntoIndex(category, "c",
                indexKeywords(category.split(" "), 100, {}),
                index_dict);

        }
        entities_to_update.push([category, "c"]);
    }

    return [index_dict, entities_to_update];
}


/*
 Return the string created by extracting only the letters and numbers
 from `text`. The non-letter/non-number characters should be replaced
 by a blank space, furthermore letters which are of uppercase must be
 converted to their corresponding lower case value
 and the final string must not contain any consecutive
 blank spaces, and should also have no leading or trailing whitespace
 */
function indexFriendly(text) {
    return text.replace(/[^a-z0-9]/gi, " ").replace(/ +/g, " ").replace(/^ +/, "").replace(/ +$/, "").toLowerCase();
}


function insertIntoIndex(link, type, keywords_worth, index_dict) {
    for (var keyword in keywords_worth) {
        if (!index_dict[keyword]) {
            index_dict[keyword] = [];

        }
        index_dict[keyword] = insertIntoKeywordList(link, type, keywords_worth[keyword], index_dict[keyword], 0)[1];
    }
}


function createArticleKeywordsWorth(title_tokens, content_tokens, categories_tokens) {

    return indexKeywords(title_tokens, 4,
        indexKeywords(content_tokens, 1,
            indexKeywords(categories_tokens, 3, {})
        )
    );


}


function indexKeywords(tokens, each_worth, keywords_worth) {
    var token;
    for (var i in tokens) {
        token = tokens[i];
        if (token.length > 2 &&
            ['to', 'for', 'and', 'with', 'from', 'the',
                'is', 'but', 'then', 'there', 'it'].indexOf(token) === -1) {
            if (!keywords_worth[token]) {
                keywords_worth[token] = 0;
            }
            keywords_worth[token] += each_worth;
        }
    }
    return keywords_worth;
}


//Main Block
if (process.argv[2] === 'test') {

    console.info('\nINITIATING TEST SUITE');

    var num_tests = 0;
    var tests_failed = 0;
    var result, expecting;

    // Testing indexFriendly
    console.info('Testing function: indexFriendly');
    var unfriendly_string = " **** lorem)()--# blue-print ~ ";
    result = indexFriendly(unfriendly_string);
    expecting = "lorem blue print";
    try {
        assert.deepEqual(result, expecting)
    } catch (err) {
        tests_failed++;
        console.error('\tfailed test');
        console.log(util.format('\t\texpecting: %j', expecting));
        console.log(util.format('\t\tgot: %j', result));

    }


    num_tests++;

    // Testing removeEntitiesFromList
    console.info('Testing function: removeEntitiesFromList');
    var entities = [
        ["lorem", "a"],
        ["foo", "c"],
        ["bar", "a"]
    ];
    var list = [
        ["pickled-carrots", "c", 20],
        ["oranges", "c", 55],
        ["lorem", "a", 1422],
        ["bar", "c", 565],
        ["foo", "c", 400]
    ];

    result = removeEntitiesFromList(list, entities);
    expecting = [
        ["pickled-carrots", "c", 20],
        ["oranges", "c", 55],
        ["bar", "c", 565]
    ];
    try {
        assert.deepEqual(result, expecting);
    } catch (err) {

        tests_failed++;
        console.error('\tfailed test');
        console.log(util.format('\t\texpecting: %j', expecting));
        console.log(util.format('\t\tgot: %j', result));

    }

    num_tests++;


    //Test Statistics
    console.info(util.format('\nPERFORMED %d TESTS', num_tests));
    if (!tests_failed) {
        console.info(util.format('ALL %d TESTS PASSED\n', num_tests));
    } else {
        console.info(util.format('%d TESTS FAILED', tests_failed));
        console.info(util.format('%d TESTS PASSED\n', num_tests - tests_failed));
    }


} else {
    GLOBAL.total_keywords_updated = 0;
    GLOBAL.keywords_to_update = 0;
    reIndex();
}
