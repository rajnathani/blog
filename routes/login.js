var secret = require('../helpers/secret');
var etc = require('../helpers/etc')

exports.get = function(req,res){

    if (session_key && req.signedCookies.relfor === session_key){
        return res.redirect('/control-panel')
    }
    return res.render('login', {incorrect_password:'none'});
};


exports.post = function(req,res){
    if (req.body.password ===secret.password){
        session_key = etc.generateGUID();
        res.cookie('relfor',session_key,{signed:true});
        return res.redirect('/control-panel');
    } else {
        return res.render('login', {incorrect_password:'block'});
    }
};