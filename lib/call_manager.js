var twilio = require('twilio'),
  util = require('util'),
  EventEmitter = require('events').EventEmitter,
  log = require('loglevel')

function CallManager (client, channel) {
  this.client = client
  this.channel = channel
  this.active_call = null
  this.outgoing = []

  this.defaults = {
    duration: 10
  }
}

util.inherits(CallManager, EventEmitter)

CallManager.prototype.default_greeting = 'Hello this is Phonebot'

CallManager.prototype.call = function (number, route) {
  // We can't make a call until the line is free...
  if (this.call_active()) return

  var that = this
  this.outgoing = [this.default_greeting]
  this.active_call = true

  this.client.makeCall({
    to: number,
    // TODO: None of this should be hardcoded.
    from: '+447728258842',
    url: route
  }, function (err, responseData) {
    if (err) {
      log.error('Failed To Start Call: ' + number + '(' + route + ') ')
      log.error(err)
      return
    }

    that.active_call = responseData.sid
    log.info('New Call Started: ' + number +  ' (' + route + '): ' + responseData.sid)
    log.trace(responseData)
  })
}

CallManager.prototype.hangup = function () {
  var that = this

  if (!this.call_active()) return

  this.client.calls(this.active_call).update({
    status: 'completed'
  }, function (err, call) {
    if (err) {
      log.error('Failed To Hangup Call: ' + number + '(' + route + ') ')
      log.error(err)
      return
    }

    log.info('Call Terminated: ' + this.active_call)
    log.trace(call)
    that.active_call = null
  })
}

CallManager.prototype.say = function (text) {
  // If we're waiting for the outgoing call to connect,
  // let user override the default greeting.
  if (this.outgoing[0] === this.default_greeting) {
    this.outgoing[0] = text
    return
  }

  this.outgoing.push(text)
}

CallManager.prototype.options = function (opts) {
  if (typeof opts.duration === 'number') {
    this.defaults.duration = opts.duration
  }
}

CallManager.prototype.call_active = function () {
  return !!this.active_call
}

CallManager.prototype.stats = function () {
}

// TODO: Need to handle all call paths -> hanging up/etc...., connected
CallManager.prototype.process = function (req) {
  var twiml = new twilio.TwimlResponse()

  // Do we have text to send down the active call?
  if (this.outgoing.length) {
    var user_speech = this.outgoing.join(' ')
    this.outgoing = []
    twiml.say(user_speech)
  }

  twiml.record({playBeep: false, trim: 'do-not-trim', maxLength: this.defaults.duration, timeout: 60})

  if (req.body && req.body.RecordingUrl) {
    this.emit('recording', req.body.RecordingUrl)
    log.info('New Recording Available: ' + req.body.RecordingUrl)
  }

  return twiml
}

module.exports = function (client, channel) {
  return new CallManager(client, channel)
}
