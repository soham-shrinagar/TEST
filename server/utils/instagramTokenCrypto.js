const crypto = require('crypto');

const getKey = () => {
  const secret = process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY || process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing token encryption secret');
  }

  return crypto.createHash('sha256').update(secret).digest();
};

const encryptToken = (token) => {
  if (!token) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':');
};

const decryptToken = (payload) => {
  if (!payload) return '';
  const [ivHex, tagHex, encryptedHex] = payload.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
};

module.exports = { encryptToken, decryptToken };
