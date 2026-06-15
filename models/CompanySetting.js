import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const CompanySetting = sequelize.define('CompanySetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  companyName: {
    type: DataTypes.STRING,
    defaultValue: 'Stark Industries',
  },
  industry: {
    type: DataTypes.STRING,
    defaultValue: 'Technology',
  },
  address: {
    type: DataTypes.TEXT,
    defaultValue: '10880 Malibu Point, Malibu, CA 90265',
  },
  phone: {
    type: DataTypes.STRING,
    defaultValue: '+1 (555) 019-2834',
  },
  email: {
    type: DataTypes.STRING,
    defaultValue: 'contact@starkindustries.com',
  },
  website: {
    type: DataTypes.STRING,
    defaultValue: 'starkindustries.com',
  },
  taxId: {
    type: DataTypes.STRING,
    defaultValue: 'TX-9988221',
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'USD',
  },
  timezone: {
    type: DataTypes.STRING,
    defaultValue: 'EST',
  },
  logo: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  }
}, {
  timestamps: true,
});

export default CompanySetting;
