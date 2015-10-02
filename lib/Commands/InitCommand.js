var Command = require('./Command');
var inquirer = require('inquirer');
var colors = require('colors');
var Promise = require('promise');

var InitCommand = new Command({
    offline: false
});

InitCommand.run = function () {
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

    return Promise.denodeify(self.initialize).call(self)
        .then(function () {
            return Promise.denodeify(self.account.authorize).call(self.account, null)
                .then(function (data) {
                    if (data.success === true) {
                        console.log("Successfully authenticated with Amazon Cloud Drive".green);

                        return 0;
                    } else {
                        if (data.data.auth_url !== undefined) {
                            console.log(data.data.message);
                            console.log(data.data.auth_url);

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
                                            console.log(err.message);

                                            return reject();
                                        }

                                        if (data.success === false) {
                                            console.log("Failed to authenticate with Amazon's Cloud Drive".red);
                                            console.log(data.data);

                                            return reject();
                                        }

                                        console.log("Successfully authenticated with Amazon's Cloud Drive".green);

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
                            console.log("Failed to authorize account with Amazon Cloud Drive. Unknown error occurred.".red);
                            console.log(JSON.stringify(data.data));

                            return 1;
                        }
                    }
                }, function (err) {
                    console.log(err.message.red);
                    console.log(JSON.stringify(data));

                    return 1;
                });
        });
};

module.exports = InitCommand;
