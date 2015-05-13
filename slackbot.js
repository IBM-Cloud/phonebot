var request = require('request'),
  util = require('util'),
  EventEmitter = require('events').EventEmitter

function Slackbot (outgoing) {
  this.COMMANDS = {
    'help': 'Hello! This is Phonebot. You can make telephone calls using the \'call\' command.',
    'call': this.call,
    'say': this.say,
    'duration': this.duration,
    'hangup': this.emit.bind(this, 'hangup')
  }

  this.outgoing = outgoing
}

util.inherits(Slackbot, EventEmitter)

Slackbot.prototype.post = function (text) {
  request({
    url: this.outgoing,
    body: {text: text, username: 'phonebot', icon_emoji: ':phone:'},
    json: true
  })
}

Slackbot.prototype.call = function (text, channel) {
  var message = 'Phonebot Command: call PHONE_NUMBER <-- Dials the phone number.'
  var numbers = text.match(/\d+/g)

  if (numbers) {
    message = 'Calling... ' + numbers.join(' ') + ' *ring* *ring*'
    this.emit('call', numbers.join(''), channel)
  }
  return message
}

Slackbot.prototype.say = function (text) {
  var message = 'Phonebot Command: say TEXT...<-- Sends text as speech to the call.'
  if (text.length) {
    this.emit('say', text)
  }
  return message
}

Slackbot.prototype.duration = function (text) {
  var message = 'Phonebot Command: duration NUMBER<-- Modify audio recording duration' +
    'for translation. Smaller durations mean faster translations but greater audio gaps.'

  var number = text.match(/\d+/)
  if (number) {
    message = ''
    this.emit('duration', number[0])
  }

  return message
}

Slackbot.prototype.channel_message = function (message) {
  var response = "What's up?"

  var words = message.text.split(' '),
    command = this.COMMANDS[words[1]]

  if (typeof command === 'string') {
    response = command
  } else if (typeof command === 'function') {
    response = command.call(this, words.slice(2).join(' '), message.channel_id)
  }

  if (typeof response === 'string') this.post(response)
}

module.exports = function (outgoing) {
  return new Slackbot(outgoing)
}
