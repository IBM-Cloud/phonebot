var twilio = require('twilio')
var translate = require('./translate.js')
var async = require('async')
var slackbot = require('./slackbot.js')

var cfenv = require('cfenv')
var service = cfenv.getAppEnv().getService('twilio')

var twilio_auth_token = service.credentials.authToken
var client = twilio(service.credentials.accountSID, service.credentials.authToken)

var express = require('express'),
  xmlparser = require('express-xml-bodyparser'),
  bodyParser = require('body-parser')

var app = express()

app.use(bodyParser.urlencoded({ extended: true }))
app.use(xmlparser())

var bot = slackbot('https://hooks.slack.com/services/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')

bot.on('call', function (number) {
  client.makeCall({
    to: number,
    // TODO: None of this should be hardcoded.
    from: '+447728258842',
    url: 'http://40405d27.ngrok.com'
  }, function(err, responseData) {
    if (err) console.log(err)
    //executed when the call has been initiated.
    console.log(responseData); 
  });
})

var queue = async.queue(function (task, callback) {
  var process = function () {
    console.log(task.transcript)
    bot.post(task.transcript)
    callback()
  }

  if (task.transcript) {
    process(task)
  } else {
    task.on('available', process)
  }
}, 1)

var schedule_translation = function (location) {
  var req = translate(location)
  req.start()
  queue.push(req)
}

app.post('/recording', function (req, res) {
  console.log('--> REQUEST @' + (new Date()).toISOString())

  var twiml = new twilio.TwimlResponse()
  twiml.record({playBeep: false, trim: 'do-not-trim', maxLength: 10, timeout: 60})

  if (req.body) {
    var audio_location = req.body.RecordingUrl
    schedule_translation(audio_location)
  }

  res.send(twiml.toString())
  console.log('<-- RESPONSE @' + (new Date()).toISOString())
})

app.post('/', function (req, res) {
  console.log('--> REQUEST @' + (new Date()).toISOString())
  var twiml = new twilio.TwimlResponse()
  twiml.say('Slackbot joining the call').record({action: '/recording', playBeep: false, trim: 'do-not-trim', maxLength: 10, timeout: 60})

  res.send(twiml.toString())
  console.log('<-- RESPONSE @' + (new Date()).toISOString())
})

app.post('/slackbot', function (req, res) {
  console.log(req.body)
  bot.channel_message(req.body)
})

var server = app.listen(1337, function () {
  var host = server.address().address
  var port = server.address().port

  console.log('Example app listening at http://%s:%s', host, port)
})
