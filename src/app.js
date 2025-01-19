import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express()

app.use(cors({
  origin: ["http://localhost:5173", 'https://emailify.netlify.app'],
  methods: ["GET", "PUT", "DELETE", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
}));

app.use(express.json({limit: "500kb"}))
app.use(express.urlencoded({extended: true, limit: "800kb"}))
app.use(cookieParser())
app.use(express.static("public"))

import userRouter from './routes/user.routes.js'
import templateRouter from './routes/template.routes.js'

//routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/templates", templateRouter)

export { app }