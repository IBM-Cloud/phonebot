var assert = require('assert')
var mockery = require('mockery')
var async = require('async')

var log = require('loglevel')
log.disableAll()

var location
var cbs = {
  available: [],
  failed: []
}

var client = {
  incomingPhoneNumbers: { list: function () {}}
}

var ret = {
  start: function () {
  },
  transcript: 'Sample', 
  on: function (id, cb) {
    cbs[id].push(cb)
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
    mockery.registerMock('request', {
      post: function () {}
    })
    PhoneBot = require('../../lib/phonebot.js')
  })

  after(function() {
    mockery.deregisterMock('request');
    mockery.disable(); // Disable Mockery after tests are completed
  })

  describe('#constructor', function(){
    it('should create slackbots and phone clients for each channel', function(){
      var channels = {
        'one': 'hook_one',
        'two': 'hook_two',
        'three': 'hook_three'
      }

      var pb = PhoneBot(client, null, channels)
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

      var pb = PhoneBot(client, null, channels),
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

      var pb = PhoneBot(client, null, channels, 'http://sample.com'),
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

      var pb = PhoneBot(client, null, channels),
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

      var pb = PhoneBot(client, null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      phone.options = function (options) {
        assert.equal(options.duration, 100)
        done()
      }

      bot.emit('duration', 100)
    })
    it('should sent user to enable verbose mode', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(client, null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      phone.options = function (options) {
        assert.equal(options.verbose, true)
        done()
      }

      bot.emit('verbose', true)
    })
    
    it('should not attempt to hang up phone call when line is not active', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(client, null, channels),
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

      var pb = PhoneBot(client, null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      phone.active_call = true
      phone.hangup = function () {
        done()
      }
      bot.emit('hangup')
    })
    it('should notify channel when phone call is queued', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(client, null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      phone.active_call = {number: '1234'}
      bot.post = function (text) {
        assert.equal(text, ':phone: Connecting to 1234')
        done()
      }
      phone.emit('queued')
    })
    it('should notify channel when phone call is ringing', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(client, null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      bot.post = function (text) {
        assert.equal(text, ':phone: Still ringing...')
        done()
      }
      phone.emit('ringing')
    })
    it('should notify channel when phone call is connected', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(client, null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      bot.post = function (text) {
        assert.equal(text, ':phone: You\'re connected! :+1:')
        done()
      }
      phone.emit('in-progress')
    })
    it('should notify channel when phone call is canceled', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(client, null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      bot.post = function (text) {
        assert.equal(text, ':phone: That\'s it, call over!')
        done()
      }
      phone.emit('canceled')
    })
    it('should notify channel when phone call is busy', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(client, null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      bot.post = function (text) {
        assert.equal(text, ':phone: They were busy, sorry :unamused:')
        done()
      }
      phone.emit('busy')
    })
    it('should notify channel when phone call is not answered', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(client, null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      bot.post = function (text) {
        assert.equal(text, ':phone: Oh no, they didn\'t answer :sleeping:')
        done()
      }
      phone.emit('no-answer')
    })
    it('should notify channel when phone call fails', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(client, null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      bot.post = function (text) {
        assert.equal(text, ':phone: Whoops, something failed. My bad. Try again? :see_no_evil:')
        done()
      }
      phone.emit('failed')
    })

    it('should post message when phone call ends once queue empties', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(client, null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      pb.channels.one.queue = async.queue(function (task, callback) {
        setTimeout(function () {
          callback()
        }, 100)
      })

      pb.channels.one.queue.push({})
      pb.channels.one.queue.push({})
      pb.channels.one.queue.push({})

      bot.post = function (text) {
        assert.ok(pb.channels.one.queue.idle())
        assert.equal(text, ':phone: That\'s it, call over!')
        done()
      }

      phone.emit('completed')
    })
    it('should post message when phone call ends and the queue is empty', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(client, null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      bot.post = function (text) {
        assert.equal(text, ':phone: That\'s it, call over!')
        done()
      }
      phone.emit('completed')
    })
    it('should schedule translation when recording is available', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(client, null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      var messages = [':speech_balloon: Sample', ':speech_balloon: _waiting for translation_']
      bot.post = function (text) {
        assert.equal(text, messages[messages.length-1])
        messages.pop()
        if (messages.length === 0) done()
      }
      // Need to mock out translate
      phone.emit('recording', 'location')
    })
    it('should post translation to channel when async task finishes', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(client, null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      ret.transcript = null
      cbs.available = []
      cbs.failed = []

      var messages = [':speech_balloon: Sample', ':speech_balloon: _waiting for translation_']
      bot.post = function (text) {
        assert.equal(text, messages[messages.length-1])
        messages.pop()
        if (messages.length === 0) done()
      }

      // Need to mock out translate
      phone.emit('recording', 'location')
      setTimeout(function () {
        ret.transcript = "Sample"
        cbs.available[0]()
      }, 10)
    })
    it('should handle multiple translation tasks being queued', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(client, null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      ret.transcript = null
      cbs.available = []
      cbs.failed = []

      var count = 0

      bot.post = function (text) {
        if (text === ':speech_balloon: _waiting for translation_') return
        assert.equal(text, ':speech_balloon: transcript')
        if (++count === 2) done()
      }
      // Need to mock out translate
      phone.emit('recording', 'location')
      phone.emit('recording', 'location')
      phone.emit('recording', 'location')

      setTimeout(function () {
        ret.transcript = "transcript"
        cbs.available[0]()
      }, 50)
    })
    it('should handle failed translation tasks', function(done){
      var channels = {
        'one': 'hook_one'
      }

      var pb = PhoneBot(client, null, channels),
        bot = pb.channels.one.bot,
        phone = pb.channels.one.phone

      ret.transcript = null
      cbs.available = []
      cbs.failed = []

      bot.post = function (text) {
        if (text === ':speech_balloon: _waiting for translation_') return
        assert.equal(text, ':speech_balloon: _unable to recognise speech_')
        done()
      }
      // Need to mock out translate
      phone.emit('recording', 'location')
      phone.emit('recording', 'location')

      setTimeout(function () {
        ret.transcript = "transcript"
        cbs.failed[0]()
      }, 50)
    })
  })
    describe('#phone_message', function(){
      it('should ignore messages for channels not registered', function(){
        var channels = {
          'one': 'hook_one'
        }

        var pb = PhoneBot(client, null, channels),
          phone = pb.channels.one.phone

        assert.equal(null, pb.phone_message('two', null))
      })
      it('should process messages for registered channels', function(){
        var channels = {
          'one': 'hook_one'
        }

        var pb = PhoneBot(client, null, channels),
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

        var pb = PhoneBot(client, null, channels),
          phone = pb.channels.one.phone

        assert.equal(null, pb.slack_message('two', null))
      })
      it('should process messages for registered channels', function(){
        var channels = {
          'one': 'hook_one'
        }

        var pb = PhoneBot(client, null, channels),
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
