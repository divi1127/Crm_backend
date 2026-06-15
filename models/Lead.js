import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Lead = sequelize.define('Lead', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  company: { type: DataTypes.STRING, allowNull: true },
  email: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: true },
  address: { type: DataTypes.STRING, allowNull: true },
  leadSource: { type: DataTypes.STRING, defaultValue: 'Organic' },
  status: { 
    type: DataTypes.ENUM('New', 'Contacted', 'Qualified', 'Proposal Sent', 'Closed Won', 'Closed Lost'),
    defaultValue: 'New'
  },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, { timestamps: true });

export default Lead;
