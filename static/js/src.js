function evUploadPictureChange() {
    if (this.files) {
        var fd = new FormData();
        fd.append('image', this.files[0]);
        var xhr = new XMLHttpRequest();


        xhr.upload.addEventListener("progress", uploadProgress, false);
        xhr.addEventListener("load", uploadComplete, false);
        xhr.addEventListener("error", uploadFailed, false);
        xhr.addEventListener("abort", uploadCanceled, false);

        xhr.open("POST", "/control-panel/pictures/_upload");

        xhr.send(fd);

        $('#upload-progress').remove();

        this.parentNode.appendChild(div({'id': 'upload-progress', 'class': 'cf', style: ' margin-top:10px;background-color:#4d161a; width:auto; height:10px;'}, [
            div({'id': 'progress-bar', 'style': 'float:left;width:0%; height:100%;background-color:#ff475a;-webkit-transition:all 400ms; transition:all 400ms;'})
        ]));

    }

}

function uploadProgress(data) {
    console.log('progressing');
    document.getElementById('progress-bar').style.width = parseInt((parseFloat(data.loaded) / data.total) * 100) + '%';
}
function uploadComplete(data) {
    console.log(data);
    var dict = JSON.parse(data.target.response);
    if (dict.error) {
        return pop(dict.error, 'error');
    }
    pop('Upload Complete!', 'success');
    setTimeout(popOut, 1100)
}

function uploadFailed() {
    console.log('upload failed');
}

function uploadCanceled() {
    console.log('upload canceled');
}

$('#bu-form-upload-picture').click(function () {
    pop(input({'type': 'file', 'change': evUploadPictureChange}));
});


// Source: http://www.quirksmode.org/js/events_properties.html
function mousePosition(e) {
    var posx = 0;
    var posy = 0;
    if (!e) var e = window.event;
    if (e.pageX || e.pageY) {
        posx = e.pageX;
        posy = e.pageY;
    }
    else if (e.clientX || e.clientY) {
        posx = e.clientX + document.body.scrollLeft
            + document.documentElement.scrollLeft;
        posy = e.clientY + document.body.scrollTop
            + document.documentElement.scrollTop;
    }
    return [posx, posy];
    // posx and posy contain the mouse position relative to the document
    // Do something with this information
}

function buSureDeleteArticle(link) {
    pop(div([
        p('Are you sure you would like to delete this article?'),
        button('yes', {'click': function () {
            buDeleteArticle(link)
        }}),
        span(' '),
        button('no', {'click': closePop})
    ]), 'slide')
}
function buDeleteArticle(link) {

    
        go_ajax('/control-panel/_article/' + link, 'DELETE', {}, function (dict) {
            perfDeleteArticle(dict, link)
        });
    
    //pop(link);
}

function perfDeleteArticle(dict, link) {
    if (dict.error) {
        return pop(dict.error, 'error');
    }
    jam_manage_article_rows.filter('tr[data-link="' + link + '"]').remove();
    popOut();
    pop('Article Deleted!', 'success');
    setTimeout(popOut, 1100);
}

function buUnpublishArticle(link) {

    var ctx = $('[data-link="' + link + '"]').find('[data-published]');

    
        go_ajax('/control-panel/_article/' + link + '/unpublish', 'PATCH', {}, perfUnpublishArticle, {context: ctx})
    
}

function perfUnpublishArticle(dict) {
    if (dict.error) {
        return pop(dict.error, 'error');
    }

    $(this).attr('data-published', "false");
    pop('The article has been unpublished', 'success');
    setTimeout(popOut, 1000);
}

function buPublishArticle(link) {

    var ctx = $('[data-link="' + link + '"]').find('[data-published]');

    
        go_ajax('/control-panel/_article/' + link + '/publish', 'PATCH', {}, perfPublishArticle, {context: ctx})
    

}

function perfPublishArticle(dict) {
    if (dict.error) {
        return pop(dict.error, 'error');
    }
    $(this).attr('data-published', "true");
    pop('Article successfully published!', 'success');
    setTimeout(popOut, 1000);
}

