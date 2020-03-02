const ratelimit = require('koa-ratelimit')

const db = new Map()

module.exports = ratelimit({
  driver: 'memory',
  db: db,
  duration: 60000,
  errorMessage: 'Sometimes You Just Have to Slow Down.',
  id: ctx => ctx.ip,
  headers: {
    remaining: 'Rate-Limit-Remaining',
    reset: 'Rate-Limit-Reset',
    total: 'Rate-Limit-Total'
  },
  max: 100,
  disableHeader: false,
  whitelist: ctx => {
    // some logic that returns a boolean
  },
  blacklist: ctx => {
    // some logic that returns a boolean
  }
})
