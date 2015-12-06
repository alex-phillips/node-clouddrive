'use strict';

var Request = require('request'),
  Url = require('url'),
  Node = require('./Node'),
  async = require('async'),
  fs = require('fs');

class Account {
  constructor(email, clientId, clientSecret, cache) {
    this.email = email;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.cache = cache;
    this.token = {};
    this.checkpoint = null;
    this.metadataUrl = null;
    this.contentUrl = null;
    this.scope = [
      Account.SCOPE_READ_ALL,
      Account.SCOPE_WRITE
    ];
  }

  authorize(authCredentials, callback) {
    var retval = {
      success: false,
      data: {}
    };

    if (authCredentials === undefined) {
      authCredentials = null;
    }

    var scope = encodeURIComponent(this.scope.join(' '));

    if (this.token.access_token === undefined || !this.token.access_token) {
      if (authCredentials === null) {
        retval.data.message = 'Initial authorization is required';
        if (!this.clientId || !this.clientSecret) {
          retval.data.auth_url = 'https://data-mind-687.appspot.com/clouddrive';
        } else {
          retval.data.auth_url = `https://www.amazon.com/ap/oa?client_id=${this.clientId}&scope=${scope}&response_type=code&redirect_uri=http://localhost`;
        }

        return callback(null, retval);
      }

      switch (typeof authCredentials) {
        case 'string':
          return this.requestAuthorization(authCredentials, (err, data) => {
            if (err) {
              return callback(err);
            }

            if (data.success === false) {
              return callback(null, data);
            }

            retval.success = true;

            return async.forEachOf(data.data, (value, key, callback) => {
              this.token[key] = value;
              callback();
            }, () => {
              return this.getEndpoints((err, data) => {
                if (err) {
                  return callback(err);
                }

                if (data.success === true) {
                  this.metadataUrl = data.data.metadataUrl;
                  this.contentUrl = data.data.contentUrl;

                  return this.save(() => {
                    return callback(null, retval);
                  });
                }

                return this.save(() => {
                  return callback(null, data);
                });
              });
            });
          });
        case 'object':
          retval.success = true;

          return async.forEachOf(authCredentials, (value, key, callback) => {
            this.token[key] = value;
            callback();
          }, () => {
            return this.getEndpoints((err, data) => {
              if (err) {
                return callback(err);
              }

              if (data.success === true) {
                this.metadataUrl = data.data.metadataUrl;
                this.contentUrl = data.data.contentUrl;

                return this.save(() => {
                  return callback(null, retval);
                });
              }

              return this.save(() => {
                return callback(null, data);
              });
            });
          });
        default:
          return callback(new Error('Auth credentials must either be a token object or a redirect URL'));
      }
    }

    retval.success = true;

    if (Date.now() - (this.token.expires_in * 1000) > (this.token.last_authorized)) {
      return this.renewAuthorization((err, data) => {
        if (err) {
          return callback(err);
        }

        if (data.success === true) {
          return async.forEachOf(data.data, (value, key, callback) => {
            this.token[key] = value;
            callback();
          }, () => {
            return this.getEndpoints((err, data) => {
              if (err) {
                return callback(err);
              }

              if (data.success === true) {
                this.metadataUrl = data.data.metadataUrl;
                this.contentUrl = data.data.contentUrl;

                return this.save(() => {
                  return callback(null, retval);
                });
              }

              return this.save(() => {
                return callback(null, data);
              });
            });
          });
        }

        return callback(null, data);
      });
    }

    return this.getEndpoints((err, data) => {
      if (err) {
        return callback(err);
      }

      if (data.success === true) {
        this.metadataUrl = data.data.metadataUrl;
        this.contentUrl = data.data.contentUrl;

        return this.save(() => {
          return callback(null, retval);
        });
      }

      return callback(null, data);
    });
  }

  getEndpoints(callback) {
    var retval = {
      success: true,
      data: {
        metadataUrl: this.metadataUrl,
        contentUrl: this.contentUrl
      }
    };

    return Request.get('https://cdws.us-east-1.amazonaws.com/drive/v1/account/endpoint', {
      headers: {
        Authorization: 'Bearer ' + this.token.access_token
      }
    }, (err, response, body) => {
      if (err) {
        return callback(err);
      }

      retval.data = JSON.parse(body);
      if (response.statusCode === 200) {
        return callback(null, retval);
      }

      retval.success = false;
      return callback(null, retval);
    });
  }

  getInfo(callback) {
    var retval = {
      success: false,
      data: {}
    };

    Request.get(`${this.metadataUrl}account/info`, {
      headers: {
        Authorization: 'Bearer ' + this.token.access_token
      }
    }, (err, response, body) => {
      if (err) {
        return callback(err);
      }

      retval.data = JSON.parse(body);
      if (response.statusCode === 200) {
        retval.success = true;
      }

      return callback(null, retval);
    });
  }

