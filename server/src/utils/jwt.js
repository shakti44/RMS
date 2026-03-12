const jwt = require('jsonwebtoken');

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || 'changeme_access';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'changeme_refresh';
const ACCESS_EXPIRY  = process.env.JWT_ACCESS_EXPIRY  || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

const signAccess = (payload) =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });

const signRefresh = (payload) =>
  jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });

const verifyAccess = (token) => jwt.verify(token, ACCESS_SECRET);
const verifyRefresh = (token) => jwt.verify(token, REFRESH_SECRET);

module.exports = { signAccess, signRefresh, verifyAccess, verifyRefresh };
