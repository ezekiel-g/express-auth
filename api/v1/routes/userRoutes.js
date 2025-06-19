import express from 'express'
import userController from '../controllers/userController.js'

const userRouter = express.Router()

userRouter.get('/', userController.readUsers)
userRouter.get('/:id', userController.readUser)
userRouter.post('/', userController.createUser)
userRouter.patch('/', userController.updateUser)
userRouter.delete('/', userController.deleteUser)

export default userRouter
