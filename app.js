var twilio = require('twilio')
var fs = require('fs')
var request = require('request')
var sox = require('sox')
var watson = require('watson-developer-cloud')

var express = require('express'),
  xmlparser = require('express-xml-bodyparser'),
  bodyParser = require('body-parser')

var app = express()

app.use(bodyParser.urlencoded({ extended: true }))
app.use(xmlparser())

var speech_to_text = watson.speech_to_text({
  username: '726d52e4-2aa6-4a9a-b8a8-5a551afbdba0',
  password: 'VAOrqIrEZGot',
  version: 'v1'
})

var transcode_to_16k = function (input, output, cb) {
  var job = sox.transcode(input, output, {
    sampleRate: 16000,
    format: 'wav',
    channelCount: 1
  })
  job.on('error', function (err) {
    console.error(err)
  })
  job.on('progress', function (amountDone, amountTotal) {
    console.log('progress', amountDone, amountTotal)
  })

  job.on('end', function () {
    console.log('Transcoding finished.')
    cb()
  })
  job.start()
}

var speech_request = function (path) {
  var params = {
    audio: fs.createReadStream(path),
    content_type: 'audio/l16; rate=16000'
  }

  console.log('Sending request to Watson...')
  speech_to_text.recognize(params, function (err, res) {
    if (err) {
      console.error(err)
      return
    }

    var result = res.results[res.result_index]
    if (result) {
      console.log(result.alternatives[0].transcript)
    }
  })
}

app.post('/recording', function (req, res) {
  console.log('--> REQUEST @' + (new Date()).toISOString())

  var twiml = new twilio.TwimlResponse()
  twiml.record({playBeep: false, trim: 'do-not-trim', maxLength: 10, timeout: 60})

  if (req.body) {
    var audio_location = req.body.RecordingUrl,
      now = new Date()
    var dest = fs.createWriteStream(now.toISOString() + '.wav')
    dest.on('finish', function () {
      console.log('Finished piping to file...')
      transcode_to_16k(now.toISOString() + '.wav', now.toISOString() + '_16k.wav', function () {
        console.log('Finished transcoding')
        speech_request(now.toISOString() + '_16k.wav')
      })
    })
    request(audio_location).pipe(dest)
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

var server = app.listen(1337, function () {
  var host = server.address().address
  var port = server.address().port

  console.log('Example app listening at http://%s:%s', host, port)
})
