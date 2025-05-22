import express from 'express'
import userController from '../controllers/userController.js'

const userRouter = express.Router()

// GET
userRouter.get('/', userController.readUsers)
userRouter.get('/verify-account-by-email', userController.verifyAccountByEmail)
userRouter.get('/confirm-email-change', userController.confirmEmailChange)
userRouter.get('/:id/get-totp-secret', userController.getTotpSecret)
userRouter.get(
    '/:id/request-account-deletion',
    userController.requestDeleteUser
)
userRouter.get('/:id', userController.readUser)

// POST
userRouter.post('/', userController.createUser)
userRouter.post(
    '/resend-verification-email',
    userController.resendVerificationEmail
)
userRouter.post(
    '/send-password-reset-email',
    userController.sendPasswordResetEmail
)

// PUT
userRouter.put('/:id', userController.updateUser)

// PATCH
userRouter.patch('/reset-password', userController.resetPassword)
userRouter.patch('/:id/set-totp-auth', userController.setTotpAuth)

// DELETE
userRouter.delete('/', userController.deleteUser)

export default userRouter
