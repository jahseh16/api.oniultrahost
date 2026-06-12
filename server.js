'use strict'

require('dotenv').config()

const express    = require('express')
const mongoose   = require('mongoose')
const cors       = require('cors')
const authRoutes = require('./routes/auth')

const app  = express()
const PORT = process.env.PORT || 4000

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    // Permitir herramientas sin origin (curl, Postman, apps móviles)
    if (!origin) return cb(null, true)
    if (allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origin '${origin}' no permitido`))
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }))          // evitar body-bombs
app.use(express.urlencoded({ extended: true }))

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status : 'ok',
    service: 'api.oniultrahost',
    uptime : process.uptime(),
    ts     : new Date().toISOString(),
  })
})

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ ok: false, message: 'Ruta no encontrada' })
})

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || 500
  const msg    = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : err.message
  res.status(status).json({ ok: false, message: msg })
})

// ─── MongoDB connection ───────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    console.log('[DB] MongoDB conectado:', process.env.MONGO_URI)
    app.listen(PORT, () => {
      console.log(`[SERVER] API corriendo en http://localhost:${PORT}`)
      console.log(`[SERVER] Entorno: ${process.env.NODE_ENV || 'development'}`)
    })
  })
  .catch(err => {
    console.error('[DB] Error de conexión a MongoDB:', err.message)
    process.exit(1)
  })
