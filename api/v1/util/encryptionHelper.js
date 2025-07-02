import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const encryptionKey = Buffer.from(process.env.TOTP_SECRET, 'base64');

const encryptionUtility = {
  encryptTotpSecret: (secret) => {
    try {
      const initVector = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(
        algorithm,
        encryptionKey,
        initVector,
      );
      const encryptedTotpSecret = Buffer.concat([
        cipher.update(secret, 'utf8'),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();

      return {
        initVector: initVector.toString('base64'),
        encryptedTotpSecret: encryptedTotpSecret.toString('base64'),
        authTag: authTag.toString('base64'),
      };
    } catch (error) {
      throw new Error(`Error in encryption: ${error.message}`);
    }
  },

  decryptTotpSecret: ({ encryptedTotpSecret, initVector, authTag }) => {
    try {
      const decipher = crypto.createDecipheriv(
        algorithm,
        encryptionKey,
        Buffer.from(initVector, 'base64'),
      );

      decipher.setAuthTag(Buffer.from(authTag, 'base64'));

      const decryptedTotpSecret =
        decipher.update(
          Buffer.from(encryptedTotpSecret, 'base64'),
          undefined,
          'utf8',
        ) + decipher.final('utf8');

      return decryptedTotpSecret;
    } catch (error) {
      throw new Error(`Error in decryption: ${error.message}`);
    }
  },
};

export default encryptionUtility;
