/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    urlTools = require('urltools'),
    AssetGraph = require('../../lib');

describe('relations/JavaScriptServiceWorkerRegistration', function () {
    it('should populate the relation', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptServiceWorkerRegistration'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptServiceWorkerRegistration', 1);
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
            })
            .run(done);
    });
});
