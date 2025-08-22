// middlewares/permissions.js
const jwt = require('jsonwebtoken');

// Permission levels for different roles
const PERMISSIONS = {
  // Admin: Full access to everything
  admin: {
    properties: ['create', 'read', 'update', 'delete', 'view_all'],
    clients: ['create', 'read', 'update', 'delete', 'view_all'],
    leads: ['create', 'read', 'update', 'delete', 'view_all'],
    analytics: ['view_all', 'view_financial', 'view_agent_performance'],
    users: ['create', 'read', 'update', 'delete', 'view_all'],
    settings: ['full_access'],
    dashboard: ['full_access']
  },
  
  // Operations Manager: Same as admin
  'operations manager': {
    properties: ['create', 'read', 'update', 'delete', 'view_all'],
    clients: ['create', 'read', 'update', 'delete', 'view_all'],
    leads: ['create', 'read', 'update', 'delete', 'view_all'],
    analytics: ['view_all', 'view_financial', 'view_agent_performance'],
    users: ['create', 'read', 'update', 'delete', 'view_all'],
    settings: ['full_access'],
    dashboard: ['full_access']
  },
  
  // Operations: Everything except financial data and agent performance
  operations: {
    properties: ['create', 'read', 'update', 'delete', 'view_all'],
    clients: ['create', 'read', 'update', 'delete', 'view_all'],
    leads: ['create', 'read', 'update', 'delete', 'view_all'],
    analytics: ['view_all'], // No financial or agent performance data
    users: ['read', 'view_all'], // Can view but not modify
    settings: ['read_only'],
    dashboard: ['full_access']
  },
  
  // Agent Manager: Can manage properties and view agent data
  'agent manager': {
    properties: ['create', 'read', 'update', 'delete', 'view_all'],
    clients: ['create', 'read', 'update', 'delete', 'view_all'],
    leads: ['create', 'read', 'update', 'delete', 'view_all'],
    analytics: ['view_all', 'view_agent_performance'], // Can see agent performance
    users: ['read', 'view_agents'], // Can view agents but not other roles
    settings: ['read_only'],
    dashboard: ['full_access']
  },
  
  // Agent: Limited access - only view assigned properties
  agent: {
    properties: ['read', 'view_assigned'], // Only view properties they're connected to
    clients: ['read', 'view_assigned'], // Only view their clients
    leads: ['read', 'view_assigned'], // Only view their leads
    analytics: ['view_basic'], // Only basic analytics, no financial data
    users: ['read_self'], // Can only view their own profile
    settings: ['read_self'],
    dashboard: ['limited_access']
  }
};

// Helper function to check if user has permission
const hasPermission = (userRole, resource, action) => {
  if (!PERMISSIONS[userRole]) return false;
  
  const rolePermissions = PERMISSIONS[userRole];
  if (!rolePermissions[resource]) return false;
  
  return rolePermissions[resource].includes(action);
};

// Middleware to verify JWT token and extract user info
const authenticateToken = (req, res, next) => {
  console.log('🔐 authenticateToken middleware called');
  console.log('📊 Request URL:', req.url);
  console.log('📊 Request method:', req.method);
  console.log('📊 Authorization header:', req.headers['authorization']);
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    console.log('🔍 Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verified, user:', decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to check permissions for specific resources
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: 'User role not found' });
    }

    if (hasPermission(req.user.role, resource, action)) {
      next();
    } else {
      return res.status(403).json({ 
        message: `Access denied. ${req.user.role} cannot ${action} ${resource}` 
      });
    }
  };
};

// Middleware to check if user can view financial data
const canViewFinancialData = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = req.user.role;
  if (role === 'admin' || role === 'operations manager') {
    next();
  } else {
    return res.status(403).json({ 
      message: 'Access denied. Financial data restricted to admin and operations manager only.' 
    });
  }
};

// Middleware to check if user can view agent performance data
const canViewAgentPerformance = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = req.user.role;
  if (role === 'admin' || role === 'operations manager' || role === 'agent manager') {
    next();
  } else {
    return res.status(403).json({ 
      message: 'Access denied. Agent performance data restricted to admin, operations manager, and agent manager only.' 
    });
  }
};

// Middleware to check if user can manage properties
const canManageProperties = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = req.user.role;
  if (role === 'admin' || role === 'operations manager' || role === 'operations' || role === 'agent manager') {
    next();
  } else {
    return res.status(403).json({ 
      message: 'Access denied. Property management restricted to admin, operations manager, operations, and agent manager only.' 
    });
  }
};

// Middleware to check if user can manage users
const canManageUsers = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = req.user.role;
  if (role === 'admin' || role === 'operations manager') {
    next();
  } else {
    return res.status(403).json({ 
      message: 'Access denied. User management restricted to admin and operations manager only.' 
    });
  }
};

// Middleware to check if user can view all data (not just assigned)
const canViewAllData = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = req.user.role;
  if (role === 'admin' || role === 'operations manager' || role === 'operations' || role === 'agent manager') {
    next();
  } else {
    return res.status(403).json({ 
      message: 'Access denied. Viewing all data restricted to admin, operations manager, operations, and agent manager only.' 
    });
  }
};

// Middleware to filter data based on user role
const filterDataByRole = (req, res, next) => {
  console.log('🎭 filterDataByRole middleware called');
  console.log('👤 User from request:', req.user);
  
  if (!req.user || !req.user.role) {
    console.log('❌ No user or role found');
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = req.user.role;
  console.log('🔑 User role:', role);
  
  // Add role-based filters to request
  req.roleFilters = {
    role: role,
    canViewAll: ['admin', 'operations manager', 'operations', 'agent manager'].includes(role),
    canViewFinancial: ['admin', 'operations manager'].includes(role),
    canViewAgentPerformance: ['admin', 'operations manager', 'agent manager'].includes(role),
    canManageProperties: ['admin', 'operations manager', 'operations', 'agent manager'].includes(role),
    canManageUsers: ['admin', 'operations manager'].includes(role)
  };

  console.log('✅ Role filters set:', req.roleFilters);
  next();
};

module.exports = {
  authenticateToken,
  checkPermission,
  canViewFinancialData,
  canViewAgentPerformance,
  canManageProperties,
  canManageUsers,
  canViewAllData,
  filterDataByRole,
  hasPermission,
  PERMISSIONS
};
