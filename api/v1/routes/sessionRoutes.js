import express from 'express'
import sessionController from '../controllers/sessionController.js'

const sessionRouter = express.Router()

sessionRouter.get('/', sessionController.readSession)
sessionRouter.post('/', sessionController.createSession)
sessionRouter.post('/refresh-session', sessionController.refreshSession)
sessionRouter.post('/verify-totp', sessionController.verifyTotp)
sessionRouter.delete('/', sessionController.deleteSession)

export default sessionRouter
