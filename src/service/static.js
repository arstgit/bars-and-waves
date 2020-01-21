let fs = require('fs')
let util = require('util')

module.exports = {
  readFileAsync: util.promisify(fs.readFile)
}
