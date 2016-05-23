/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    _ = require('lodash'),
    AssetGraph = require('../../lib');

describe('transforms/bundleRequireJs', function () {
    it('should handle the jquery-require-sample test case', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/jquery-require-sample/webapp/'})
            .registerRequireJsConfig()
            .loadAssets('app.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 1);
            })
            .bundleRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 2);
                expect(htmlScripts[0].href, 'to equal', 'scripts/require.js');
                expect(htmlScripts[1].to, 'to have the same AST as', function () {
                    /* eslint-disable */
                    var jquery = {};
                    define('jquery', function () {}),
                    $.fn.alpha = function ()  {
                        return this.append('<p>Alpha is Go!</p>');
                    },
                    define('jquery.alpha', function () {}),
                    $.fn.beta = function () {
                        return this.append('<p>Beta is Go!</p>');
                    },
                    define('jquery.beta', function () {}),
                    require(['jquery', 'jquery.alpha', 'jquery.beta'], function (n) {
                        n(function () {
                            n('body').alpha().beta();
                        });
                    }),
                    define('main',function () {});
                    /* eslint-enable */
                });
            });
    });

    it('should handle a test case with a text dependency', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/textDependency/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .bundleRequireJs({type: 'Html'})
            .populate({from: { type: 'JavaScript'}})
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 2);
                expect(htmlScripts[0].href, 'to equal', 'require.js');
            });
    });

    it('should handle a test case with a module that has multiple define calls pointing at it', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/multipleIncoming/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'JavaScript');
            })
            .bundleRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 2);
                expect(htmlScripts[0].href, 'to equal', 'require.js');
                expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
                    define('popular', [], function () {
                        return alert('I\'m a popular helper module'), 'foo';
                    }), define('module1', ['popular'], function () {
                        return 'module1';
                    }), define('module2', ['popular'], function () {
                        return 'module2';
                    }), require([
                        'module1',
                        'module2'
                    ], function (e, u) {
                        alert('Got it all!');
                    }), define('main', function () {});
                });
            });
    });

    it('should handle another case with a module that has multiple define calls pointing at it', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/multipleIncoming2/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .bundleRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 2);
                expect(htmlScripts[0].href, 'to equal', 'require.js');
                expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
                    define('module2', [], function () {
                        return 'module2';
                    }), define('module1', ['module2'], function () {
                        return 'module1';
                    }), require([
                        'module1',
                        'module2'
                    ], function (e, n) {
                        alert('Got it all!');
                    }), define('main', function () {});
                });
            });
    });

    it('should handle a test case with a module that is included via a script tag and a JavaScriptAmdRequire relation', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/nonOrphanedJavaScript/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 3);
                expect(assetGraph, 'to contain relations', 'HtmlScript', 2);
            })
            .bundleRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 4);
                expect(htmlScripts[0].href, 'to equal', 'includedInHtmlAndViaRequire.js');
                expect(htmlScripts[1].href, 'to equal', 'require.js');
                expect(htmlScripts[2].to.parseTree, 'to have the same AST as', function () {
                    alert('includedInHtmlAndViaRequire.js');
                    define('includedInHtmlAndViaRequire', function () {});
                });
                expect(htmlScripts[3].to.parseTree, 'to have the same AST as', function () {
                    require(['includedInHtmlAndViaRequire'], function (foo) {
                        alert('Here we are!');
                    });
                    define('main', function () {});
                });
            });
    });

    // No longer supported
    it.skip('should handle a test case that uses require(...) in a regular <script>', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/withoutHtmlRequireJsMain/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
            })
            .bundleRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 5);
                expect(htmlScripts[0].href, 'to equal', 'require.js');
                expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
                    define('popular', function () {
                        alert('I\'m a popular helper module');
                        return 'foo';
                    });
                });
                expect(htmlScripts[2].to.parseTree, 'to have the same AST as', function () {
                    define('module1', ['popular'], function () {
                        return 'module1';
                    });
                });
                expect(htmlScripts[3].to.parseTree, 'to have the same AST as', function () {
                    define('module2', ['popular'], function () {
                        return 'module2';
                    });
                });
                expect(htmlScripts[4].to.parseTree, 'to have the same AST as', function () {
                    require(['module1', 'module2'], function () {
                        alert('Got it all!');
                    });
                });
            });
    });

    it('should handle a test case that uses require(...) to fetch a css file', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/cssRequire/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
            })
            .bundleRequireJs({type: 'Html'})
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlStyle');
                expect(assetGraph, 'to contain asset', 'Css');
                expect(assetGraph, 'to contain relation', 'CssImage');
                expect(assetGraph, 'to contain asset', 'Png');
            });
    });

    it('should handle a test case that includes a GETSTATICURL relation', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/withOneGetStaticUrl/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
                expect(assetGraph, 'to contain relation', 'JavaScriptGetStaticUrl');
                expect(assetGraph, 'to contain relation', 'StaticUrlMapEntry');
                expect(assetGraph, 'to contain asset', 'Png');
            })
            .bundleRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Png');

                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 5);
                expect(htmlScripts[0].to.url, 'to match', /\/require\.js$/);

                expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
                    define('module2', function () {
                        return 'module2, who\'s my url?' + GETSTATICURL('foo.png');
                    });
                });
                expect(htmlScripts[2].to.parseTree, 'to have the same AST as', function () {
                    define('module1', ['module2'], function () {
                        return 'module1';
                    });
                });
                expect(htmlScripts[3].to.parseTree, 'to have the same AST as', function () {
                    define('module3', function () {
                        alert('module3.js');
                    });
                });
                expect(htmlScripts[4].to.parseTree, 'to have the same AST as', function () {
                    require(['module1', 'module2', 'module3'], function (module1, module2, module3) {
                        alert('Got it all');
                    });
                    define('main', function () {});
                });
            });
    });

    it('should handle a umd test case', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/umd/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .bundleRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 3);
                expect(htmlScripts[0].to.url, 'to match', /\/require\.js$/);

                expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
                    define('myumdmodule', function () {
                        return true;
                    });
                });

                expect(htmlScripts[2].to.parseTree, 'to have the same AST as', function () {
                    require(['myumdmodule'], function (myUmdModule) {
                        alert(myUmdModule);
                    });
                    define('main', function () {});
                });
            });
    });

    it('should handle the umd test case without requirejs', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/umdWithoutRequire/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                assetGraph._localstorageText = assetGraph.findAssets({
                    url: /backbone.localStorage.js$/
                })[0].text;
            })
            .bundleRequireJs({type: 'Html', isFragment: false})
            .queue(function (assetGraph) {
                var scriptRelations = assetGraph.findRelations({
                    to: {
                        type: 'JavaScript'
                    }
                });
                expect(scriptRelations, 'to have length', 3);

                var relations = assetGraph.findRelations({type: 'JavaScriptAmdDefine'});
                expect(relations, 'to have length', 0);
            });
    });

    it('should handle a umd test case where the wrapper has a dependency in the define call', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/umdWithDependency/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .bundleRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 4);
                expect(htmlScripts[0].href, 'to equal', 'require.js');
                expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
                    define('someDependency', function () {
                        alert('got the dependency!');
                    });
                });
                expect(htmlScripts[2].to.parseTree, 'to have the same AST as', function () {
                    define('myumdmodule', ['someDependency'], function (someDependency) {
                        return true;
                    });
                });
                expect(htmlScripts[3].to.parseTree, 'to have the same AST as', function () {
                    require(['myumdmodule'], function (myUmdModule) {
                        alert(myUmdModule);
                    });
                    define('main', function () {});
                });
            });
    });

    it('should handle a non-umd test case', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/nonUmd/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .bundleRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 3);
                expect(htmlScripts[0].href, 'to equal', 'require.js');
                expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
                    /* eslint-disable */
                    (function (global){
                        var signals = function () {return true;};

                        if (typeof define === 'function' && define.amd) {
                            define('signals', function () { return signals; });
                        } else if (typeof module !== 'undefined' && module.exports) {
                            module.exports = signals;
                        } else {
                            global['signals'] = signals;
                        }
                   }(this));
                    /* eslint-enable */
                });
                expect(htmlScripts[2].to.parseTree, 'to have the same AST as', function () {
                    /* eslint-disable */
                    require(['signals'], function (myUmdModule) {
                        alert(signals);
                    });
                    /* eslint-enable */
                    define('main', function () {});
                });
            });
    });

    it('should handle a test case with multiple Html files depending on the same modules', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/multipleHtmls/'})
            .registerRequireJsConfig()
            .loadAssets('*.html')
            .populate()
            .bundleRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript', from: {url: /\/index1\.html$/}});
                expect(htmlScripts, 'to have length', 4);
                expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
                    define('someDependency', function () {
                        alert('here is the dependency of the common module');
                    });
                });
                expect(htmlScripts[2].to.parseTree, 'to have the same AST as', function () {
                    define('commonModule', ['someDependency'], function () {
                        alert('here is the common module');
                    });
                });
                expect(htmlScripts[3].to.parseTree, 'to have the same AST as', function () {
                    require(['commonModule'], function (commonModule) {
                        alert('here we are in app1!');
                    });
                    define('app1', function () {});
                });

                htmlScripts = assetGraph.findRelations({type: 'HtmlScript', from: {url: /\/index2\.html$/}});
                expect(htmlScripts, 'to have length', 4);
                expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
                    define('someDependency', function () {
                        alert('here is the dependency of the common module');
                    });
                });
                expect(htmlScripts[2].to.parseTree, 'to have the same AST as', function () {
                    define('commonModule', ['someDependency'], function () {
                        alert('here is the common module');
                    });
                });
                expect(htmlScripts[3].to.parseTree, 'to have the same AST as', function () {
                    require(['commonModule'], function (commonModule) {
                        alert('here we are in app2!');
                    });
                    define('app2', function () {});
                });
            });
    });

    it('should handle a test case using the less! plugin', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/lessPlugin/'})
            .registerRequireJsConfig()
            .loadAssets('index*.html')
            .populate()
            .bundleRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                expect(_.map(assetGraph.findRelations({type: 'HtmlStyle', from: {url: /\/index\.html$/}}), 'href'), 'to equal', [
                    'b.less',
                    'a.less',
                    'c.less'
                ]);

                expect(_.map(assetGraph.findRelations({type: 'HtmlStyle', from: {url: /\/index2\.html$/}}), 'href'), 'to equal', [
                    'b.less',
                    'a.less',
                    'c.less'
                ]);
            });
    });

    it('should handle a test case with a shims config', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/shim/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .queue(function (assetGraph) {
                expect(assetGraph.requireJsConfig.shim, 'to equal', {
                    nonAmdModule1: {deps: ['someDependency']},
                    nonAmdModule2: {exports: 'foo.bar', deps: ['someOtherDependency']}
                });
            })
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptShimRequire', 2);
            })
            .bundleRequireJs()
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 7);
                expect(htmlScripts[0].to.text, 'to match', /var require\s*=/);
                expect(htmlScripts[1].to.url, 'to match', /\/require\.js$/);

                expect(htmlScripts[2].to.parseTree, 'to have the same AST as', function () {
                    alert('someDependency');
                    define('someDependency', function () {});
                });
                expect(htmlScripts[3].to.parseTree, 'to have the same AST as', function () {
                    alert('nonAmdModule1');
                    define('nonAmdModule1', function () {});
                });
                expect(htmlScripts[4].to.parseTree, 'to have the same AST as', function () {
                    alert('someOtherDependency');
                    define('someOtherDependency', function () {});
                });
                expect(htmlScripts[5].to.parseTree, 'to have the same AST as', function () {
                    /* eslint-disable */
                    alert('nonAmdModule2');
                    window.foo = {bar: 'foo dot bar'};
                    define('nonAmdModule2', function () {return foo.bar;});
                    /* eslint-enable */
                });
                expect(htmlScripts[6].to.parseTree, 'to have the same AST as', function () {
                    require(['nonAmdModule1', 'nonAmdModule2'], function (nonAmdModule1, nonAmdModule2) {
                        alert('Got \'em all!');
                    });
                    define('main', function () {});
                });
            });
    });

    it('should handle a test case with a non-string items in the require array', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/nonString/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(_.map(assetGraph.findAssets({type: 'JavaScript'}), 'url').sort(), 'to equal', [
                    assetGraph.root + 'main.js',
                    assetGraph.root + 'require.js',
                    assetGraph.root + 'something.js'
                ]);
            })
            .bundleRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
            });
    });

    it('should handle a test case with relative dependencies', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/relativeDependencies/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(_.map(assetGraph.findAssets({type: 'JavaScript'}), 'url').sort(), 'to equal', [
                    assetGraph.root + 'main.js',
                    assetGraph.root + 'require.js',
                    assetGraph.root + 'subdir/bar.js',
                    assetGraph.root + 'subdir/foo.js',
                    assetGraph.root + 'subdir/subsubdir/quux.js'
                ]);
            })
            .bundleRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 5);

                expect(htmlScripts[0].to.url, 'to match', /\/require\.js$/);
                expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
                    define('subdir/subsubdir/quux', function () {
                        alert('quux!');
                    });
                });

                expect(htmlScripts[2].to.parseTree, 'to have the same AST as', function () {
                    define('subdir/bar', ['./subsubdir/quux'], function (quux) {
                        alert('bar!');
                    });
                });

                expect(htmlScripts[3].to.parseTree, 'to have the same AST as', function () {
                    define('subdir/foo', ['./bar', './subsubdir/quux'], function (bar) {
                        alert('foo!');
                    });
                });

                expect(htmlScripts[4].to.parseTree, 'to have the same AST as', function () {
                    require(['subdir/foo'], function (foo) {
                        alert('Got \'em all!');
                    });
                    define('main', function () {});
                });
            });
    });

    it('should handle a test case with a relative dependencies once again', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/relativeDependencies/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(_.map(assetGraph.findAssets({type: 'JavaScript'}), 'url').sort(), 'to equal', [
                    assetGraph.root + 'main.js',
                    assetGraph.root + 'require.js',
                    assetGraph.root + 'subdir/bar.js',
                    assetGraph.root + 'subdir/foo.js',
                    assetGraph.root + 'subdir/subsubdir/quux.js'
                ]);

                var quuxJs = assetGraph.findAssets({url: /\/quux\.js/})[0];
                quuxJs.url = quuxJs.url.replace(/subsubdir/, 'othersubdir');
            })
            .bundleRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 5);
                expect(htmlScripts[0].href, 'to equal', 'require.js');
                expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
                    define('subdir/othersubdir/quux', function () {
                        alert('quux!');
                    });
                });
                expect(htmlScripts[2].to.parseTree, 'to have the same AST as', function () {
                    define('subdir/bar', ['./othersubdir/quux'], function (quux) {
                        alert('bar!');
                    });
                });
                expect(htmlScripts[3].to.parseTree, 'to have the same AST as', function () {
                    define('subdir/foo', ['./bar', './othersubdir/quux'], function (bar) {
                        alert('foo!');
                    });
                });
                expect(htmlScripts[4].to.parseTree, 'to have the same AST as', function () {
                    require(['subdir/foo'], function (foo) {
                        alert('Got \'em all!');
                    });
                    define('main', function () {});
                });
            });
    });

    it('should handle a test case with a paths config that points jquery at a CDN', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/httpPath/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(_.map(assetGraph.findAssets({type: 'JavaScript', isInline: false}), 'url').sort(), 'to equal', [
                    assetGraph.root + 'main.js',
                    assetGraph.root + 'require.js',
                    'http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js'
                ]);
            });
    });

    it('should handle a test case with a root-relative require alongside a non-root-relative require to the same file', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/rootRelative/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Text');
            })
            .bundleRequireJs()
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 3);
                expect(htmlScripts[0].href, 'to equal', 'require.js');
                expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
                    define('foo.txt', GETTEXT('foo.txt'));
                });
                expect(htmlScripts[2].to.parseTree, 'to have the same AST as', function () {
                    require(['foo.txt', 'foo.txt'], function (fooText1, fooText2) {
                        alert('fooText1=' + fooText1 + ' fooText2=' + fooText2);
                    });
                    define('main', function () {});
                });
            });
    });

    it('should handle a test case with a paths config that maps theLibrary to 3rdparty/theLibrary', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/paths/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
            })
            .bundleRequireJs()
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 5);
                expect(htmlScripts[0].to.url, 'to match', /\/require\.js$/);

                expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
                    define('theLibrary', function () {
                        return 'the contents of theLibrary';
                    });
                });
                expect(htmlScripts[2].to.parseTree, 'to have the same AST as', function () {
                    define('subdir/bar', function () {
                        return 'bar';
                    });
                });
                expect(htmlScripts[3].to.parseTree, 'to have the same AST as', function () {
                    define('subdir/foo', ['./bar'], function (bar) {
                        alert('Got bar: ' + bar);
                        return {};
                    });
                });
                expect(htmlScripts[4].to.parseTree, 'to have the same AST as', function () {
                    require.config({
                        paths: {
                            theLibrary: '3rdparty/theLibrary'
                        }
                    });
                    require(['theLibrary', 'subdir/foo'], function (theLibrary) {
                        alert('Got the library: ' + theLibrary);
                    });
                    define('main', function () {});
                });
            });
    });

    it('should handle a test case with document-relative dependencies', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/documentRelativeDependencies/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', {type: 'JavaScript', isLoaded: true}, 5);
            })
            .bundleRequireJs()
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 5);
                expect(htmlScripts[0].href, 'to equal', 'require.js');
                expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
                    define('/thingAtTheRoot.js', function () {
                        return 'thing at the root';
                    });
                });
                expect(htmlScripts[2].to.parseTree, 'to have the same AST as', function () {
                    define('anotherThingAtTheRoot.js', function () {
                        return 'another thing at the root';
                    });
                });
                expect(htmlScripts[3].to.parseTree, 'to have the same AST as', function () {
                    define('thingInScripts', function () {
                        return 'thing in scripts';
                    });
                });
                expect(htmlScripts[4].to.parseTree, 'to have the same AST as', function () {
                    require(['/thingAtTheRoot.js', 'anotherThingAtTheRoot.js', 'thingInScripts'], function (thingAtTheRoot, anotherThingAtTheRoot, thingInScripts) {
                        alert('got ' + thingAtTheRoot + ', ' + anotherThingAtTheRoot + ', and ' + thingInScripts);
                    });
                    define('main', function () {});
                });
            });
    });

    it('should handle a test case with a data-main that only contains a define (#127)', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/issue127/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
            })
            .bundleRequireJs()
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 2);
                expect(htmlScripts[0].href, 'to equal', 'require.js');
                expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
                    define('main', function () {
                        alert('It gets lonely in here if nobody runs me');
                    });
                    require(['main']);
                });
            });
    });

    /*
    // This is a common mistake that require.js tolerates, although it does have the side effect that the module definition
    // function is run twice. This test case asserts that bundleRequireJs emits an error as the build will be broken.
    it('should handle a test case with a module that is referred to both with and without the .js extension', function (done) {
        var warns = [];
        new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/multipleIncomingWithAndWithoutDotJsSuffix/'})
            .on('warn', function (err) {
                warns.push(err);
            })
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(warns, 'to have length', 0);
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
            })
            .bundleRequireJs()
            .queue(function (assetGraph) {
                expect(warns, 'This test has failed once in a random manner. If you see this again expect it to be a race condition', 'to be ok');
                expect(warns, 'to have length', 1);
                expect(warns[0].message.replace(/^file:\/\/[^\s]* /, ''), 'is referred to as both popular and popular.js, 'to equal', please omit the .js extension in define/require');
            });
    });
    */
    it('should handle a test case with a umdish factory pattern', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/umdishBackboneLocalstorage/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .bundleRequireJs()
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({fileName: /backbone-localstorage/}).pop().parseTree, 'to have the same AST as', function () {
                    (function (root, factory) {
                        if (typeof exports === 'object' && typeof require === 'function') {
                            module.exports = factory(require('underscore'), require('backbone'));
                        } else if (typeof define === 'function' && define.amd) {
                            // AMD. Register as an anonymous module.
                            define('backbone-localstorage', ['underscore', 'backbone'], function (_, Backbone) {
                                // Use global variables if the locals are undefined.
                                return factory(_ || root._, Backbone || root.Backbone);
                            });
                        } else {
                            // RequireJS isn't being used. Assume underscore and backbone are loaded in <script> tags
                            factory(root._, root.Backbone);
                        }
                    })(this, function (_, Backbone) {
                        return 'LOCALSTORAGE';
                    });
                });
            });
    });
});
