var SQL = require('./SQL');
var heredoc = require('heredoc');

function MySQL(config, callback) {
  var self = this;
  SQL.call(this, config, function(err, db) {
    self.db.raw(
      heredoc(function() {
        /*
         CREATE TABLE IF NOT EXISTS configs (
         id INT(11) NOT NULL auto_increment,
         email VARCHAR(32),
         token_type VARCHAR(16),
         expires_in INT(12),
         refresh_token TEXT,
         access_token TEXT,
         last_authorized INT(12),
         content_url MEDIUMTEXT,
         metadata_url MEDIUMTEXT,
         checkpoint TEXT,
         PRIMARY KEY (id),
         INDEX (email)
         );
         */
      })
    )
      .then(function() {
        return self.db.raw(
          heredoc(function() {
            /*
             CREATE TABLE IF NOT EXISTS nodes (
             id VARCHAR(255) NOT NULL,
             name VARCHAR(128),
             kind VARCHAR(16),
             md5 VARCHAR(128),
             status VARCHAR(16),
             created DATETIME,
             modified DATETIME,
             raw_data LONGTEXT,
             PRIMARY KEY (id),
             INDEX (id, name, md5)
             );
             */
          })
        );
      })
      .then(function() {
        return self.db.raw(
          heredoc(function() {
            /*
             CREATE TABLE IF NOT EXISTS nodes_nodes (
             id INT(11) NOT NULL auto_increment,
             id_node VARCHAR(255) NOT NULL,
             id_parent VARCHAR(255) NOT NULL,
             PRIMARY KEY (id),
             UNIQUE KEY (id_node, id_parent),
             INDEX(id_node, id_parent)
             );
             */
          })
        );
      })
      .then(function() {
        return callback(null, db);
      });
  });
}

MySQL.prototype = SQL.prototype;
MySQL.constructor = MySQL;

module.exports = MySQL;
