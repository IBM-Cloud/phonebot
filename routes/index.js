var xmlparser = require('express-xml-bodyparser'),
    bodyParser = require('body-parser'),
    twilio = require('twilio'),
    phonebot = require('../lib/phonebot.js'),
    cfenv = require('cfenv')

var service_credentials = function (name) {
  var service = cfenv.getAppEnv().getService(name)
  if (!service) {
    console.error('ERROR: Missing service credentials: ' + name)
    process.exit(1)
  }

  return service.credentials
}

var twilio_account = service_credentials('twilio'),
  client = twilio(twilio_account.accountSID, twilio_account.authToken)

var bot = phonebot(client, service_credentials('slack_webhooks'), cfenv.getAppEnv().url)

module.exports = function (app) {
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(xmlparser())

  app.post('/recording/:channel', function (req, res) {
    console.log('--> REQUEST @' + (new Date()).toISOString())

    res.send(bot.phone_message(req.params.channel, req))

    console.log('<-- RESPONSE @' + (new Date()).toISOString())
  })

  app.post('/slackbot', function (req, res) {
    console.log(req.body)
    bot.slack_message(req.body.channel_name, req.body)
  })
}
