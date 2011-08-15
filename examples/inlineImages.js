#!/usr/bin/env node

var AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

AssetGraph({root: __dirname + '/inlineImages'}).queue(
    transforms.loadAssets('*.html'),
    transforms.populate(),
    transforms.inlineRelations({type: ['HtmlImage', 'CssImage']}),
    transforms.writeAssetsToStdout({type: 'Html'})
).run();
