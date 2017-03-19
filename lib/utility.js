"use strict";

var path = require("path");
var fs = require("fs");

var find = function find(start, rel) {
    var file = path.join(start, rel);
    if (fs.existsSync(file)) {
        return file;
    }
    if (start == process.cwd()) {
        return null;
    }
    var up = path.dirname(start);
    if (up !== start) {
        return find(up, rel);
    }
};

var resolveRc = function resolveRc(loc, rel) {
    rel = rel || ".babelrc";
    return find(loc, rel);
};

var ensureDirectoryExistence = function ensureDirectoryExistence(filePath) {
    var dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
};

module.exports.resolveRc = resolveRc;
module.exports.ensureDirectoryExistence = ensureDirectoryExistence;