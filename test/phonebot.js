var assert = require('assert')
var mockery = require('mockery')

var location
var cbs = []
var ret = {
  start: function () {
  },
  transcript: 'Sample', 
  on: function (id, cb) {
    cbs.push(cb)
  }
}
var translate = function (_) {
  location = _
  return ret
}

describe('PhoneBot', function(){
  before(function() {
    mockery.enable(); // Enable mockery at the start of your test suite
    mockery.warnOnUnregistered(false);
    mockery.registerMock('./translate.js', translate);
    PhoneBot = require('../lib/phonebot.js')
  })

  after(function() {
    mockery.disable(); // Disable Mockery after tests are completed
  })

  describe('#constructor', function(){
    it('should create slackbots and phone clients for each channel', function(){
      var channels = {
        'one': 'hook_one',
        'two': 'hook_two',
        'three': 'hook_three'
      }

      var pb = PhoneBot(null, channels)
      var keys = Object.keys(pb.channels)
      assert.deepEqual(Object.keys(channels), keys)
      keys.forEach(function (key) {
        assert.equal(pb.channels[key].bot.outgoing, channels[key])
        assert.equal(pb.channels[key].phone.channel, key)
      })
    })
    it('should not make a call if phone line is busy', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      phone.active_call = true
      bot.post = function () {
        done()
      }

      bot.emit('call', '123456789')
    })
    it('should make a call if phone line is free', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(null, channels, 'http://sample.com'),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      phone.active_call = false 
      phone.call = function (number, location) {
        assert.equal(number, '123456789')
        assert.equal(location, 'http://sample.com/one')
        done()
      }

      bot.emit('call', '123456789')
    })
    it('should sent channel messages to phone line', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      phone.active_call = true
      phone.say = function (text) {
        assert.equal(text, '123456789')
        done()
      }

      bot.emit('say', '123456789')
    })
    it('should sent allow user to change recording duration', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      phone.options = function (options) {
        assert.equal(options.duration, 100)
        done()
      }

      bot.emit('duration', 100)
    })
    it('should not attempt to hang up phone call when line is not active', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      phone.active_call = false 
      bot.post = function () {
        done()
      }
      bot.emit('hangup')
    })
    it('should hang up phone call when line is active', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      phone.active_call = true
      phone.hangup = function () {
        done()
      }
      bot.emit('hangup')
    })
 
    it('should schedule translation when recording is available', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      bot.post = function (text) {
        assert.equal(text, 'Sample')
        done()
      }
      // Need to mock out translate
      phone.emit('recording', 'location')
    })
    it('should post translation to channel when async task finishes', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      ret.transcript = null

      bot.post = function (text) {
        assert.equal(text, 'Sample 1 2 3')
        done()
      }
      // Need to mock out translate
      phone.emit('recording', 'location')
      setTimeout(function () {
        ret.transcript = "Sample 1 2 3"
        cbs[0]()
      }, 10)
    })
    it('should handle multiple translation tasks being queued', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      ret.transcript = null
      cbs = []

      var count = 0

      bot.post = function (text) {
        assert.equal(text, 'transcript')
        if (++count === 2) done()
      }
      // Need to mock out translate
      phone.emit('recording', 'location')
      phone.emit('recording', 'location')
      phone.emit('recording', 'location')

      setTimeout(function () {
        ret.transcript = "transcript"
        cbs[0]()
      }, 50)
    })
    describe('#phone_message', function(){
      it('should ignore messages for channels not registered', function(){
        var channels = {
          'one': 'hook_one'
        }

        var pb = PhoneBot(null, channels),
          phone = pb.channels.one.phone

        assert.equal(null, pb.phone_message('two', null))
      })
      it('should process messages for registered channels', function(){
        var channels = {
          'one': 'hook_one'
        }

        var pb = PhoneBot(null, channels),
          phone = pb.channels.one.phone

        phone.process = function () {
          return "testing"
        }
        assert.equal('testing', pb.phone_message('one', null))
      })
    })
    describe('#slack_message', function(){
      it('should ignore messages for channels not registered', function(){
        var channels = {
          'one': 'hook_one'
        }

        var pb = PhoneBot(null, channels),
          phone = pb.channels.one.phone

        assert.equal(null, pb.slack_message('two', null))
      })
      it('should process messages for registered channels', function(){
        var channels = {
          'one': 'hook_one'
        }

        var pb = PhoneBot(null, channels),
          bot = pb.channels.one.bot

        var called = false
        bot.channel_message = function () {
          called = true
        }
        pb.slack_message('one', null)
        assert.equal(true, called)
      })
    })


  })
})
