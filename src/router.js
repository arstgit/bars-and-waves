module.exports = app => {
  return {
    'get /': app.controller.root.category,
    'get /category/:category': app.controller.root.category,
    'get /article/:article': app.controller.root.article,

    'get /static/:filepath+': app.controller.static.get,

    'get /favicon.ico': app.controller.redirect.toStatic,
    'get /style.css': app.controller.redirect.toStatic,
    'get /sitemap.xml': app.controller.redirect.toStatic,

    'get /user': app.controller.user.get,

    'get /:unknown*': app.controller.root.unknown
  }
}
