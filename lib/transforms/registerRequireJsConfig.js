var urlTools = require('urltools');
var escodegen = require('escodegen');
var estraverse = require('estraverse');
var esanimate = require('esanimate');
var _ = require('lodash');

module.exports = function (options) {
    options = options || {};
    return function registerRequireJsConfig(assetGraph) {
        var requireJsConfig = (assetGraph.requireJsConfig = assetGraph.requireJsConfig || {});
        var systemJsConfig = (assetGraph.systemJsConfig = assetGraph.systemJsConfig || {
            configStatements: [],
            topLevelSystemImportCalls: []
        });

        var seenByAssetId = {};

        requireJsConfig.registerConfigInJavaScript = function (javaScript, baseAsset) {
            if (seenByAssetId[javaScript.id]) {
                return;
            }
            seenByAssetId[javaScript.id] = true;
            if (!baseAsset) {
                var incomingRelationsFromHtml = assetGraph.findRelations({to: javaScript, from: {type: 'Html'}});
                if (incomingRelationsFromHtml.length > 0) {
                    baseAsset = incomingRelationsFromHtml[0].from.nonInlineAncestor; // Could be a conditional comment.
                } else {
                    baseAsset = javaScript;
                }
            }
            if (baseAsset) {
                var htmlUrl = baseAsset.url,
                    extractRequireJsConfig = function (objAst) {
                        // FIXME: Refine this (deep extend?)
                        _.extend(requireJsConfig, esanimate.objectify(objAst));
                    };

                estraverse.traverse(javaScript.parseTree, {
                    enter: function (node) {
                        if (node.type === 'CallExpression' &&
                            node.callee.type === 'MemberExpression' &&
                            !node.callee.computed &&
                            node.callee.object.type === 'Identifier' &&
                            node.callee.object.name === 'System' &&
                            node.callee.property.type === 'Identifier' &&
                            node.arguments.length === 1) {

                            if (node.callee.property.name === 'config') {
                                systemJsConfig.foundConfig = true;
                                assetGraph.systemJsConfig.configStatements.push({ asset: javaScript, node: node });
                            } else if (node.callee.property.name === 'import') {
                                systemJsConfig.topLevelSystemImportCalls.push({
                                    argumentString: node.arguments[0].value,
                                    asset: javaScript,
                                    node: node
                                });
                            }
                        } else if (node.type === 'ExpressionStatement' &&
                            node.expression.type === 'CallExpression' &&
                            node.expression.callee.type === 'MemberExpression' &&
                            !node.expression.callee.computed &&
                            node.expression.callee.property.name === 'config' &&
                            node.expression.callee.object.type === 'Identifier' &&
                            node.expression.arguments.length > 0 &&
                            node.expression.arguments[0].type === 'ObjectExpression' &&
                            (node.expression.callee.object.name === 'require' || node.expression.callee.object.name === 'requirejs')) {
                            // require.config({})
                            requireJsConfig.foundConfig = true;
                            extractRequireJsConfig(node.expression.arguments[0]);
                        } else if (node.type === 'VariableDeclaration') {
                            node.declarations.forEach(function (declarator) {
                                if ((declarator.id.type === 'Identifier' && (declarator.id.name === 'require' || declarator.id.name === 'requirejs')) && declarator.init && declarator.init.type === 'ObjectExpression') {
                                    // var require = {}
                                    // var requirejs = {}
                                    requireJsConfig.foundConfig = true;
                                    extractRequireJsConfig(declarator.init);
                                }
                            });
                        } else if (node.type === 'AssignmentExpression' &&
                                   node.left.type === 'Identifier' &&
                                   node.operator === '=' &&
                                   node.right.type === 'ObjectExpression' &&
                                   (node.left.name === 'require' || node.left.name === 'requirejs')) {
                            // require = {}
                            // requirejs = {}
                            requireJsConfig.foundConfig = true;
                            extractRequireJsConfig(node.right);
                        } else if (node.type === 'AssignmentExpression' &&
                                   node.left.type === 'MemberExpression' &&
                                   !node.left.computed &&
                                   node.operator === '=' &&
                                   node.left.object.type === 'Identifier' &&
                                   node.left.object.name === 'window' &&
                                   (node.left.property.name === 'require' || node.left.property.name === 'requirejs') &&
                                   node.right.type === 'ObjectExpression') {
                            // window.require = {}
                            // window.requirejs = {}
                            requireJsConfig.foundConfig = true;
                            extractRequireJsConfig(node.right);
                        } else if (node.type === 'AssignmentExpression' &&
                                   node.left.type === 'MemberExpression' &&
                                   !node.left.computed &&
                                   node.left.object.type === 'Identifier' &&
                                   node.left.object.name === 'require' &&
                                   node.left.property.name === 'baseUrl' &&
                                   node.right.type === 'Literal' &&
                                   typeof node.right.value === 'string') {
                            // require.config.baseUrl = '...'
                            requireJsConfig.baseUrl = assetGraph.resolveUrl(htmlUrl.replace(/[^\/]+([\?#].*)?$/, ''), node.right.value.replace(/\/?$/, '/'));
                        }
                    }
                });
            }
        };

        // Find config in all previously loaded JavaScript assets
        assetGraph.findAssets({ type: 'JavaScript' }).forEach(function (asset) {
            if (!requireJsConfig.assumeRequireJsConfigHasBeenFound) {
                requireJsConfig.registerConfigInJavaScript(asset);
            }
        });

        // Run config detection on all new incoming JavaScript assets
        assetGraph.on('addAsset', function (asset) {
            if (asset.type === 'JavaScript' && (requireJsConfig.preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound || (!requireJsConfig.foundConfig && !systemJsConfig.foundConfig))) {
                if (requireJsConfig.preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound) {
                    asset.keepUnpopulated = true;
                }
                if (asset.isLoaded) {
                    requireJsConfig.registerConfigInJavaScript(asset);
                } else {
                    asset.on('load', function () {
                        requireJsConfig.registerConfigInJavaScript(asset);
                    });
                }
            }
        });
    };
};
