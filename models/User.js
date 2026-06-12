'use strict'

const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')

// ─── Esquema ──────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    uuid: {
      type    : String,
      default : uuidv4,
      unique  : true,
      immutable: true,   // nunca cambia después de creado
    },
    email: {
      type     : String,
      required : [true, 'El email es obligatorio'],
      unique   : true,
      lowercase: true,
      trim     : true,
      match    : [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email inválido'],
    },
    password: {
      type    : String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [8, 'Mínimo 8 caracteres'],
      select  : false,   // NUNCA devuelta en queries por defecto
    },
    plan: {
      type   : String,
      enum   : ['basico', 'medio', 'premium'],
      default: 'basico',
    },
    status: {
      type   : String,
      enum   : ['activo', 'suspendido', 'pendiente'],
      default: 'activo',
    },
    role: {
      type   : String,
      enum   : ['user', 'admin'],
      default: 'user',
    },
    lastLogin: {
      type: Date,
    },
    // Para invalidar tokens si el usuario cambia password
    passwordChangedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,  // createdAt, updatedAt automáticos
    toJSON: {
      transform (_doc, ret) {
        // Nunca exponer password ni __v en respuestas JSON
        delete ret.password
        delete ret.__v
        return ret
      },
    },
  }
)

// ─── Pre-save: hash de password ───────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  // Solo hashear si el campo fue modificado
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

// ─── Método de instancia: comparar password ───────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

// ─── Método: verificar si token fue emitido antes del cambio de password ──────
userSchema.methods.passwordChangedAfter = function (jwtIssuedAt) {
  if (this.passwordChangedAt) {
    return this.passwordChangedAt.getTime() / 1000 > jwtIssuedAt
  }
  return false
}

module.exports = mongoose.model('User', userSchema)
