var Command = require('./Command');
var inquirer = require('inquirer');
var colors = require('colors');
var Promise = require('promise');

var InitCommand = new Command({
    offline: false
});

InitCommand.run = function () {
    var self = this;
    Command.log("Initializing...");

    if (!this.config.get("email")) {
        Command.error("Account email must be set via the `config` command");

        return 1;
    }

    if (!this.config.get("client-id") || !this.config.get("client-secret")) {
        Command.error("Amazon Cloud Drive credentials must be set via the `config` command");

        return 1;
    }

    return Promise.denodeify(self.initialize).call(self)
        .then(function () {
            return Promise.denodeify(self.account.authorize).call(self.account, null)
                .then(function (data) {
                    if (data.success === true) {
                        Command.info("Successfully authenticated with Amazon Cloud Drive");

                        return 0;
                    } else {
                        if (data.data.auth_url !== undefined) {
                            Command.log(data.data.message);
                            Command.log(data.data.auth_url);

                            return new Promise(function (resolve, reject) {
                                inquirer.prompt([
                                    {
                                        type: "input",
                                        name: "callbackUrl",
                                        message: "url: "
                                    }
                                ], function (answers) {
                                    self.account.authorize(answers.callbackUrl, function (err, data) {
                                        if (err) {
                                            Command.error(err.message);

                                            return reject();
                                        }

                                        if (data.success === false) {
                                            Command.error("Failed to authenticate with Amazon's Cloud Drive: ");
                                            Command.log(data.data);

                                            return reject();
                                        }

                                        Command.info("Successfully authenticated with Amazon's Cloud Drive");

                                        return resolve();
                                    });
                                });
                            })
                                .then(function () {
                                    return 0;
                                }, function () {
                                    return 1;
                                });
                        } else {
                            Command.error("Failed to authorize account with Amazon Cloud Drive. Unknown error occurred.");
                            Command.log(JSON.stringify(data.data));

                            return 1;
                        }
                    }
                }, function (err) {
                    Command.error(err.message);
                    Command.log(JSON.stringify(data));

                    return 1;
                });
        });
};

module.exports = InitCommand;
