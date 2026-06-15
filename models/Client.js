import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Client = sequelize.define('Client', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  company: { type: DataTypes.STRING, allowNull: true },
  email: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: true },
  orderDetail: { type: DataTypes.TEXT, allowNull: true },
  implementationStatus: { 
    type: DataTypes.STRING, 
    defaultValue: 'Planning' 
  },
  changes: { type: DataTypes.TEXT, allowNull: true },
  deliveryStatus: { 
    type: DataTypes.STRING, 
    defaultValue: 'Pending' 
  }
}, { timestamps: true });

export default Client;
