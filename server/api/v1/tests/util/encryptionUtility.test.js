import encryptionUtility from '../../util/encryptionUtility.js'

describe('encryptionUtility', () => {
    const originalSecret = 'totpSecret123'

    it('should encrypt and decrypt a TOTP secret correctly', () => {
        const encryptedToken =
            encryptionUtility.encryptTotpSecret(originalSecret)

        expect(encryptedToken).toHaveProperty('initVector')
        expect(encryptedToken).toHaveProperty('encryptedTotpSecret')
        expect(encryptedToken).toHaveProperty('authTag')

        const decryptedToken = encryptionUtility.decryptTotpSecret({
            encryptedTotpSecret: encryptedToken.encryptedTotpSecret,
            initVector: encryptedToken.initVector,
            authTag: encryptedToken.authTag
        })

        expect(decryptedToken).toBe(originalSecret)
    })

    it('should throw an error if decryption fails due to invalid data', () => {
        const badData = {
            encryptedTotpSecret: 'invalid',
            initVector: 'invalid',
            authTag: 'invalid'
        }

        expect(() => {
            encryptionUtility.decryptTotpSecret(badData)
        }).toThrow(/Error in decryption/)
    })

    it('should throw an error if encryption fails ' +
        'due to invalid key', async () => {
        const originalKey = process.env.TOTP_SECRET
        process.env.TOTP_SECRET = 'invalid-key'

        jest.resetModules()
        
        const { default: encryptionUtilReloaded } =
            await import('../../util/encryptionUtility.js')

        expect(() => {
            encryptionUtilReloaded.encryptTotpSecret('test')
        }).toThrow(/Error in encryption/)

        process.env.TOTP_SECRET = originalKey
    })
})
