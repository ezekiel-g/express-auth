import express from 'express'
import authController from '../controllers/authController.js'

const authRouter = express.Router()

authRouter.post('/register', authController.registerUser)
authRouter.post('/sign-in', authController.signInUser)
authRouter.put('/update', authController.updateUser)
authRouter.delete('/delete', authController.deleteUser)

export default authRouter
