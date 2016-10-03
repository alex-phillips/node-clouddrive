'use strict';

let got = require('got'),
  Url = require('url'),
  Node = require('./Node'),
  Logger = require('./Logger'),
  async = require('async'),
  fs = require('fs');

class Account {
  constructor(email, cache, clientId = null, clientSecret = null) {
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

  authorize(authCredentials, options, callback) {
    let retval = {
      success: false,
      data: {}
    };

    if (!options) {
      options = {};
    }

    if (authCredentials === undefined) {
      authCredentials = null;
    }

    let scope = encodeURIComponent(this.scope.join(' '));

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
            }, err => {
              if (err) {
                return callback(err);
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
          }, err => {
            if (err) {
              return callback(err);
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

              return this.save(() => {
                return callback(null, data);
              });
            });
          });
        default:
          return callback(Error('Auth credentials must either be a token object or a redirect URL'));
      }
    }

    retval.success = true;

    if ((Date.now() - (this.token.expires_in * 1000) > (this.token.last_authorized)) || options.force === true) {
      return this.renewAuthorization((err, data) => {
        if (err) {
          return callback(err);
        }

        if (data.success === true) {
          return async.forEachOf(data.data, (value, key, callback) => {
            this.token[key] = value;
            callback();
          }, err => {
            if (err) {
              return callback(err);
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
    let retval = {
      success: false,
      data: {
        metadataUrl: this.metadataUrl,
        contentUrl: this.contentUrl
      }
    };

    Logger.debug(`HTTP Request: GET 'https://cdws.us-east-1.amazonaws.com/drive/v1/account/endpoint'`);
    got.get('https://cdws.us-east-1.amazonaws.com/drive/v1/account/endpoint', {
      headers: {
        Authorization: 'Bearer ' + this.token.access_token
      }
    })
      .then(response => {
        Logger.verbose(`Response returned with status code ${response.statusCode}.`);
        Logger.silly(`Response body: ${response.body}`);
        retval.data = JSON.parse(response.body);
        if (response.statusCode === 200) {
          retval.success = true;
        }

        return callback(null, retval);
      })
      .catch(err => {
        return callback(err);
      });
  }

  getInfo(callback) {
    let retval = {
      success: false,
      data: {}
    };

    Logger.debug(`HTTP Request: GET '${this.metadataUrl}account/info'`);
    got.get(`${this.metadataUrl}account/info`, {
      headers: {
        Authorization: 'Bearer ' + this.token.access_token
      }
    })
      .then(response => {
        Logger.verbose(`Response returned with status code ${response.statusCode}.`);
        Logger.silly(`Response body: ${response.body}`);
        retval.data = JSON.parse(response.body);
        if (response.statusCode === 200) {
          retval.success = true;
        }

        return callback(null, retval);
      })
      .catch(err => {
        return callback(err);
      });
  }

  getQuota(callback) {
    let retval = {
      success: false,
      data: {}
    };

    Logger.debug(`HTTP Request: GET '${this.metadataUrl}account/quota'`);
    got.get(`${this.metadataUrl}account/quota`, {
      headers: {
        Authorization: 'Bearer ' + this.token.access_token
      }
    })
      .then(response => {
        Logger.verbose(`Response returned with status code ${response.statusCode}.`);
        Logger.silly(`Response body: ${response.body}`);
        retval.data = JSON.parse(response.body);
        if (retval.statusCode === 200) {
          retval.success = true;
        }

        return callback(null, retval);
      })
      .catch(err => {
        return callback(err);
      });
  }

  getUsage(callback) {
    let retval = {
      success: false,
      data: {}
    };

    Logger.debug(`HTTP Request: GET '${this.metadataUrl}account/usage'`);
    got.get(`${this.metadataUrl}account/usage`, {
      headers: {
        Authorization: 'Bearer ' + this.token.access_token
      },
    })
      .then(response => {
        Logger.verbose(`Response returned with status code ${response.statusCode}.`);
        Logger.debug(`Response body: ${response.body}`);
        retval.data = JSON.parse(response.body);
        if (response.statusCode === 200) {
          retval.success = true;
        }

        return callback(null, retval);
      })
      .catch(err => {
        return callback(err);
      });
  }

  load(callback) {
    this.cache.loadConfigByEmail(this.email, (err, data) => {
      if (err) {
        return callback(err);
      }

      let retval = {
        success: true,
        data: {}
      };

      let config = data.length === 0 ? {} : data[0];

      return async.forEachOf(config, (value, key, callback) => {
        this.token[key] = value;
        callback();
      }, err => {
        if (err) {
          return callback(err);
        }

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
    let retval = {
      success: false,
      data: {}
    };

    if (!this.clientId || !this.clientSecret) {
      Logger.debug(`HTTP Request: GET 'https://data-mind-687.appspot.com/clouddrive?refresh_token=${this.token.refresh_token}'`);
      got.get(`https://data-mind-687.appspot.com/clouddrive?refresh_token=${this.token.refresh_token}`)
        .then(response => {
          Logger.verbose(`Response returned with status code ${response.statusCode}.`);
          Logger.silly(`Response body: ${response.body}`);
          retval.success = true;
          retval.data = JSON.parse(response.body);
          retval.data.last_authorized = Date.now();

          return callback(null, retval);
        })
        .catch(err => {
          return callback(err);
        });
    } else {
      Logger.debug(`HTTP Request: POST 'https://api.amazon.com/auth/o2/token'`);
      got.post('https://api.amazon.com/auth/o2/token', {
        body: {
          grant_type: 'refresh_token',
          refresh_token: this.token.refresh_token,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: 'http://localhost'
        }
      })
        .then(response => {
          Logger.verbose(`Response returned with status code ${response.statusCode}.`);
          Logger.silly(`Response body: ${response.body}`);
          retval.data = JSON.parse(response.body);
          if (response.statusCode === 200) {
            retval.success = true;
            retval.data.last_authorized = Date.now();
          }

          return callback(null, retval);
        })
        .catch(err => {
          return callback(err);
        });
    }
  }

  requestAuthorization(redirectUrl, callback) {
    let retval = {
      success: false,
      data: {}
    };

    let url = Url.parse(redirectUrl, true);
    if (url.query.code === undefined) {
      return callback(Error(`No authorization code found in callback URL: ${redirectUrl}`));
    }

    Logger.debug(`HTTP Request: POST 'https://api.amazon.com/auth/o2/token'`);
    got.post('https://api.amazon.com/auth/o2/token', {
      body: {
        grant_type: 'authorization_code',
        code: url.query.code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: 'http://localhost',
      }
    })
      .then(response => {
        Logger.verbose(`Response returned with status code ${response.statusCode}.`);
        Logger.silly(`Response body: ${response.body}`);
        retval.data = JSON.parse(response.body);
        if (response.statusCode === 200) {
          retval.success = true;
          retval.data.last_authorized = Date.now();
        }

        return callback(null, retval);
      })
      .catch(err => {
        return callback(err);
      });
  }

  save(callback) {
    return this.cache.saveAccount(this, callback);
  }

  setScope(scopes) {
    this.scope = scopes;
  }

  sync(params, callback) {
    params = params ? params : {};

    if (this.checkpoint) {
      params.includePurged = 'true';
    }

    return this.getChanges(params, callback);
  }

  getChanges(params, callback) {
    let loop = true;

    if (this.checkpoint !== null) {
      params.checkpoint = this.checkpoint;
    }

    let self = this;
    function processData(part, callback) {
      if (part.nodes !== undefined) {
        if (part.nodes.length === 0) {
          loop = false;

          return callback(null, 0, 0);
        } else {
          let inserted = 0,
            purged = 0;
          self.cache.transaction(() => {
            async.forEach(part.nodes, (node, callback) => {
              node = new Node(node);
              if (node.getStatus() === Node.STATUS_PURGED) {
                purged++;

                return node.del(callback);
              }

              inserted++;

              return node.save(callback);
            }, err => {
              if (err) {
                return callback(err);
              }

              if (part.checkpoint !== undefined) {
                self.checkpoint = part.checkpoint;
              }

              return self.save(err => {
                if (err) {
                  self.cache.rollback();

                  return callback(err);
                }

                self.cache.commit();

                return callback(null, inserted, purged);
              });
            });
          });
        }
      }
    }

    Logger.debug(`HTTP Request: POST '${this.metadataUrl}changes'`);
    got.post(`${this.metadataUrl}changes`, {
      headers: {
        Authorization: 'Bearer ' + this.token.access_token
      },
      body: JSON.stringify(params),
      gzip: true,
    })
      .then(response => {
        Logger.verbose(`Response returned with status code ${response.statusCode}.`);
        Logger.silly(`Response body: ${response.body}`);
        if (response.statusCode === 401) {
          return this.authorize(null,  {force: true}, (err, data) => {
            if (err) {
              return callback(err);
            }

            return this.getChanges(params, callback);
          });
        }

        if (!response.body) {
          return callback(Error(`Invalid data received: ${response.body}`));
        }

        let data = response.body.split('\n');
        Logger.verbose(`Received ${data.length} parts.`);
        async.forEachSeries(data, (part, callback) => {
          part = JSON.parse(part);

          if (part.end !== undefined && part.end === true) {
            return callback();
          }

          if (part.reset !== undefined && part.reset === true) {
            return this.cache.deleteAllNodes(() => {
              return processData(part, (err, inserted, purged) => {
                if (err) {
                  return callback(err);
                }

                Logger.verbose(`Created/updated ${inserted} nodes.`);
                Logger.verbose(`Purged ${purged} nodes.`);
                callback();
              });
            });
          }

          return processData(part, (err, inserted, purged) => {
            if (err) {
              return callback(err);
            }

            Logger.verbose(`Created/updated ${inserted} nodes.`);
            Logger.verbose(`Purged ${purged} nodes.`);
            callback();
          });
        }, err => {
          if (err) {
            return callback(err);
          }

          if (loop === true) {
            return this.getChanges(params, callback);
          }

          return callback();
        });
      })
      .catch(err => {
        return callback(err);
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
