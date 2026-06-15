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
    await User.update({ password: 'password123', role: 'Admin' }, { where: { email: 'admin@crm.io' } });
    await User.update({ password: 'password123' }, { where: { email: 'marketing@crm.io' } });
    await User.update({ password: 'password123' }, { where: { email: 'developer@crm.io' } });

    // Create admin if missing
    const admin = await User.findOne({ where: { email: 'admin@crm.io' } });
    if (!admin) {
      await User.create({ name: 'Admin User', email: 'admin@crm.io', username: 'admin', password: 'password123', role: 'Admin', department: 'Management' });
    }

    const users = await User.findAll({ attributes: ['id', 'name', 'email', 'role', 'password'] });
    res.json({ message: 'Passwords reset', users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ======================
   DASHBOARD API
====================== */
app.get('/api/dashboard', async (req, res) => {
  try {
    const totalDealsAmount = await SalesDeal.sum('amount') || 0;

    res.json({
      stats: {
        totalLeads: await Lead.count(),
        salesRevenue: totalDealsAmount || 45231,
        employeeCount: await Employee.count(),
        pendingTasks: await Task.count({ where: { status: 'todo' } }),
        totalClients: await Client.count(),
        totalProjects: await Project.count()
      }
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