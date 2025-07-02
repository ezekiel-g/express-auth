import { describe, it, expect, jest } from '@jest/globals';
import encryptionHelper from '../../util/encryptionHelper.js';

describe('encryptionHelper', () => {
  const originalSecret = 'totpSecret123';

  it('encrypts and decrypt a TOTP secret correctly', () => {
    const encryptedToken = encryptionHelper.encryptTotpSecret(originalSecret);

    expect(encryptedToken).toHaveProperty('initVector');
    expect(encryptedToken).toHaveProperty('encryptedTotpSecret');
    expect(encryptedToken).toHaveProperty('authTag');

    const decryptedToken = encryptionHelper.decryptTotpSecret({
      encryptedTotpSecret: encryptedToken.encryptedTotpSecret,
      initVector: encryptedToken.initVector,
      authTag: encryptedToken.authTag,
    });

    expect(decryptedToken).toBe(originalSecret);
  });

  it('throws an error if decryption fails due to invalid data', () => {
    const invalidData = {
      encryptedTotpSecret: 'invalid',
      initVector: 'invalid',
      authTag: 'invalid',
    };

    expect(() => {
      encryptionHelper.decryptTotpSecret(invalidData);
    }).toThrow(/Error in decryption/);
  });

  it('throws an error if encryption fails due to invalid key', async () => {
    const originalKey = process.env.TOTP_SECRET;
    process.env.TOTP_SECRET = 'invalid-key';

    jest.resetModules();

    const { default: encryptionUtilReloaded } = await import(
      '../../util/encryptionHelper.js'
    );

    expect(() => {
      encryptionUtilReloaded.encryptTotpSecret('test');
    }).toThrow(/Error in encryption/);

    process.env.TOTP_SECRET = originalKey;
  });
});
