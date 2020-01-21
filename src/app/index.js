const Loader = require('./loader')
const app = new Loader()

app.listen(app.config.port, '0.0.0.0', () => {
  console.log('Server listening at: ' + app.config.port)
})
