import express from 'express'
import userController from '../controllers/userController.js'

const userRouter = express.Router()

userRouter.get('/', userController.readUsers)
userRouter.get('/:id', userController.readUser)
userRouter.post('/', userController.createUser)
userRouter.put('/:id', userController.updateUser)
userRouter.delete('/:id', userController.deleteUser)

export default userRouter
