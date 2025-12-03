/**
 * Modelo de Configuracion
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Configuracion = sequelize.define('Configuracion', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: () => uuidv4()
  },
  clave: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: false
  },
  valor: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_secret: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'configuracion',
  timestamps: false
});

module.exports = Configuracion;
