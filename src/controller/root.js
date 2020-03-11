function initLang(ctx) {
  let lang = ctx.params.lang
  if (!lang) lang = ctx.get('Accept-Language').includes('zh-CN') ? 'zh' : 'en'

  ctx.custom.lang = lang
}

function pathExcludeLang(path) {
  if (path.startsWith('/en') || path.startsWith('/zh')) {
    return path.substring(3)
  }
  return path
}

module.exports = {
  async category(ctx, service, app) {
    initLang(ctx)

    let articleList = await service.article.getList(
      ctx.custom.lang,
      ctx.params.category
    )
    let randomArticleList = await service.article.getRandomList(ctx.custom.lang)
    let pageType = 'digest'

    ctx.body = await app.ejs.renderFileAsync(
      'ejs/root.ejs',
      {
        lang: ctx.custom.lang,
        locale: str => app.locale(str, ctx.custom.lang),
        pageType,
        articleList,
        randomArticleList,
        pathExcludeLang: pathExcludeLang(ctx.path)
      },
      null
    )
  },

  async article(ctx, service, app) {
    initLang(ctx)

    let fileName = ctx.params.article
    let articleList = await service.article.get(ctx.custom.lang, fileName)
    let pageType = 'detail'

    ctx.body = await app.ejs.renderFileAsync(
      'ejs/root.ejs',
      {
        lang: ctx.custom.lang,
        locale: str => app.locale(str, ctx.custom.lang),
        pageType,
        articleList,
        markdown: app.markdown.compile,
        pathExcludeLang: pathExcludeLang(ctx.path)
      },
      null
    )
  },

  async unknown(ctx, service, app) {
    initLang(ctx)

    ctx.body = await app.ejs.renderFileAsync(
      'ejs/unknown.ejs',
      { locale: str => app.locale(str, ctx.custom.lang), pathExcludeLang: '/' },
      null
    )
  }
}
