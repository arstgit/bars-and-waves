module.exports = {
  async toStatic(ctx, service, app) {
    ctx.status = 301
    ctx.redirect('/static' + ctx.path)
  },
}
