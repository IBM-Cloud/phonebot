var assert = require('assert')
var mockery = require('mockery')

var param
var request = function (req) {
  param = req
}

describe('Slackbot', function(){
  before(function() {
    mockery.enable({useCleanCache: true}); // Enable mockery at the start of your test suite
    mockery.registerMock('request', request);
    mockery.registerAllowables(['events', '../lib/slackbot.js', 'util']);
    slackbot = require('../lib/slackbot.js')
  })

  after(function() {
    mockery.disable(); // Disable Mockery after tests are completed
  })

  describe('#post', function(){
    it('should send text as HTTP POST to url parameter', function(){
      var url = "some_url",
        text = "testing 1 2 3",
        bot = slackbot(url)

      bot.post(text)
      assert.equal(param.url, url)
      assert.equal(param.json, true)
      assert.deepEqual(param.body, {text: text, username: 'phonebot', icon_emoji: ':phone:'})
    })
  })

  describe('#call', function(){
    it('should notify listeners of new call requests', function(done){
      var bot = slackbot()

      bot.on('call', function(number){
        assert.equal('111', number)
        done()
      })
      bot.call('111')
    })
    it('should parse all digits into a phone number', function(done){
      var bot = slackbot()
      
      bot.on('call', function(number){
        assert.equal('111222333', number)
        done()
      })

      bot.call('111 222 333')
    })
    it('should return channel message about new phone call', function(){
      var bot = slackbot()
      var message = bot.call('111')
      assert.equal(message, 'Calling... 111 *ring* *ring*')
    })
    it('should show help text for command without number', function(){
      var bot = slackbot()
      var message = bot.call('')
      assert.ok(message.indexOf('Phonebot Command') === 0)
    })
  })

  describe('#say', function(){
    it('should notify listeners of new speech replies', function(done){
      var bot = slackbot()

      bot.on('say', function(text){
        assert.equal('111', text)
        done()
      })
      bot.say('111')
    })
    it('should show help text for command without number', function(){
      var bot = slackbot()
      var message = bot.say('')
      assert.ok(message.indexOf('Phonebot Command') === 0)
    })
  })

  describe('#duration', function(){
    it('should notify listeners of duration change', function(done){
      var bot = slackbot()

      bot.on('duration', function(_){
        assert.equal('111', _)
        done()
      })
      bot.duration('111')
    })
    it('should use first number as duration', function(done){
      var bot = slackbot()

      bot.on('duration', function(_){
        assert.equal('111', _)
        done()
      })
      bot.duration('111 222')
    })
    it('should show help text for command without duration', function(){
      var bot = slackbot()
      var message = bot.duration('')
      assert.ok(message.indexOf('Phonebot Command') === 0)
    })
  })

  describe('#channel_message', function(){
    it('should ignore commands not registered', function(){
      var bot = slackbot(),
        response
      bot.post = function (_) {
        response = _
      }
      bot.channel_message({text:'@slackbot hello'})
      assert.equal(response, 'What\'s up?')
    })
    it('should return string commands as channel message', function(){
      var bot = slackbot(),
        response
      bot.post = function (_) {
        response = _
      }
      bot.COMMANDS.hello = "testing"
      bot.channel_message({text:'@slackbot hello'})
      assert.equal(response, bot.COMMANDS.hello)
    })
    it('should execute and return function commands as message', function(){
      var bot = slackbot(),
        response, arg
      bot.post = function (_) {
        response = _
      }
      bot.COMMANDS.hello = function (_) {
        arg = _
        return 'testing'
      }
      bot.channel_message({text:'@slackbot hello 1 2 3'})
      assert.equal(response, 'testing')
      assert.equal(arg, '1 2 3')

      bot.COMMANDS.hello = function (_) {
        arg = _
      }

      response = null
      bot.channel_message({text:'@slackbot hello 1 2 3'})
      assert.equal(response, null)
    })
  })
})
