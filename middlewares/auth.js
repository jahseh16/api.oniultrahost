'use strict'

const jwt  = require('jsonwebtoken')
const User = require('../models/User')

/**
 * Middleware: protect
 * Valida el JWT en el header Authorization: Bearer <token>
 * Si es válido, adjunta el usuario en req.user y llama next()
 */
module.exports = async function protect (req, res, next) {
  try {
    // 1. Extraer token del header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        ok     : false,
        message: 'Acceso denegado. Token no proporcionado.',
      })
    }

    const token = authHeader.split(' ')[1]

    // 2. Verificar firma y expiración
    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (err) {
      const msg = err.name === 'TokenExpiredError'
        ? 'Token expirado. Inicia sesión de nuevo.'
        : 'Token inválido.'
      return res.status(401).json({ ok: false, message: msg })
    }

    // 3. Verificar que el usuario aún existe en DB
    const user = await User.findById(decoded.id)
    if (!user) {
      return res.status(401).json({
        ok     : false,
        message: 'El usuario de este token ya no existe.',
      })
    }

    // 4. Verificar que la cuenta esté activa
    if (user.status !== 'activo') {
      return res.status(403).json({
        ok     : false,
        message: `Cuenta ${user.status}. Contacta soporte.`,
      })
    }

    // 5. Verificar que el token no fue emitido antes de un cambio de password
    if (user.passwordChangedAfter(decoded.iat)) {
      return res.status(401).json({
        ok     : false,
        message: 'Contraseña cambiada recientemente. Inicia sesión de nuevo.',
      })
    }

    // 6. Adjuntar usuario al request para las siguientes rutas
    req.user = {
      id   : user._id,
      uuid : user.uuid,
      email: user.email,
      role : user.role,
      plan : user.plan,
    }

    next()
  } catch (err) {
    next(err)
  }
}
