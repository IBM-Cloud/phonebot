var watson = require('watson-developer-cloud');
var fs = require('fs');
 
var speech_to_text = watson.speech_to_text({
  username: '726d52e4-2aa6-4a9a-b8a8-5a551afbdba0',
  password: 'VAOrqIrEZGot',
  version: 'v1'
});
 
var params = {
  // From file 
  audio: fs.createReadStream('./audio_16k.wav'),
  content_type: 'audio/l16; rate=16000'
};
 
/** speech_to_text.recognize(params, function(err, res) {
  if (err)
    console.log(err);
  else
    console.log(JSON.stringify(res, null, 2));
});
**/

var observe_results = function(session, recognize_end) {
  return function(err, chunk) {
    if (err) {
      console.log('error:', err)
    } else {
      console.dir(chunk.results[0])
    }
  }
}

speech_to_text.createSession({}, function(err, session) {
  if (err) {
    next(new Error('The server could not create a session'));
  } else {
    console.log(session)
        var payload = {
          session_id: session.session_id,
          cookie_session: session.cookie_session,
          content_type: 'audio/l16; rate=' + (16000),
          continuous: true,
          interim_results: true
        };

        var cb = function (err, chunk) {
          if (err) {
            console.log(err)
          } else {
            console.dir(chunk.results[0]) 
          }
        }

        // POST /recognize to send data in every message we get
        var req = speech_to_text.recognizeLive(payload, cb);
        // GET /observeResult to get live transcripts
        speech_to_text.observeResult(payload, cb);
        fs.readFile('./audio_16k.wav', function (err, data) {
          if (err) throw err;
          console.log("Read file")
          req.write(data)
          setTimeout(function () {
            fs.readFile('./audio2_16k.wav', function (err, data) {
              if (err) throw err;
              console.log("Read file")
              req.write(data)
            });

          }, 5000)
        });
  }
});
