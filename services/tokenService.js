// services/tokenService.js
const jwt = require('jsonwebtoken');
const config = require('../config/env');

exports.generateToken = (id) => {
  return jwt.sign({ id }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn || '7d',
  });
};