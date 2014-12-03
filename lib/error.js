'use strict';

/**
 * Export `AdapterError`.
 */

module.exports = AdapterError;

/**
 * There was an error when joining or leaving a room.
 *
 * @param {Mixed} message The error or the error message.
 * @param {Spark} spark The spark that caused the error.
 * @api public
 */

function AdapterError(message) {

  Error.call(this);
  Error.captureStackTrace(this, this.constructor);

  if ('object' === typeof message) {
    message = message.message;
  }

  this.message = message;
  this.name = this.constructor.name;
}

/**
 * Inherit from `Error`.
 */

AdapterError.prototype = Object.create(Error.prototype, {
  constructor: { value: AdapterError }
});
