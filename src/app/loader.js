const Koa = require('koa')
const Router = require('koa-router')
const requireDir = require('ya-require-dir')

const config = require('ya-config-loader').load('../..')

let controller = requireDir('../controller')
let service = requireDir('../service')
let routerF = require('../router')
let plugin = requireDir('../plugin')

module.exports = Loader

function Loader() {
  if (!(this instanceof Loader)) {
    return new Loader()
  }

  this.config = config
  this.controller = controller

  let koaRouter = new Router()
  let router = routerF(this)
  let me = this
  Object.assign(me, plugin)
  Object.keys(router).forEach((key) => {
    const [method, path] = key.split(' ')
    koaRouter[method](path, async function (ctx) {
      await router[key](ctx, service, me)
    })
  })

  this.use(this.logger)

  this.use(this.ratelimiter)

  this.use(async (ctx, next) => {
    ctx.custom = {}

    await next()
  })

  this.use(koaRouter.routes())

  this.on('error', (err, ctx) => {
    console.error(err)
  })
}

//Loader.prototype = Object.create(Koa.prototype)
Loader.prototype = new Koa()
