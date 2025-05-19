import express from 'express'
import userController from '../controllers/userController.js'

const userRouter = express.Router()

userRouter.get('/', userController.readUsers)
userRouter.get('/verify-account-by-email', userController.verifyAccountByEmail)
userRouter.get('/confirm-email-change', userController.confirmEmailChange)
userRouter.get('/:id', userController.readUser)
userRouter.post('/', userController.createUser)
userRouter.post(
    '/resend-verification-email',
    userController.resendVerificationEmail
)
userRouter.post(
    '/send-password-reset-email',
    userController.sendPasswordResetEmail
)
userRouter.put('/:id', userController.updateUser)
userRouter.patch('/reset-password', userController.resetPassword)
userRouter.delete('/:id', userController.deleteUser)

export default userRouter
