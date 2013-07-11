var _ = require('underscore');

var AirForm = function (req) {
    this.req = req;
    this.valid = true;

    this.isValid = function () {
        return this.valid;
    };
    this.resetValid = function () {
        this.valid = true;
    };


    this.xvalidate = function (name, type, dict) {
        var val;
        if (type === 'params') {
            val = this.req.params[name];
        } else if (type === 'body') {
            val = this.req.body[name];
        } else {  //query
            val = this.req.query[name];
        }
        return this.validate(val, dict);
    };

    this.validate = function (val, dict) {

        if (!dict) {
            dict = {}
        }
        if (dict.optional) {
            if (!val) {
                return val;
            }
        }
        if (val === undefined || val === null) {
            this.valid = false;
            return null;
        }

        dict.type = dict.type ? dict.type : 'string';
        var v;
        for (var k in dict) {
            v = dict[k];
            switch (k) {
                case "size":
                    // Precondition: v is either an array or a number

                    // val is either a string or an array
                    var val_length = val.substring ? val.toString().length : val.length;
                    if (Array.isArray(v)) {
                        var min = v[0];
                        var max = v[1];
                        if ((val_length < min) || (val_length > max)) {
                            this.valid = false;
                            return null;
                        }
                    } else {
                        if (val_length !== v) {
                            this.valid = false;
                            return null;
                        }
                    }

                    break;
                case "has to be":
                    for (var i = 0; i < v.length; i++) {
                        switch (v[i]) {
                            case "email":
                                // /[A-Za-z0-9\._%\+\-]+@[A-Za-z0-9\._%\+\-]+\.[A-Za-z]{2,4}/
                                var reg_email = /[A-Za-z0-9\._%\+\-]+@[A-Za-z0-9\._%\+\-]+\.[A-Za-z]{2,4}/;
                                if (!val.match(reg_email)) {
                                    this.valid = false;
                                    return null;
                                }
                                break;
                            case "number-like":
                                if (isNaN(parseInt(val))) {
                                    this.valid = false;
                                    return null;
                                }
                                break;
                            // Reminder of how to do it: http://stackoverflow.com/a/1077692
                            case "upper":
                                if (val.toUpperCase() !== val) {
                                    this.valid = false;
                                    return null;
                                }
                                break;
                            case "lower":
                                if (val.toLowerCase() !== val) {
                                    this.valid = false;
                                    return null;
                                }
                                break;
                        }
                    }
                    break;
                case "type":
                    copy_v = v.toLowerCase();
                    switch (copy_v) {
                        case "array":
                            if (!_.isArray(val)) {this.valid = false; return null;}
                            break;
                        case "string":
                            if (!_.isString(val)) {this.valid = false; return null;}
                            break;
                        case "number":
                            if (!_.isNumber(val)) {this.valid = false; return null;}
                            break;
                        case "object":
                            if (!_.isObject(val)) {this.valid = false; return null;}
                            break;
                        case "boolean":
                            if (!_.isBoolean(val)) {this.valid = false; return null;}
                            break;
                    }
                    break;
                case "has to be in":
                    if (v.indexOf(val) === -1) {
                        this.valid = false;
                        return null;
                    }
                    break;

            }
        }
        return val;

    };

    this.noneNull = function (l) {
        for (var i = 0; i < l.length; i++) {
            if (l[i] === null) {
                return false;
            }
        }
        return true;
    };

    this.nullExists = function (l) {
        return !this.noneNull(l);
    }
};

module.exports = AirForm;