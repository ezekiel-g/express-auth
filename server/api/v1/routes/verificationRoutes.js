import express from 'express'
import verificationController from '../controllers/verificationController.js'

const verificationRouter = express.Router()

verificationRouter.get(
    '/verify-account-by-email',
    verificationController.verifyAccountByEmail
)
verificationRouter.get(
    '/confirm-email-change',
    verificationController.confirmEmailChange
)

verificationRouter.post(
    '/validate-user-info-update',
    verificationController.validateUserInfoForUpdate
)
verificationRouter.post(
    '/get-totp-secret',
    verificationController.getTotpSecret
)
verificationRouter.post(
    '/resend-verification-email',
    verificationController.resendVerificationEmail
)
verificationRouter.post(
    '/send-password-reset-email',
    verificationController.sendPasswordResetEmail
)
verificationRouter.post(
    '/request-account-deletion',
    verificationController.requestDeleteUser
)

verificationRouter.patch(
    '/reset-password', verificationController.resetPassword
)
verificationRouter.patch(
    '/set-totp-auth', verificationController.setTotpAuth
)

export default verificationRouter
