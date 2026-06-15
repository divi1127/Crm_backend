import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Task = sequelize.define('Task', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  priority: { type: DataTypes.ENUM('High', 'Medium', 'Low'), defaultValue: 'Medium' },
  status: { type: DataTypes.ENUM('todo', 'inProgress', 'review', 'completed'), defaultValue: 'todo' },
  dueDate: { type: DataTypes.DATEONLY, allowNull: true },
  // assignee display name (kept for legacy + display)
  assignee: { type: DataTypes.STRING, allowNull: true },
  // FK to User table — the employee this task is assigned to
  assignedToUserId: { type: DataTypes.INTEGER, allowNull: true },
  // Who assigned this task (admin name)
  assignedByName: { type: DataTypes.STRING, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, { timestamps: true });

export default Task;
