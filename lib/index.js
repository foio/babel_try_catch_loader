"use strict";

var fs = require("fs");
var path = require('path');
var babel = require('babel-core');
var loaderUtils = require("loader-utils");
var assign = require("object-assign");
var tryCatchWrapper = require('./plugin/index').default;
var utility = require("./utility");

module.exports = function (source, inputMap) {
    var webpackRemainingChain = loaderUtils.getRemainingRequest(this).split("!");
    var absoulteFilename = webpackRemainingChain[webpackRemainingChain.length - 1];
    var loaderOptions = loaderUtils.parseQuery(this.query);
    var globalOptions = this.options.babelTryCatchLoader || {};
    var userOptions = assign({}, globalOptions, loaderOptions);
    var filename = path.relative(process.cwd(), absoulteFilename);
    var transOpts = {
        babelrc: false,
        inputSourceMap: inputMap,
        sourceRoot: process.cwd(),
        filename: filename,
        env: userOptions.forceEnv || process.env.BABEL_ENV || process.env.NODE_ENV,
        plugins: [[tryCatchWrapper, {
            sourceMap: inputMap,
            reportError: userOptions.reporter,
            rethrow: userOptions.rethrow
        }]],
        sourceMaps: true
    };
    try {
        var result = babel.transform(source, transOpts);
        if (userOptions.verbose) {
            console.log('try catch file [' + filename + '] succed');
        }
        if (userOptions.tempdir) {
            var filename = path.resolve(process.cwd(), userOptions.tempdir, filename);
            utility.ensureDirectoryExistence(filename);
            fs.writeFileSync(filename, result.code);
        }
        this.callback(null, result.code, result.map);
    } catch (ex) {
        if (userOptions.verbose) {
            console.log('try catch  file [' + filename + '] failed');
        }
        throw ex;
    }
};