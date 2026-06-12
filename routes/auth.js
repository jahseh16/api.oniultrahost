'use strict'

const { Router } = require('express')
const authController = require('../controllers/authController')
const protect        = require('../middlewares/auth')

const router = Router()

// Rutas públicas
router.post('/register', authController.register)
router.post('/login',    authController.login)

// Rutas protegidas
router.get('/me', protect, authController.getMe)

module.exports = router
