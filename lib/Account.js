var Request = require('request');
var Url = require('url');
var Node = require('./Node');
var async = require('async');
var fs = require('fs');

function Account(email, clientId, clientSecret, cache) {
  this.email = email;
  this.clientId = clientId;
  this.clientSecret = clientSecret;
  this.cache = cache;
  this.token = {};
  this.checkpoint = null;
  this.metadataUrl = null;
  this.contentUrl = null;
}

Account.SCOPE_READ_IMAGE = 'clouddrive:read_image';
Account.SCOPE_READ_VIDEO = 'clouddrive:read_video';
Account.SCOPE_READ_DOCUMENT = 'clouddrive:read_document';
Account.SCOPE_READ_OTHER = 'clouddrive:read_other';
Account.SCOPE_READ_ALL = 'clouddrive:read_all';
Account.SCOPE_WRITE = 'clouddrive:write';

Account.prototype.scope = [
  Account.SCOPE_READ_ALL,
  Account.SCOPE_WRITE
];

Account.prototype.authorize = function(authCredentials, callback) {
  var retval = {
    success: false,
    data: {}
  };

  if (authCredentials === undefined) {
    authCredentials = null;
  }

  var self = this;
  var scope = encodeURIComponent(self.scope.join(' '));

  if (self.token.access_token === undefined || !self.token.access_token) {
    if (authCredentials === null) {
      retval.data.message = 'Initial authorization is required';
      if (!self.clientId || !self.clientSecret) {
        retval.data.auth_url = 'https://data-mind-687.appspot.com/clouddrive';
      } else {
        retval.data.auth_url = 'https://www.amazon.com/ap/oa?client_id=' + self.clientId + '&scope=' + scope + '&response_type=code&redirect_uri=http://localhost';
      }

      return callback(null, retval);
    }

    switch (typeof authCredentials) {
      case 'string':
        return self.requestAuthorization(authCredentials, function(err, data) {
          if (err) {
            return callback(err);
          }

          if (data.success === false) {
            return callback(null, data);
          }

          retval.success = true;

          return async.forEachOf(data.data, function(value, key, callback) {
            self.token[key] = value;
            callback();
          }, function() {
            return self.getEndpoints(function(err, data) {
              if (err) {
                return callback(err);
              }

              if (data.success === true) {
                self.metadataUrl = data.data.metadataUrl;
                self.contentUrl = data.data.contentUrl;

                return self.save(function() {
                  return callback(null, retval);
                });
              } else {
                return self.save(function() {
                  return callback(null, data);
                });
              }
            });
          });
        });
      case 'object':
        retval.success = true;

        return async.forEachOf(authCredentials, function(value, key, callback) {
          self.token[key] = value;
          callback();
        }, function() {
          return self.getEndpoints(function(err, data) {
            if (err) {
              return callback(err);
            }

            if (data.success === true) {
              self.metadataUrl = data.data.metadataUrl;
              self.contentUrl = data.data.contentUrl;

              return self.save(function() {
                return callback(null, retval);
              });
            } else {
              return self.save(function() {
                return callback(null, data);
              });
            }
          });
        });
      default:
        return callback(new Error('Auth credentials must either be a token object or a redirect URL'));
    }
  }

  retval.success = true;

  if (Date.now() - (self.token.expires_in * 1000) > (self.token.last_authorized)) {
    return self.renewAuthorization(function(err, data) {
      if (err) {
        return callback(err);
      }

      if (data.success === true) {
        return async.forEachOf(data.data, function(value, key, callback) {
          self.token[key] = value;
          callback();
        }, function() {
          return self.save(function() {
            callback(null, retval);
          });
        });
      }

      return callback(null, data);
    });
  }

  return callback(null, retval);
};

Account.prototype.getEndpoints = function(callback) {
  var self = this;
  Request.get('https://cdws.us-east-1.amazonaws.com/drive/v1/account/endpoint', {
    headers: {
      Authorization: 'Bearer ' + self.token.access_token
    }
  }, function(err, response, body) {
    if (err) {
      return callback(err);
    }

    body = JSON.parse(body);
    if (response.statusCode === 200) {
      return callback(null, {
        success: true,
        data: body
      });
    }

    return callback(null, {
      success: false,
      data: body
    });
  });
};

Account.prototype.getQuota = function(callback) {
  var retval = {
    success: false,
    data: {}
  };

  var self = this;
  Request.get(self.metadataUrl + 'account/quota', {
    headers: {
      Authorization: 'Bearer ' + self.token.access_token
    }
  }, function(err, response, body) {
    if (err) {
      return callback(err);
    }

    retval.data = JSON.parse(body);
    if (retval.statusCode === 200) {
      retval.success = true;
    }

    return callback(null, retval);
  });
};

