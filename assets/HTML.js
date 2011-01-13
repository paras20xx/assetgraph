var util = require('util'),
    _ = require('underscore'),
    jsdom = require('jsdom'),
    error = require('../error'),
    makeBufferedAccessor = require('../makeBufferedAccessor'),
    relations = require('../relations'),
    Base = require('./Base').Base;

function HTML(config) {
    Base.call(this, config);
}

util.inherits(HTML, Base);

_.extend(HTML.prototype, {
    getParseTree: makeBufferedAccessor('parseTree', function (cb) {
        var that = this;
        this.getSrc(error.passToFunction(cb, function (src) {
            that.parseTree = jsdom.jsdom(src, undefined, {features: {ProcessExternalResources: [], FetchExternalResources: []}});
            cb(null, that.parseTree);
        }));
    }),

    getOriginalRelations: makeBufferedAccessor('originalRelations', function (cb) {
        var that = this;
        this.getParseTree(error.passToFunction(cb, function (parseTree) {
            var originalRelations = [];
            _.toArray(parseTree.getElementsByTagName('*')).forEach(function (node) {
                var nodeName = node.nodeName.toLowerCase();
                if (nodeName === 'script') {
                    if (node.src) {
                        originalRelations.push(new relations.HTMLScript({
                            from: that,
                            node: node,
                            assetConfig: {
                                url: node.src
                            }
                        }));
                    } else {
                        originalRelations.push(new relations.HTMLScript({
                            from: that,
                            node: node,
                            assetConfig: {
                                type: 'JavaScript',
                                src: node.firstChild.nodeValue
                            }
                        }));
                    }
                } else if (nodeName === 'style') {
                    originalRelations.push(new relations.HTMLStyle({
                        from: that,
                        node: node,
                        assetConfig: {
                            type: 'CSS',
                            src: node.firstChild.nodeValue
                        }
                    }));
                } else if (nodeName === 'link') {
                    if ('rel' in node) {
                        var rel = node.rel.toLowerCase();
                        if (rel === 'stylesheet') {
                            originalRelations.push(new relations.HTMLStyle({
                                from: that,
                                node: node,
                                assetConfig: {
                                    url: node.href
                                }
                           }));
                        } else if (/^(?:shortcut |apple-touch-)?icon$/.test(rel)) {
                            originalRelations.push(new relations.HTMLShortcutIcon({
                                from: that,
                                node: node,
                                assetConfig: {
                                    url: node.href
                                }
                            }));
                        }
                    }
                } else if (nodeName === 'img') {
                    originalRelations.push(new relations.HTMLImage({
                        from: that,
                        node: node,
                        assetConfig: {
                            url: node.src
                        }
                    }));
                } else if (nodeName === 'iframe') {
                    originalRelations.push(new relations.HTMLIFrame({
                        from: that,
                        node: node,
                        assetConfig: {
                            url: node.src
                        }
                    }));
                }
            }, this);
            cb(null, originalRelations);
        }));
    }),

    attachRelation: function (newRelation, existingRelationOrNode, position) {
        position = position || 'after';
        var existingNode = existingRelationOrNode.node || existingRelationOrNode;
        _.extend(newRelation, {
            from: this,
            node: newRelation.createNode(this.parseTree)
        });

        var parentNode = existingNode.parentNode;
        if (position === 'before') {
            parentNode.insertBefore(newRelation.node, existingNode);
        } else {
            parentNode.insertBefore(newRelation.node, existingNode.nextSibling);
        }
    }
});

exports.HTML = HTML;
