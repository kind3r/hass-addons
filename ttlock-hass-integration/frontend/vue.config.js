module.exports = {
  publicPath: process.env.NODE_ENV === 'production'
  ? './'
  : '/',
  "devServer": {
    "disableHostCheck": true,
    "proxy": {
      "/api": {
        "target": "ws://localhost:55099/"
      }
    }
  },
  "transpileDependencies": [
    "vuetify"
  ]
}