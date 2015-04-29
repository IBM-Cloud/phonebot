var tmp = require('tmp'),
  fs = require('fs'),
  Promise = require('promise'),
  sox = require('sox'),
  request = require('request'),
  watson = require('watson-developer-cloud')

var EventEmitter = require('events').EventEmitter

var temp_wav_file = Promise.denodeify(tmp.file)

var speech_to_text = watson.speech_to_text({
  username: '726d52e4-2aa6-4a9a-b8a8-5a551afbdba0',
  password: 'VAOrqIrEZGot',
  version: 'v1'
})

var Translate = function (location) {
  this.location = location
}

Translate.prototype = new EventEmitter()

Translate.prototype.transcode_to_16k = function () {
  var that = this
  var promise = new Promise(function (resolve, reject) {
    var job = sox.transcode(that.source, that.upsample, {
      sampleRate: 16000,
      format: 'wav',
      channelCount: 1
    })
    job.on('error', function (err) {
      console.error(err)
      reject(err)
    })
    job.on('end', function () {
      resolve()
    })
    job.start()
  })

  return promise
}

Translate.prototype.download_source = function () {
  var that = this

  var promise = new Promise(function (resolve, reject) {
    var source_stream = fs.createWriteStream(that.source)
    source_stream.on('finish', resolve)

    request(that.location).pipe(source_stream)
  })

  return promise
}

Translate.prototype.translate_to_text = function () {
  var that = this

  var params = {
    audio: fs.createReadStream(this.upsample),
    content_type: 'audio/l16; rate=16000'
  }

  speech_to_text.recognize(params, function (err, res) {
    if (err) {
      console.error(err)
      return
    }

    var result = res.results[res.result_index]
    if (result) {
      that.transcript = result.alternatives[0].transcript
      that.emit('available')
    }
  })
}

Translate.prototype.tmp_files = function () {
  var that = this
  var temp_files = [temp_wav_file({postfix: '.wav'}), temp_wav_file({postfix: '.wav'})]

  return Promise.all(temp_files).then(function (results) {
    that.source = results[0]
    that.upsample = results[1]
  })
}

Translate.prototype.start = function () {
  this.tmp_files()
    .then(this.download_source.bind(this))
    .then(this.transcode_to_16k.bind(this))
    .then(this.translate_to_text.bind(this))
}

module.exports = function (location) {
  return new Translate(location)
}
