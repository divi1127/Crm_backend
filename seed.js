import dotenv from 'dotenv';
import sequelize, { connectDB } from './config/db.js';
import User from './models/User.js';
import Lead from './models/Lead.js';
import Task from './models/Task.js';
import Employee from './models/Employee.js';

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.sync({ force: true }); // Reset DB and clear all data
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    // 1. Create Admin User
    await User.create({
      name: 'Admin User',
      email: 'admin@crm.io',
      username: 'admin',
      password: 'password123',
      role: 'Admin',
      department: 'Management'
    });

    // 2. Create Marketing Employee
    await User.create({
      name: 'Marketing Employee',
      email: 'marketing@crm.io',
      username: 'marketing',
      password: 'password123',
      role: 'Marketing',
      department: 'Marketing'
    });
    await Employee.create({
      name: 'Marketing Employee',
      role: 'Marketing Specialist',
      department: 'Marketing',
      email: 'marketing@crm.io',
      username: 'marketing',
      password: 'password123',
      phone: '9876543210',
      address: 'Marketing Dept, HQ',
      joiningDate: '2025-01-15',
      status: 'Active'
    });

    // 3. Create Developer Employee
    await User.create({
      name: 'Developer Employee',
      email: 'developer@crm.io',
      username: 'developer',
      password: 'password123',
      role: 'Developer',
      department: 'Development'
    });
    await Employee.create({
      name: 'Developer Employee',
      role: 'Software Engineer',
      department: 'Development',
      email: 'developer@crm.io',
      username: 'developer',
      password: 'password123',
      phone: '9876543211',
      address: 'Development Dept, HQ',
      joiningDate: '2025-02-10',
      status: 'Active'
    });

    console.log('Database wiped & seeded! Admin (admin@crm.io), Marketing Employee (marketing@crm.io), and Developer Employee (developer@crm.io) accounts created.');
    process.exit();
  } catch (error) {
    console.error('Error resetting data:', error);
    process.exit(1);
  }
};

seedData();
