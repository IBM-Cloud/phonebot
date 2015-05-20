var tmp = require('tmp'),
  fs = require('fs'),
  util = require('util'),
  Promise = require('promise'),
  sox = require('sox'),
  request = require('request'),
  log = require('loglevel')

var EventEmitter = require('events').EventEmitter

var temp_wav_file = Promise.denodeify(tmp.file)

var Translate = function (speech_to_text, location) {
  this.transcript = null
  this.location = location
  this.speech_to_text = speech_to_text
}

util.inherits(Translate, EventEmitter)

Translate.prototype.error = function (message) {
  if (message) log.error(message)

  this.emit('failed')
}

Translate.prototype.transcode_to_16k = function () {
  var that = this
  var promise = new Promise(function (resolve, reject) {
    var job = sox.transcode(that.source, that.upsample, {
      sampleRate: 16000,
      format: 'wav',
      channelCount: 1
    })
    job.on('error', function (err) {
      that.error(err)
      reject(err)
    })
    job.on('end', function () {
      log.debug('Translation Audio Converted (' + that.source + '): ' + that.upsample)
      resolve()
    })
    job.start()
  })

  return promise
}

Translate.prototype.download_source = function () {
  log.debug('Retrieving Audio Recording Source: ' + this.source)
  var that = this

  var promise = new Promise(function (resolve, reject) {
    var source_stream = fs.createWriteStream(that.source)
    source_stream.on('finish', resolve)

    request(that.location)
      .on('error', reject)
      .pipe(source_stream)
  })

  return promise
}

Translate.prototype.translate_to_text = function () {
  log.debug('Translating audio recording (upsampled): ' + this.upsample)
  var that = this

  var params = {
    audio: fs.createReadStream(this.upsample),
    content_type: 'audio/l16; rate=16000'
  }

  this.speech_to_text.recognize(params, function (err, res) {
    log.trace('Watson Service Response: ' + JSON.stringify(res))
    if (err) {
      that.error(err)
      return
    }

    var result = res.results[res.result_index]
    if (result) {
      that.transcript = result.alternatives[0].transcript
      that.emit('available')
    } else {
      that.error('Missing speech recognition result.')
    }
  })
}

Translate.prototype.tmp_files = function () {
  var that = this
  var temp_files = [temp_wav_file({postfix: '.wav'}), temp_wav_file({postfix: '.wav'})]

  return Promise.all(temp_files).then(function (results) {
    that.source = results[0]
    that.upsample = results[1]
  }, this.error.bind(this))
}

Translate.prototype.start = function () {
  var err = this.error.bind(this)
  this.tmp_files()
    .then(this.download_source.bind(this), err)
    .then(this.transcode_to_16k.bind(this), err)
    .then(this.translate_to_text.bind(this), err)
}

module.exports = function (speech_to_text, location) {
  return new Translate(speech_to_text, location)
}
