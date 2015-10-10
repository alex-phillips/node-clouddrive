var Command = require('./Command');
var Promise = require('promise');
var Utils = require('../Utils');
var colors = require('colors');

var ConfigCommand = new Command({
    offline: true
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
                Command.log(Utils.pad(key, maxSize) + ' = ' + colors.blue(data[key]));
            }

            return resolve();
        } else if (data[option] === undefined) {
            Command.error("Option '" + option + "' not found");

            return resolve();
        }

        if (value === undefined) {
            Command.log(data[option]);

            return resolve();
        }

        self.config.set(option, value);
        self.saveConfig();
        Command.log(option.cyan + ' saved');

        return resolve();
    });
};

module.exports = ConfigCommand;
