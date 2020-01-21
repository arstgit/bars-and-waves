module.exports = {
  async get(ctx, service, app) {
    if (ctx.path.endsWith('css')) {
      ctx.type = 'text/css'
    }
    ctx.body = await service.static.readFileAsync(
      __dirname + '/../../static/' + ctx.params.filepath
    )
  }
}
