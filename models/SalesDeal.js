import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const SalesDeal = sequelize.define('SalesDeal', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  client: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  stage: {
    type: DataTypes.STRING,
    defaultValue: 'Negotiation',
  },
  probability: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
  }
}, {
  timestamps: true,
});

export default SalesDeal;
