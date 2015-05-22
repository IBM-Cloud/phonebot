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

CallManager.prototype.update_call_status = function (details) {
  // NodeJS Twilio clients wraps TwiML responses with different
  // parameter names than XML POSTs. Handle both types of message name.
  var status = details.CallStatus || details.status,
    sid = details.CallSid || details.sid

  // Ensure message sid matches active call sid
  if (!this.is_message_valid(status, sid)) {
    log.error('ERROR: Invalid message received for call (' + this.active_call.sid + '): ' + details)
    return null
  }

  switch (status) {
    // Store new call reference when outbound call is queued.
    case 'queued':
      this.active_call = {sid: sid, status: status}
      this.emit(status)
      break
    case 'ringing':
    case 'in-progress':
      this.active_call.status = status
      this.emit(status)
      break
    // When the phone call ends, for any reason, remove
    // the active call reference so we can make another.
    case 'completed':
    case 'busy':
    case 'failed':
    case 'no-answer':
    case 'canceled':
      this.active_call = null
      this.emit(status)
      break
    default:
      status = null
      log.error('ERROR: Unknown call state encountered (' + status + '): ' + details)
  }

  return status
}

CallManager.prototype.call = function (number, route) {
  // We can't make a call until the line is free...
  if (this.call_active()) return

  var that = this
  this.outgoing = [this.default_greeting]
  this.active_call = {sid: null, status: null}

  this.client.makeCall({
    to: number,
    // TODO: None of this should be hardcoded.
    from: '+447728258842',
    url: route
  }, function (err, responseData) {
    if (err) {
      that.request_fail('Failed To Start Call: ' + number + '(' + route + ') ', err)
      return
    }

    that.request_success('New Call Started: ' + number + ' (' + route + '): ' + responseData.sid, responseData)
  })
}

CallManager.prototype.hangup = function () {
  var that = this

  if (!this.call_active()) return

  this.client.calls(this.active_call.sid).update({
    status: 'completed'
  }, function (err, call) {
    if (err) {
      that.request_fail('Failed To Hangup Call (' + that.active_call.sid + ')', err)
      return
    }

    that.request_success('Call Terminated: ' + this.active_call, call)
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

CallManager.prototype.process = function (req) {
  var twiml = ''

  var current_status = this.update_call_status(req.body)
  if (current_status) {
    if (current_status === 'in-progress') {
      twiml = new twilio.TwimlResponse()

      // Do we have text to send down the active call?
      if (this.outgoing.length) {
        var user_speech = this.outgoing.join(' ')
        this.outgoing = []
        twiml.say(user_speech)
      }

      twiml.record({playBeep: false, trim: 'do-not-trim', maxLength: this.defaults.duration, timeout: 60})
    }

    if (req.body && req.body.RecordingUrl) {
      this.emit('recording', req.body.RecordingUrl)
      log.info('New Recording Available: ' + req.body.RecordingUrl)
    }
  }

  return twiml
}

CallManager.prototype.request_fail = function (message, err) {
  log.error(message)
  log.error(err)
  this.update_call_status({CallStatus: 'failed', sid: this.active_call.sid})
}

CallManager.prototype.request_success = function (message, call) {
  log.info(message)
  log.trace(call)
  this.update_call_status(call)
}

CallManager.prototype.is_message_valid = function (status, sid) {
  return (status === 'queued' || sid === this.active_call.sid)
}

module.exports = function (client, channel) {
  return new CallManager(client, channel)
}