Account.prototype.getUsage = function(callback) {
  var retval = {
    success: false,
    data: {}
  };

  var self = this;
  Request.get(self.metadataUrl + 'account/usage', {
    headers: {
      Authorization: 'Bearer ' + self.token.access_token
    }
  }, function(err, response, body) {
    if (err) {
      return callback(err);
    }

    retval.data = JSON.parse(body);
    if (retval.statusCode === 200) {
      retval.success = true;
    }

    return callback(null, retval);
  });
};

Account.prototype.load = function(callback) {
  var self = this;
  this.cache.loadConfigByEmail(self.email, function(err, data) {
    if (err) {
      return callback(err);
    }

    var retval = {
      success: true,
      data: {}
    };

    var config = data.length === 0 ? {} : data[0];

    return async.forEachOf(config, function(value, key, callback) {
      self.token[key] = value;
      callback();
    }, function() {
      if (config.checkpoint !== undefined) {
        self.checkpoint = config.checkpoint;
      }

      self.metadataUrl = self.token.metadata_url;
      self.contentUrl = self.token.content_url;

      return callback(null, retval);
    });
  });
};

Account.prototype.renewAuthorization = function(callback) {
  var retval = {
    success: false,
    data: {}
  };

  var self = this;
  if (!self.clientId || self.clientSecret) {
    Request.get('https://data-mind-687.appspot.com/clouddrive?refresh_token=' + self.token.refresh_token, function(err, response, body) {
      if (err) {
        return callback(err);
      }

      retval.success = true;
      retval.data = JSON.parse(body);
      retval.data.last_authorized = Date.now();

      return callback(null, retval);
    });
  } else {
    Request.post('https://api.amazon.com/auth/o2/token', {
      form: {
        grant_type: 'refresh_token',
        refresh_token: self.token.refresh_token,
        client_id: self.clientId,
        client_secret: self.clientSecret,
        redirect_uri: 'http://localhost'
      }
    }, function(err, response, body) {
      if (err) {
        return callback(err);
      }

      retval.data = JSON.parse(body);
      if (response.statusCode === 200) {
        retval.success = true;
        retval.data.last_authorized = Date.now();
      }

      return callback(null, retval);
    });
  }
};

Account.prototype.requestAuthorization = function(redirectUrl, callback) {
  var retval = {
    success: false,
    data: {}
  };

  var url = Url.parse(redirectUrl, true);
  if (url.query.code === undefined) {
    return callback(new Error('No authorization code found in callback URL: ' + redirectUrl));
  }

  var self = this;
  Request.post('https://api.amazon.com/auth/o2/token', {
    form: {
      grant_type: 'authorization_code',
      code: url.query.code,
      client_id: self.clientId,
      client_secret: self.clientSecret,
      redirect_uri: 'http://localhost'
    }
  }, function(err, response, body) {
    if (err) {
      return callback(err);
    }

    retval.data = JSON.parse(body);
    if (response.statusCode === 200) {
      retval.success = true;
      retval.data.last_authorized = Date.now();
    }

    return callback(null, retval);
  });
};

Account.prototype.save = function(callback) {
  return this.cache.saveAccount(this, callback);
};

Account.prototype.setScope = function(scopes) {
  this.scope = scopes;
};

Account.prototype.sync = function(callback) {
  var params = {};

  if (this.checkpoint) {
    params.includePurged = 'true';
  }

  return this.getChanges(params, callback);
};

Account.prototype.getChanges = function(params, callback) {
  var self = this;
  var loop = true;

  if (this.checkpoint !== null) {
    params.checkpoint = this.checkpoint;
  }

  function processData(part, callback) {
    if (part.nodes !== undefined) {
      if (part.nodes.length === 0) {
        loop = false;

        return callback();
      } else {
        async.forEach(part.nodes, function(node, callback) {
          node = new Node(node);
          if (node.get('status') === 'PURGED') {
            return node.delete(callback);
          }

          return node.save(callback);
        }, function() {
          if (part.checkpoint !== undefined) {
            self.checkpoint = part.checkpoint;
          }

          return self.save(callback);
        });
      }
    }
  }

  Request.post(self.metadataUrl + 'changes', {
    headers: {
      Authorization: 'Bearer ' + self.token.access_token
    },
    body: JSON.stringify(params),
    gzip: true
  }, function(err, response, body) {
    if (err) {
      return callback(err);
    }

    if (response.statusCode === 401) {
      return self.authorize(null, function(err, data) {
        return self.getChanges(params, callback);
      });
    }

    if (!body) {
      return callback(new Error('Invalid data received: ', body));
    }

    var data = body.split('\n');
    async.forEachSeries(data, function(part, callback) {
      part = JSON.parse(part);

      if (part.end !== undefined && part.end === true) {
        return callback(null);
      }

      if (part.reset !== undefined && part.reset === true) {
        return self.cache.deleteAllNodes(function() {
          return processData(part, callback);
        });
      }

      return processData(part, callback);
    }, function() {
      if (loop === true) {
        return self.getChanges(params, callback);
      }

      return callback(null);
    });
  });
};

module.exports = Account;
