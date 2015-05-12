var request = require('request')

function Slackbot (outgoing) {
  this.outgoing = outgoing
}

Slackbot.prototype.post = function (text) {
  request({
    url: this.outgoing,
    body: {text: text, username: 'phonebot', icon_emoji: ':phone:'},
    json: true
  })
}

module.exports = function (outgoing) {
  return new Slackbot(outgoing)
}
