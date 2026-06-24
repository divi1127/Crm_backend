import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize, { connectDB } from './config/db.js';

// routes
import authRoutes from './routes/authRoutes.js';
import apiRoutes from './routes/apiRoutes.js';

// models
import User from './models/User.js';
import Lead from './models/Lead.js';
import Task from './models/Task.js';
import Employee from './models/Employee.js';
import Attendance from './models/Attendance.js';
import FollowUp from './models/FollowUp.js';
import LeaveRequest from './models/LeaveRequest.js';
import SalesDeal from './models/SalesDeal.js';
import CompanySetting from './models/CompanySetting.js';
import Client from './models/Client.js';
import Project from './models/Project.js';
import WorkUpdate from './models/WorkUpdate.js';

dotenv.config();

const app = express();

/* ======================
   MIDDLEWARE
====================== */
app.use(express.json());

app.use(cors({
  origin: [
   
    "https://crm-frontend-blond-phi.vercel.app"
  ],
  credentials: true
}));

/* ======================
   ASSOCIATIONS
====================== */
Client.hasMany(Project, {
  foreignKey: 'clientId',
  as: 'projects',
  onDelete: 'SET NULL'
});

Project.belongsTo(Client, {
  foreignKey: 'clientId',
  as: 'client'
});

User.hasMany(WorkUpdate, {
  foreignKey: 'userId',
  as: 'workUpdates',
  onDelete: 'CASCADE'
});

WorkUpdate.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(Task, {
  foreignKey: 'assignedToUserId',
  as: 'assignedTasks',
  onDelete: 'SET NULL'
});

Task.belongsTo(User, {
  foreignKey: 'assignedToUserId',
  as: 'assignedTo'
});

