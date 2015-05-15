var assert = require('assert')
var mockery = require('mockery')

var param
var request = function (req) {
  param = req
}

describe('Slackbot', function(){
  before(function() {
    mockery.enable(); // Enable mockery at the start of your test suite
    mockery.registerMock('request', request);
    slackbot = require('../slackbot.js')
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
})

