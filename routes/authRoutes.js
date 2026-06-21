import express from 'express';
import { loginUser, registerUser, getUserProfile, createEmployee, getEmployees, updateEmployee, deleteEmployee, forgotPassword } from '../controllers/authController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);

// Forgot / Reset password (public — no token needed)
router.post('/forgot-password', forgotPassword);

// Employee management routes (Admin only)
router.post('/create-employee', protect, admin, createEmployee);
router.get('/employees', protect, admin, getEmployees);
router.put('/employees/:id', protect, admin, updateEmployee);
router.delete('/employees/:id', protect, admin, deleteEmployee);

export default router;
