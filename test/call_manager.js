var assert = require('assert')
var CallManager = require('../lib/call_manager.js')
var twilio = require('twilio')
var log = require('loglevel')
log.disableAll()

var args = null
var cb_arg = {}
var client = {
  makeCall: function (options, cb) {
    args = options
    cb(null, cb_arg)
  }, 
  incomingPhoneNumbers: { list: function (cb) {
    cb(null, {incoming_phone_numbers: [{phone_number: 1234}]})
  }}
}

var failing = {
  makeCall: function (options, cb) {
    cb('Error')
  }, 
  incomingPhoneNumbers: { list: function () {}},
  calls: function () { 
    return {
      update: function (opts, cb) {
        cb('Error', null)
      }
    }
  }
}

describe('CallManager', function(){
  describe('#constructor', function(){
    it('should retrieve active phone number for outgoing call', function(){
      var cm = CallManager({incomingPhoneNumbers: {
        list: function (cb) {
          cb(null, {incoming_phone_numbers: [{phone_number: 1234}]})
        }
      }})
      assert.ok(1234, cm.from)
    })
    it('should throw an error if we cannot access outbound number', function(){
      var called = false
      try {
        var cm = CallManager({incomingPhoneNumbers: {
          list: function (cb) {
            cb(true, {incoming_phone_numbers: [{phone_number: 1234}]})
          }
        }})
      } catch (e) {
        called = true
      }
      assert.ok(called)
    })
  })
  describe('#call', function(){
    it('should not make a call if there is an active call', function(){
      var channel = 'some_url',
        number = '111 222 333'
        cm = CallManager({
          makeCall: function () {
            assert.ok(false)
          }, 
          incomingPhoneNumbers: {
            list: function (){}
          }
        }, channel)

        var route = 'localhost'
        cm.active_call = {sid: null, status: null}
        cm.call(number, route)
    })
    it('should make a call and save the sid as the active call reference', function(){
      var channel = 'some_url',
        number = '111 222 333'
        cm = CallManager(client, channel)

        cb_arg = {sid: 111, CallStatus: 'queued'}
        var route = 'localhost'
        cm.call(number, route)
        assert.equal(args.to, number)
        assert.equal(args.from, 1234)
        assert.equal(args.url, route)
        assert.equal(cm.active_call.sid, 111)
        assert.equal(cm.active_call.status, 'queued')
        assert.deepEqual(cm.outgoing, [cm.default_greeting])
    })
    it('should remove active call when initial request fails', function(done){
      var channel = 'some_url',
        number = '111 222 333'
        cm = CallManager(failing, channel)

        cm.on('failed', function (arg) {
          done()
        })
        var route = 'localhost'
        cm.call(number, route)
        assert.equal(cm.active_call, null)
    })
  })
  describe('#hangup', function(){
    it('should not hang up without an active call', function(){
      var channel = 'some_url',
        number = '111 222 333'

      cm = CallManager({
        makeCall: function () {
          assert.ok(false)
        }, 
        incomingPhoneNumbers: {
          list: function (){}
        }
      }, channel)

      cm.hangup()
    })
    it('should hang up the active call', function(done){
      var channel = 'some_url',
        number = '111 222 333'
        
      var called = false
      cm = CallManager({calls: function () {
        called = true
        return {update: function (opts, cb) { cb(null, {CallStatus: 'completed', CallSid: 111})} } 
      }, incomingPhoneNumbers: {list: function () {}}}, channel)

      cm.on('completed', function (arg) {
        done()
      })
      cm.active_call = {sid: 111, status: null}
      cm.hangup()
      assert.ok(called)
      assert.equal(null, cm.active_call)
    })
    it('should handle request failure when hanging up the active call', function(done){
      var channel = 'some_url',
        number = '111 222 333'
        
      cm = CallManager(failing, channel)

      cm.on('failed', function (arg) {
        done()
      })

      cm.active_call = {sid: null, status: null}
      cm.hangup()
      assert.equal(null, cm.active_call)
    })
  })
  describe('#say', function(){
    it('should push user text into queue of outgoing messages', function(){
      var channel = 'some_url',
        number = '111 222 333'

      cm = CallManager({incomingPhoneNumbers: {list: function () {}}}, channel)
      cm.outgoing = []
      cm.say('Hello world')
      cm.say('Hello world')
      cm.say('Hello world')
      assert.deepEqual(cm.outgoing, ['Hello world', 'Hello world', 'Hello world'])
    })
    it('should let user override the default greeting', function(){
      var channel = 'some_url',
        number = '111 222 333'

      cm = CallManager({incomingPhoneNumbers: {list: function () {}}}, channel)
      cm.outgoing = [cm.default_greeting]
      cm.say('Hello world')
      assert.deepEqual(cm.outgoing, ['Hello world'])
    })
  })
  describe('#options', function(){
    it('should let the user change the call duration', function(){
      cm = CallManager({incomingPhoneNumbers: {list: function () {}}})
      cm.options({duration: 100})
      assert.equal(cm.defaults.duration, 100)
    })
  })
  describe('#process', function(){
    it('should record calls when they reach in-progress state', function(){
      cm = CallManager({incomingPhoneNumbers: {list: function () {}}})
      cm.outgoing = []
      cm.active_call = {sid: 111}
      var response = cm.process({body: {CallStatus: 'in-progress', CallSid: 111}})
      var twiml = new twilio.TwimlResponse()
      twiml.record({playBeep: false, trim: 'do-not-trim', maxLength: cm.defaults.duration, timeout: 60})

      assert.equal(response.toString(), twiml.toString())
    })
    it('should add all outgoing speech text to response', function(){
      cm = CallManager({incomingPhoneNumbers: {list: function () {}}})
      cm.outgoing = ['Hello', 'World', '!']
      cm.active_call = {sid: 111}
      var response = cm.process({body: {CallStatus: 'in-progress', CallSid: 111}})
      var twiml = new twilio.TwimlResponse()
      twiml.say('Hello World !')
      twiml.record({playBeep: false, trim: 'do-not-trim', maxLength: cm.defaults.duration, timeout: 60})

      assert.equal(response.toString(), twiml.toString())
    })
    it('should notify listeners recording is available', function(done){
      cm = CallManager({incomingPhoneNumbers: {list: function () {}}})
      cm.outgoing = []
      cm.active_call = {sid: 111}
      cm.on('recording', function (arg) {
        assert.ok(arg)
        done()
      })
      var response = cm.process({body: {RecordingUrl: 'testing', CallStatus: 'in-progress', CallSid: 111}})
    })
  })
  describe('#is_message_valid', function(){
    it('should ignore queued messages', function(){
      cm = CallManager({incomingPhoneNumbers: {list: function () {}}})
      assert.ok(cm.is_message_valid('queued', null))
    })
    it('should match sid against current sid', function(){
      cm = CallManager({incomingPhoneNumbers: {list: function () {}}})
      cm.active_call = {sid: 1}
      assert.ok(cm.is_message_valid(null, 1))
      assert.ok(!cm.is_message_valid(null, 2))
    })
  })
  describe('#update_call_status', function(){
    it('should stop processing when invalid sid encountered', function(){
      cm = CallManager({incomingPhoneNumbers: {list: function () {}}})
      var msg = {'CallStatus': 'in-progress', sid: 2222}
      cm.active_call = {sid: 1111}
      assert.equal(null, cm.update_call_status(msg))
    })
    it('should create the new active call reference when call is started', function(done){
      cm = CallManager({incomingPhoneNumbers: {list: function () {}}})
      var msg = {'CallStatus': 'queued', sid: 'sid'}
      cm.on('queued', function () {
        done()
      })
      cm.update_call_status(msg)

      assert.equal(cm.active_call.sid, 'sid')
      assert.equal(cm.active_call.status, 'queued')
    })
    it('should notify listeners when call starts ringing', function(done){
      cm = CallManager({incomingPhoneNumbers: {list: function () {}}})
      var msg = {'CallStatus': 'ringing'}
      cm.on('ringing', function () {
        done()
      })
      cm.active_call = {}
      cm.update_call_status(msg)

      assert.equal(cm.active_call.status, 'ringing')
    })
    it('should notify listeners when call is connected', function(done){
      cm = CallManager({incomingPhoneNumbers: {list: function () {}}})
      var msg = {'CallStatus': 'in-progress'}
      cm.on('in-progress', function () {
        done()
      })
      cm.active_call = {}

      cm.update_call_status(msg)
      assert.equal(cm.active_call.status, 'in-progress')
    })
    it('should not notify listeners unless status changes', function(done){
      cm = CallManager({incomingPhoneNumbers: {list: function () {}}})
      var msg = {'CallStatus': 'in-progress'}
      cm.on('in-progress', function () {
        done()
      })
      cm.active_call = {}

      cm.update_call_status(msg)
      cm.update_call_status(msg)
      assert.equal(cm.active_call.status, 'in-progress')
    })
    it('should notify listeners when call is completed normally', function(done){
      cm = CallManager({incomingPhoneNumbers: {list: function () {}}})
      var msg = {'CallStatus': 'completed'}
      cm.on('completed', function () {
        done()
      })
      cm.active_call = {}

      cm.update_call_status(msg)
      assert.equal(null, cm.active_call)
    })
    it('should notify listeners when call could not connect', function(done){
      cm = CallManager({incomingPhoneNumbers: {list: function () {}}})
      var msg = {'CallStatus': 'failed'}
      cm.on('failed', function () {
        done()
      })
      cm.active_call = {}

      cm.update_call_status(msg)
      assert.equal(cm.active_call, null)
    })
    it('should notify listeners when call was not answered', function(done){
      cm = CallManager({incomingPhoneNumbers: {list: function () {}}})
      var msg = {'CallStatus': 'no-answer', 'CallSid': 111}
      cm.active_call = {sid: 111}
      cm.on('no-answer', function () {
        done()
      })

      cm.update_call_status(msg)
      assert.equal(cm.active_call, null)
    })
    it('should notify listeners when we cancel the call', function(done){
      cm = CallManager({incomingPhoneNumbers: {list: function () {}}})
      var msg = {'CallStatus': 'canceled', sid: 111}
      cm.active_call = {sid: 111}
      cm.on('canceled', function () {
        done()
      })

      cm.update_call_status(msg)
      assert.equal(cm.active_call, null)
    })
  })
})
