let util = require('util')
let ejs = require('ejs')
let LRU = require('lru-cache')

let options = { max: 100 }
ejs.cache = new LRU(options)

let ejsPlugin = {}
module.exports = ejsPlugin

ejsPlugin.renderFileAsync = util.promisify(ejs.renderFile)
