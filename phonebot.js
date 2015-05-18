var slackbot = require('./slackbot.js'),
    call_manager = require('./call_manager.js'),
    translate = require('./translate.js'),
    async = require('async')

var PhoneBot = function (client, channels, base_url) {
  this.channels = {}
  this.base_url = base_url

  for(var key in channels) {
    this.channels[key] = {
      bot: this.create_channel_bot(channels[key], key),
      phone: this.create_call_manager(client, key),
      queue: this.create_translation_queue(key)
    }
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
  })

  bot.on('say', function (text) {
    var phone = that.channels[channel].phone
    phone.say(text)
  })

  bot.on('duration', function (duration) {
    var phone = that.channels[channel].phone
    phone.options({duration: duration})
  })

  bot.on('hangup', function () {
    var phone = that.channels[channel].phone

    if (!phone.call_active()) {
      bot.post('There isn\'t a phone call to hang up...')
      return
    }

    phone.hangup()
  })

  return bot
}

PhoneBot.prototype.create_call_manager = function (client, channel) {
    var phone = call_manager(client, channel)
    that = this

    phone.on('recording', function (location) {
      var req = translate(location)
      req.start()
      that.channels[channel].queue.push(req)
    })

    return phone
}

PhoneBot.prototype.create_translation_queue = function (channel) {
  var that = this

  return async.queue(function (task, callback) {
    var process = function () {
      console.log(task.transcript)
      that.channels[channel].bot.post(task.transcript)
      callback()
    }

    if (task.transcript) {
      process(task)
    } else {
      task.on('available', process)
    }
  }, 1)
}

module.exports = function (client, channels, base_url) {
  return new PhoneBot(client, channels, base_url)
}
