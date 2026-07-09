import express from 'express';
import { protect, admin, marketing, adminOrMarketing, adminOrDeveloper } from '../middleware/authMiddleware.js';
import Lead from '../models/Lead.js';
import Task from '../models/Task.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import FollowUp from '../models/FollowUp.js';
import Attendance from '../models/Attendance.js';
import LeaveRequest from '../models/LeaveRequest.js';
import SalesDeal from '../models/SalesDeal.js';
import CompanySetting from '../models/CompanySetting.js';
import Client from '../models/Client.js';
import Project from '../models/Project.js';
import WorkUpdate from '../models/WorkUpdate.js';

const router = express.Router();

// IST time helper
const getIST = () => {
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return {
    date: now.toISOString().slice(0, 10),   // YYYY-MM-DD
    time: now.toISOString().slice(11, 16),  // HH:MM
  };
};

// =======================
// LEADS ROUTES
// GET: all authenticated employees can view leads
// POST/PUT/DELETE: Admin or Marketing only
// =======================
router.route('/leads')
  .get(protect, async (req, res) => {
    try {
      const leads = await Lead.findAll({ order: [['createdAt', 'DESC']] });
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  })
  .post(protect, adminOrMarketing, async (req, res) => {
    try {
      const lead = await Lead.create(req.body);
      res.status(201).json(lead);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

router.route('/leads/:id')
  .put(protect, adminOrMarketing, async (req, res) => {
    try {
      const lead = await Lead.findByPk(req.params.id);
      if (!lead) return res.status(404).json({ message: 'Lead not found' });
      await lead.update(req.body);
      res.json(lead);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  })
  .delete(protect, admin, async (req, res) => {
    try {
      const lead = await Lead.findByPk(req.params.id);
      if (!lead) return res.status(404).json({ message: 'Lead not found' });
      await lead.destroy();
      res.json({ message: 'Lead deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });


// =======================
// TASKS ROUTES
// =======================
router.route('/tasks')
  .get(protect, async (req, res) => {
    try {
      const ADMIN_ROLES = ['Admin', 'HR', 'MD'];
      let tasks;
      if (ADMIN_ROLES.includes(req.user.role)) {
        tasks = await Task.findAll({ order: [['createdAt', 'DESC']] });
      } else {
        // Employees only see tasks assigned to them
        tasks = await Task.findAll({
          where: { assignedToUserId: req.user.id },
          order: [['createdAt', 'DESC']]
        });
      }
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  })
  .post(protect, admin, async (req, res) => {
    try {
      // Auto-store who assigned it
      const payload = {
        ...req.body,
        assignedByName: req.user.name
      };
      const task = await Task.create(payload);
      res.status(201).json(task);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

router.route('/tasks/:id')
  .put(protect, async (req, res) => {
    try {
      const task = await Task.findByPk(req.params.id);
      if (!task) return res.status(404).json({ message: 'Task not found' });

      const ADMIN_ROLES = ['Admin', 'HR', 'MD'];
      if (ADMIN_ROLES.includes(req.user.role)) {
        // Admin/HR/MD can update everything
        await task.update(req.body);
      } else {
        // Employee can only update STATUS of tasks assigned to them
        if (task.assignedToUserId !== req.user.id) {
          return res.status(403).json({ message: 'You can only update your own tasks.' });
        }
        // Once completed, employees cannot change status back
        if (task.status === 'completed' && req.body.status && req.body.status !== 'completed') {
          return res.status(403).json({ message: 'This task is already completed and cannot be changed. Contact your Admin.' });
        }
        await task.update({ status: req.body.status });
      }
      res.json(task);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  })
  .delete(protect, admin, async (req, res) => {
    try {
      const task = await Task.findByPk(req.params.id);
      if (!task) return res.status(404).json({ message: 'Task not found' });
      await task.destroy();
      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });


// =======================
// USERS LIST (for admin to assign tasks)
// =======================
router.get('/users', protect, admin, async (req, res) => {
  try {
    const users = await User.findAll({
      where: { role: ['Developer', 'Marketing'] },
      attributes: ['id', 'name', 'email', 'role', 'department']
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =======================
// FACE RECOGNITION ENDPOINTS
// =======================

// GET all users with face descriptors (for matching during check-in)
router.get('/users/faces', protect, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'faceDescriptor'],
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT save face descriptor for a user
router.put('/users/:id/face', protect, async (req, res) => {
  try {
    const { descriptor } = req.body; // JSON array of 128 floats
    if (!descriptor) return res.status(400).json({ message: 'Face descriptor is required.' });

    // Only admin can register ANY user's face; employees can only register their own
    const targetId = parseInt(req.params.id);
    if (req.user.role !== 'Admin' && req.user.id !== targetId) {
      return res.status(403).json({ message: 'You can only register your own face.' });
    }

    const user = await User.findByPk(targetId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    await user.update({ faceDescriptor: JSON.stringify(descriptor) });
    res.json({ message: `Face registered for ${user.name}`, userId: user.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE face descriptor (unregister face)
router.delete('/users/:id/face', protect, admin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    await user.update({ faceDescriptor: null });
    res.json({ message: `Face unregistered for ${user.name}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// =======================
// EMPLOYEES ROUTES - Admin only
// =======================
router.route('/employees')
  .get(protect, admin, async (req, res) => {
    const employees = await Employee.findAll({ order: [['createdAt', 'DESC']] });
    res.json(employees);
  })
  .post(protect, admin, async (req, res) => {
    try {
      // 1. Create Login Credential for Employee
      if (req.body.username) {
        const usernameExists = await User.findOne({ where: { username: req.body.username } });
        if (usernameExists) {
          return res.status(400).json({ message: 'User with this username already exists' });
        }
      }

      const userExists = await User.findOne({ where: { email: req.body.email } });
      if (userExists) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
      
      const user = await User.create({
        name: req.body.name,
        email: req.body.email,
        username: req.body.username || null,
        password: req.body.password || 'password123',
        role: (() => {
          const dept = (req.body.department || '').toLowerCase();
          if (dept.includes('market')) return 'Marketing';
          if (dept.includes('admin') || dept.includes('manage')) return 'Admin';
          return 'Developer';
        })(),
        specialization: req.body.specialization || null
      });

      // 2. Create Employee Profile Record
      const employee = await Employee.create(req.body);
      
      res.status(201).json({ employee, user });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

router.route('/employees/:id')
  .put(protect, admin, async (req, res) => {
    try {
      const employee = await Employee.findByPk(req.params.id);
      if (!employee) return res.status(404).json({ message: 'Employee not found' });
      
      await employee.update(req.body);

      // Also update name, role, specialization, username in User table if user exists
      const user = await User.findOne({ where: { email: employee.email } });
      if (user) {
        const updateData = {
          name: employee.name,
          specialization: employee.specialization || null,
          username: employee.username || null
        };
        if (req.body.role) {
          updateData.role = req.body.role;
        }
        if (req.body.password) {
          updateData.password = req.body.password;
        }
        await user.update(updateData);
      }

      res.json(employee);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  })
  .delete(protect, admin, async (req, res) => {
    try {
      const employee = await Employee.findByPk(req.params.id);
      if (!employee) return res.status(404).json({ message: 'Employee not found' });
      
      // Also delete from User table
      const user = await User.findOne({ where: { email: employee.email } });
      if (user) await user.destroy();

      await employee.destroy();
      res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

// =======================
// FOLLOW UP ROUTES
// GET: all authenticated employees can view follow-ups
// POST/PUT/DELETE: Admin or Marketing only
// =======================
router.route('/followups')
  .get(protect, async (req, res) => {
    try {
      const followups = await FollowUp.findAll({ order: [['date', 'ASC'], ['time', 'ASC']] });
      res.json(followups);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  })
  .post(protect, adminOrMarketing, async (req, res) => {
    try {
      const followup = await FollowUp.create(req.body);
      res.status(201).json(followup);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

router.route('/followups/:id')
  .put(protect, admin, async (req, res) => {
    try {
      const followup = await FollowUp.findByPk(req.params.id);
      if (!followup) return res.status(404).json({ message: 'Follow-up not found' });
      await followup.update(req.body);
      res.json(followup);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  })
  .delete(protect, admin, async (req, res) => {
    try {
      const followup = await FollowUp.findByPk(req.params.id);
      if (!followup) return res.status(404).json({ message: 'Follow-up not found' });
      await followup.destroy();
      res.json({ message: 'Follow-up deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

// =======================
// ATTENDANCE ROUTES
// =======================
router.route('/attendances')
  .get(protect, async (req, res) => {
    try {
      const ADMIN_ROLES_ATT = ['Admin', 'HR', 'MD'];
      let attendances;
      if (ADMIN_ROLES_ATT.includes(req.user.role)) {
        attendances = await Attendance.findAll({ order: [['date', 'DESC']] });
      } else {
        attendances = await Attendance.findAll({
          where: { employeeName: req.user.name },
          order: [['date', 'DESC']]
        });
      }
      res.json(attendances);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  })
  .post(protect, async (req, res) => {
    try {
      const attendance = await Attendance.create(req.body);
      res.status(201).json(attendance);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

// Check-in endpoint
const checkInCooldown = new Map(); // userId -> timestamp of last check-in attempt

router.post('/attendances/checkin', protect, async (req, res) => {
  try {
    const user = req.user;

    // IST = UTC + 5h 30min
    const { date: today, time: timeString } = getIST();

    if (req.body.faceVerified) {
      if (!req.body.employeeId) {
        return res.status(400).json({ message: 'Face recognition data missing.' });
      }
      if (parseInt(req.body.employeeId, 10) !== user.id) {
        return res.status(403).json({ message: 'Face verification failed: recognized face does not match the logged-in user.' });
      }
    }

    // ── Cooldown guard: block duplicate requests within 5 seconds ──
    const lastAttempt = checkInCooldown.get(user.id);
    if (lastAttempt && (Date.now() - lastAttempt) < 5000) {
      return res.status(429).json({ message: 'Check-in already in progress. Please wait a moment.' });
    }
    checkInCooldown.set(user.id, Date.now());

    let attendance = await Attendance.findOne({ where: { employeeName: user.name, date: today } });
    if (attendance) {
      return res.status(400).json({ message: 'Already checked in for today' });
    }

    const lateThreshold = '10:00';
    const status = timeString > lateThreshold ? 'Late' : 'Present';

    attendance = await Attendance.create({
      employeeName: user.name,
      date: today,
      checkIn: timeString,
      status,
      type: req.body.type || 'Office',
      location: req.body.location || null,
      photo: req.body.photo || null,
      faceVerified: !!req.body.faceVerified,
    });

    const attendanceJson = attendance.toJSON();
    if (req.body.faceVerified) {
      attendanceJson.recognizedEmployeeId = parseInt(req.body.employeeId, 10);
    }
    res.status(201).json(attendanceJson);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Check-out endpoint
router.post('/attendances/checkout', protect, async (req, res) => {
  try {
    const user = req.user;
    const { date: today, time: timeString } = getIST();

    let attendance = await Attendance.findOne({ where: { employeeName: user.name, date: today } });
    if (!attendance) {
      return res.status(404).json({ message: 'No check-in found for today' });
    }

    await attendance.update({ checkOut: timeString });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Auto-mark absent: call after 18:00 IST — marks all users who have no attendance record for today
router.post('/attendances/mark-absent', protect, admin, async (req, res) => {
  try {
    const { date: today } = getIST();
    const allUsers = await User.findAll({
      where: { role: ['Developer', 'Marketing', 'HR', 'MD', 'Admin'] },
      attributes: ['id', 'name']
    });
    const existing = await Attendance.findAll({ where: { date: today } });
    const presentNames = new Set(existing.map(a => a.employeeName));
    const absentUsers = allUsers.filter(u => !presentNames.has(u.name));
    const created = [];
    for (const u of absentUsers) {
      const record = await Attendance.create({
        employeeName: u.name,
        date: today,
        checkIn: null,
        checkOut: null,
        status: 'Absent',
        type: '-',
      });
      created.push(record);
    }
    res.json({ message: `Marked ${created.length} employees as Absent`, records: created });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.route('/attendances/:id')
  .put(protect, admin, async (req, res) => {
    try {
      const attendance = await Attendance.findByPk(req.params.id);
      if (!attendance) return res.status(404).json({ message: 'Attendance record not found' });
      await attendance.update(req.body);
      res.json(attendance);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  })
  .delete(protect, admin, async (req, res) => {
    try {
      const attendance = await Attendance.findByPk(req.params.id);
      if (!attendance) return res.status(404).json({ message: 'Attendance record not found' });
      await attendance.destroy();
      res.json({ message: 'Attendance record deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

// =======================
// LEAVE REQUEST ROUTES
// =======================
router.route('/leaverequests')
  .get(protect, async (req, res) => {
    const requests = await LeaveRequest.findAll({ order: [['createdAt', 'DESC']] });
    res.json(requests);
  })
  .post(protect, async (req, res) => {
    try {
      // If employee is creating, auto-fill name/department
      const user = req.user;
      const payload = {
        employeeName: req.body.employeeName || user.name,
        department: req.body.department || user.department || '',
        type: req.body.type || 'Sick',
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        reason: req.body.reason || ''
      };
      const request = await LeaveRequest.create(payload);
      res.status(201).json(request);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

router.route('/leaverequests/:id')
  .put(protect, admin, async (req, res) => {
    try {
      const request = await LeaveRequest.findByPk(req.params.id);
      if (!request) return res.status(404).json({ message: 'Leave request not found' });
      await request.update(req.body);
      res.json(request);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  })
  .delete(protect, admin, async (req, res) => {
    try {
      const request = await LeaveRequest.findByPk(req.params.id);
      if (!request) return res.status(404).json({ message: 'Leave request not found' });
      await request.destroy();
      res.json({ message: 'Leave request deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

// =======================
// SALES DEAL ROUTES
// =======================
router.route('/salesdeals')
  .get(protect, async (req, res) => {
    const deals = await SalesDeal.findAll({ order: [['createdAt', 'DESC']] });
    res.json(deals);
  })
  .post(protect, admin, async (req, res) => {
    try {
      const deal = await SalesDeal.create(req.body);
      res.status(201).json(deal);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

router.route('/salesdeals/:id')
  .put(protect, admin, async (req, res) => {
    try {
      const deal = await SalesDeal.findByPk(req.params.id);
      if (!deal) return res.status(404).json({ message: 'Deal not found' });
      await deal.update(req.body);
      res.json(deal);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  })
  .delete(protect, admin, async (req, res) => {
    try {
      const deal = await SalesDeal.findByPk(req.params.id);
      if (!deal) return res.status(404).json({ message: 'Deal not found' });
      await deal.destroy();
      res.json({ message: 'Deal deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

// =======================
// COMPANY SETTINGS ROUTES
// =======================
router.route('/settings/company')
  .get(protect, async (req, res) => {
    try {
      let setting = await CompanySetting.findOne();
      if (!setting) {
        // Create initial default setting if none exists
        setting = await CompanySetting.create({});
      }
      res.json(setting);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  })
  .put(protect, admin, async (req, res) => {
    try {
      let setting = await CompanySetting.findOne();
      if (!setting) {
        setting = await CompanySetting.create(req.body);
      } else {
        await setting.update(req.body);
      }
      res.json(setting);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

// =======================
// CLIENTS ROUTES
// =======================
router.route('/clients')
  .get(protect, async (req, res) => {
    try {
      const clients = await Client.findAll({ order: [['createdAt', 'DESC']] });
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  })
  .post(protect, admin, async (req, res) => {
    try {
      const client = await Client.create(req.body);
      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

router.route('/clients/:id')
  .put(protect, admin, async (req, res) => {
    try {
      const client = await Client.findByPk(req.params.id);
      if (!client) return res.status(404).json({ message: 'Client not found' });
      await client.update(req.body);
      res.json(client);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  })
  .delete(protect, admin, async (req, res) => {
    try {
      const client = await Client.findByPk(req.params.id);
      if (!client) return res.status(404).json({ message: 'Client not found' });
      await client.destroy();
      res.json({ message: 'Client deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

// =======================
// PROJECTS ROUTES
// =======================
router.route('/projects')
  .get(protect, async (req, res) => {
    try {
      const projects = await Project.findAll({
        include: [{ model: Client, as: 'client', attributes: ['name', 'company'] }],
        order: [['createdAt', 'DESC']]
      });
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  })
  .post(protect, admin, async (req, res) => {
    try {
      const project = await Project.create(req.body);
      // Fetch complete created project with Client loaded
      const completeProject = await Project.findByPk(project.id, {
        include: [{ model: Client, as: 'client', attributes: ['name', 'company'] }]
      });
      res.status(201).json(completeProject);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

router.route('/projects/:id')
  .put(protect, admin, async (req, res) => {
    try {
      const project = await Project.findByPk(req.params.id);
      if (!project) return res.status(404).json({ message: 'Project not found' });
      await project.update(req.body);
      // Fetch updated project with Client loaded
      const completeProject = await Project.findByPk(project.id, {
        include: [{ model: Client, as: 'client', attributes: ['name', 'company'] }]
      });
      res.json(completeProject);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  })
  .delete(protect, admin, async (req, res) => {
    try {
      const project = await Project.findByPk(req.params.id);
      if (!project) return res.status(404).json({ message: 'Project not found' });
      await project.destroy();
      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

// =======================
// WORK UPDATE ROUTES
// =======================
router.route('/work-updates/my')
  .get(protect, async (req, res) => {
    try {
      const { date } = req.query;
      if (!date) return res.status(400).json({ message: 'Date is required' });

      // Non-admin employees can only view today's update
      const isAdminOrManager = req.user.role === 'Admin' || req.user.role === 'Manager';
      const today = getIST().date;

      const update = await WorkUpdate.findOne({
        where: { userId: req.user.id, date }
      });
      res.json(update);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  })
  .post(protect, async (req, res) => {
    try {
      const { date, update11AM, update3PM, update630PM_completed, update630PM_pending, update630PM_tomorrow, update630PM_issues } = req.body;
      if (!date) return res.status(400).json({ message: 'Date is required' });

      // Non-admin employees can only submit/update for today
      const isAdminOrManager = req.user.role === 'Admin' || req.user.role === 'Manager';
      const today = getIST().date;
      
      let update = await WorkUpdate.findOne({
        where: { userId: req.user.id, date }
      });

      if (update) {
        // Slot locking: once a slot has content, it cannot be overwritten
        const updateData = {};
        if (!update.update11AM && update11AM !== undefined) updateData.update11AM = update11AM;
        if (!update.update3PM && update3PM !== undefined) updateData.update3PM = update3PM;
        if (!update.update630PM_completed && update630PM_completed !== undefined) updateData.update630PM_completed = update630PM_completed;
        if (update630PM_pending !== undefined) updateData.update630PM_pending = update630PM_pending;
        if (update630PM_tomorrow !== undefined) updateData.update630PM_tomorrow = update630PM_tomorrow;
        if (update630PM_issues !== undefined) updateData.update630PM_issues = update630PM_issues;
        await update.update(updateData);
      } else {
        update = await WorkUpdate.create({
          userId: req.user.id,
          date,
          update11AM,
          update3PM,
          update630PM_completed,
          update630PM_pending,
          update630PM_tomorrow,
          update630PM_issues
        });
      }
      res.json(update);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

router.route('/work-updates/team')
  .get(protect, async (req, res) => {
    try {
      // Allow all roles to view team updates
      const { date } = req.query;
      if (!date) return res.status(400).json({ message: 'Date is required' });

      const users = await User.findAll({
        where: { role: ['Developer', 'Marketing', 'HR', 'MD'] },
        attributes: ['id', 'name', 'email', 'department'],
        include: [{
          model: WorkUpdate,
          as: 'workUpdates',
          where: { date },
          required: false
        }]
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

export default router;