/* ======================
   ROUTES
====================== */
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// One-time seed trigger endpoint
app.get('/api/run-seed', async (req, res) => {
  try {
    const { seedDefaults } = await import('./seed.js');
    await seedDefaults();
    const count = await User.count();
    res.json({ message: 'Seed complete', userCount: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Debug: list all users (remove after fix)
app.get('/api/debug-users', async (req, res) => {
  try {
    const users = await User.findAll({ attributes: ['id', 'name', 'email', 'username', 'role', 'password'] });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Force reset default user passwords
app.get('/api/reset-passwords', async (req, res) => {
  try {
    // Update existing admin
    await User.update(
      { password: 'password123', role: 'Admin', name: 'Admin User', username: 'admin', department: 'Management' },
      { where: { email: 'admin@crm.io' } }
    );

    // Create marketing user if missing
    await User.findOrCreate({ where: { email: 'marketing@crm.io' }, defaults: {
      name: 'Marketing Employee', username: 'marketing', password: 'password123', role: 'Marketing', department: 'Marketing'
    }});

    // Create developer user if missing
    await User.findOrCreate({ where: { email: 'developer@crm.io' }, defaults: {
      name: 'Developer Employee', username: 'developer', password: 'password123', role: 'Developer', department: 'Development'
    }});

    // Create HR user if missing
    await User.findOrCreate({ where: { email: 'hr@crm.io' }, defaults: {
      name: 'HR Manager', username: 'hr', password: 'password123', role: 'HR', department: 'HR'
    }});

    // Create MD user if missing
    await User.findOrCreate({ where: { email: 'md@crm.io' }, defaults: {
      name: 'Managing Director', username: 'md', password: 'password123', role: 'MD', department: 'Management'
    }});

    // Create Employee user if missing
    await User.findOrCreate({ where: { email: 'employee@crm.io' }, defaults: {
      name: 'General Employee', username: 'employee', password: 'password123', role: 'Employee', department: 'General'
    }});

    const users = await User.findAll({ attributes: ['id', 'name', 'email', 'username', 'role', 'password'] });
    res.json({ message: 'Done', users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

import { Op } from 'sequelize';

/* ======================
   DASHBOARD API
====================== */
app.get('/api/dashboard', async (req, res) => {
  try {
    const safe = async (fn) => { try { return await fn(); } catch(_) { return 0; } };

    // Build last 6 months chart data using imported Op
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const label = d.toLocaleString('default', { month: 'short' }) + ' ' + year;
      months.push({ label, year, month });
    }

    const chartData = await Promise.all(months.map(async ({ label, year, month }) => {
      const start = new Date(year, month - 1, 1);
      const end   = new Date(year, month, 1);
      const leads = await safe(() => Lead.count({ where: { createdAt: { [Op.gte]: start, [Op.lt]: end } } }));
      const sales = await safe(() => SalesDeal.sum('amount', { where: { createdAt: { [Op.gte]: start, [Op.lt]: end } } })) || 0;
      return { name: label, leads, sales };
    }));

    res.json({
      stats: {
        totalLeads:    await safe(() => Lead.count()),
        salesRevenue:  await safe(() => SalesDeal.sum('amount')) || 0,
        employeeCount: await safe(() => Employee.count()),
        pendingTasks:  await safe(() => Task.count({ where: { status: 'todo' } })),
        totalClients:  await safe(() => Client.count()),
        totalProjects: await safe(() => Project.count()),
      },
      chartData,
      recentActivities: await safe(() => Lead.findAll({ order: [['createdAt','DESC']], limit: 5 })),
      salesDeals: await safe(() => SalesDeal.findAll({ order: [['createdAt','DESC']] })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ======================
   START SERVER
====================== */
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    console.log('✓ Database connected successfully');

    // Fix duplicate FK index on Tasks table (filess.io cloud DB issue)
    try {
      await sequelize.query('ALTER TABLE `Tasks` DROP FOREIGN KEY `tasks_ibfk_1`');
    } catch (_) {}
    try {
      await sequelize.query('DROP INDEX `tasks_ibfk_1` ON `Tasks`');
    } catch (_) {}

    // Force update Users role ENUM to include new roles
    try {
      await sequelize.query(
        "ALTER TABLE `Users` MODIFY COLUMN `role` ENUM('Admin','Developer','Marketing','Employee','HR','MD') NOT NULL DEFAULT 'Employee'"
      );
      console.log('✓ Users role ENUM updated');
    } catch (_) {}

    // Create all missing tables individually - safe even if they already exist
    const tableSQL = [
      `CREATE TABLE IF NOT EXISTS \`FollowUps\` (\`id\` INT AUTO_INCREMENT PRIMARY KEY, \`leadName\` VARCHAR(255) NOT NULL, \`type\` ENUM('Call','Meeting','Email') DEFAULT 'Call', \`date\` DATE NOT NULL, \`time\` VARCHAR(255), \`notes\` TEXT, \`status\` ENUM('Scheduled','Completed','Pending') DEFAULT 'Scheduled', \`createdAt\` DATETIME NOT NULL, \`updatedAt\` DATETIME NOT NULL) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS \`Attendances\` (\`id\` INT AUTO_INCREMENT PRIMARY KEY, \`employeeName\` VARCHAR(255) NOT NULL, \`date\` DATE NOT NULL, \`checkIn\` VARCHAR(255), \`checkOut\` VARCHAR(255), \`type\` ENUM('Office','Remote','-') DEFAULT 'Office', \`status\` ENUM('Present','Late','Absent') DEFAULT 'Present', \`location\` VARCHAR(255), \`photo\` TEXT, \`faceVerified\` TINYINT(1) NOT NULL DEFAULT 0, \`createdAt\` DATETIME NOT NULL, \`updatedAt\` DATETIME NOT NULL) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS \`LeaveRequests\` (\`id\` INT AUTO_INCREMENT PRIMARY KEY, \`employeeName\` VARCHAR(255) NOT NULL, \`department\` VARCHAR(255) NOT NULL, \`type\` ENUM('Sick','Casual','Annual') DEFAULT 'Sick', \`startDate\` DATE NOT NULL, \`endDate\` DATE NOT NULL, \`reason\` TEXT, \`status\` ENUM('Pending','Approved','Rejected') DEFAULT 'Pending', \`createdAt\` DATETIME NOT NULL, \`updatedAt\` DATETIME NOT NULL) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS \`SalesDeals\` (\`id\` INT AUTO_INCREMENT PRIMARY KEY, \`client\` VARCHAR(255) NOT NULL, \`amount\` INT NOT NULL DEFAULT 0, \`stage\` VARCHAR(255) DEFAULT 'Negotiation', \`probability\` INT DEFAULT 50, \`createdAt\` DATETIME NOT NULL, \`updatedAt\` DATETIME NOT NULL) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS \`CompanySettings\` (\`id\` INT AUTO_INCREMENT PRIMARY KEY, \`companyName\` VARCHAR(255) DEFAULT 'Stark Industries', \`industry\` VARCHAR(255) DEFAULT 'Technology', \`address\` TEXT, \`phone\` VARCHAR(255), \`email\` VARCHAR(255), \`website\` VARCHAR(255), \`taxId\` VARCHAR(255), \`currency\` VARCHAR(255) DEFAULT 'USD', \`timezone\` VARCHAR(255) DEFAULT 'EST', \`logo\` LONGTEXT, \`createdAt\` DATETIME NOT NULL, \`updatedAt\` DATETIME NOT NULL) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS \`Clients\` (\`id\` INT AUTO_INCREMENT PRIMARY KEY, \`name\` VARCHAR(255) NOT NULL, \`company\` VARCHAR(255), \`email\` VARCHAR(255) NOT NULL, \`phone\` VARCHAR(255), \`orderDetail\` TEXT, \`implementationStatus\` VARCHAR(255) DEFAULT 'Planning', \`changes\` TEXT, \`deliveryStatus\` VARCHAR(255) DEFAULT 'Pending', \`createdAt\` DATETIME NOT NULL, \`updatedAt\` DATETIME NOT NULL) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS \`Projects\` (\`id\` INT AUTO_INCREMENT PRIMARY KEY, \`name\` VARCHAR(255) NOT NULL, \`description\` TEXT, \`projectLink\` VARCHAR(255), \`status\` VARCHAR(255) DEFAULT 'In Progress', \`clientId\` INT, \`createdAt\` DATETIME NOT NULL, \`updatedAt\` DATETIME NOT NULL) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS \`WorkUpdates\` (\`id\` INT AUTO_INCREMENT PRIMARY KEY, \`userId\` INT NOT NULL, \`date\` DATE NOT NULL, \`update11AM\` TEXT, \`update3PM\` TEXT, \`update630PM_completed\` TEXT, \`update630PM_pending\` TEXT, \`update630PM_tomorrow\` TEXT, \`update630PM_issues\` TEXT, \`createdAt\` DATETIME NOT NULL, \`updatedAt\` DATETIME NOT NULL, UNIQUE KEY \`work_updates_user_date\` (\`userId\`,\`date\`)) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS \`Employees\` (\`id\` INT AUTO_INCREMENT PRIMARY KEY, \`name\` VARCHAR(255) NOT NULL, \`role\` VARCHAR(255) NOT NULL, \`department\` VARCHAR(255) NOT NULL, \`email\` VARCHAR(255) NOT NULL UNIQUE, \`username\` VARCHAR(255) UNIQUE, \`password\` VARCHAR(255), \`phone\` VARCHAR(255), \`address\` VARCHAR(255), \`joiningDate\` DATE, \`status\` ENUM('Active','On Leave','Offline') DEFAULT 'Active', \`createdAt\` DATETIME NOT NULL, \`updatedAt\` DATETIME NOT NULL) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS \`Leads\` (\`id\` INT AUTO_INCREMENT PRIMARY KEY, \`name\` VARCHAR(255) NOT NULL, \`company\` VARCHAR(255), \`email\` VARCHAR(255) NOT NULL, \`phone\` VARCHAR(255), \`address\` VARCHAR(255), \`leadSource\` VARCHAR(255) DEFAULT 'Organic', \`status\` ENUM('New','Contacted','Qualified','Proposal Sent','Closed Won','Closed Lost') DEFAULT 'New', \`notes\` TEXT, \`createdAt\` DATETIME NOT NULL, \`updatedAt\` DATETIME NOT NULL) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS \`Tasks\` (\`id\` INT AUTO_INCREMENT PRIMARY KEY, \`title\` VARCHAR(255) NOT NULL, \`description\` TEXT, \`priority\` ENUM('High','Medium','Low') DEFAULT 'Medium', \`status\` ENUM('todo','inProgress','review','completed') DEFAULT 'todo', \`dueDate\` DATE, \`assignee\` VARCHAR(255), \`assignedToUserId\` INT, \`assignedByName\` VARCHAR(255), \`notes\` TEXT, \`createdAt\` DATETIME NOT NULL, \`updatedAt\` DATETIME NOT NULL) ENGINE=InnoDB`,
    ];
    for (const sql of tableSQL) {
      try { await sequelize.query(sql); } catch (_) {}
    }
    console.log('✓ All tables ensured');

    // Sync all models safely
    try {
      await sequelize.sync({ alter: true });
      console.log('✓ Database tables synced');
    } catch (syncErr) {
      console.warn('⚠ Sync warning (non-fatal):', syncErr.message);
    }

    // Seed default users if none exist
    try {
      const userCount = await User.count();
      console.log(`ℹ User count: ${userCount}`);
      if (userCount === 0) {
        const { seedDefaults } = await import('./seed.js');
        await seedDefaults();
        console.log('✓ Default users seeded');
      } else {
        console.log('ℹ Users already exist, skipping seed');
      }
    } catch (seedErr) {
      console.error('❌ Seed error:', seedErr.message);
    }

    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error('❌ Startup error:', err);
    process.exit(1);
  }
};

startServer();

/* ======================
   ERROR HANDLING
====================== */
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});