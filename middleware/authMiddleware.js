import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');

      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Roles with full admin-level access
const ADMIN_ROLES = ['Admin', 'HR', 'MD'];

// Admin / HR / MD access
export const admin = (req, res, next) => {
  if (req.user && ADMIN_ROLES.includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized. Admin access required.' });
  }
};

// Developer only access
export const developer = (req, res, next) => {
  if (req.user && req.user.role === 'Developer') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a developer' });
  }
};

// Marketing only access
export const marketing = (req, res, next) => {
  if (req.user && req.user.role === 'Marketing') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized. Marketing access only' });
  }
};

// Admin / HR / MD or Developer access
export const adminOrDeveloper = (req, res, next) => {
  if (req.user && (ADMIN_ROLES.includes(req.user.role) || req.user.role === 'Developer')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized. Admin or Developer access required' });
  }
};

// Admin / HR / MD or Marketing access
export const adminOrMarketing = (req, res, next) => {
  if (req.user && (ADMIN_ROLES.includes(req.user.role) || req.user.role === 'Marketing')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized. Admin or Marketing access required' });
  }
};