function articleContextMenu(e) {
    document.forceEscape && document.forceEscape();
    var pos = mousePosition(e);
    var pos_x = pos[0];
    var pos_y = pos[1];

    var link = this.parentNode.getAttribute('data-link');

    var published = $(this.parentNode).find('[data-published]').first().attr('data-published') === "true";

    var edit_publish_status = button(published ? 'unpublish' : 'publish', {style: 'display:block;', 'click': published ? function () {
        buUnpublishArticle(link)
    } : function () {
        buPublishArticle(link)
    }});

    document.body.appendChild(
        div({'class': 'context-menu', id: "art-context-menu", 'style': 'position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px'}, [
            published ? a('open', {href: '/article/' + link, 'class': 'button', 'style': 'display:block'}) :
                span('open', { 'class': 'button', 'style': 'display:block; color:rgb(150,150,150); cursor:default;'}),
            button('delete', {'style': 'display:block', 'click': function () {
                buSureDeleteArticle(link)
            }}),
            edit_publish_status
        ])
    );
    escapeState('art-context-menu');
    return false;

}

var jam_manage_article_rows = $('#cp-table.manage-articles').find('tr');

jam_manage_article_rows.find('td:first-child').on('contextmenu', articleContextMenu);

jam_manage_article_rows.find('td:last-child').on('click', articleContextMenu);

function perfNewCategory(dict, category_name) {
    if (dict.error) {
        return pop(dict.error, 'error');
    }
    $('#cp-table').find('tbody').append(
        tr({ 'data-name': category_name},
            [
                td([a(category_name, {href: '/category/' + category_name, class: 'hover-link' })], {contextmenu: categoryContextMenu}),
                td('0 Articles'),
                td({'click': categoryContextMenu})
            ]
        )
    );
    popOut();
    pop('Category Successfully Created!', 'success');
    setTimeout(popOut, 500);


}
function buCreateCategory(category_name) {
    if (!category_name.match(/^[a-zA-Z0-9\- _]*$/)) {
        return pop('Illegal characters in category name', 'error');
    } else {
        
            go_ajax('/control-panel/_categories', 'POST', {name: category_name}, function (dict) {
                perfNewCategory(dict, category_name)
            });
        
    }
}

function keypressCategoryName(e) {
    var key_code = e.keyCode;
    if (key_code === 13) {

        if (this.value) {
            buCreateCategory(this.value);
        }
    }
}
$('#bu-new-category').click(function () {
    pop(textinput({id: 'new-name', maxlength: '40', 'placeholder': 'New Category ...',
        style: 'width:100%',
        keypress: keypressCategoryName}));
    $('#new-name').focus();

});


function buSureDeleteCategory(name) {
    pop(div([
        p('Are you sure you would like to delete the category: ' + name + '?'),
        button('yes', {'click': function () {
            buDeleteCategory(name)
        }}),
        span(' '),
        button('no', {'click': closePop})]
    ), 'slide')
}
function buDeleteCategory(name) {
    
        go_ajax('/control-panel/_category/' + name, 'DELETE', {}, function (dict) {
            perfDeleteCategory(dict, name)
        });
    
}

function perfDeleteCategory(dict, category_name) {
    if (dict.error) {
        return pop(dict.error, 'error');
    }

    $('#cp-table.manage-categories').find('tr[data-name="' + category_name + '"]').remove();
    popOut();
}

function categoryContextMenu(e) {
    document.forceEscape && document.forceEscape();
    var pos = mousePosition(e);
    var pos_x = pos[0];
    var pos_y = pos[1];

    var name = this.parentNode.getAttribute('data-name');

    document.body.appendChild(
        div({'class': 'context-menu', id: "art-context-menu", 'style': 'position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px'}, [
            button('delete', {'style': 'display:block', 'click': function () {
                buSureDeleteCategory(name)
            }})
        ])
    );
    escapeState('art-context-menu');
    return false;

}

var jam_manage_category_rows = $('#cp-table.manage-categories').find('tr');

jam_manage_category_rows.find('td:first-child').on('contextmenu', categoryContextMenu);

jam_manage_category_rows.find('td:last-child').on('click', categoryContextMenu);


