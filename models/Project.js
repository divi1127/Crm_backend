import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Project = sequelize.define('Project', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  projectLink: { type: DataTypes.STRING, allowNull: true },
  status: { 
    type: DataTypes.STRING, 
    defaultValue: 'In Progress' 
  },
  clientId: { 
    type: DataTypes.INTEGER, 
    allowNull: true 
  }
}, { timestamps: true });

export default Project;
