const path = require("path");
const fs = require("fs");

const find = function find(start, rel) {
    const file = path.join(start, rel);
    if (fs.existsSync(file)) {
        return file;
    }
    if (start == process.cwd()) {
        return null;
    }
    const up = path.dirname(start);
    if (up !== start) {
        return find(up, rel);
    }
};


const resolveRc = function (loc, rel) {
    rel = rel || ".babelrc";
    return find(loc, rel);
};


const ensureDirectoryExistence = function (filePath) {
    var dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}

module.exports.resolveRc = resolveRc;
module.exports.ensureDirectoryExistence = ensureDirectoryExistence;