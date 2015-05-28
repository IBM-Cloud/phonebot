'use strict'

var request = require('request'),
  util = require('util'),
  EventEmitter = require('events').EventEmitter,
  log = require('loglevel')

function Slackbot (outgoing) {
  this.COMMANDS = {
    'help': 'Hello! This is Phonebot. You can make telephone calls using the \'call\' command.',
    'call': this.call,
    'say': this.say,
    'duration': this.duration,
    'verbose': this.verbose,
    'hangup': this.emit.bind(this, 'hangup')
  }

  this.outgoing = outgoing
}

util.inherits(Slackbot, EventEmitter)

Slackbot.prototype.post = function (text) {
  log.info('Slackbot.post (' + this.outgoing + '): ' + text)
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
    message = ':phone: Let me try to put you through...'
    this.emit('call', numbers.join(''))
  }
  return message
}

Slackbot.prototype.say = function (text) {
  var message = 'Phonebot Command: say TEXT...<-- Sends text as speech to the call.'
  if (text.length) {
    this.emit('say', text)
    message = ''
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

Slackbot.prototype.verbose = function (text) {
  var message = 'Phonebot Command: verbose {on|off}<-- Enable/disable verbose mode. ' +
    'When enabled, channel messages sent to notify users when call audio has been received but not translated.'

  var toggle = text.split(' ')[0]

  if (toggle === 'on' || toggle === 'off') {
    message = ''
    this.emit('verbose', toggle === 'on')
  }

  return message
}

Slackbot.prototype.channel_message = function (message) {
  var response = 'What\'s up?'

  var words = message.text.split(' '),
    command = this.COMMANDS[words[1]]

  if (typeof command === 'string') {
    response = command
  } else if (typeof command === 'function') {
    response = command.call(this, words.slice(2).join(' '))
  }

  if (typeof response === 'string') this.post(response)
}

module.exports = function (outgoing) {
  return new Slackbot(outgoing)
}
