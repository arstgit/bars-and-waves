const child_process = require('child_process')

const REFRESH_INTERVAL = 100 * 1000

let fortune
let str

refresh()
setInterval(refresh, REFRESH_INTERVAL)

module.exports = {
  get: () => {
    return str
  },
}

function refresh() {
  str = ''
  fortune = child_process.spawn('/usr/games/fortune', [])
  fortune.stdout.on('data', (data) => (str += data))
  fortune.on('exit', (code) => {
    if (code !== 0) {
      console.log('fortune exit code: ' + code)
    }
    let i = str.indexOf('\t\t--')
    if (i === -1) return
    str =
      str.slice(0, i) +
      '<p id="fortune-author" style="text-align: right"> ' +
      str.slice(i, -1) +
      '</p>'
  })
}
