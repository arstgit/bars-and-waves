let nodejieba = require('nodejieba')

const TOPN = 40
const MAX_FONT_SIZE = 19
const MIN_FONT_SIZE = 8
const FONT_SIZE_STEP = (MAX_FONT_SIZE - MIN_FONT_SIZE) / TOPN

let strMap = {}

module.exports = {
  extract: function (str) {
    if (strMap[str]) {
      return strMap[str]
    } else {
      let arr = nodejieba.extract(str, TOPN)

      for (let i = 0; i < arr.length; i++) {
        arr[i].fontSize = MIN_FONT_SIZE + i * FONT_SIZE_STEP
      }
      arr = arr.sort(() => 0.5 - Math.random())

      return (strMap[str] = arr)
    }
  },
}
