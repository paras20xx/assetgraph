/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    passError = require('../util/passError'),
    query = require('../query'),
    Base = require('./Base');

function CssAlphaImageLoader(config) {
    Base.call(this, config);
}

util.inherits(CssAlphaImageLoader, Base);

_.extend(CssAlphaImageLoader.prototype, {
    baseAssetQuery: {type: 'Html', url: query.isDefined},

    _getRawUrlString: function () {
        var matchUrl = this.cssRule.style[this.propertyName].match(/\bsrc=(\'|\"|)([^\'\"]*)\1/);
        if (matchUrl) {
            return matchUrl[2];
        }
        // Else return undefined
    },

    _setRawUrlString: function (url) {
        var style = this.cssRule.style;
        style[this.propertyName] = style[this.propertyName].replace(/\bsrc=(\'|\"|)(?:[^\'\"]*)\1/, function () {
           return "src='" + url.replace(/([\'\"])/g, "\\$1") + "'";
        });
    },

    remove: function () {
        this.cssRule.style.filter = null; // There can be multiple filters, so this might be a little too brutal
        delete this.cssRule;
    }
});

module.exports = CssAlphaImageLoader;