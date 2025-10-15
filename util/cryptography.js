const crypto = require('crypto');
require('dotenv').config();

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.CRED_SECRET_KEY;
const IV_LENGTH = 16;
console.log('CRED_SECRET_KEY:', SECRET_KEY);

function encrypt(text) {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

function decrypt(encText) {
  if (!encText) return encText;
  try {
    const [ivHex, encryptedHex] = encText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

function fadeUsername(username) {
  if (!username) return '';
  const len = username.length;
  if (len <= 2) return '**';
  const firstChar = username[0];
  const lastChar = username[len - 1];
  const stars = '*'.repeat(len - 2);
  return firstChar + stars + lastChar;
}

function getDisplayCredential(credential) {
  const credentialObj = credential.toObject ? credential.toObject() : credential;
  
  const decryptedUsername = decrypt(credential.username);
  
  return {
    ...credentialObj,
    username: fadeUsername(decryptedUsername), // "a****b"
    password: credential.password // Encrypted text "a1b2c3:d4e5f6"
  };
}

function getDecryptedCredential(credential) {
  const credentialObj = credential.toObject ? credential.toObject() : credential;
  
  const decryptedUsername = decrypt(credential.username);
  const decryptedPassword = decrypt(credential.password);
  
  return {
    ...credentialObj,
    username: decryptedUsername, // "actualuser"
    password: decryptedPassword  // "actualpass123"
  };
}

module.exports = {
  encrypt,
  decrypt,
  fadeUsername,   
  getDisplayCredential,
  getDecryptedCredential
};