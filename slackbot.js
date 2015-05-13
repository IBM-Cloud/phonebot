var request = require('request'),
  util = require('util'),
  EventEmitter = require('events').EventEmitter

function Slackbot (outgoing) {
  this.COMMANDS = {
    'help': 'Hello! This is Phonebot. You can make telephone calls using the \'call\' command.',
    'call': this.call
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

Slackbot.prototype.call = function (text) {
  var message = 'Phonebot Command: call PHONE_NUMBER <-- Dials the phone number.'
  var numbers = text.match(/\d+/g)

  if (numbers) {
    message = 'Calling... ' + numbers.join(' ') + ' *ring* *ring*'
    this.emit('call', numbers.join(''))
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
    response = command(words.slice(2).join(' '))
  }

  this.post(response)
}

module.exports = function (outgoing) {
  return new Slackbot(outgoing)
}
