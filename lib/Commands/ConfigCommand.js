var Command = require('./Command');
var Promise = require('promise');
var colors = require('colors');
var Utils = require('../Utils');

var ConfigCommand = new Command({
    offline: false
});

ConfigCommand.run = function (option, value, options) {
    var self = this;

    return new Promise(function (resolve, reject) {
        var data = self.config.flatten();

        if (option === undefined) {
            var keys = Object.keys(data);
            var maxSize = keys.sort(function (a, b) {
                return b.length - a.length;
            })[0].length;


            for (var key in data) {
                console.log(Utils.pad(key, maxSize).cyan + ' = ' + data[key]);
            }

            return resolve();
        }

        if (value === undefined) {
            if (data[option] === undefined) {
                var msg = "Option '" + option + "' not found";
                console.log(msg.red);

                return resolve();
            }

            console.log(data[option]);

            return resolve();
        }

        self.config.set(option, value);
        self.saveConfig();
        console.log(option.cyan + ' saved');

        return resolve();
    });
};

module.exports = ConfigCommand;
