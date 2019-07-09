const path = require('path');
module.exports = {
    "mode": "development",
    "entry": "./src/web/script.js",
    "output": {
        "path": path.resolve(__dirname, "gen/web/"),
        "filename": "minisql.bundle.js"
    },
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.(?:png|gif|jpe?g|svg)$/,
                use: "url-loader"
            },
            {
                test: /\.css$/,
                use: [
                    { loader: "style-loader" },
                    { loader: "css-loader" }
                ]
            },
            {
                test: /\.html?$/,
                loader: 'file-loader',
                options: {
                    name: '[name].[ext]'
                }
            }
        ]
    }
};