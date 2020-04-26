const ARTICLE_NUM_PER_PAGE = 6
const MIN_PAGE = 1
const MAX_PAGE = 20

module.exports = {
  async category(ctx, service, app) {
    initLang(ctx)

    let curPageNum, maxPageNum, prevPageNum, nextPageNum
    curPageNum = getPage(ctx)

    let articleList = await service.article.getList(
      ctx.custom.lang,
      ctx.params.category
    )

    maxPageNum = Math.ceil(articleList.length / ARTICLE_NUM_PER_PAGE)
    prevPageNum = curPageNum - 1
    nextPageNum = curPageNum + 1
    if (nextPageNum > maxPageNum) nextPageNum = maxPageNum
    if (prevPageNum < MIN_PAGE) prevPageNum = MIN_PAGE

    let initArticleNum = ARTICLE_NUM_PER_PAGE * (curPageNum - 1)
    articleList = articleList.slice(
      initArticleNum,
      initArticleNum + ARTICLE_NUM_PER_PAGE
    )

    let randomArticleList = await service.article.getRandomList(ctx.custom.lang)

    let allStr = await service.article.getAllStr(ctx.custom.lang)
    let tags = app.jieba.extract(allStr)

    let fortune = service.fortune.get()

    let pageType = 'digest'
    ctx.body = await app.ejs.renderFileAsync(
      'ejs/root.ejs',
      {
        lang: ctx.custom.lang,
        locale: (str) => app.locale(str, ctx.custom.lang),
        pageType,
        articleList,
        randomArticleList,
        pathExcludeLang: pathExcludeLang(ctx.path),
        nextPageNum,
        prevPageNum,
        curPageNum,
        maxPageNum,
        pathExcludePage: getPathExcludePage(ctx.path),
        tags,
        fortune,
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
        locale: (str) => app.locale(str, ctx.custom.lang),
        pageType,
        articleList,
        markdown: app.markdown.compile,
        pathExcludeLang: pathExcludeLang(ctx.path),
      },
      null
    )
  },

  async unknown(ctx, service, app) {
    initLang(ctx)

    ctx.body = await app.ejs.renderFileAsync(
      'ejs/unknown.ejs',
      {
        locale: (str) => app.locale(str, ctx.custom.lang),
        pathExcludeLang: '/',
      },
      null
    )
    ctx.status = 404
  },
}

function initLang(ctx) {
  let lang = ctx.params.lang
  //if (!lang) lang = ctx.get('Accept-Language').includes('zh-CN') ? 'zh' : 'en'
  if (!lang) lang = 'zh'

  ctx.custom.lang = lang
}

function pathExcludeLang(path) {
  if (path.startsWith('/en') || path.startsWith('/zh')) {
    return path.substring(3)
  }
  return path
}

function getPathExcludePage(path) {
  let regex = /^(.*?)(\/page\/\d+\/?)?$/
  let result = regex.exec(path)
  path = result[1]
  if (!path.endsWith('/')) path = path + '/'
  path = path + 'page/'
  return path
}

function getPage(ctx) {
  let page = ctx.params.page
  if (!page) return MIN_PAGE

  page = parseInt(page)

  if (page < MIN_PAGE || page > MAX_PAGE) page = 1

  return page
}
