# babel try catch loader

This loader using babel to transform a file and wrap all function(include class method and arrow function) with try catch clause,
it collect specific information: filename,function name, line number, using AST(Abstract Syntax Tree) and Source Map. This loader base on
the ouput of babel-loader, include it's generated source and source map.

---

## support options


```
rethrow: true | false;  // rethrow catched error
verbose: true | false; //show verbose log
reporter: String;  //report function name, which should be globally accessed. default name is reportError
tmpdir: String; //a temp directory relate to project root dirctory, to write transformed file， for debug purpose only
```

---

## how to config


use loader query string

```
{
   test: /\.jsx$/,
   loader: 'babel-try-catch-loader?rethrow=true&verbose=true&reporter=reportError&tempdir=.tryCatchLoader!babel-loader',
   exclude: /node_modules/
}
```

or use default options:

```
{
   test: /\.jsx$/,
   loader: 'babel-try-catch-loader!babel-loader',
   exclude: /node_modules/
}
```

### webpack source map config

since this loader is based on babel-loader and it's source map, so you have to enable webpack's source-map config.

```
devtool: 'source-map'
```

---

## output demo

before:

``` javascript
export default class testReact extends React.Component {
    static defaultProps = {
        data: {}
    }

    componentDidMount() {
        console.log('mount....');
    }

    render() {
        return (<p>test</p>);
    }
}

```

after:

```
...
_createClass(testReact, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
        try {
            console.log('mount....');
        } catch (_e) {
            reportError(_e, "testReact.jsx", "componentDidMount", 7);
            throw _e;
        }
    }
}, {
    key: 'render',
    value: function render() {
        try {
            return _react2.default.createElement('p', null, 'test');
        } catch (_e2) {
            reportError(_e2, "testReact.jsx", "render", 11);
            throw _e2;
        }
    }
}]);
...
```
