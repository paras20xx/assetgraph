var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    replaceDescendantNode = require('../replaceDescendantNode'),
    Relation = require('./Relation');

function JavaScriptServiceWorkerRegistration(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptServiceWorkerRegistration, Relation);

extendWithGettersAndSetters(JavaScriptServiceWorkerRegistration.prototype, {
    get href() {
        return this.node.arguments[0].value;
    },

    set href(href) {
        this.node.arguments[0].value = href;
    },

    inline: function () {
        throw new Error('JavaScriptServiceWorkerRegistration.inline(): Not supported');
    },

    attach: function () {
        throw new Error('JavaScriptServiceWorkerRegistration.attach(): Not implemented');
    },

    detach: function () {
        throw new Error('JavaScriptServiceWorkerRegistration.detach(): Not implemented');
    }
});

module.exports = JavaScriptServiceWorkerRegistration;