  getQuota(callback) {
    var retval = {
      success: false,
      data: {}
    };

    Request.get(`${this.metadataUrl}account/quota`, {
      headers: {
        Authorization: 'Bearer ' + this.token.access_token
      }
    }, (err, response, body) => {
      if (err) {
        return callback(err);
      }

      retval.data = JSON.parse(body);
      if (retval.statusCode === 200) {
        retval.success = true;
      }

      return callback(null, retval);
    });
  }

  getUsage(callback) {
    var retval = {
      success: false,
      data: {}
    };

    Request.get(`${this.metadataUrl}account/usage`, {
      headers: {
        Authorization: 'Bearer ' + this.token.access_token
      }
    }, (err, response, body) => {
      if (err) {
        return callback(err);
      }

      retval.data = JSON.parse(body);
      if (retval.statusCode === 200) {
        retval.success = true;
      }

      return callback(null, retval);
    });
  }

  load(callback) {
    this.cache.loadConfigByEmail(this.email, (err, data) => {
      if (err) {
        return callback(err);
      }

      var retval = {
        success: true,
        data: {}
      };

      var config = data.length === 0 ? {} : data[0];

      return async.forEachOf(config, (value, key, callback) => {
        this.token[key] = value;
        callback();
      }, () => {
        if (config.checkpoint !== undefined) {
          this.checkpoint = config.checkpoint;
        }

        this.metadataUrl = this.token.metadata_url;
        this.contentUrl = this.token.content_url;

        return callback(null, retval);
      });
    });
  }

  renewAuthorization(callback) {
    var retval = {
      success: false,
      data: {}
    };

    if (!this.clientId || !this.clientSecret) {
      Request.get(`https://data-mind-687.appspot.com/clouddrive?refresh_token=${this.token.refresh_token}`, (err, response, body) => {
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
          refresh_token: this.token.refresh_token,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: 'http://localhost'
        }
      }, (err, response, body) => {
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
  }

  requestAuthorization(redirectUrl, callback) {
    var retval = {
      success: false,
      data: {}
    };

    var url = Url.parse(redirectUrl, true);
    if (url.query.code === undefined) {
      return callback(new Error(`No authorization code found in callback URL: ${redirectUrl}`));
    }

    Request.post('https://api.amazon.com/auth/o2/token', {
      form: {
        grant_type: 'authorization_code',
        code: url.query.code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: 'http://localhost'
      }
    }, (err, response, body) => {
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

  save(callback) {
    return this.cache.saveAccount(this, callback);
  }

  setScope(scopes) {
    this.scope = scopes;
  }

  sync(callback) {
    var params = {};

    if (this.checkpoint) {
      params.includePurged = 'true';
    }

    return this.getChanges(params, callback);
  }

  getChanges(params, callback) {
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
          async.forEach(part.nodes, (node, callback) => {
            node = new Node(node);
            if (node.get('status') === 'PURGED') {
              return node.delete(callback);
            }

            return node.save(callback);
          }, () => {
            if (part.checkpoint !== undefined) {
              this.checkpoint = part.checkpoint;
            }

            return this.save(callback);
          });
        }
      }
    }

    Request.post(`${this.metadataUrl}changes`, {
      headers: {
        Authorization: 'Bearer ' + this.token.access_token
      },
      body: JSON.stringify(params),
      gzip: true
    }, (err, response, body) => {
      if (err) {
        return callback(err);
      }

      if (response.statusCode === 401) {
        return this.authorize(null, (err, data) => {
          return this.getChanges(params, callback);
        });
      }

      if (!body) {
        return callback(new Error(`Invalid data received: ${body}`));
      }

      var data = body.split('\n');
      async.forEachSeries(data, (part, callback) => {
        part = JSON.parse(part);

        if (part.end !== undefined && part.end === true) {
          return callback(null);
        }

        if (part.reset !== undefined && part.reset === true) {
          return this.cache.deleteAllNodes(() => {
            return processData(part, callback);
          });
        }

        return processData(part, callback);
      }, () => {
        if (loop === true) {
          return this.getChanges(params, callback);
        }

        return callback(null);
      });
    });
  }
}

Account.SCOPE_READ_IMAGE = 'clouddrive:read_image';
Account.SCOPE_READ_VIDEO = 'clouddrive:read_video';
Account.SCOPE_READ_DOCUMENT = 'clouddrive:read_document';
Account.SCOPE_READ_OTHER = 'clouddrive:read_other';
Account.SCOPE_READ_ALL = 'clouddrive:read_all';
Account.SCOPE_WRITE = 'clouddrive:write';

module.exports = Account;
