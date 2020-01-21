const fs = require('fs')
const morgan = require('koa-morgan')

// write log file to project root directory
let accessLogStream = fs.createWriteStream(
  __dirname + '/../../data/access.log',
  { flags: 'a' }
)

let logger = morgan('combined', { stream: accessLogStream })
module.exports = logger
