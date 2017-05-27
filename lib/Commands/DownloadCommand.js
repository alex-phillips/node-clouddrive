'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Utils = require('../Utils'),
  Logger = require('../Logger'),
  ProgressBar = require('../ProgressBar'),
  async = require('async'),
  inquirer = require('inquirer');

class DownloadCommand extends Command {
  async run(args, options) {
    let remotePath = args[0],
      localPath = args[1],
      searchFunction = Node.loadByPath,
      notFound = `No node exists at path '${remotePath}'`;
    if (options.id) {
      searchFunction = Node.loadById;
      notFound = `No node exists with ID '${remotePath}'`;
    }

    if (remotePath) {
      remotePath = remotePath.trim();
    }

    await this.initialize();

    let node = await searchFunction(remotePath);
    if (!node) {
      throw Error(notFound);
    }

    let queryParams = {};
    if (options.dimensions) {
      queryParams.viewBox = options.dimensions;
    }

    let bar = null,
      downloadingNode = null,
      bytesDownloaded = 0,
      bytesTransfered = 0,
      lastRun = null,
      startTime = null,
      opts = {
        remote: options.remote,
        queryParams: queryParams,
        maxConnections: this.config.get('download.maxConnections') || 1,
        retryAttempt: 0,
        numRetries: this.config.get('upload.numRetries'),
        checkMd5: this.config.get('download.checkMd5'),
        decrypt: options.decrypt || false,
        password: this.config.get('crypto.password'),
        algorithm: this.config.get('crypto.algorithm'),
        armor: options.armor || this.config.get('crypto.armor'),
      };

    if (options.decrypt && options.password) {
      let answers = await inquirer.prompt([
        {
          type: 'password',
          name: 'password',
          message: 'password: '
        }
      ]);

      opts.password = answers.password;
    }

    node.on('fileDownload', node => {
      if (this.config.get('cli.progressBars') && opts.maxConnections === 1) {
        startTime = Date.now();
        bytesDownloaded = 0;
        downloadingNode = node;
        lastRun = Date.now();
        bar = new ProgressBar(`Downloading ${downloadingNode.getName()}\n:percent[:bar] :speed eta :etas (:downloaded / :filesize)`, {
          total: node.getSize(),
          incomplete: ' ',
          width: 40,
          clear: false,
          renderThrottle: this.config.get('cli.progressInterval')
        });
      }
    });

    node.on('downloadProgress', data => {
      if (bar) {
        bytesDownloaded += data.length;
        bytesTransfered += data.length;

        let timeDiff = Date.now() - lastRun;

        if (timeDiff >= this.config.get('cli.progressInterval') || bytesDownloaded >= downloadingNode.getSize()) {
          lastRun = Date.now();
          bar.tick(bytesTransfered, {
            speed: `${Utils.convertFileSize(Math.round(bytesTransfered / (timeDiff / 1000)), 2)}/s`,
            downloaded: Utils.convertFileSize(bytesDownloaded),
            filesize: Utils.convertFileSize(downloadingNode.getSize()),
          });
          bytesTransfered = 0;
        }
      }
    });

    node.on('downloadComplete', (response, body, retval, data) => {
      // Clear out progress bar
      if (bar !== null) {
        bar.clear();
        bar = null;
      }

      if (response) {
        Logger.debug(`Response returned with status code ${response.statusCode}`);
      }

      if (retval.success) {
        return Logger.info(`Successfully downloaded '${data.localPath}'`);
      }

      let message = `Failed to download '${data.localPath}'`;
      if (retval.data.message) {
        message += ': ' + retval.data.message;
      }

      if (retval.data.exists) {
        Logger.warn(message);
      } else {
        Logger.error(message);
      }
    });

    await node.download(localPath, opts);
  }
}

module.exports = DownloadCommand;
