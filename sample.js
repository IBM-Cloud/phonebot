/**
var translate = require('./translate.js')
var instance = translate('https://api.twilio.com/2010-04-01/Accounts/AC37e07ca7a6087f93ec92f998c8a2a26f/Recordings/REf2f7b7377ea5d1aec01354b4533398c6.wav');
instance.on('available', function () {
  console.log(instance.transcript)
})
instance.start()
*/


//Place a phone call, and respond with TwiML instructions from the given URL
client.makeCall({
  to: '07728258842', // Any number Twilio can call
  from: '+447728258842', // A number you bought from Twilio and can use for outbound communication
  url: 'http://40405d27.ngrok.com'
}, function(err, responseData) {
  if (err) console.log(err)
    //executed when the call has been initiated.
    console.log(responseData); // outputs "+14506667788"
});
