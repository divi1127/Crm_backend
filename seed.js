import dotenv from 'dotenv';
import sequelize, { connectDB } from './config/db.js';
import User from './models/User.js';
import Lead from './models/Lead.js';
import Task from './models/Task.js';
import Employee from './models/Employee.js';

dotenv.config();

export const seedDefaults = async () => {
  try {
    await connectDB();
    await sequelize.sync({ alter: false });

    // Use findOrCreate so re-running won't wipe data
    await User.findOrCreate({ where: { email: 'admin@crm.io' }, defaults: {
      name: 'Admin User', username: 'admin', password: 'password123', role: 'Admin', department: 'Management'
    }});

    const [mktUser] = await User.findOrCreate({ where: { email: 'marketing@crm.io' }, defaults: {
      name: 'Marketing Employee', username: 'marketing', password: 'password123', role: 'Marketing', department: 'Marketing'
    }});
    await Employee.findOrCreate({ where: { email: 'marketing@crm.io' }, defaults: {
      name: 'Marketing Employee', role: 'Marketing Specialist', department: 'Marketing',
      email: 'marketing@crm.io', username: 'marketing', password: 'password123',
      phone: '9876543210', address: 'Marketing Dept, HQ', joiningDate: '2025-01-15', status: 'Active'
    }});

    await User.findOrCreate({ where: { email: 'developer@crm.io' }, defaults: {
      name: 'Developer Employee', username: 'developer', password: 'password123', role: 'Developer', department: 'Development'
    }});
    await Employee.findOrCreate({ where: { email: 'developer@crm.io' }, defaults: {
      name: 'Developer Employee', role: 'Software Engineer', department: 'Development',
      email: 'developer@crm.io', username: 'developer', password: 'password123',
      phone: '9876543211', address: 'Development Dept, HQ', joiningDate: '2025-02-10', status: 'Active'
    }});

    await User.findOrCreate({ where: { email: 'hr@crm.io' }, defaults: {
      name: 'HR Manager', username: 'hr', password: 'password123', role: 'HR', department: 'HR'
    }});

    await User.findOrCreate({ where: { email: 'md@crm.io' }, defaults: {
      name: 'Managing Director', username: 'md', password: 'password123', role: 'MD', department: 'Management'
    }});

    await User.findOrCreate({ where: { email: 'employee@crm.io' }, defaults: {
      name: 'General Employee', username: 'employee', password: 'password123', role: 'Employee', department: 'General'
    }});

    console.log('Seed complete: admin, marketing, developer, hr, md, employee');
    process.exit();
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

// Run directly: node seed.js
if (process.argv[1].includes('seed.js')) seedDefaults();
