#!/usr/bin/env node

// Clone of http://www.nczonline.net/blog/2009/11/03/automatic-data-uri-embedding-in-css-files/

var fs = require('fs'),
    AssetGraph = require('../lib/AssetGraph'),
    urlTools = require('../lib/util/urlTools'),
    transforms = AssetGraph.transforms,
    commandLineOptions = require('optimist')
        .usage('$0 [--root <urlOrDirectory>] [-o <outputCssFileName>] <inputCssFileName>')
        .demand(1)
        .argv;

new AssetGraph({root: commandLineOptions.root}).queue(
    transforms.loadAssets(commandLineOptions._.map(urlTools.fsFilePathToFileUrl)),
    transforms.populate({
        followRelations: {type: 'CssImage'}
    }),
    transforms.inlineRelations({type: 'CssImage'}),
    function(assetGraph) {
        var initialCssAsset = assetGraph.findAssets({isInitial: true})[0];
        if (commandLineOptions.o) {
            fs.writeFileSync(commandLineOptions.o, initialCssAsset.rawSrc, null);
        } else {
            process.stdout.write(initialCssAsset.rawSrc);
        }
    }
).run();
