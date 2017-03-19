'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _babelHelperFunctionName = require('babel-helper-function-name');

var _babelHelperFunctionName2 = _interopRequireDefault(_babelHelperFunctionName);

var _babelTemplate = require('babel-template');

var _babelTemplate2 = _interopRequireDefault(_babelTemplate);

var _babelTypes = require('babel-types');

var t = _interopRequireWildcard(_babelTypes);

var _sourceMap = require('source-map');

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
 stack format:
 ${error.name}: ${error.message}
 at ${functionName} (${fileNameOrUrl}:line:column)
 at ${functionName} (${fileNameOrUrl}:line:column)
 .
 .
 .
 */

var wrapFunctionRethrow = (0, _babelTemplate2.default)('{\n  try {\n    BODY\n  } catch(ERROR_VARIABLE_NAME) {\n    REPORT_ERROR(ERROR_VARIABLE_NAME, FILENAME, FUNCTION_NAME, LINE)\n    throw ERROR_VARIABLE_NAME\n  }\n}');

var wrapFunctionNothrow = (0, _babelTemplate2.default)('{\n  try {\n    BODY\n  } catch(ERROR_VARIABLE_NAME) {\n    REPORT_ERROR(ERROR_VARIABLE_NAME, FILENAME, FUNCTION_NAME, LINE)\n  }\n}');

var markErrorResolved = (0, _babelTemplate2.default)('\n  ERROR._r = true\n');

var markErrorUnresolved = (0, _babelTemplate2.default)('\n  delete ERROR._r\n');

var shouldSkip = function () {
    var records = new Map();

    return function (path, state, fileName, sourceLineMap) {
        if (state.end) {
            return true;
        }
        // ignore generated code
        if (!path.node.loc) {
            return true;
        }
        //only process functon which has source map
        var loc = path.node.loc;
        var sourceLine = sourceLineMap[loc.start.line];
        if (!sourceLine) {
            return true;
        }

        // ignore processed nodes
        var nodeType = path.node.type;
        if (!records.has(nodeType)) {
            records.set(nodeType, new Set());
        }
        var recordsOfThisType = records.get(nodeType);
        var sourceLocation = fileName + ':' + path.node.start + '-' + path.node.end;
        var hasRecord = recordsOfThisType.has(sourceLocation);
        recordsOfThisType.add(sourceLocation);
        return hasRecord;
    };
}();

// function name reporting error, default: 'reportError'
var reportError = void 0;

var wrapFunction = void 0;

var sourceLineMap = void 0;

var fileName = void 0;

exports.default = {
    pre: function pre(file) {
        reportError = this.opts.reportError || 'reportError';
        wrapFunction = this.opts.rethrow ? wrapFunctionRethrow : wrapFunctionNothrow;
        if (this.opts.sourceMap) {
            var sourceMap = new _sourceMap.SourceMapConsumer(this.opts.sourceMap);
            fileName = sourceMap._sources._array[0];
            sourceLineMap = {};
            sourceMap.eachMapping(function (mappingItem) {
                sourceLineMap[mappingItem.generatedLine] = mappingItem.originalLine;
            });
        }
        if (!sourceLineMap) {
            throw new Error('source map is illegal');
        }
    },

    visitor: {
        "Function": {
            exit: function exit(path, state) {
                if (shouldSkip(path, state, fileName, sourceLineMap)) {
                    return;
                }

                // ignore empty function body
                var body = path.node.body.body;
                if (body.length === 0) {
                    return;
                }

                //gather function name
                var functionName = 'anonymous function';
                (0, _babelHelperFunctionName2.default)(path);
                if (path.node.id) {
                    functionName = path.node.id.name || 'anonymous function';
                }
                if (path.node.key) {
                    functionName = path.node.key.name || 'anonymous function';
                }

                var loc = path.node.loc;
                var sourceLine = sourceLineMap[loc.start.line];
                var errorVariableName = path.scope.generateUidIdentifier('e');

                path.get('body').replaceWith(wrapFunction({
                    BODY: body,
                    FILENAME: t.StringLiteral(_path2.default.basename(fileName)),
                    FUNCTION_NAME: t.StringLiteral(functionName),
                    LINE: t.NumericLiteral(sourceLine),
                    REPORT_ERROR: t.identifier(reportError),
                    ERROR_VARIABLE_NAME: errorVariableName
                }));
            }
        }
    }
};