import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';

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

    if (user && (await user.matchPassword(password))) {
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        department: user.department,
        token: generateToken(user.id),
      });
    } else {
      res.status(401).json({ message: 'Invalid username/email or password' });
    }
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
        role: ['Developer', 'Marketing']
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
