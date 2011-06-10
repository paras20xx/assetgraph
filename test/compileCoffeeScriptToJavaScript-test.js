var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms,
    query = AssetGraph.query;

vows.describe('Compiling CoffeeScript to JavaScript').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/compileCoffeeScriptToJavaScript/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate({followRelations: {to: {url: query.not(/^http:/)}}})
            ).run(this.callback);
        },
        'the graph should contain two CoffeeScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'CoffeeScript'}).length, 2);
        },
        'then run the compileCoffeeScriptToJavaScript transform': {
            topic: function (assetGraph) {
                assetGraph.queue(transforms.compileCoffeeScriptToJavaScript({type: 'CoffeeScript'})).run(this.callback);
            },
            'the graph should contain no CoffeeScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'CoffeeScript'}).length, 0);
            },
            'the graph should contain two JavaScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
            },
            'then get the Html asset as text': {
                topic: function (assetGraph) {
                    assetGraph.getAssetText(assetGraph.findAssets({type: 'Html'})[0], this.callback);
                },
                'there should be no occurrences of "text/coffeescript"': function (text) {
                    assert.equal(text.indexOf('text/coffeescript'), -1);
                }
            }
        }
    }
})['export'](module);