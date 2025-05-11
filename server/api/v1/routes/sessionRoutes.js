import express from 'express'
import sessionController from '../controllers/sessionController.js'

const sessionRouter = express.Router()

sessionRouter.post('/', sessionController.createSession)

export default sessionRouter
