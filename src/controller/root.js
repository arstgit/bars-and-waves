module.exports = {
  async category(ctx, service, app) {
    let articleList = await service.article.getList(ctx.params.category)
    let randomArticleList = await service.article.getRandomList()
    let pageType = 'digest'

    ctx.body = await app.ejs.renderFileAsync(
      'ejs/root.ejs',
      { locale: ctx.custom.locale, pageType, articleList, randomArticleList },
      null
    )
  },

  async article(ctx, service, app) {
    let fileName = ctx.params.article
    let articleList = await service.article.get(fileName)
    let pageType = 'detail'

    ctx.body = await app.ejs.renderFileAsync(
      'ejs/root.ejs',
      {
        locale: ctx.custom.locale,
        pageType,
        articleList,
        markdown: app.markdown.compile
      },
      null
    )
  },

  async unknown(ctx, service, app) {
    ctx.body = await app.ejs.renderFileAsync(
      'ejs/unknown.ejs',
      { locale: ctx.custom.locale },
      null
    )
  }
}
