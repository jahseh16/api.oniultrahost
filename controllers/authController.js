'use strict'

const jwt  = require('jsonwebtoken')
const User = require('../models/User')

// ─── Helper: generar JWT ──────────────────────────────────────────────────────
const signToken = (payload) => jwt.sign(
  payload,
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
)

// ─── Helper: respuesta con token ─────────────────────────────────────────────
const sendToken = (res, statusCode, user, message) => {
  const token = signToken({
    id   : user._id,
    uuid : user.uuid,
    role : user.role,
    plan : user.plan,
  })

  res.status(statusCode).json({
    ok     : true,
    message,
    token,
    user: {
      uuid  : user.uuid,
      email : user.email,
      plan  : user.plan,
      status: user.status,
      role  : user.role,
    },
  })
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        ok     : false,
        message: 'Email y contraseña son obligatorios',
      })
    }

    if (password.length < 8) {
      return res.status(400).json({
        ok     : false,
        message: 'La contraseña debe tener mínimo 8 caracteres',
      })
    }

    const exists = await User.findOne({ email: email.toLowerCase() })
    if (exists) {
      return res.status(409).json({
        ok     : false,
        message: 'Ya existe una cuenta con ese email',
      })
    }

    const user = await User.create({ email, password })

    sendToken(res, 201, user, 'Cuenta creada correctamente')
  } catch (err) {
    next(err)
  }
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        ok     : false,
        message: 'Email y contraseña son obligatorios',
      })
    }

    // Recuperar password explícitamente (select: false en schema)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password')

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        ok     : false,
        message: 'Credenciales incorrectas',   // mensaje genérico intencional
      })
    }

    if (user.status !== 'activo') {
      return res.status(403).json({
        ok     : false,
        message: `Cuenta ${user.status}. Contacta soporte.`,
      })
    }

    // Actualizar lastLogin sin triggear validaciones completas
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() })

    sendToken(res, 200, user, 'Sesión iniciada correctamente')
  } catch (err) {
    next(err)
  }
}

// ─── GET /api/auth/me (ruta protegida) ────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' })
    }
    res.json({ ok: true, user })
  } catch (err) {
    next(err)
  }
}
