var express = require('express'),
    cfenv = require('cfenv'),
    log = require('loglevel')

log.setLevel('info')

var app = express()
require('./routes')(app)

var server = app.listen(cfenv.getAppEnv().port, function () {
  var host = server.address().address
  var port = server.address().port

  log.info('Example app listening at http://%s:%s', host, port)
})
