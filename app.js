var twilio = require('twilio')
var translate = require('./translate.js')
var async = require('async')
var slackbot = require('./slackbot.js')
var call_manager = require('./call_manager.js')

var cfenv = require('cfenv')
var service = cfenv.getAppEnv().getService('twilio')

var client = twilio(service.credentials.accountSID, service.credentials.authToken)

var express = require('express'),
  xmlparser = require('express-xml-bodyparser'),
  bodyParser = require('body-parser')

var app = express()

app.use(bodyParser.urlencoded({ extended: true }))
app.use(xmlparser())

var channel_call_mgr = {}

var channel_bots = {
}

var create_bot = function (channel, webhook) {
  var bot = slackbot(webhook)
  channel_bots[channel] = bot

  // Need to handle disconnection & active calls
  bot.on('call', function (number) {
    var call_mgr = get_call_mgr(channel)

    if (call_mgr.is_active()) {
      bot.post('The line is busy, you have to hang up first...!')
      return
    }

    call_mgr.call(number, 'http://40405d27.ngrok.com/' + channel)
  })

  bot.on('say', function (text) {
    get_call_mgr(channel).say(text)
  })

  bot.on('duration', function (duration) {
    get_call_mgr(channel).options({duration: duration})
  })

  bot.on('hangup', function () {
    var call_mgr = get_call_mgr(channel)

    if (!call_mgr.is_active()) {
      bot.post('There isn\'t a phone call to hang up...')
      return
    }

    call_mgr.hangup()
  })
}

// Should come from CFENV
create_bot('slackbot-testing', 'https://hooks.slack.com/services/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')

var get_call_mgr = function (channel) {
  if (!channel_call_mgr[channel]) {
    channel_call_mgr[channel] = call_manager(client, channel)
    listen_to_events(channel_call_mgr[channel], channel)
  }

  return channel_call_mgr[channel]
}

var listen_to_events = function (call_mgr, channel) {
  call_mgr.on('recording', function (location) {
    var req = translate(location)
    req.channel = channel
    req.start()
    queue.push(req)
  })
  // .. add event handlers to listen and post call state changes to the channel
}

var queue = async.queue(function (task, callback) {
  var process = function () {
    console.log(task.transcript)
    channel_bots[task.channel].post(task.transcript)
    callback()
  }

  if (task.transcript) {
    process(task)
  } else {
    task.on('available', process)
  }
}, 1)

app.post('/recording/:channel', function (req, res) {
  console.log('--> REQUEST @' + (new Date()).toISOString())

  var channel = req.params.channel

  var twiml = get_call_mgr(channel).process(req)
  res.send(twiml.toString())

  console.log('<-- RESPONSE @' + (new Date()).toISOString())
})

app.post('/slackbot', function (req, res) {
  console.log(req.body)
  var channel = req.body.channel_name
  channel_bots[channel].channel_message(req.body)
})

var server = app.listen(1337, function () {
  var host = server.address().address
  var port = server.address().port

  console.log('Example app listening at http://%s:%s', host, port)
})
