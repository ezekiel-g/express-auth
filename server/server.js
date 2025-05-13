import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import userRoutes from './api/v1/routes/userRoutes.js'
import sessionRoutes from './api/v1/routes/sessionRoutes.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000
const corsOptions = {
    origin: process.env.CORS_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}

app.use(express.json())
app.use(cors(corsOptions))
app.use(cookieParser())
app.use('/api/v1/users', userRoutes)
app.use('/api/v1/sessions', sessionRoutes)

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})
