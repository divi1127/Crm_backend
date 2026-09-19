import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';

// Roles that are exempt from working-hours login restrictions
const EXEMPT_ROLES = ['Admin', 'HR', 'MD'];

// IST time helper (UTC + 5h 30min)
const getIST = () => {
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return {
    date: now.toISOString().slice(0, 10), // YYYY-MM-DD
    hours: now.getUTCHours(),
    minutes: now.getUTCMinutes(),
  };
};

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your_jwt_secret_key_here', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public (or Private depending on CRM needs)
export const registerUser = async (req, res) => {
  try {
    const { name, email, username, password, role } = req.body;

    const userExists = await User.findOne({
      where: {
        [Op.or]: [
          { email: email || '' },
          { username: username || '' }
        ]
      }
    });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email or username' });
    }

    const user = await User.create({
      name,
      email,
      username: username || null,
      password,
      role
    });

    if (user) {
      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        department: user.department,
        token: generateToken(user.id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body; // 'email' holds username or email from frontend

    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: email || '' },
          { username: email || '' }
        ]
      }
    });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid username/email or password' });
    }

    // ── Working-hours lock: non-exempt roles cannot log in outside 06:00–18:00 IST ──
    if (!EXEMPT_ROLES.includes(user.role)) {
      const { date: today, hours, minutes } = getIST();
      const totalMinutes = hours * 60 + minutes;
      const START_MIN = 6 * 60;   // 06:00 IST = 360 min
      const END_MIN   = 18 * 60;  // 18:00 IST = 1080 min

      if (totalMinutes >= END_MIN || totalMinutes < START_MIN) {
        return res.status(403).json({
          message:
            'Work hours ended at 6:00 PM. Daily auto-logout is completed for today. ' +
            'Employee login is locked until tomorrow morning (6:00 AM IST).',
          code: 'AFTER_HOURS_LOCK',
        });
      }

      // Also block re-login if today's attendance already has an auto-checkout at 18:00
      const todayRecord = await Attendance.findOne({ where: { employeeName: user.name, date: today } });
      if (todayRecord && todayRecord.checkOut === '18:00') {
        return res.status(403).json({
          message:
            'Your attendance was auto-checked-out at 6:00 PM today. ' +
            'Employee login is locked until tomorrow morning (6:00 AM IST).',
          code: 'AFTER_HOURS_LOCK',
        });
      }
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      department: user.department,
      token: generateToken(user.id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create employee by admin
// @route   POST /api/auth/create-employee
// @access  Private - Admin only
export const createEmployee = async (req, res) => {
  try {
    const { name, email, username, password, role, specialization } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Please provide name, email, password, and role' });
    }

    // Check if user already exists
    const userExists = await User.findOne({
      where: {
        [Op.or]: [
          { email: email || '' },
          { username: username || '' }
        ]
      }
    });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email or username' });
    }

    // Create the user
    const newUser = await User.create({
      name,
      email,
      username: username || null,
      password,
      role,
      specialization: specialization || null
    });

    res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role,
      specialization: newUser.specialization,
      message: `${role} account created successfully`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all employees (Admin only)
// @route   GET /api/auth/employees
// @access  Private - Admin only
export const getEmployees = async (req, res) => {
  try {
    const employees = await User.findAll({
      where: {
        role: ['Developer', 'Marketing', 'Employee', 'HR', 'MD']
      },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update employee (Admin only)
// @route   PUT /api/auth/employees/:id
// @access  Private - Admin only
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, username, role, specialization } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    await user.update({
      name: name || user.name,
      email: email || user.email,
      username: username || user.username,
      role: role || user.role,
      specialization: specialization || user.specialization
    });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      specialization: user.specialization,
      message: 'Employee updated successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete employee (Admin only)
// @route   DELETE /api/auth/employees/:id
// @access  Private - Admin only
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    await user.destroy();
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset password by email (no token — plain-text passwords)
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address. Please check and try again.' });
    }

    await user.update({ password: newPassword });
    res.json({ message: 'Password reset successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
