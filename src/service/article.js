const fs = require('fs')
const path = require('path')

const RANDOM_ARTICLE_NUM = 6

let populated = false
let articleService = {}
module.exports = articleService

let dir = __dirname + '/../../article'
let article = load(dir)

articleService.article = article
articleService.get = async function (expectedLang, fileName) {
  await populateArticle(article)

  let result = []
  Object.keys(article).map((lang) => {
    if (lang !== expectedLang) return

    Object.keys(article[lang]).map((category) => {
      Object.keys(article[lang][category]).map((articleName) => {
        if (articleName === fileName) {
          result.push(article[lang][category][articleName])
        }
      })
    })
  })
  return result
}

articleService.getRandomList = async function (expectedLang) {
  await populateArticle(article)
  let result = []
  Object.keys(article).map((lang) => {
    if (lang !== expectedLang) return

    Object.keys(article[lang]).map((category) => {
      Object.keys(article[lang][category]).map((articleName) => {
        result.push(article[lang][category][articleName])
      })
    })
  })

  result = result.sort((a, b) => 0.5 - Math.random())
  result = result.slice(0, RANDOM_ARTICLE_NUM)
  return result
}

articleService.getAllStr = async function (expectedLang) {
  let str = ''
  let objList = await articleService.getList(expectedLang, null)
  objList.map((obj) => (str += obj.content))
  return str
}

articleService.getList = async function (expectedLang, expectedCategory) {
  await populateArticle(article)
  let result = []

  Object.keys(article).map((lang) => {
    if (lang !== expectedLang) return

    Object.keys(article[lang]).map((category) => {
      if (expectedCategory && category !== expectedCategory) return

      Object.keys(article[lang][category]).map((articleName) => {
        result.unshift(article[lang][category][articleName])
      })
    })
  })

  if (!expectedCategory) {
    result = result.sort((a, b) => {
      if (a.date < b.date) {
        return 1
      } else {
        return -1
      }
    })
  }
  return result
}

async function populateArticle(article) {
  if (populated === true) return
  populated = true

  for (let lang of Object.keys(article)) {
    for (let type of Object.keys(article[lang])) {
      for (let articleName of Object.keys(article[lang][type])) {
        let content = await article[lang][type][articleName]
        let newlineIndex = content.indexOf('\n')
        let newArticle = (article[lang][type][articleName] = {
          fileName: articleName,
        })
        newArticle.content = content.substring(newlineIndex + 2)
        newArticle.date = articleName.split('_')[0]
        newArticle.digest = content.split('\n')[2].substring(0, 150)
        newArticle.digest2 = content.split('\n')[2].substring(0, 40)

        let title = content.split('\n')[0]
        newArticle.title = title.substring(2)
        newArticle.category = type
      }
    }
  }
}

function load(dir) {
  let files = fs.readdirSync(dir)

  let result = {}

  files.forEach((file) => {
    let ext = path.extname(file)

    let baseName = path.basename(file, ext)

    if (baseName.startsWith('.')) return

    if (result[baseName]) return

    let abs = path.resolve(dir, file)

    if (fs.statSync(abs).isDirectory()) {
      result[baseName] = load(abs)
    } else {
      ;['.md'].forEach((ext) => {
        if (abs.endsWith(ext)) {
          result[baseName] = fs.promises.readFile(abs, { encoding: 'utf8' })
        }
      })
    }
  })

  return result
}
