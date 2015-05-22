'use strict'

var slackbot = require('./slackbot.js'),
    call_manager = require('./call_manager.js'),
    translate = require('./translate.js'),
    async = require('async'),
    log = require('loglevel')

var PhoneBot = function (client, watson, channels, base_url) {
  this.channels = {}
  this.base_url = base_url
  this.watson = watson

  for (var key in channels) {
    this.channels[key] = {
      bot: this.create_channel_bot(channels[key], key),
      phone: this.create_call_manager(client, key),
      queue: this.create_translation_queue(key)
    }
    log.info('Registering #' + key + ' (' + channels[key] + ')')
  }
}

PhoneBot.prototype.create_channel_bot = function (webhook, channel) {
  var bot = slackbot(webhook)
  var that = this

  bot.on('call', function (number) {
    var phone = that.channels[channel].phone

    if (phone.call_active()) {
      bot.post('The line is busy, you have to hang up first...!')
      return
    }

    phone.call(number, that.base_url + '/' + channel)
    log.info('#' + channel + ': call ' + number)
  })

  bot.on('say', function (text) {
    var phone = that.channels[channel].phone
    phone.say(text)
    log.info('#' + channel + ': say ' + text)
  })

  bot.on('duration', function (duration) {
    var phone = that.channels[channel].phone
    phone.options({duration: duration})
    log.info('#' + channel + ': duration ' + duration)
  })

  bot.on('hangup', function () {
    var phone = that.channels[channel].phone

    if (!phone.call_active()) {
      bot.post('There isn\'t a phone call to hang up...')
      return
    }

    phone.hangup()
    log.info('#' + channel + ': hangup')
  })

  return bot
}

PhoneBot.prototype.create_call_manager = function (client, channel) {
  var phone = call_manager(client, channel)
  var that = this

  phone.on('recording', function (location) {
    that.channels[channel].bot.post(':speech_balloon: _waiting for translation_')
    var req = translate(that.watson, location)
    req.start()
    that.channels[channel].queue.push(req)
  })

  phone.on('queued', function () {
    that.channels[channel].bot.post(':phone: Connecting to ' + phone.active_call.number)
  })

  phone.on('ringing', function () {
    that.channels[channel].bot.post(':phone: Still ringing...')
  })

  phone.on('in-progress', function () {
    that.channels[channel].bot.post(':phone: You\'re connected! :+1:')
  })

  phone.on('completed', function () {
    // If we have translation tasks outstanding, wait until we have finished
    // before posting the call finished message
    if (!that.channels[channel].queue.idle()) {
      that.channels[channel].queue.drain = function () {
        setTimeout(function () {
          that.channels[channel].bot.post(':phone: That\'s it, call over!')
        }, 1000)
        that.channels[channel].queue.drain = null
      }
    } else {
      that.channels[channel].bot.post(':phone: That\'s it, call over!')
    }
  })

  phone.on('canceled', function () {
    that.channels[channel].bot.post(':phone: That\'s it, call over!')
  })

  phone.on('busy', function () {
    that.channels[channel].bot.post(':phone: They were busy, sorry :unamused:')
  })

  phone.on('no-answer', function () {
    that.channels[channel].bot.post(':phone: On no, they didn\'t answer :sleeping:')
  })

  phone.on('failed', function () {
    that.channels[channel].bot.post(':phone: Whoops, something failed. My bad. Try again? :see_no_evil:')
  })

  return phone
}

PhoneBot.prototype.create_translation_queue = function (channel) {
  var that = this

  return async.queue(function (task, callback) {
    var process = function () {
      log.info('Transcription Task Result (' + channel + '): ' + task.location)
      log.info('Transcription Task Result (' + channel + '): ' + task.transcript)
      that.channels[channel].bot.post(':speech_balloon: ' + task.transcript)
      callback()
    }

    var failed = function () {
      log.error('Transcription Task Failed(' + channel + '): ' + task.location)
      that.channels[channel].bot.post(':speech_balloon: _unable to recognise speech_')
      callback()
    }

    if (task.transcript) {
      process(task)
    } if (task.failed) {
      failed()
    } else {
      log.info('Transcription Task Queued(' + channel + '): ' + task.location)
      task.on('available', process)
      task.on('failed', failed)
    }
  }, 1)
}

// Need to handle unknown channel messages.
PhoneBot.prototype.phone_message = function (channel, message) {
  var response = null,
    lookup = this.channels[channel]

  if (lookup) {
    response = lookup.phone.process(message).toString()
    log.trace(response)
  } else {
    log.error('Phone message received for unknown channel: ' + channel)
  }
  return response
}

PhoneBot.prototype.slack_message = function (channel, message) {
  var lookup = this.channels[channel]

  if (lookup) {
    lookup.bot.channel_message(message)
  } else {
    log.error('Slack message received for unknown channel: ' + channel)
  }
}

module.exports = function (client, watson, channels, base_url) {
  return new PhoneBot(client, watson, channels, base_url)
}
