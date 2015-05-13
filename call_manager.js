var twilio = require('twilio')
var cfenv = require('cfenv')
var service = cfenv.getAppEnv().getService('twilio')

var client = twilio(service.credentials.accountSID, service.credentials.authToken)

function CallManager (channel) {
  this.channel = channel
  this.call = null
}

CallManager.prototype.call = function (number) {
  var that = this

  client.makeCall({
    to: number,
    // TODO: None of this should be hardcoded.
    from: '+447728258842',
    url: 'http://40405d27.ngrok.com'
  }, function (err, responseData) {
    if (err) console.log(err)
    console.log(responseData)
    that.call = responseData.sid
  })

}

CallManager.prototype.hangup = function () {
}

CallManager.prototype.say = function (text) {
}

CallManager.prototype.options = function (opts) {
}

CallManager.prototype.call_active = function () {
}

CallManager.prototype.stats = function () {
}

module.exports = function (channel) {
  return new CallManager(channel)
}
