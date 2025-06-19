import dotenv from 'dotenv'
import express from 'express'
import rateLimit from 'express-rate-limit'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import userRoutes from './api/v1/routes/userRoutes.js'
import sessionRoutes from './api/v1/routes/sessionRoutes.js'
import verificationRoutes from './api/v1/routes/verificationRoutes.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests — please try again later',
    standardHeaders: true,
    legacyHeaders: false
})
const corsOptions = {
    origin: process.env.FRONT_END_URL,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true
}

app.use(express.json())
app.use(limiter)
app.use(cors(corsOptions))
app.use(cookieParser())

app.use('/api/v1/users', userRoutes)
app.use('/api/v1/sessions', sessionRoutes)
app.use('/api/v1/verifications', verificationRoutes)

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})
