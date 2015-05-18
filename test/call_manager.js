var assert = require('assert')
var CallManager = require('../call_manager.js')
var twilio = require('twilio')

var args = null
var client = {
  makeCall: function (options, cb) {
    args = options
    cb(null, {sid: 111})
  }
}

describe('CallManager', function(){
  describe('#call', function(){
    it('should not make a call if there is an active call', function(){
      var channel = 'some_url',
        number = '111 222 333'
        cm = CallManager({makeCall: function () {
          assert.ok(false)
        }}, channel)

        var route = 'localhost'
        cm.active_call = true
        cm.call(number, route)
    })
    it('should make a call and save the sid as the active call reference', function(){
      var channel = 'some_url',
        number = '111 222 333'
        cm = CallManager(client, channel)

        var route = 'localhost'
        cm.call(number, route)
        assert.equal(args.to, number)
        assert.equal(args.url, route)
        assert.equal(cm.active_call, 111)
        assert.deepEqual(cm.outgoing, [cm.default_greeting])
    })
  })
  describe('#hangup', function(){
    it('should not hang up without an active call', function(){
      var channel = 'some_url',
        number = '111 222 333'

      cm = CallManager({calls: function () {
        assert.ok(false)
      }}, channel)

      cm.hangup()
    })
    it('should hang up the active call', function(){
      var channel = 'some_url',
        number = '111 222 333'
        
      var called = false
      cm = CallManager({calls: function () {
        called = true
        return {update: function (opts, cb) { cb(null, {})} } 
      }}, channel)

      cm.active_call = true
      cm.hangup()
      assert.ok(called)
      assert.ok(!cm.active_call)
    })
  })
  describe('#say', function(){
    it('should push user text into queue of outgoing messages', function(){
      var channel = 'some_url',
        number = '111 222 333'

      cm = CallManager(null, channel)
      cm.outgoing = []
      cm.say('Hello world')
      cm.say('Hello world')
      cm.say('Hello world')
      assert.deepEqual(cm.outgoing, ['Hello world', 'Hello world', 'Hello world'])
    })
    it('should let user override the default greeting', function(){
      var channel = 'some_url',
        number = '111 222 333'

      cm = CallManager(null, channel)
      cm.outgoing = [cm.default_greeting]
      cm.say('Hello world')
      assert.deepEqual(cm.outgoing, ['Hello world'])
    })
  })
  describe('#options', function(){
    it('should let the user change the call duration', function(){
      cm = CallManager()
      cm.options({duration: 100})
      assert.equal(cm.defaults.duration, 100)
    })
  })
  describe('#process', function(){
    it('should process the call recording message', function(){
      cm = CallManager()
      cm.outgoing = []
      var response = cm.process({})
      var twiml = new twilio.TwimlResponse()
      twiml.record({playBeep: false, trim: 'do-not-trim', maxLength: cm.defaults.duration, timeout: 60})

      assert.equal(response.toString(), twiml.toString())
    })
    it('should add all outgoing speech text to response', function(){
      cm = CallManager()
      cm.outgoing = ['Hello', 'World', '!']
      var response = cm.process({})
      var twiml = new twilio.TwimlResponse()
      twiml.say('Hello World !')
      twiml.record({playBeep: false, trim: 'do-not-trim', maxLength: cm.defaults.duration, timeout: 60})

      assert.equal(response.toString(), twiml.toString())
    })
    it('should notify listeners recording is available', function(done){
      cm = CallManager()
      cm.outgoing = []
      cm.on('recording', function (arg) {
        assert.ok(arg)
        done()
      })
      var response = cm.process({body: {RecordingUrl: 'testing'}})
    })
  })
})
