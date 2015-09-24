var Command = require('./Command');
var prompt = require('prompt');
var colors = require('colors');
var Promise = require('promise');

var InitCommand = new Command({
    offline: false
});

InitCommand.run = function (cmd, options) {
    var self = this;
    console.log("Initializing...");

    if (!this.config.get("email")) {
        console.log("Account email must be set via the `config` command".red);

        return 1;
    }

    if (!this.config.get("client-id") || !this.config.get("client-secret")) {
        console.log("Amazon Cloud Drive credentials must be set via the `config` command".red);

        return 1;
    }

    return Promise.denodeify(self.account.authorize).call(self.account, null)
        .then(function (data) {
            if (data.success === true) {
                console.log("Successfully authenticated with Amazon Cloud Drive".green);

                return 0;
            } else {
                if (data.data.auth_url !== undefined) {
                    console.log(data.data.message);
                    console.log(data.data.auth_url);

                    prompt.start();

                    return Promise.denodeify(prompt.get)(['url'])
                        .then(function (data) {
                            return Promise.denodeify(self.account.authorize).call(self.account, data.url)
                                .then(function(data){
                                    if (data.success === false) {
                                        console.log("Failed to authenticate with Amazon's Cloud Drive".red);
                                        console.log(data.data);

                                        return 1;
                                    } else {
                                        console.log("Successfully authenticated with Amazon's Cloud Drive".green);

                                        return 0;
                                    }
                                }, function (err) {
                                    console.log(err.message);
                                });
                        });
                }
            }
        });
};

module.exports = InitCommand;
