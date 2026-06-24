import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';


const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('Admin', 'Developer', 'Marketing', 'Employee', 'HR', 'MD'),
    defaultValue: 'Employee',
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Developer or Marketing specific field
  specialization: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('Active', 'On Leave', 'Offline'),
    defaultValue: 'Offline',
  },
  // Face recognition: stores JSON array of 128 floats (face descriptor embedding)
  faceDescriptor: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  timestamps: true
});

// Method to verify password (Plain Text comparison as requested)
User.prototype.matchPassword = async function(enteredPassword) {
  return enteredPassword === this.password;
};

export default User;
