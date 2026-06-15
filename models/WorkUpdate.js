import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import User from './User.js';

const WorkUpdate = sequelize.define('WorkUpdate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  update11AM: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  update3PM: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  update630PM_completed: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  update630PM_pending: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  update630PM_tomorrow: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  update630PM_issues: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'date']
    }
  ]
});

// Associations are defined on server.js to avoid circular import issues.

export default WorkUpdate;
