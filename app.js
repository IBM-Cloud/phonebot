var twilio = require('twilio')
var phonebot = require('./phonebot.js')

var cfenv = require('cfenv')
var service = cfenv.getAppEnv().getService('twilio')

var client = twilio(service.credentials.accountSID, service.credentials.authToken)

var express = require('express'),
  xmlparser = require('express-xml-bodyparser'),
  bodyParser = require('body-parser')

var app = express()

app.use(bodyParser.urlencoded({ extended: true }))
app.use(xmlparser())

// TODO: Get creds and set up routes...
var bot = phonebot(client, {'slackbot-testing': 'https://hooks.slack.com/services/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'}, 'http://...')

app.post('/recording/:channel', function (req, res) {
  console.log('--> REQUEST @' + (new Date()).toISOString())

  var channel = req.params.channel

  var twiml = bot.phone_message(channel, req)
  res.send(twiml.toString())

  console.log('<-- RESPONSE @' + (new Date()).toISOString())
})

app.post('/slackbot', function (req, res) {
  console.log(req.body)
  var channel = req.body.channel_name
  bot.slack_message(channel, req.body)
})

var server = app.listen(1337, function () {
  var host = server.address().address
  var port = server.address().port

  console.log('Example app listening at http://%s:%s', host, port)
})
