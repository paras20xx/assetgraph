var _ = require('lodash');

module.exports = function (queryObj) {
    return function flattenStaticIncludes(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'Html'}, queryObj)).forEach(function (initialAsset) {
            var addedAssetsById = {}; // Only add one <link rel='stylesheet'> / <script> per asset.
            assetGraph.findRelations({from: initialAsset, type: ['HtmlScript', 'HtmlRequireJsMain']}).forEach(function (htmlScriptRelation) {
                var existingHtmlStyleRelations = assetGraph.findRelations({type: 'HtmlStyle', from: initialAsset}, true), // includeUnpopulated
                    pathByAssetId = {},
                    insertionPointByRelationType = {};
                if (existingHtmlStyleRelations.length > 0) {
                    insertionPointByRelationType.HtmlStyle = existingHtmlStyleRelations[existingHtmlStyleRelations.length - 1];
                }

                function processRelation(relation, isAmd) {
                    var relationType = {Css: 'HtmlStyle', Less: 'HtmlStyle', Scss: 'HtmlStyle', Sass: 'HtmlStyle', JavaScript: 'HtmlScript'}[relation.to.type],
                        existingRelations = assetGraph.findRelations({from: initialAsset, type: relationType}),
                        insertionPointIndex = existingRelations.indexOf(insertionPointByRelationType[relationType]),
                        existingRelationIndex = -1;

                    for (var i = 0 ; i < existingRelations.length ; i += 1) {
                        if (existingRelations[i].to === relation.to) {
                            existingRelationIndex = i;
                            break;
                        }
                    }
                    if (existingRelationIndex !== -1) {
                        if (existingRelationIndex > insertionPointIndex) {
                            // There's already a relation to that asset, but it's located after the insertion point.
                            // Remove the existing relation and proceed with inserting the new one.
                            assetGraph.removeRelation(existingRelations[existingRelationIndex]);
                        } else {
                            // There's already a relation to that asset, and it's located before the insertion point.
                            // Don't do anything.
                            return;
                        }
                    }

                    if (!addedAssetsById[relation.to.id]) {
                        if ((['Css', 'Less', 'Scss', 'Sass'].indexOf(relation.to.type) !== -1) && (relation.type === 'JavaScriptInclude' || relation.type === 'SystemJsBundle')) {
                            var newHtmlStyle = new assetGraph.HtmlStyle({to: relation.to});
                            if (insertionPointByRelationType.HtmlStyle) {
                                newHtmlStyle.attach(initialAsset, 'after', insertionPointByRelationType.HtmlStyle);
                            } else {
                                newHtmlStyle.attach(initialAsset, 'first');
                            }
                            insertionPointByRelationType.HtmlStyle = newHtmlStyle;
                        } else if (relation.to.type === 'JavaScript' && !isAmd) {
                            var newHtmlScript = new assetGraph.HtmlScript({to: relation.to});
                            if (insertionPointByRelationType.HtmlScript) {
                                newHtmlScript.attach(initialAsset, 'after', insertionPointByRelationType.HtmlScript);
                            } else {
                                // The RequireJS loader must come before the scripts that use it:
                                newHtmlScript.attach(initialAsset, htmlScriptRelation.type === 'HtmlRequireJsMain' ? 'after' : 'before', htmlScriptRelation);
                            }
                            insertionPointByRelationType.HtmlScript = newHtmlScript;
                        } else if (relation.to.type === 'Html' && relation.to.isLoaded && !isAmd) {
                            //Find all inline script templates and insert before <script src=".."></script>
                            assetGraph.findRelations({
                                from: relation.to,
                                type: 'HtmlInlineScriptTemplate'
                            }).forEach(function (htmlInlineScriptTemplate) {
                                htmlInlineScriptTemplate.node = initialAsset.parseTree.importNode(htmlInlineScriptTemplate.node, true);
                                htmlInlineScriptTemplate.attachNodeBeforeOrAfter('before', htmlScriptRelation);
                                initialAsset.markDirty();
                            });
                        }
                        addedAssetsById[relation.to.id] = true;
                    }
                }

                (function traversePostorder(asset, parentIsAmd) {
                    pathByAssetId[asset.id] = true;
                    assetGraph.findRelations({from: asset, type: ['JavaScriptInclude', 'JavaScriptExtJsRequire', 'JavaScriptAmdRequire', 'JavaScriptAmdDefine', 'SystemJsBundle']}).forEach(function (relation) {
                        var isAmd = parentIsAmd || /^JavaScriptAmd/.test(relation.type);
                        if (pathByAssetId[relation.to.id]) {
                            console.warn('transforms.flattenStaticIncludes: Cycle detected: ' + relation);
                        } else {
                            traversePostorder(relation.to, isAmd);
                            processRelation(relation, isAmd);
                            if ((relation.type === 'JavaScriptInclude' || relation.type === 'SystemJsBundle') && relation.to.type !== 'I18n') {
                                if (asset === htmlScriptRelation.to) {
                                    relation.detach();
                                } else {
                                    relation.remove();
                                }
                            }
                        }
                    });
                    pathByAssetId[asset.id] = undefined;
                }(htmlScriptRelation.to));
            });
        });
    };
};
