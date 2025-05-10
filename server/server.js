import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import authRoutes from './api/v1/routes/authRoutes.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000
const corsOptions = {
    origin: process.env.CORS_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}

app.use(express.json())
app.use(cors(corsOptions))
app.use('/api/v1/auth', authRoutes)

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})
