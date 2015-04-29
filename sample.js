var translate = require('./translate.js')
var instance = translate('https://api.twilio.com/2010-04-01/Accounts/AC37e07ca7a6087f93ec92f998c8a2a26f/Recordings/REf2f7b7377ea5d1aec01354b4533398c6.wav');
instance.on('available', function () {
  console.log(instance.transcript)
})
instance.start()
