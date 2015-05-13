var twilio = require('twilio')
var translate = require('./translate.js')
var async = require('async')
var slackbot = require('./slackbot.js')

var cfenv = require('cfenv')
var service = cfenv.getAppEnv().getService('twilio')

var client = twilio(service.credentials.accountSID, service.credentials.authToken)

var express = require('express'),
  xmlparser = require('express-xml-bodyparser'),
  bodyParser = require('body-parser')

var app = express()

app.use(bodyParser.urlencoded({ extended: true }))
app.use(xmlparser())

var bot = slackbot('https://hooks.slack.com/services/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')

var call_replies = [],
  duration = 10,
  active_call = null

var hangup = function (cb) {
  if (!active_call) {
    return
  }

  client.calls(active_call).update({
    status: 'completed'
  }, function (err, call) {
    if (err) console.log(err)

    console.log(call.direction)
    active_call = null
    cb()
  })
}

// Need to handle disconnection & active calls
bot.on('call', function (number) {
  // TODO: Hang up active calls.

  client.makeCall({
    to: number,
    // TODO: None of this should be hardcoded.
    from: '+447728258842',
    url: 'http://40405d27.ngrok.com'
  }, function (err, responseData) {
    if (err) console.log(err)
    console.log(responseData)
    active_call = responseData.sid
  })
})

bot.on('say', function (text) {
  call_replies.push(text)
})

bot.on('duration', function (_) {
  duration = _
})

bot.on('hangup', function () {
  if (!active_call) {
    bot.post('There isn\'t a phone call to hang up...')
    return
  }

  hangup(function () {
    bot.post('Phone call terminated!')
  })
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

  if (call_replies.length) {
    var user_speech = call_replies.join(' ')
    call_replies = []
    twiml.say(user_speech)
  }

  twiml.record({playBeep: false, trim: 'do-not-trim', maxLength: duration, timeout: 60})

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
  twiml.say('Hello this is Phonebot').record({action: '/recording', playBeep: false, trim: 'do-not-trim', maxLength: duration, timeout: 60})

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