$('.pictures-grid').find('div').click(function () {
    var bgcss_url = this.style.backgroundImage;

    pop(img({src: bgcss_url.replace(/^url\(["']?/, '').replace(/["']?\)$/, ''), style: 'width:auto;display:block;margin:auto;'}), 'large');
});;if (_path_name.match(/^\/?$/) || _path_name.match(/home\.html$/)) {

    function evCheckHomeScroll() {
        if ($(document).height() - ($(this).scrollTop() + $(window).height()) < 200) {
            var $last_link = $('.article').last();
            var last_link = $last_link.attr('data-link');
            var last_link_ts = parseInt($last_link.find('.article-meta [data-timestamp]').attr('data-timestamp'));
            $(window).unbind('scroll', evCheckHomeScroll);
            $('.loading').show();
            
                go_ajax('/_?last_link=' + last_link + '&timestamp=' + last_link_ts, 'GET', perfAppendMoreArticles,
                    {'complete': function (jqXHR, text_status) {
                        $('.loading').hide();
                        if (["notmodified", "error", "timeout", "abort", "parsererror"].indexOf(text_status) !== -1) {
                            $(window).bind('scroll', evCheckHomeScroll);
                        }
                    }});
            


        }

    }

    $(window).bind('scroll', evCheckHomeScroll);


    function perfAppendMoreArticles(dict) {

        if (!dict.error && dict.more_articles) {
            if (dict.more_articles.length === 0) {
                // The return statement below is important. the function needs to terminate
                // here as later in the function we re-bind the scrolling event to the window,
                // which we obviously do not want any more.
                return $('#articles').after(div({'class': 'gab', style: 'margin:30px 0;font-size:25px; text-align:center;'}, "~ THE END ~"));
            }
            var cur_article, cur_article_categories, cur_category;

            for (var i = 0; i < dict.more_articles.length; i++) {
                cur_article = dict.more_articles[i];

                cur_article_categories = div({'class': 'categories'});

                for (var j = 0; j < cur_article.categories.length; j++) {
                    cur_category = cur_article.categories[j];
                    cur_article_categories.appendChild(a(cur_category, {href: '/category/' + cur_category, 'class': 'hover-link'}))
                }
                $('#articles').append(
                    li({'class': 'article cf', 'data-link': cur_article._id}, [
                        div([
                            h1({'class': 'article-head'}, [
                                a(cur_article.title, {href: '/article/' + cur_article._id, 'class': 'hover-link'})
                            ]),
                            div(cur_article.content, {'class': 'article-content'})
                        ]),
                        div({'class': 'article-meta'}, [
                            div({'data-timestamp': cur_article.created, 'data-time-mode': "1"}),
                            cur_article_categories
                        ])
                    ])

                );

            }
        }
        $(window).bind('scroll', evCheckHomeScroll);
    }
}
;if (skinTesting() ||
    _path_name.match(/article\/create\/?$/) ||
    _path_name.match(/\/edit\/?$/)
    ) {
    $('textarea').autosize();

    $('.x-article-category').chosen();

    if (_path_name.match(/edit\/?$/) || _path_name.match(/edit-article\.html/)) {
        $('#bu-remove-category').css('visibility', 'visible');
    } else {
        $('[data-published]').hide();
        $('#ae-created').hide();
        $('#ae-last-saved').hide();
    }

    function urlArticleLink() {
        
            return _path_name.match(/^\/control\-panel\/article\/([\w\-]+)\/edit/)[1];
        
    }

    $('.article-content').keyup(function (e) {


        if (e.keyCode === 16) {
            $.data(this, 'shift-pressed', false);
        }
    });

    //thanks: http://jsfiddle.net/sdDVf/8/
    $('.article-content').keydown(function (e) {


        if (e.keyCode === 16) {
            $.data(this, 'shift-pressed', true);
        }
        if (e.keyCode === 9) {

            if ($.data(this, 'shift-pressed')) {
                var to_find = "\n\t";
                var to_replace = "\n";
            } else {
                var to_find = "\n";
                var to_replace = "\n\t";

            }
            var start_pos = this.selectionStart;
            var end_pos = this.selectionEnd;


            var $this = $(this);
            var selected_text = $this.val().substring(start_pos, end_pos);
            var before_selected_text = $this.val().substring(0, start_pos);
            if (before_selected_text.match(new RegExp(to_find))) {
                var last_index_line_break = before_selected_text.lastIndexOf(to_find);
                before_selected_text = before_selected_text.substring(0, last_index_line_break) + to_replace +
                    before_selected_text.substring(last_index_line_break + to_find.length);
            }
            else {
                if (to_replace === "\n\t") {
                    before_selected_text = "\t" + before_selected_text;
                }
            }

            selected_text = selected_text.replace(new RegExp(to_find, 'g'), to_replace);

            $this.val(before_selected_text + selected_text + $this.val().substring(end_pos));
            this.selectionStart = this.selectionEnd = start_pos + to_replace.length - to_find.length;
            this.selectionStart = start_pos;
            this.selectionEnd = end_pos;

            return false;
        }
    });

    function categoryCount() {
        return parseInt($('#number-of-categories').val());
    }

    function increaseCategory() {
        $('#number-of-categories').val(categoryCount() + 1);
    }

    function decreaseCategory() {
        $('#number-of-categories').val(categoryCount() - 1);
    }

    $('#bu-remove-category').click(function () {
        var category_count = categoryCount();
        if (category_count > 0) {
            if (category_count === 1) {
                $('#bu-remove-category').css('visibility', 'hidden');
            }
            $('#category-' + category_count).remove();
            $('#category_' + category_count + '_chzn').remove();

            decreaseCategory();
        }
        return false;
    });
    $('#bu-add-category').click(function () {
        var new_category_num = categoryCount() + 1;
        if (new_category_num === 1) {
            $('#bu-remove-category').css('visibility', 'visible');
        }


        $('#bu-remove-category').after($('#category-placeholder').first().clone(false).attr('id', 'category-' + new_category_num).addClass('x-article-category').show());
        $('#category-' + new_category_num).chosen();
        increaseCategory();

        return false;

    });


    $('#bu-preview-article').click(function () {
        var $this = $(this);
        if ($this.hasClass('color')) {
            $this.removeClass('color');
            $('#article-preview').hide();
            $('textarea.article-content').show();
        } else {
            $this.addClass('color');

            var $article_textarea = $('textarea.article-content');
            var $article_preview = $('#article-preview');

            $article_preview.html(markDown($article_textarea.val()));

            $article_textarea.hide();
            $article_preview.show();
        }
        return false;
    });

    function markDown(mark_down) {
        var converter = new Markdown.Converter();
        return (converter.makeHtml(mark_down));
    }


    $('#bu-save-article').click(
        function () {
            var $this = $(this);
            // Converting it to string so as to avoid confusion
            // as to whether it will be returned as a string or a number
            var data_article_created = $this.attr('data-article-created').toString();
            if (data_article_created === "false") {
                return createArticle.call(this);
            } else if (data_article_created === "true") {
                return saveArticle.call(this, urlArticleLink());
            }
        }
    );

    function fetchArticleDetails() {
        return dict = {
            title: $('#x-head').val(),
            markdown: $('#x-body').val(),
            categories: fetchCategories()
        };
    }

    function fetchCategories() {
        var all_categories = [];
        var category;
        $('.x-article-category').each(function () {
            category = $(this).val();
            if (category && all_categories.indexOf(category) === -1) {
                all_categories.push(category);
            }
        });

        return all_categories;
    }


    function createArticle() {
        var dict = fetchArticleDetails();


        if (dict.title.length === 0) {
            return pop('No title given', 'error');
        }

        
            go_ajax('/control-panel/_articles', 'POST', dict, perfCreateArticle, {context: this});
        
    }

    function perfCreateArticle(dict) {
        if (dict.error) {
            return pop(dict.error, 'error');
        }
        // save is the save button, this is the
        // save button supplied as the context
        // by the jquery ajax call
        var $save = $(this);
        $save.attr('data-article-created', "true");

        
            history.pushState({}, "", "/control-panel/article/" + dict.link + "/edit");
            updatePathName();
        

        pop('Article Successfully Created!', 'success');
        $('[data-published]').show();
        $('#ae-created').show().find('span').attr('data-timestamp', cur_timestamp());
        $('#ae-last-saved').show().find('span').attr('data-timestamp', cur_timestamp());

        setTimeout(popOut, 700);
    }


    function saveArticle(link) {
        var dict = fetchArticleDetails();

        if (dict.title.length === 0) {
            return pop('No title given', 'error');
        }

        
            go_ajax('/control-panel/_article/' + link, 'PATCH', dict, perfSaveArticle);

        

    }

    function perfSaveArticle(dict) {
        if (dict.error) {
            return pop(dict.error, 'error');
        }


        
            //history.pushState({}, "", "/control-panel/article/" + urlArticleLink() + "/edit");
        
        pop('Article Successfully Saved!', 'success');
        $('#ae-last-saved').find('span').attr('data-timestamp', cur_timestamp());
        setTimeout(popOut, 700);
    }


};if (skinTesting() ||
    _path_name.match(/^\/article\//)) {
    $('textarea').autosize();

    function pageArticleLink() {
        return _path_name.substring(_path_name.lastIndexOf('/') + 1);
    }

    function evLoadComments() {
        $('.loading.more-comments').show();
        
            go_ajax(_path_name + '/_comments', 'GET', perfLoadComments, {'error': function () {

                return $('.loading.more-comments').removeClass('more-comments').show().html(span('Error Retrieving Comments',
                    {'class': 'color'}).outerHTML);


            }});
        
    }

    function perfLoadComments(dict) {
        console.log(dict);
        if (dict.error) {
            return $('.loading.more-comments').after(
                div('Error Retrieving Comments', {'class': 'color', style: 'font-size:20px; margin-bottom:25px'})).hide();
        }

        $('.loading').hide();

        var comments = dict.comments;
        if (comments) {
            var comment_replies;
            var comments_list = $('#comments-section').children('ul');
            for (var i = comments.length - 1; i >= 0; i--) {
                comment_replies = [];
                for (var j = 0; j < comments[i].replies.length; j++) {
                    comment_replies.push(comment(comments[i].replies[j], {reply:true}));
                }
                comments_list.append(comment(comments[i], {'children':comment_replies}));

            }
        }
    }

    evLoadComments();


    function findCommentFormDetails($comment_form) {
        return {content: $comment_form.find('textarea').val(),
            name: $comment_form.find('input[type="text"]').val(),
            website: $comment_form.find('input[type="url"]').val(),
            email: $comment_form.find('input[type="email"]').val()
        };
    }

    function deleteCommentFormDetails($comment_form) {
        $comment_form.find('textarea').val("");
        $comment_form.find('input[type="text"]').val("");
        $comment_form.find('input[type="url"]').val("");
        $comment_form.find('input[type="email"]').val("")
    }


    function commentFormValidate(dict) {
        if (dict.content === '') {
            return false;
        }
        if (dict.name === '') {
            return pop('Please fill out your name.', 'error');
        } else if (dict.email === '') {
            return pop('Please fill out your email address.', 'error');
        } else if (!validEmail(dict.email)) {
            return pop('Please enter a valid email, confirmation will be required.', 'error');
        }
        return true;
    }

    $('#bu-post-comment').click(function () {
        var dict = findCommentFormDetails($('#leave-comment'));
        if (!commentFormValidate(dict)) {
            return false;
        }
        dict.parent_comment_id = "";
        
            go_ajax(_path_name + '/_comments', 'POST', dict, function (ret_dict) {
                ret_dict.created = cur_timestamp();
                ret_dict.content = dict.content;
                ret_dict.name = dict.name;
                ret_dict.website = dict.website;
                perfPostComment(ret_dict);
            })
        

    });


    function perfPostComment(dict) {
        if (dict.error) {
            return pop(dict.error, 'error');
        }


        $('html, body').animate({
            scrollTop: $("#comments-section").offset().top
        }, 200);

        $('#comments-section').children('ul').prepend(comment(dict, {'children': []}));

        deleteCommentFormDetails($('#leave-comment'));
        pop(p({html: 'Your comment has been posted as of now, however confirmation is <b><i>required</i></b>.<br><br>' +
            'Please check your inbox for the confirmation mail; click on the link given in the email (this link lasts 2 hours)<br><br>' +
            'If this confirmation is not performed, your comment will be <b><i>deleted</i></b> in 2 hours.'}), 'slide');

    }


    function buFormReplyComment() {
        var $this = $(this);
        $this.prop('disabled', true);
        var $parent_coment = $this.closest('li');
        $parent_coment.append(
            div({'class': "cf comment-form"}, [
                div({'class': 'non-comment-details cf'}, [
                    input({'type': 'text', 'placeholder': 'Full Name', maxlength: '100'}),
                    input({'type': 'email', 'placeholder': 'Email Address', maxlength: '255'}),
                    input({'type': 'url', 'placeholder': 'Website/Blog (Optional)', maxlength: '100'})
                ]),
                textarea({'placeholder': 'Reply...', maxlength: "1000", 'rows': 2, 'focus': function () {
                    $(this).autosize()
                }}),
                button({'class': 'bu-reply-comment', 'click': buReplyComment}, 'Post'),
                button({'class': 'bu-cancel-reply', 'click': buCancelReply}, 'Cancel')
            ])
        );
        $('html, body').animate({
            scrollTop: ($parent_coment.find('.comment-form').offset().top - 190)
        }, 450);

        $parent_coment.find('input[type="text"]').focus();
    }


    function buCancelReply() {
        var $parent_comment = $(this).closest('li');
        $parent_comment.find('.bu-form-reply-comment').prop('disabled', false);
        $parent_comment.find('.comment-form').remove();
    }

    function buReplyComment() {

        var dict = findCommentFormDetails($(this).closest('li').find('.comment-form'));
        if (!commentFormValidate(dict)) {
            return false;
        }
        dict.parent_comment_id = parseInt($(this).closest('li').attr('data-comment-id'));


        
            go_ajax(_path_name + '/_comments', 'POST', dict, function (ret_dict) {
                console.log(dict);
                ret_dict.parent_comment_id = dict.parent_comment_id;
                ret_dict.created = cur_timestamp();
                ret_dict.content = dict.content;
                ret_dict.name = dict.name;
                ret_dict.website = dict.website;
                perfReplyComment(ret_dict);
            })
        
    }


    function comment(dict, options) {
        options = options ? options : {};
        return li({'class': 'cf slide-left', 'data-comment-id': dict.comment_id}, [
            img({src: dict.img, height: 70, width: 70}),
            div(dict.content),
            div({'class': 'comment-meta'}, [
                dict.relfor ? span(dict.name, { 'class': 'color gab'}) :
                    (dict.website ? a(dict.name, {'href': dict.website, 'class': 'hover-link'}) : span(dict.name)), br(),
                span({'data-timestamp': dict.created, 'data-time-mode': '2'}), br(),
                options.children ?  button({'class': 'bu-form-reply-comment', 'click': buFormReplyComment}) : null
            ]),
            options.children ? ul(options.children) : null
        ])
    }

    function perfReplyComment(dict) {

        if (dict.error) {
            return pop(dict.error, 'error');
        }


        var $parent_comment = $('[data-comment-id=' + dict.parent_comment_id + ']');

        $parent_comment.find('ul').append(comment(dict));


        $parent_comment.find('.comment-form').remove();
        $parent_comment.find('.bu-form-reply-comment').prop('disabled', false);
        pop(p({html: 'Your comment has been posted as of now, however confirmation is <b><i>required</i></b>.<br><br>' +
            'Please check your inbox for the confirmation mail; click on the link given in the email (this link lasts 2 hours)<br><br>' +
            'If this confirmation is not performed, your comment will be <b><i>deleted</i></b> in 2 hours.'}), 'slide');

    }
};
var jam_search_query = $("#query");
var jam_search_suggestions = $('#search-suggestions');
var jam_cur_spotlight;
var previous_search = "";
var search_cache = {};


jam_search_query.focus(function(){
    if (this.value === "Search"){
        this.value = "";
        this.placeholder = "Search";
    }
});

jam_search_query.blur(function(){
    if (this.value === ""){
        this.value = "Search";
        this.placeholder = "";
    }
});



function remove_px(s){
    var start_px = s.indexOf('px');
    if (start_px !== -1){
        return parseInt(s.substr(0, start_px));
    }
}
jam_search_suggestions.css('width',(jam_search_query.width() +
    remove_px(jam_search_query.css('paddingLeft')) + remove_px(jam_search_query.css('paddingRight'))) +
    remove_px(jam_search_query.css('borderLeftWidth')) +
    remove_px(jam_search_query.css('borderRightWidth'))
    + 'px');

$('#search-form').submit(function () {

    var spotlight_link = $('#spotlight').attr('data-link');
    if (this['query'].value !== '') {
        if (spotlight_link === undefined) {
            return true;
        } else {
            window.location.href = spotlight_link;
            return false;
        }
    } return false;

});



jam_search_query.keyup(function (event) {
    if (arrowDown(event)) {
        suggestionsDownKey();
    } else if (arrowUp(event)) {
        suggestionsUpKey();
    }
    var search_query = jam_search_query.val();

    if (search_query !== previous_search) {
        search_cache[previous_search] = jam_search_suggestions.children();
        jam_search_suggestions.empty();
        if (search_cache[search_query] !== undefined) {
            jam_search_suggestions.append(search_cache[search_query]);
        }
        else {
            search_suggest(search_query)
        }
        previous_search = search_query;
    }
    if(jam_search_suggestions.children().length === 0){
        jam_search_suggestions.hide();
    } else{
        jam_search_suggestions.show();
    }
});


jam_search_query.focus(function () {
    var search_query = jam_search_query.val();

    if (search_query !== previous_search) {
        search_cache[previous_search] = jam_search_suggestions.children();
        jam_search_suggestions.empty();
        if (search_cache[search_query] !== undefined) {
            jam_search_suggestions.append(search_cache[search_query]);
        }
        else {
            search_suggest(search_query)
        }
        previous_search = search_query;
    }
});

jam_search_query.blur(function () {
    search_cache[jam_search_query.val()] = jam_search_suggestions.children();
    jam_search_suggestions.empty();
    jam_search_suggestions.hide();
});


function arrowDown(e) {
    return e.keyCode === 40;
}

function arrowUp(e) {
    return e.keyCode === 38;
}


function suggestionsUpKey() {
    if (document.getElementById('spotlight') === null) {
        jam_search_suggestions.children().last().attr('id', 'spotlight');
    } else {
        jam_cur_spotlight = $('#spotlight');
        jam_cur_spotlight.attr('id', '');
        if (jam_cur_spotlight.prev() !== undefined) {
            jam_cur_spotlight.prev().attr('id', 'spotlight');
        } else {
            jam_search_suggestions.children().last().attr('id', 'spotlight');
        }
    }
}

function suggestionsDownKey() {
    if (document.getElementById('spotlight') === null) {
        jam_search_suggestions.children().first().attr('id', 'spotlight');
    } else {
        jam_cur_spotlight = $('#spotlight');
        jam_cur_spotlight.attr('id', '');
        if (jam_cur_spotlight.next() !== undefined) {
            jam_cur_spotlight.next().attr('id', 'spotlight');
        } else {
            jam_search_suggestions.children().first().attr('id', 'spotlight');
        }
    }
}

function search_suggest(search_query) {
    search_query = search_query.toLowerCase();
    
        bring_json('/_search', make_keywords(search_query), perf_search_suggest)
    
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
        return {'other-keywords': refined_keywords, 'last-keyword':raw_keywords.pop()};
    } else{
        return {'other-keywords': refined_keywords, 'last-keyword':''};
    }
}

function perf_search_suggest(results_dict){
    var suggestions = results_dict['suggestions'];
    if (suggestions.length != 0){
        display_search_suggestions();
        for (var i=0; i < suggestions.length; i++){
            add_suggestion(suggestions[i][0],suggestions[i][1],suggestions[i][2]);
        }
    }
}


function display_search_suggestions(){
    var creator_offset = jam_search_query.offset();
    jam_search_suggestions.css('left', creator_offset.left + "px");
    jam_search_suggestions.css('top', (creator_offset.top - $(document).scrollTop() + 33) + "px");
    jam_search_suggestions.show();
}

function add_suggestion(content, type, link) {
    jam_search_suggestions.append(li( {'html':'<div class="icon-sprite-holder ' + type + '-sprite"></div>' + bolden_keywords(decodeURI(content)),
            'mouseover':spotlight_suggestion, 'mouseout':unspotlight_suggestion, 'data-link': '/' + type + '/' + link,
            'mousedown':function () {
                window.location.href = $(this).attr('data-link')
            } }
    ));
}

function spotlight_suggestion() {
    $('#spotlight').attr('id', '');
    $(this).attr('id', 'spotlight');
}

function unspotlight_suggestion() {

    $(this).attr('id', '');
}


function bolden_keywords(content) {
    var search_query = jam_search_query.val().toLowerCase();
    var split_content = content.split(' ');
    var boldened_content = "";
    for (var i = 0; i < split_content.length; i++) {
        if (search_query.indexOf(split_content[i].toLowerCase()) !== -1) {
            boldened_content += '<b>' + split_content[i] + '</b>';
        } else {
            boldened_content += split_content[i];
        }
        boldened_content += " ";
    }

    return boldened_content;
};