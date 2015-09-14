function Cache () {

}

Cache.prototype.initialize = function (config) {
    this.db = require('knex')(config);
};

Cache.prototype.saveNode = function (callback) {

};

module.exports = Cache;
