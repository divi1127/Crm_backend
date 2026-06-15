import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const FollowUp = sequelize.define('FollowUp', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  leadName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('Call', 'Meeting', 'Email'),
    defaultValue: 'Call',
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  time: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('Scheduled', 'Completed', 'Pending'),
    defaultValue: 'Scheduled',
  }
}, {
  timestamps: true,
});

export default FollowUp;
