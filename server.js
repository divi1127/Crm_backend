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
    "http://localhost:5173",
    "http://localhost:3000",
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

    // ❌ IMPORTANT: DO NOT USE sequelize.sync()

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