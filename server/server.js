import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'
import userRoutes from './api/v1/routes/userRoutes.js'
import sessionRoutes from './api/v1/routes/sessionRoutes.js'
import verificationRoutes from './api/v1/routes/verificationRoutes.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000
const corsOptions = {
    origin: process.env.FRONT_END_URL,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true
}
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(express.json())
app.use(cors(corsOptions))
app.use(cookieParser())

app.use('/api/v1/users', userRoutes)
app.use('/api/v1/sessions', sessionRoutes)
app.use('/api/v1/verifications', verificationRoutes)

if (process.env.NODE_ENV === 'production') {
    const clientDistPath = path.join(__dirname, '../client/dist')
    app.use(express.static(clientDistPath))

    app.get('*', (request, response) => {
        response.sendFile(path.join(clientDistPath, 'index.html'))
    })
}

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})
