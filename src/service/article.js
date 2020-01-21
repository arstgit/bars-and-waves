const fs = require('fs')
const path = require('path')

let populated = false
let articleService = {}
module.exports = articleService

let dir = __dirname + '/../../article'
let article = load(dir)

articleService.article = article
articleService.get = async function(fileName) {
  await populateArticle(article)

  let result = []
  for (let type of Object.keys(article)) {
    for (let articleName of Object.keys(article[type])) {
      if (articleName === fileName) {
        result.push(article[type][articleName])
      }
    }
  }
  return result
}

articleService.getRandomList = async function() {
  await populateArticle(article)
  let result = []
  for (let type of Object.keys(article)) {
    for (let articleName of Object.keys(article[type])) {
      result.push(article[type][articleName])
    }
  }
  result = result.sort((a, b) => 0.5 - Math.random())
  result = result.slice(0, 5)
  return result
}

articleService.getList = async function(category) {
  await populateArticle(article)
  let result = []
  for (let type of Object.keys(article)) {
    if (category && type !== category) continue

    for (let articleName of Object.keys(article[type])) {
      result.unshift(article[type][articleName])
    }
  }

  if (!category) {
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

  for (let type of Object.keys(article)) {
    for (let articleName of Object.keys(article[type])) {
      let content = await article[type][articleName]
      let newlineIndex = content.indexOf('\n')
      article[type][articleName] = { fileName: articleName }
      article[type][articleName].content = content.substring(newlineIndex + 2)
      article[type][articleName].date = articleName.split('_')[0]
      article[type][articleName].digest = content
        .split('\n')[2]
        .substring(0, 150)
      article[type][articleName].digest2 = content
        .split('\n')[2]
        .substring(0, 40)

      let title = content.split('\n')[0]
      article[type][articleName].title = title.substring(2)
      article[type][articleName].category = type
    }
  }
}

function load(dir) {
  let files = fs.readdirSync(dir)

  let result = {}

  files.forEach(file => {
    let ext = path.extname(file)

    let baseName = path.basename(file, ext)

    if (baseName.startsWith('.')) return

    if (result[baseName]) return

    let abs = path.resolve(dir, file)

    if (fs.statSync(abs).isDirectory()) {
      result[baseName] = load(abs)
    } else {
      ;['.md'].forEach(ext => {
        if (abs.endsWith(ext)) {
          result[baseName] = fs.promises.readFile(abs, { encoding: 'utf8' })
        }
      })
    }
  })

  return result
}
