const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AiApiKey = sequelize.define('AiApiKey', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  alias: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  key_value: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  provider: {
    type: DataTypes.STRING(50),
    defaultValue: 'google'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  usage_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  error_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  last_used_at: {
    type: DataTypes.DATE
  },
  quota_exceeded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  quota_reset_at: {
    type: DataTypes.DATE
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'ai_api_keys',
  timestamps: false
});

module.exports = AiApiKey;
