'use strict';

let Cache = require('./Cache'),
  Node = require('../Node'),
  async = require('async'),
  moment = require('moment');

class SQL extends Cache {
  constructor(config) {
    super(config);
    this.db = require('knex')(config);
    this.trx = null;
  }

  commit() {
    if (this.trx) {
      this.trx.commit();
    }

    this.trx = null;
  }

  async deleteAllNodes(callback) {
    await this.db('nodes').del()
      .transacting(this.trx);

    await this.db('nodes_nodes').del()
      .transacting(this.trx);
  }

  async deleteNodeById(id) {
    await this.db('nodes').where({
        id: id
      })
      .del()
      .transacting(this.trx);
  }

  async filter(filters) {
    let data = await this.db.select('raw_data')
      .from('nodes')
      .where(filters)
      .transacting(this.trx);

    await Promise.all(data.map((row, index) => {
      data[index] = new Node(JSON.parse(row.raw_data));
    }));

    return data;
  }

  async findNodeById(id) {
    let data = await this.db.select('raw_data')
      .from('nodes')
      .where({
        id: id
      })
      .transacting(this.trx);

    if (data.length === 0) {
      return null;
    }

    return new Node(JSON.parse(data[0].raw_data));
  }

  async findNodesByMd5(md5) {
    let data = await this.db.select('raw_data')
      .from('nodes')
      .where({
        md5: md5
      })
      .transacting(this.trx);

    return data.map(row => {
      return new Node(JSON.parse(row.raw_data));
    });
  }

  async findNodesByName(name) {
    let data = this.db.select('raw_data')
      .from('nodes')
      .where({
        name: name
      })
      .transacting(this.trx);

    return data.map(row => {
      return new Node(JSON.parse(row.raw_data));
    });
  }

  async getNodeChildren(node) {
    let data = await this.db.select('raw_data')
      .from('nodes')
      .innerJoin('nodes_nodes', 'nodes.id', 'nodes_nodes.id_node')
      .where({
        'nodes_nodes.id_parent': node.getId()
      })
      .transacting(this.trx);

    return data.map(row => {
      return new Node(JSON.parse(row.raw_data));
    });
  }

  async loadConfigByEmail(email) {
    return await this.db.select('*')
      .from('configs')
      .where({
        email: email
      })
      .transacting(this.trx);
  }

  rollback() {
    if (this.trx) {
      this.trx.rollback();
    }

    this.trx = null;
  }

  async saveAccount(account) {
    let data = await this.db.select('*')
      .from('configs')
      .where({
        email: account.email
      })
      .transacting(this.trx);


    if (data.length === 0) {
      await this.db('configs')
        .insert({
          email: account.email,
          token_type: account.token.token_type,
          expires_in: account.token.expires_in,
          refresh_token: account.token.refresh_token,
          access_token: account.token.access_token,
          last_authorized: account.token.last_authorized,
          content_url: account.contentUrl,
          metadata_url: account.metadataUrl,
          checkpoint: account.checkpoint
        })
        .transacting(this.trx);
    } else {
      await this.db('configs')
        .where('email', '=', account.email)
        .update({
          token_type: account.token.token_type,
          expires_in: account.token.expires_in,
          refresh_token: account.token.refresh_token,
          access_token: account.token.access_token,
          last_authorized: account.token.last_authorized,
          content_url: account.contentUrl,
          metadata_url: account.metadataUrl,
          checkpoint: account.checkpoint
        })
        .transacting(this.trx);
    }
  }

  async saveNode(node) {
    if (!node.getName()) {
      if (node.isRoot() === true) {
        node.set('name', 'Cloud Drive');
      } else {
        throw Error(`Node cannot be saved with no name (node ID: ${node.getId()})`);
      }
    }

    let data = await this.db.select('*')
      .from('nodes')
      .where({
        id: node.getId()
      })
      .transacting(this.trx);

    if (data.length === 0) {
      await this.db('nodes')
        .insert({
          id: node.getId(),
          name: node.getName(),
          kind: node.getKind(),
          md5: node.getMd5(),
          status: node.getStatus(),
          created: moment(new Date(node.getCreatedDate())).format('YYYY-MM-DD HH:mm:ss'),
          modified: moment(new Date(node.getModifiedDate())).format('YYYY-MM-DD HH:mm:ss'),
          raw_data: JSON.stringify(node.getData())
        })
        .transacting(this.trx);
    } else {
      await this.db('nodes')
        .where('id', '=', node.getId())
        .update({
          name: node.getName(),
          kind: node.getKind(),
          md5: node.getMd5(),
          status: node.getStatus(),
          created: moment(new Date(node.getCreatedDate())).format('YYYY-MM-DD HH:mm:ss'),
          modified: moment(new Date(node.getModifiedDate())).format('YYYY-MM-DD HH:mm:ss'),
          raw_data: JSON.stringify(node.getData())
        })
        .transacting(this.trx);
    }

    return await this.saveNodeParents(node);
  }

  async saveNodeParents(node, callback) {
    let parents = node.getParentIds();
    let data = await this.db.select('*')
      .from('nodes_nodes')
      .where({
        id_node: node.getId(),
      })
      .transacting(this.trx);

    await Promise.all(data.map(row => {
      let index = parents.indexOf(row['id_parent']);
      if (index === -1) {
        return this.db('nodes_nodes')
          .where({
            id_parent: row['id_parent'],
            id_node: node.getId()
          })
          .del()
          .transacting(this.trx);
      }

      delete(parents[index]);
    }));

    await Promise.all(parents.map(parent => {
      if (!parent) {
        return callback();
      }

      return this.db('nodes_nodes')
        .insert({
          id_node: node.getId(),
          id_parent: parent
        })
        .transacting(this.trx);
    }));
  }

  async searchBy(field, value) {
    let data = await this.db.select('raw_data')
      .from('nodes')
      .where(field, 'like', `%${value}%`)
      .transacting(this.trx);

    return data.map(row => {
      return new Node(JSON.parse(row.raw_data));
    });
  }

  transaction() {
    return new Promise(resolve => {
      this.db.transaction(trx => {
        this.trx = trx;
        return resolve();
      });
    });
  }
}

module.exports = SQL;
