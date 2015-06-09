#!/usr/bin/env node
// Licensed under the Apache 2.0 License. See footer for details.

var express = require("express"),
    http = require("http"),
    path = require("path"),
    program = require("commander"),
    pkg = require(path.join(__dirname, "package.json"));

http.post = require("http-post");


var app = express();

if (process.env.VCAP_APPLICATION) {
    var vcapApplication = JSON.parse(process.env.VCAP_APPLICATION);
    app.set("vcapApplication", vcapApplication);
}



program
  .command("track")
  .description("Track application deployments")
  .action(function(options) {
    var vcapApplication = app.get("vcapApplication");
    if (vcapApplication) {
      var event = {
        date_sent: new Date().toJSON()
      };
      if (pkg.version) {
        event.code_version = pkg.version;
      }
      if (pkg.repository && pkg.repository.url) {
        event.repository_url = pkg.repository.url;
      }
      if (vcapApplication.application_name) {
        event.application_name = vcapApplication.application_name;
      }
      if (vcapApplication.space_id) {
        event.space_id = vcapApplication.space_id;
      }
      if (vcapApplication.application_version) {
        event.application_version = vcapApplication.application_version;
      }
      if (vcapApplication.application_uris) {
        event.application_uris = vcapApplication.application_uris;
      }
      // TODO: Make this work over HTTPS
      http.post("http://deployment-tracker.mybluemix.net/", event);
    }
  }).on("--help", function() {
    console.log("  Examples:");
    console.log();
    console.log("    $ track");
    console.log();
  });

program.parse(process.argv);

//-------------------------------------------------------------------------------
// Copyright IBM Corp. 2015
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//-------------------------------------------------------------------------------
