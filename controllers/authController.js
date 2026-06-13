'use strict'

const jwt  = require('jsonwebtoken')
const User = require('../models/User')

// ─── Helper: extraer IP real del request ───────────────────────────────────────────
const getIP = (req) =>
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.headers['x-real-ip'] ||
  req.socket?.remoteAddress ||
  'unknown'

// ─── Helper: logger de audit ───────────────────────────────────────────────────
const audit = (event, data) => {
  const ts      = new Date().toISOString()
  const icons   = { OK: '✅', FAIL: '❌', WARN: '⚠️ ', INFO: 'ℹ️ ' }
  const icon    = icons[data.result] || '•'
  const parts   = [
    `[${event}]`,
    icon,
    `ts=${ts}`,
    `email=${data.email || '-'}`,
    `ip=${data.ip || 'unknown'}`,
  ]
  if (data.reason)  parts.push(`reason=${data.reason}`)
  if (data.uuid)    parts.push(`uuid=${data.uuid}`)
  if (data.plan)    parts.push(`plan=${data.plan}`)
  if (data.status)  parts.push(`status=${data.status}`)

  // Resultado OK va a stdout, fallos a stderr para separar en PM2
  if (data.result === 'OK') {
    console.log(parts.join(' | '))
  } else {
    console.error(parts.join(' | '))
  }
}

// ─── Helper: generar JWT ────────────────────────────────────────────────────────
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
  const ip = getIP(req)
  try {
    const { email, password } = req.body

    if (!email || !password) {
      audit('REGISTER', { result: 'FAIL', email: email || 'none', ip, reason: 'missing_fields' })
      return res.status(400).json({
        ok     : false,
        message: 'Email y contraseña son obligatorios',
      })
    }

    if (password.length < 8) {
      audit('REGISTER', { result: 'FAIL', email, ip, reason: 'password_too_short' })
      return res.status(400).json({
        ok     : false,
        message: 'La contraseña debe tener mínimo 8 caracteres',
      })
    }

    const exists = await User.findOne({ email: email.toLowerCase() })
    if (exists) {
      audit('REGISTER', { result: 'FAIL', email, ip, reason: 'email_already_exists' })
      return res.status(409).json({
        ok     : false,
        message: 'Ya existe una cuenta con ese email',
      })
    }

    const user = await User.create({ email, password })

    audit('REGISTER', {
      result: 'OK',
      email : user.email,
      ip,
      uuid  : user.uuid,
      plan  : user.plan,
    })

    sendToken(res, 201, user, 'Cuenta creada correctamente')
  } catch (err) {
    audit('REGISTER', { result: 'FAIL', email: req.body?.email || 'none', ip, reason: 'server_error' })
    next(err)
  }
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  const ip = getIP(req)
  try {
    const { email, password } = req.body

    if (!email || !password) {
      audit('LOGIN', { result: 'FAIL', email: email || 'none', ip, reason: 'missing_fields' })
      return res.status(400).json({
        ok     : false,
        message: 'Email y contraseña son obligatorios',
      })
    }

    // Recuperar password explícitamente (select: false en schema)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password')

    // Usuario no existe o password incorrecta — mismo mensaje intencional
    if (!user) {
      audit('LOGIN', { result: 'FAIL', email, ip, reason: 'user_not_found' })
      return res.status(401).json({ ok: false, message: 'Credenciales incorrectas' })
    }

    const passwordMatch = await user.comparePassword(password)
    if (!passwordMatch) {
      audit('LOGIN', { result: 'FAIL', email, ip, reason: 'wrong_password', uuid: user.uuid })
      return res.status(401).json({ ok: false, message: 'Credenciales incorrectas' })
    }

    if (user.status !== 'activo') {
      audit('LOGIN', { result: 'WARN', email, ip, reason: `account_${user.status}`, uuid: user.uuid })
      return res.status(403).json({
        ok     : false,
        message: `Cuenta ${user.status}. Contacta soporte.`,
      })
    }

    // Actualizar lastLogin sin triggear validaciones completas
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() })

    audit('LOGIN', {
      result: 'OK',
      email : user.email,
      ip,
      uuid  : user.uuid,
      plan  : user.plan,
      status: user.status,
    })

    sendToken(res, 200, user, 'Sesión iniciada correctamente')
  } catch (err) {
    audit('LOGIN', { result: 'FAIL', email: req.body?.email || 'none', ip, reason: 'server_error' })
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
