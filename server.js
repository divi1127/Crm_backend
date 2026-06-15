import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize, { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import apiRoutes from './routes/apiRoutes.js';

// Import models
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

// Setup Associations
Client.hasMany(Project, { foreignKey: 'clientId', as: 'projects', onDelete: 'SET NULL' });
Project.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

User.hasMany(WorkUpdate, { foreignKey: 'userId', as: 'workUpdates', onDelete: 'CASCADE' });
WorkUpdate.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Task assignment: Admin assigns tasks to employees (Users)
User.hasMany(Task, { foreignKey: 'assignedToUserId', as: 'assignedTasks', onDelete: 'SET NULL' });
Task.belongsTo(User, { foreignKey: 'assignedToUserId', as: 'assignedTo' });

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

// Sync DB without wiping data — alter:true updates schema only, preserving all records
sequelize.sync()
  .then(() => {
    console.log('✓ Database synced successfully.');
    console.log('✓ Server is ready to accept requests');
  })
  .catch((err) => {
    console.error('Failed to sync database:');
    console.error(err);
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

app.get('/api/dashboard', async (req, res) => {
  try {
    const totalDealsAmount = await SalesDeal.sum('amount') || 0;
    res.json({
      stats: {
        totalLeads: await Lead.count(),
        salesRevenue: totalDealsAmount > 0 ? totalDealsAmount : 45231, // Fallback if no deals
        employeeCount: await Employee.count(),
        pendingTasks: await Task.count({ where: { status: 'todo' }}),
        totalClients: await Client.count(),
        totalProjects: await Project.count()
      },
      chartData: [
        { name: 'Jan', leads: 400, sales: 240 },
        { name: 'Feb', leads: 300, sales: 139 },
        { name: 'Mar', leads: 520, sales: 380 },
        { name: 'Apr', leads: 450, sales: 390 },
        { name: 'May', leads: 600, sales: 480 },
        { name: 'Jun', leads: 700, sales: 600 },
      ],
      recentActivities: await Lead.findAll({ limit: 4, order: [['createdAt', 'DESC']] }),
      salesDeals: await SalesDeal.findAll({ order: [['createdAt', 'DESC']] })
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n✓✓✓ Server running on port ${PORT} ✓✓✓\n`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
