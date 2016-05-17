/*jshint unused:false*/
var _ = require('lodash'),
    fs = require('fs'),
    passError = require('passerror'),
    async = require('async'),
    urlTools = require('urltools'),
    getTemporaryFilePath = require('gettemporaryfilepath'),
    AssetGraph = require('../../lib');

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
                        cb();
                    }));
                }, cb);
            }, cb);
        } else {
            cb();
        }
    };
};
