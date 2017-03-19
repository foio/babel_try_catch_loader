import functionNameHelper from 'babel-helper-function-name'
import template from 'babel-template'
import * as t from 'babel-types'
import {SourceMapConsumer} from 'source-map'
import nodePath  from 'path'

/*
 stack format:
 ${error.name}: ${error.message}
 at ${functionName} (${fileNameOrUrl}:line:column)
 at ${functionName} (${fileNameOrUrl}:line:column)
 .
 .
 .
 */

const wrapFunctionRethrow = template(`{
  try {
    BODY
  } catch(ERROR_VARIABLE_NAME) {
    REPORT_ERROR(ERROR_VARIABLE_NAME, FILENAME, FUNCTION_NAME, LINE)
    throw ERROR_VARIABLE_NAME
  }
}`)

const wrapFunctionNothrow = template(`{
  try {
    BODY
  } catch(ERROR_VARIABLE_NAME) {
    REPORT_ERROR(ERROR_VARIABLE_NAME, FILENAME, FUNCTION_NAME, LINE)
  }
}`)


const markErrorResolved = template(`
  ERROR._r = true
`)

const markErrorUnresolved = template(`
  delete ERROR._r
`)

const shouldSkip = (() => {
    const records = new Map

    return (path, state, fileName, sourceLineMap) => {
        if (state.end) {
            return true
        }
        // ignore generated code
        if (!path.node.loc) {
            return true
        }
        //only process functon which has source map
        const loc = path.node.loc;
        const sourceLine = sourceLineMap[loc.start.line];
        if (!sourceLine) {
            return true;
        }

        // ignore processed nodes
        const nodeType = path.node.type
        if (!records.has(nodeType)) {
            records.set(nodeType, new Set)
        }
        const recordsOfThisType = records.get(nodeType)
        const sourceLocation = `${fileName}:${path.node.start}-${path.node.end}`
        const hasRecord = recordsOfThisType.has(sourceLocation)
        recordsOfThisType.add(sourceLocation)
        return hasRecord
    }
})()

// function name reporting error, default: 'reportError'
let reportError

let wrapFunction

let sourceLineMap

let fileName

export default {
    pre(file) {
        reportError = this.opts.reportError || 'reportError'
        wrapFunction = this.opts.rethrow ? wrapFunctionRethrow : wrapFunctionNothrow;
        if (this.opts.sourceMap) {
            let sourceMap = new SourceMapConsumer(this.opts.sourceMap);
            fileName = sourceMap._sources._array[0];
            sourceLineMap = {};
            sourceMap.eachMapping(function (mappingItem) {
                sourceLineMap[mappingItem.generatedLine] = mappingItem.originalLine;
            });
        }
        if (!sourceLineMap) {
            throw new Error('source map is illegal')
        }
    },
    visitor: {
        "Function": {
            exit(path, state) {
                if (shouldSkip(path, state, fileName, sourceLineMap)) {
                    return
                }

                // ignore empty function body
                const body = path.node.body.body
                if (body.length === 0) {
                    return
                }

                //gather function name
                let functionName = 'anonymous function';
                functionNameHelper(path);
                if (path.node.id) {
                    functionName = path.node.id.name || 'anonymous function';
                }
                if (path.node.key) {
                    functionName = path.node.key.name || 'anonymous function';
                }

                const loc = path.node.loc
                const sourceLine = sourceLineMap[loc.start.line];
                const errorVariableName = path.scope.generateUidIdentifier('e')

                path.get('body').replaceWith(wrapFunction({
                    BODY: body,
                    FILENAME: t.StringLiteral(nodePath.basename(fileName)),
                    FUNCTION_NAME: t.StringLiteral(functionName),
                    LINE: t.NumericLiteral(sourceLine),
                    REPORT_ERROR: t.identifier(reportError),
                    ERROR_VARIABLE_NAME: errorVariableName,
                }))
            }
        }
    }
}