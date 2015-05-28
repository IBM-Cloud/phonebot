# phonebot

Slackbot that lets users make phone calls within a Slack channel. 
Users can dial a phone number, with the phone call audio converted to text and sent to the channel.
Channel message replies are converted to speech and sent over the phone call.

Twilio is used to make phone calls and capture call audio.
IBM Watson's "Speech To Text" service is used to translate the audio into text.
NodeJS web application handles incoming messages from Slack, IBM Watson and Twilio. 

<a href="https://bluemix.net/deploy?repository=https://github.com/jthomas/doctor-watson" target="_blank">
<img src="http://bluemix.net/deploy/button.png" alt="Bluemix button" />
</a>

[![Build Status](https://api.travis-ci.org/jthomas/phonebot.svg?branch=master)](https://api.travis-ci.org/jthomas/phonebot.svg?branch=master)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

Add link to blog post. 

INCLUDE GIF OF PHONEBOT

## Usage

Once the Phonebot application is registered for a Slack channel, the following
commands are available:

```
@phonebot call PHONE_NUMBER <-- Dials the phone number
@phonebot say TEXT <-- Sends text as speech to the call 
@phonebot hangup <-- Ends the active call
@phonebot help <-- Show all commands usage information 
```

## Deployment Instructions

Phonebot is a NodeJS application designed for deployment to IBM Bluemix, a Cloud Foundry
Platform-as-a-Service instance.

Before deploying the application, we need to...

* Register [Slack webhooks](https://api.slack.com/) to allow the bot to send and receive channel messages.
* Register for Twilio and IBM Watson authentication credentials.

### Slack Webhooks

Phonebot can be registered on multiple channels. Every channel you want Phonebot
to join needs both an outgoing incoming and outgoing webhook. 

#### Set up Outgoing Slack Webhooks

[Outgoing Webhooks](https://api.slack.com/outgoing-webhooks) are used to notify
Phonebot when messages for the bot (@phonebot command) are sent to the channel.
Visiting the [Service Integration](https://my.slack.com/services/new/outgoing-webhook) page will allow
you to create a new webhooks that posts all messages starting with a keyword to
an external URL.

The following configuration parameters should be used: 
* Channel - Channel for Phonebot to listen on
* Trigger Words - @phonebot
* URL - http://<INSERT_APP_NAME>.mybluemix.net/slackbot

ADD IMAGE

#### Set up Incoming Slack Webhooks

[Incoming Webhooks](https://api.slack.com/incoming-webhooks) are used by
Phonebot to post the translated call audio as channel messages. We need an incoming webhook for each channel
with a registered outgoing webhook. Visiting the [Service Integration](https://my.slack.com/services/new/incoming-webhook) page will allow
you to create a new webhook that exposes a URL to post channel messages.

ADD IMAGE

Copy the generated URL that exposes the webhook, you will need to pass this into
the application as explained in the section below.

### Deploy to IBM Bluemix

Before we can deploy the application, we need to create the service 
credentials the application relies on within IBM Bluemix. These credentials 
will be bound to the application at runtime.

#### Twilio

Register for a developer account at [Twilio](https://www.twilio.com/try-twilio).
Connect an [external phone number](https://www.twilio.com/user/account/phone-numbers/incoming) to 
the account, this will be used as the caller id when making phone calls.

Authentication credentials for Phonebot will be available [here](https://www.twilio.com/user/account/settings).

Run the following CF CLI command to expose your developer account credentials to
the platform. Replace the ACCOUNT_SID and TOKEN values with credentials from
your [account settings page](https://www.twilio.com/user/account/settings).

```
$ cf create-user-provided-service twilio -p '{"accountSID":"ACCOUNT_SID","authToken":"TOKEN"}'
```

*Note: Phonebot will work with a Twilio trial account, however outgoing calls are 
only allowed to verified numbers. See [here](https://www.twilio.com/user/account/phone-numbers/verified) for more details.*

#### IBM Watson 

This "Speech To Text" service will be automatically created using the "Free Plan" when the
application is deployed. To change the service instance the application uses,
modify the manifest.yml.

#### Slack channels

Run the following [CF CLI](http://docs.cloudfoundry.org/devguide/installcf/)
command to register your Slack channel webhooks within Phonebot.

```
$ cf cups slack_webhooks -p '{"channel_name":"incoming_webhook_url",...}'
```

Replace the *channel_name* and *incoming_webhook_url* with the actual values for the channel name and
incoming webhooks found at your [Slack integrations page](https://myslack.slack.com/services). You have
to register each channels as a separate property.

#### Deploy!

Phew, you're now got everything configured! Deploying the application is easy,
just run this command:

```
$ cf push --name your_random_identifier 
```

Modify *your_random_identifier* to a name relevant for your Phonebot instance.

Once the application has finished deploying, Phonebot will be listening to
requests at http://your_random_identifier.mybluemix.net. 

*This address must match the URL registered with the outgoing webhooks.*

*... and you're done! Phonebot should post a message to each registered channel
to confirm it's ready for action.*

## Development Mode 

Running Phonebot on your development machine is possible provided you following
these steps...

* Copy VCAP_SERVICES and VCAP_APPLICATION to local development environment.
* Run *node app.js* to start application 
* Ensure application running on localhost is available at external URL, e.g. ngrok
* Modify Slack outgoing webhooks to point to new URL
