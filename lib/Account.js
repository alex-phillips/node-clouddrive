'use strict';

let got = require('got'),
  Url = require('url'),
  Node = require('./Node'),
  Logger = require('./Logger'),
  async = require('async'),
  fs = require('fs');

class Account {
  constructor({email = '', cache = null, clientId = null, clientSecret = null} = {}) {
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
      Account.SCOPE_WRITE,
    ];
  }

  async authorize(authCredentials, options) {
    let retval = {
      success: false,
      data: {},
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

        return retval;
      }

      if (typeof authCredentials === 'string') {
        let authResponse = await this.requestAuthorization(authCredentials);
        if (authResponse.success === false) {
          return authResponse;
        }

        authCredentials = authResponse.data;
      }

      if (typeof authCredentials !== 'object') {
        throw Error('Auth credentials must either be a token object or a redirect URL');
      }

      retval .success = true;

      for (let key in authCredentials) {
        this.token[key] = authCredentials[key];
      }
    } else {
      retval.success = true;

      if ((Date.now() - (this.token.expires_in * 1000) > (this.token.last_authorized)) || options.force === true) {
        let renewResponse = await this.renewAuthorization();
        if (renewResponse.success === true) {
          for (let key in renewResponse.data) {
            this.token[key] = renewResponse.data[key];
          }
        }
      }
    }

    let endpointsResponse = await this.getEndpoints();
    if (endpointsResponse.success === true) {
      this.metadataUrl = endpointsResponse.data.metadataUrl;
      this.contentUrl = endpointsResponse.data.contentUrl;
    } else {
      retval = endpointsResponse;
    }

    await this.save();

    return retval;
  }

  async getEndpoints() {
    let retval = {
      success: false,
      data: {
        metadataUrl: this.metadataUrl,
        contentUrl: this.contentUrl,
      },
    };

    Logger.verbose('Requesting account:endpoints endpoint');
    Logger.debug(`HTTP Request: GET 'https://cdws.us-east-1.amazonaws.com/drive/v1/account/endpoint'`);

    let response = await got.get('https://cdws.us-east-1.amazonaws.com/drive/v1/account/endpoint', {
      headers: {
        Authorization: `Bearer ${this.token.access_token}`,
      },
    });

    Logger.debug(`Response returned with status code ${response.statusCode}.`);
    Logger.silly(`Response body: ${response.body}`);

    retval.data = JSON.parse(response.body);
    if (response.statusCode === 200) {
      retval.success = true;
    }

    return retval;
  }

  async getInfo() {
    let retval = {
      success: false,
      data: {},
    };

    Logger.verbose('Requesting account:info endpoint');
    Logger.debug(`HTTP Request: GET '${this.metadataUrl}account/info'`);

    let response = await got.get(`${this.metadataUrl}account/info`, {
      headers: {
        Authorization: `Bearer ${this.token.access_token}`,
      },
    });

    Logger.debug(`Response returned with status code ${response.statusCode}.`);
    Logger.silly(`Response body: ${response.body}`);

    retval.data = JSON.parse(response.body);
    if (response.statusCode === 200) {
      retval.success = true;
    }

    return retval;
  }

  async getQuota() {
    let retval = {
      success: false,
      data: {},
    };

    Logger.verbose('Requesting account:quota endpoint');
    Logger.debug(`HTTP Request: GET '${this.metadataUrl}account/quota'`);

    let response = await got.get(`${this.metadataUrl}account/quota`, {
      headers: {
        Authorization: `Bearer ${this.token.access_token}`,
      },
    });

    Logger.debug(`Response returned with status code ${response.statusCode}.`);
    Logger.silly(`Response body: ${response.body}`);
    retval.data = JSON.parse(response.body);
    if (retval.statusCode === 200) {
      retval.success = true;
    }

    return retval;
  }

  async getUsage() {
    let retval = {
      success: false,
      data: {},
    };

    Logger.verbose('Requesting account:usage endpoint');
    Logger.debug(`HTTP Request: GET '${this.metadataUrl}account/usage'`);

    let response = await got.get(`${this.metadataUrl}account/usage`, {
      headers: {
        Authorization: `Bearer ${this.token.access_token}`,
      },
    });

    Logger.debug(`Response returned with status code ${response.statusCode}.`);
    Logger.debug(`Response body: ${response.body}`);
    retval.data = JSON.parse(response.body);
    if (response.statusCode === 200) {
      retval.success = true;
    }

    return retval;
  }

  async load() {
    let data = await this.cache.loadConfigByEmail(this.email);

    let retval = {
      success: true,
      data: {},
    };

    let config = data.length === 0 ? {} : data[0];
    for (let key in config) {
      this.token[key] = config[key];
    }

    if (config.checkpoint !== undefined) {
      this.checkpoint = config.checkpoint;
    }

    this.metadataUrl = this.token.metadata_url;
    this.contentUrl = this.token.content_url;

    return retval;
  }

  async renewAuthorization() {
    let retval = {
      success: false,
      data: {},
    };

    if (!this.clientId || !this.clientSecret) {
      Logger.verbose('Requesting auth:renew endpoint (no API credentials)');
      Logger.debug(`HTTP Request: GET 'https://data-mind-687.appspot.com/clouddrive?refresh_token=${this.token.refresh_token}'`);

      let response = await got.get(`https://data-mind-687.appspot.com/clouddrive?refresh_token=${this.token.refresh_token}`)

      Logger.debug(`Response returned with status code ${response.statusCode}.`);
      Logger.silly(`Response body: ${response.body}`);

      retval.success = true;
      retval.data = JSON.parse(response.body);
      retval.data.last_authorized = Date.now();
    } else {
      Logger.verbose('Requesting auth:renew endpoint (with API credentials)');
      Logger.debug(`HTTP Request: POST 'https://api.amazon.com/auth/o2/token'`);
      let response = await got.post('https://api.amazon.com/auth/o2/token', {
        body: {
          grant_type: 'refresh_token',
          refresh_token: this.token.refresh_token,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: 'http://localhost',
        },
      });

      Logger.debug(`Response returned with status code ${response.statusCode}.`);
      Logger.silly(`Response body: ${response.body}`);

      retval.data = JSON.parse(response.body);
      if (response.statusCode === 200) {
        retval.success = true;
        retval.data.last_authorized = Date.now();
      }
    }

    return retval;
  }

  async requestAuthorization(redirectUrl) {
    let retval = {
      success: false,
      data: {},
    };

    let url = Url.parse(redirectUrl, true);
    if (url.query.code === undefined) {
      throw Error(`No authorization code found in callback URL: ${redirectUrl}`);
    }

    Logger.verbose('Requesting auth:grant endpoint');
    Logger.debug(`HTTP Request: POST 'https://api.amazon.com/auth/o2/token'`);

    let response = await got.post('https://api.amazon.com/auth/o2/token', {
      body: {
        grant_type: 'authorization_code',
        code: url.query.code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: 'http://localhost',
      },
    });

    Logger.debug(`Response returned with status code ${response.statusCode}.`);
    Logger.silly(`Response body: ${response.body}`);

    retval.data = JSON.parse(response.body);
    if (response.statusCode === 200) {
      retval.success = true;
      retval.data.last_authorized = Date.now();
    }

    return retval;
  }

  async save() {
    return await this.cache.saveAccount(this);
  }

  setScope(scopes) {
    this.scope = scopes;
  }

  async sync(params) {
    params = params || {};

    if (this.checkpoint) {
      params.includePurged = 'true';
    }

    return await this.getChanges(params);
  }

  async getChanges(params) {
    this.loop = true;

    if (this.checkpoint !== null) {
      params.checkpoint = this.checkpoint;
    }

    Logger.verbose('Requesting changes:get endpoint');
    Logger.debug(`HTTP Request: POST '${this.metadataUrl}changes'`);

    let response = null;
    try {
      response = await got.post(`${this.metadataUrl}changes`, {
        headers: {
          Authorization: `Bearer ${this.token.access_token}`,
        },
        body: JSON.stringify(params),
        gzip: true,
      });
    } catch(err) {
      if (err.statusCode === 401) {
        await this.authorize(null,  {force: true});

        return await this.getChanges(params);
      }

      throw err;
    }

    Logger.debug(`Response returned with status code ${response.statusCode}.`);
    Logger.silly(`Response body: ${response.body}`);

    if (!response.body) {
      Logger.error('Invalid body received. Trying Again.');

      return await this.getChanges(params);
    }

    let data = response.body.split('\n');
    Logger.debug(`Received ${data.length} parts.`);

    for (let part of data) {
      if (!part) {
        Logger.warn(`Invalid part. Skipping: ${part}`);
        continue;
      }

      part = JSON.parse(part);

      if (part.end !== undefined && part.end === true) {
        continue;
      }

      if (part.reset !== undefined && part.reset === true) {
        await this.cache.deleteAllNodes();
        let changes = await this.processData(part);

        Logger.verbose(`Created/updated ${changes.inserted} nodes.`);
        Logger.verbose(`Purged ${changes.purged} nodes.`);

        continue;
      }

      let changes = await this.processData(part);
      Logger.verbose(`Created/updated ${changes.inserted} nodes.`);
      Logger.verbose(`Purged ${changes.purged} nodes.`);
    }

    if (this.loop === true) {
      await this.getChanges(params);
    }
  }

  async processData(part) {
    Logger.debug(`Processing part with ${part.nodes.length} nodes`);

    let changes = {
      inserted: 0,
      purged: 0,
    };
    if (part.nodes !== undefined) {
      if (part.nodes.length === 0) {
        this.loop = false;

        return changes;
      }

      await this.cache.transaction();
      await Promise.all(part.nodes.map(node => {
        node = new Node(node);
        if (node.getStatus() === Node.STATUS_PURGED) {
          changes.purged++;

          return node.del();
        }

        changes.inserted++;

        return node.save();
      }));

      if (part.checkpoint !== undefined) {
        this.checkpoint = part.checkpoint;
      }

      Logger.debug('Attempting to save account...');

      try {
        await this.save();
        this.cache.commit();

        return changes;
      } catch (err) {
        this.cache.rollback();
        throw err;
      }
    }
  }
}

Account.SCOPE_READ_IMAGE = 'clouddrive:read_image';
Account.SCOPE_READ_VIDEO = 'clouddrive:read_video';
Account.SCOPE_READ_DOCUMENT = 'clouddrive:read_document';
Account.SCOPE_READ_OTHER = 'clouddrive:read_other';
Account.SCOPE_READ_ALL = 'clouddrive:read_all';
Account.SCOPE_WRITE = 'clouddrive:write';

module.exports = Account;
