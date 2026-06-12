'use strict'

/**
 * Middleware: adminOnly
 * Usar DESPUÉS de protect. Permite paso solo si role === 'admin'
 */
module.exports = function adminOnly (req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      ok     : false,
      message: 'Acceso restringido a administradores.',
    })
  }
  next()
}
