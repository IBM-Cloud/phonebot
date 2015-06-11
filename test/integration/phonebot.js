var request = require('request'),
  assert = require('assert')

var stub_server = process.env.STUB_SERVER
if (!stub_server) throw new Error('Unable to find stub server from process.env')

var test_server = process.env.TEST_SERVER
if (!test_server) throw new Error('Unable to find test server from process.env')

describe('PhoneBot', function(){
  after(function(done){
    request.get({url: stub_server + '/requests/clear'}, function () {
      done()
    })
  })
  describe('#startup', function(){
    var requests
    before(function (done) {
      request.get({url: stub_server + '/requests', json: true}, function (err, resp, body) {
        if (err) assert.ok(false)
        if (!body) assert.ok(false)
        requests = body.requests
        done()
      })
    })
    it('should post new channel message to each registered channel', function(){
      var channel_message = requests[0]

      assert.deepEqual({
        text: '_Phonebot is here!_',
        username: 'phonebot',
        icon_emoji: ':phone:'
      }, channel_message.body)
      assert.equal('/slack/testing', channel_message.url)
      assert.equal('POST', channel_message.method)
    })
    it('should request incoming list of account phone numbers', function(){
      var channel_message = requests[1]

      assert.equal('/2010-04-01/Accounts/xxx/IncomingPhoneNumbers.json', channel_message.url)
      assert.equal('GET', channel_message.method)
    })
  })

  describe('#slackbot', function(){
   it('should respond to channel messages', function(done){
     this.timeout(5000)
      request.post({url: test_server + '/slackbot', form: {channel_name: 'testing', text: '@phonebot hello'}}, function (err, resp, body) {
        if (err) { 
          console.log(err)
          assert.ok(false)
       }

          setTimeout(function () {
            request.get({url: stub_server + '/requests', json: true}, function (err, resp, body) {
              if (err) assert.ok(false)

                message = body.requests.pop()

                assert.deepEqual({
                  text: 'What\'s up?',
                  username: 'phonebot',
                  icon_emoji: ':phone:'
                }, message.body)
                assert.equal('/slack/testing', message.url)
                assert.equal('POST', message.method)

                done()
            })
        }, 2000)
      })
    })

    it('should make a call from user command', function(done){
      this.timeout(10000);
      request.post({url: test_server + '/slackbot', form: {channel_name: 'testing', text: '@phonebot call 1234567890'}}, function (err) {
        if (err) assert.ok(false)

        setTimeout(function () {
          request.get({url: stub_server + '/requests', json: true}, function (err, resp, body) {
            if (err) assert.ok(false)

              var slack_message = body.requests.pop(),
                twilio_message = body.requests.pop()

              assert.deepEqual({
                text: ':phone: Connecting to 1234567890',
                username: 'phonebot',
                icon_emoji: ':phone:'
              }, slack_message.body)
              assert.equal('/slack/testing', slack_message.url)
              assert.equal('POST', slack_message.method)

              assert.deepEqual({
                To: '1234567890',
                From: '+440123456789',
                Url: test_server.replace('http', 'https') + '/recording/testing'
              }, twilio_message.body)
              assert.equal('/2010-04-01/Accounts/xxx/Calls.json', twilio_message.url)
              assert.equal('POST', twilio_message.method)

              done()
          })
        }, 5000)
      })
    })

    it('should ignore new calls for active line', function(done){
      this.timeout(10000);
      request.post({url: test_server + '/slackbot', form: {channel_name: 'testing', text: '@phonebot call 1234567890'}}, function (err) {
        if (err) assert.ok(false)

        setTimeout(function () {
          request.get({url: stub_server + '/requests', json: true}, function (err, resp, body) {
            if (err) assert.ok(false)

              var slack_message = body.requests.pop()

              assert.deepEqual({
                text: 'The line is busy, you have to hang up first...!',
                username: 'phonebot',
                icon_emoji: ':phone:'
              }, slack_message.body)
              assert.equal('/slack/testing', slack_message.url)
              assert.equal('POST', slack_message.method)

              done()
          })
        }, 5000)
      })
    })

    it('should hang up active calls', function(done){
      this.timeout(10000);
      request.post({url: test_server + '/slackbot', form: {channel_name: 'testing', text: '@phonebot hangup'}}, function (err) {
        if (err) assert.ok(false)

        setTimeout(function () {
          request.get({url: stub_server + '/requests', json: true}, function (err, resp, body) {
            if (err) assert.ok(false)

              var slack_message = body.requests.pop()

              assert.deepEqual({
                text: ':phone: That\'s it, call over!',
                username: 'phonebot',
                icon_emoji: ':phone:'
              }, slack_message.body)
              assert.equal('/slack/testing', slack_message.url)
              assert.equal('POST', slack_message.method)

              done()
          })
        }, 5000)
      })
    })
  })
  
  describe('#call transcribing', function(){
    it('should send audio descriptions back to channels', function(done){
      this.timeout(10000);
      // start the call...
      request.post({url: test_server + '/slackbot', form: {channel_name: 'testing', text: '@phonebot call 1234567890'}}, function (err) {
        if (err) assert.ok(false)

        setTimeout(function () {
          request.post({url: test_server + '/recording/testing', form: {sid: 'testing_sid', status: 'in-progress', RecordingUrl: stub_server + '/audio.wav'}}, function (err, resp, body) {

            setTimeout(function () {
              request.get({url: stub_server + '/requests', json: true}, function (err, resp, body) {
                if (err) assert.ok(false)

                  message = body.requests.pop()

                  assert.deepEqual({
                    text: ':speech_balloon: Hello World',
                    username: 'phonebot',
                    icon_emoji: ':phone:'
                  }, message.body)
                  assert.equal('/slack/testing', message.url)
                  assert.equal('POST', message.method)
                  done()
              })
            }, 5000)
          })
        }, 2000)
      })
    })
  })
  // AFTER CLEAR DOWN TEST RESULTS
})
