/*jshint unused:false*/
var _ = require('lodash');
var fs = require('fs');
var pathModule = require('path');
var passError = require('passerror');
var async = require('async');
var urlTools = require('urltools');
var getTemporaryFilePath = require('gettemporaryfilepath');
var AssetGraph = require('../../lib');

module.exports = function (options) {
    options = options || {};
    return function bundleRequireJs(assetGraph, cb) {
        var requireJsConfig = assetGraph.requireJsConfig;
        if (!requireJsConfig) {
            return;
        }
        var requireJs;
        var entryPoints = [];
        assetGraph.findRelations({type: 'HtmlScript'}).forEach(function (htmlScript) {
            var dataMain = htmlScript.node.getAttribute('data-main');
            if (dataMain) {
                entryPoints.push(htmlScript);
            }
        });

        if (entryPoints.length > 0) {
            try {
                requireJs = require('requirejs');
            } catch (e) {
                throw new Error('urgh' + e.stack);
            }

            async.eachLimit(entryPoints, 1, function (entryPoint, cb) {
                var outBundleFile = getTemporaryFilePath({suffix: '.js'});
                var dataMain = entryPoint.node.getAttribute('data-main');
                var baseUrl = urlTools.fileUrlToFsPath(requireJsConfig.baseUrl || assetGraph.root);
                var lastIndexOfSlash = dataMain.lastIndexOf('/');
                if (lastIndexOfSlash !== -1) {
                    baseUrl = assetGraph.resolveUrl(baseUrl, dataMain.slice(0, lastIndexOfSlash));
                    dataMain = dataMain.slice(lastIndexOfSlash + 1, dataMain.length);
                }
                requireJs.optimize(_.defaults({
                    siteRoot: urlTools.fileUrlToFsPath(assetGraph.root), // https://github.com/guybedford/require-css#siteroot-configuration
                    baseUrl: baseUrl,
                    name: dataMain,
                    out: outBundleFile,
                    generateSourceMaps: true,
                    preserveLicenseComments: false
                }, requireJsConfig), function (buildResponse) {
                    //buildResponse is just a text output of the modules
                    //included. Load the built file for the contents.
                    //Use config.out to get the optimized file contents.
                    fs.readFile(outBundleFile, 'utf-8', passError(cb, function (contents) {
                        var sourceMapFileName;
                        contents = contents.replace(/\/\/[@#]\s*sourceMappingURL=([\w-\.]+)\s*$/, function ($0, sourceMapUrl) {
                            sourceMapFileName = pathModule.resolve(pathModule.dirname(outBundleFile), decodeURIComponent(sourceMapUrl));
                            return '';
                        });
                        fs.unlink(outBundleFile, function () {});
                        var bundleAsset = new AssetGraph.JavaScript({
                            text: contents,
                            url: assetGraph.root + 'bundle.js',
                            sourceMap: undefined
                        });
                        new AssetGraph.HtmlScript({
                            to: bundleAsset
                        }).attach(entryPoint.from, 'after', entryPoint);
                        assetGraph.addAsset(bundleAsset);
                        if (sourceMapFileName) {
                            fs.readFile(sourceMapFileName, 'utf-8', passError(cb, function (sourceMapContents) {
                                fs.unlink(sourceMapFileName, function () {});
                                bundleAsset.sourceMap = JSON.parse(sourceMapContents);
                                proceed();
                            }));
                        } else {
                            proceed();
                        }
                        function proceed() {
                            var outCssFileName = outBundleFile.replace(/\.js$/, '.css');
                            // See if
                            fs.stat(outCssFileName, function (err, stats) {
                                if (err || !stats.isFile()) {
                                    return cb();
                                }
                                fs.readFile(outCssFileName, 'utf-8', passError(cb, function (cssContents) {
                                    if (cssContents) {
                                        var cssBundleAsset = new AssetGraph.Css({
                                            text: cssContents,
                                            url: assetGraph.root + 'bundle.css',
                                            sourceMap: undefined
                                        });
                                        var htmlStyle = new AssetGraph.HtmlStyle({to: cssBundleAsset});
                                        var existingHtmlStyles = assetGraph.findRelations({from: entryPoint.from, type: 'HtmlStyle'});
                                        var lastExistingHtmlStyle = existingHtmlStyles[existingHtmlStyles.length - 1];
                                        htmlStyle.attach(entryPoint.from, lastExistingHtmlStyle ? 'after' : 'first', lastExistingHtmlStyle);
                                        assetGraph.addAsset(cssBundleAsset);
                                    }
                                    cb();
                                }));
                            });
                        }
                    }));
                }, cb);
            }, cb);
        } else {
            cb();
        }
    };
};
