const jwt = require('jsonwebtoken');
const UserSession = require('../models/UserSession');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if session exists and is active
    const session = await UserSession.findBySessionToken(token);
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired session.' 
      });
    }

    // Check if user is active and not locked
    if (!session.is_active || session.account_locked) {
      return res.status(401).json({ 
        success: false, 
        message: 'Account is locked or inactive.' 
      });
    }

    // Update last accessed time
    await UserSession.updateLastAccessed(session.id);

    // Add user info to request
    req.user = {
      id: session.user_id,
      email: session.email,
      name: session.name,
      sessionId: session.id
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired.' 
      });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error.' 
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const session = await UserSession.findBySessionToken(token);
    
    if (session && session.is_active && !session.account_locked) {
      await UserSession.updateLastAccessed(session.id);
      req.user = {
        id: session.user_id,
        email: session.email,
        name: session.name,
        sessionId: session.id
      };
    }

    next();
  } catch (error) {
    // For optional auth, we just continue without user info
    next();
  }
};

const requireEmailVerified = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    const user = await User.findById(req.user.id);
    if (!user.email_verified) {
      return res.status(403).json({ 
        success: false, 
        message: 'Email verification required.' 
      });
    }

    next();
  } catch (error) {
    console.error('Email verification middleware error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error.' 
    });
  }
};

module.exports = {
  auth,
  optionalAuth,
  requireEmailVerified
}; 