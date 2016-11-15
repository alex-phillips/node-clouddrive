'use strict';

let logUpdate = require('log-update');

/**
 * Initialize a `ProgressBar` with the given `format` string and `options` or
 * `total`.
 *
 * Options:
 *
 *   - `total` total number of ticks to complete
 *   - `width` the displayed width of the progress bar defaulting to total
 *   - `stream` the output stream defaulting to stderr
 *   - `complete` completion character defaulting to "="
 *   - `incomplete` incomplete character defaulting to "-"
 *   - `renderThrottle` minimum time between updates in milliseconds defaulting to 16
 *   - `callback` optional function to call when the progress bar completes
 *   - `clear` will clear the progress bar upon termination
 *
 * Tokens:
 *
 *   - `:bar` the progress bar itself
 *   - `:current` current tick number
 *   - `:total` total ticks
 *   - `:elapsed` time elapsed in seconds
 *   - `:percent` completion percentage
 *   - `:eta` eta in seconds
 *
 * @param {string} fmt
 * @param {object|number} options or total
 * @api public
 */
class ProgressBar {
  constructor(format, options = {}) {
    let config = {
      format: format,
      total: options.total,
      width: options.width || options.total,
      chars: {
        complete: options.complete || '=',
        incomplete: options.incomplete || '-',
      },
      renderThrottle: options.renderThrottle !== 0 ? (options.renderThrottle || 16) : 0,
      current: 0,
      output: options.output !== undefined ? options.output : true,
      clear: options.clear !== undefined ? options.clear : true,
      stream: options.stream || process.stderr,
      callback: options.callback,
      tokens: {},
      lastDraw: '',
      complete: false,
    };

    this.options = {};
    for (let option in config) {
      this.options[option] = config[option];
    }
  }

  getOutput() {
    return this.options.lastDraw;
  }

  tick(length = 1, tokens = {}) {
    if (typeof length === 'object') {
      tokens = length;
      length = 1;
    }

    this.options.tokens = tokens;
    if (!this.options.current) {
      logUpdate.done();
      this.options.start = new Date();
    }

    this.options.current += length;

    // schedule render
    if (!this.options.renderThrottleTimeout) {
      this.options.renderThrottleTimeout = setTimeout(this.render.bind(this), this.options.renderThrottle);
    }

    // progress complete
    if (this.options.current >= this.options.total) {
      if (this.options.renderThrottleTimeout) {
        this.render();
      }
      this.options.complete = true;
      if (this.options.clear) {
        this.clear();
      }
      if (this.options.callback) {
        this.options.callback(this);
      }
    }
  }

  /**
   * Method to render the progress bar with optional `tokens` to place in the
   * progress bar's `fmt` field.
   *
   * @param {object} tokens
   * @api public
   */
  render(tokens = null) {
    clearTimeout(this.options.renderThrottleTimeout);
    this.options.renderThrottleTimeout = null;

    this.options.tokens = tokens || this.options.tokens;

    let ratio = this.options.current / this.options.total;
    ratio = Math.min(Math.max(ratio, 0), 1);

    let percent = ratio * 100,
      incomplete, complete, completeLength,
      elapsed = new Date() - this.options.start,
      eta = percent === 100 ? 0 : elapsed * (this.options.total / this.options.current - 1);

    let str = this.options.format
      .replace(':current', this.options.current)
      .replace(':total', this.options.total)
      .replace(':elapsed', isNaN(elapsed) ? '0.0' : (elapsed / 1000).toFixed(1))
      .replace(':eta', (isNaN(eta) || !isFinite(eta)) ? '0.0' : (eta / 1000).toFixed(1))
      .replace(':percent', percent.toFixed(0) + '%');

    /* compute the available space (non-zero) for the bar */
    let availableSpace = Math.max(0, this.options.stream.columns - str.replace(':bar', '').length),
      width = Math.min(this.options.width, availableSpace);

    /* TODO: the following assumes the user has one ':bar' token */
    completeLength = Math.round(width * ratio);
    complete = Array(completeLength + 1).join(this.options.chars.complete);
    incomplete = Array(width - completeLength + 1).join(this.options.chars.incomplete);

    /* fill in the actual progress bar */
    str = str.replace(':bar', complete + incomplete);

    /* replace the extra tokens */
    if (this.options.tokens) for (var key in this.options.tokens) str = str.replace(':' + key, this.options.tokens[key]);

    if (this.options.lastDraw !== str) {
      if (this.options.output) {
        logUpdate(str);
      }
      this.options.lastDraw = str;
    }
  }

  /**
   * "update" the progress bar to represent an exact percentage.
   * The ratio (between 0 and 1) specified will be multiplied by `total` and
   * floored, representing the closest available "tick." For example, if a
   * progress bar has a length of 3 and `update(0.5)` is called, the progress
   * will be set to 1.
   *
   * A ratio of 0.5 will attempt to set the progress to halfway.
   *
   * @param {number} ratio The ratio (between 0 and 1 inclusive) to set the
   *   overall completion to.
   * @api public
   */
  update(ratio, tokens) {
    let goal = Math.floor(ratio * this.options.total),
      delta = goal - this.options.current;

    this.tick(delta, tokens);
  }

  clear() {
    logUpdate.clear();
  }
}

module.exports = ProgressBar;
