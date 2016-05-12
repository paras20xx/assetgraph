/*jshint unused:false*/
var _ = require('lodash'),
    fs = require('fs'),
    Promise = require('rsvp').Promise,
    passError = require('passerror'),
    esanimate = require('esanimate'),
    async = require('async'),
    urlTools = require('urltools'),
    getTemporaryFilePath = require('gettemporaryfilepath'),
    AssetGraph = require('../../lib');

module.exports = function (options) {
    options = options || {};
    return function bundleRequireJs(assetGraph, done) {
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
                requireJs.optimize(_.defaults({
                    baseUrl: urlTools.fileUrlToFsPath(requireJsConfig.baseUrl || assetGraph.root),
                    name: entryPoint.node.getAttribute('data-main'),
                    out: outBundleFile,
                    generateSourceMaps: true,
                    preserveLicenseComments: false
                }, requireJsConfig), function (buildResponse) {
                    //buildResponse is just a text output of the modules
                    //included. Load the built file for the contents.
                    //Use config.out to get the optimized file contents.
                    fs.readFile(outBundleFile, 'utf-8', passError(cb, function (contents) {
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
            }, done);
        } else {
            done();
        }
    };
};
