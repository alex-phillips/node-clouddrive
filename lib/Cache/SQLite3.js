var SQL = require('./SQL');
var heredoc = require('heredoc');

function SQLite3(config, callback) {
  var self = this;
  SQL.call(this, config, function(err, db) {
    self.db.raw(
      heredoc(function() {
        /*
         CREATE TABLE IF NOT EXISTS nodes(
         id VARCHAR PRIMARY KEY NOT NULL,
         name VARCHAR NOT NULL,
         kind VARCHAR NOT NULL,
         md5 VARCHAR,
         status VARCHAR,
         created DATETIME NOT NULL,
         modified DATETIME NOT NULL,
         raw_data TEXT NOT NULL
         );
         */
      })
    )
      .then(function() {
        return self.db.raw('CREATE INDEX IF NOT EXISTS node_id on nodes(id);');
      })
      .then(function() {
        return self.db.raw('CREATE INDEX IF NOT EXISTS node_name on nodes(name);');
      })
      .then(function() {
        return self.db.raw('CREATE INDEX IF NOT EXISTS node_md5 on nodes(md5);');
      })
      .then(function() {
        return self.db.raw(
          heredoc(function() {
            /*
             CREATE TABLE IF NOT EXISTS configs(
             id INTEGER PRIMARY KEY,
             email VARCHAR NOT NULL,
             token_type VARCHAR,
             expires_in INT,
             refresh_token TEXT,
             access_token TEXT,
             last_authorized INT,
             content_url VARCHAR,
             metadata_url VARCHAR,
             checkpoint VARCHAR
             );
             */
          })
        );
      })
      .then(function() {
        return self.db.raw('CREATE INDEX IF NOT EXISTS config_email on configs(email);');
      })
      .then(function() {
        return self.db.raw(
          heredoc(function() {
            /*
             CREATE TABLE IF NOT EXISTS nodes_nodes(
             id INTEGER PRIMARY KEY,
             id_node VARCHAR NOT NULL,
             id_parent VARCHAR NOT NULL,
             UNIQUE (id_node, id_parent)
             );
             */
          })
        );
      })
      .then(function() {
        return self.db.raw('CREATE INDEX IF NOT EXISTS nodes_id_node on nodes_nodes(id_node);');
      })
      .then(function() {
        return self.db.raw('CREATE INDEX IF NOT EXISTS nodes_id_parent on nodes_nodes(id_parent);');
      })
      .then(function() {
        return callback(null, db);
      });
  });
}

SQLite3.prototype = SQL.prototype;
SQLite3.constructor = SQLite3;

module.exports = SQLite3;
