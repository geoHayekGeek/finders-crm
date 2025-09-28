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
    dashboard: ['full_access'],
    categories: ['create', 'read', 'update', 'delete', 'view_all'],
    statuses: ['create', 'read', 'update', 'delete', 'view_all']
  },
  
  // Operations Manager: Same as admin
  'operations manager': {
    properties: ['create', 'read', 'update', 'delete', 'view_all'],
    clients: ['create', 'read', 'update', 'delete', 'view_all'],
    leads: ['create', 'read', 'update', 'delete', 'view_all'],
    analytics: ['view_all', 'view_financial', 'view_agent_performance'],
    users: ['create', 'read', 'update', 'delete', 'view_all'],
    settings: ['full_access'],
    dashboard: ['full_access'],
    categories: ['create', 'read', 'update', 'delete', 'view_all'],
    statuses: ['create', 'read', 'update', 'delete', 'view_all']
  },
  
  // Operations: Everything except financial data and agent performance
  operations: {
    properties: ['create', 'read', 'update', 'delete', 'view_all'],
    clients: ['create', 'read', 'update', 'delete', 'view_all'],
    leads: ['create', 'read', 'update', 'delete', 'view_all'],
    analytics: ['view_all'], // No financial or agent performance data
    users: ['read', 'view_all'], // Can view but not modify
    settings: ['read_only'],
    dashboard: ['full_access'],
    categories: ['create', 'read', 'update', 'delete', 'view_all'],
    statuses: ['create', 'read', 'update', 'delete', 'view_all']
  },
  
  // Agent Manager: Can manage properties and view agent data, read-only access to leads
  'agent manager': {
    properties: ['create', 'read', 'update', 'delete', 'view_all'],
    clients: ['create', 'read', 'update', 'delete', 'view_all'],
    leads: ['read', 'view_all'], // Read-only access to leads
    analytics: ['view_all', 'view_agent_performance'], // Can see agent performance
    users: ['read', 'view_agents'], // Can view agents but not other roles
    settings: ['read_only'],
    dashboard: ['full_access'],
    categories: ['create', 'read', 'update', 'delete', 'view_all'],
    statuses: ['create', 'read', 'update', 'delete', 'view_all']
  },
  
  // Team Leader: Can view their own properties and assigned agents' properties, but cannot manage properties
  'team_leader': {
    properties: ['read', 'view_assigned'], // Can only view their own properties and assigned agents' properties
    clients: ['read', 'view_assigned'], // Can view their own clients and assigned agents' clients
    leads: [], // No access to leads
    analytics: ['view_agent_performance'], // Can see performance of assigned agents only
    users: ['read', 'view_assigned_agents'], // Can view only assigned agents
    settings: ['read_self'],
    dashboard: ['limited_access'],
    categories: ['read'], // Can only view categories
    statuses: ['read'] // Can only view statuses
  },
  
  // Agent: Limited access - only view assigned properties
  agent: {
    properties: ['read', 'view_assigned'], // Only view properties they're connected to (assigned or referred)
    clients: [], // No access to clients
    leads: [], // No access to leads
    analytics: [], // No access to analytics
    users: ['read_self'], // Can only view their own profile
    settings: ['read_self'],
    dashboard: ['limited_access'],
    categories: ['read'], // Can view categories (needed for properties page functionality)
    statuses: ['read'] // Can view statuses (needed for properties page functionality)
  },
  
  // Accountant: No access to properties, categories, or statuses
  accountant: {
    properties: [], // No access to properties
    clients: ['read', 'view_assigned'], // Only view their assigned clients
    leads: ['read', 'view_assigned'], // Only view their assigned leads
    analytics: ['view_basic'], // Only basic analytics, no financial data
    users: ['read_self'], // Can only view their own profile
    settings: ['read_self'],
    dashboard: ['limited_access'],
    categories: [], // No access to categories
    statuses: [] // No access to statuses
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
  if (role === 'admin' || role === 'operations manager' || role === 'agent manager' || role === 'team_leader') {
    next();
  } else {
    return res.status(403).json({ 
      message: 'Access denied. Agent performance data restricted to admin, operations manager, agent manager, and team leader only.' 
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

// Middleware to check if user can view properties
const canViewProperties = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = req.user.role;
  if (role === 'admin' || role === 'operations manager' || role === 'operations' || role === 'agent manager' || role === 'team_leader' || role === 'agent') {
    next();
  } else {
    return res.status(403).json({ 
      message: 'Access denied. Property viewing restricted to admin, operations manager, operations, agent manager, team leader, and agent only.' 
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

// Middleware to check if user can manage categories and statuses
const canManageCategoriesAndStatuses = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = req.user.role;
  if (role === 'admin' || role === 'operations manager' || role === 'operations' || role === 'agent manager') {
    next();
  } else {
    return res.status(403).json({ 
      message: 'Access denied. Category and status management restricted to admin, operations manager, operations, and agent manager only.' 
    });
  }
};

// Middleware to check if user can view categories and statuses
const canViewCategoriesAndStatuses = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = req.user.role;
  if (role === 'admin' || role === 'operations manager' || role === 'operations' || role === 'agent manager' || role === 'agent' || role === 'team_leader') {
    next();
  } else {
    return res.status(403).json({ 
      message: 'Access denied. Category and status viewing restricted to roles with property access.' 
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

// Middleware to check if user can manage leads
const canManageLeads = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = req.user.role;
  if (role === 'admin' || role === 'operations manager' || role === 'operations') {
    next();
  } else {
    return res.status(403).json({ 
      message: 'Access denied. Lead management restricted to admin, operations manager, and operations only.' 
    });
  }
};

// Middleware to check if user can view leads
const canViewLeads = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = req.user.role;
  if (role === 'admin' || role === 'operations manager' || role === 'operations' || role === 'agent manager') {
    next();
  } else {
    return res.status(403).json({ 
      message: 'Access denied. Lead viewing restricted to admin, operations manager, operations, and agent manager only.' 
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
    canViewAgentPerformance: ['admin', 'operations manager', 'agent manager', 'team_leader'].includes(role),
    canManageProperties: ['admin', 'operations manager', 'operations', 'agent manager'].includes(role),
    canViewProperties: ['admin', 'operations manager', 'operations', 'agent manager', 'team_leader', 'agent'].includes(role),
    canManageUsers: ['admin', 'operations manager'].includes(role),
    canManageCategoriesAndStatuses: ['admin', 'operations manager', 'operations', 'agent manager'].includes(role),
    canViewCategoriesAndStatuses: ['admin', 'operations manager', 'operations', 'agent manager', 'agent', 'team_leader'].includes(role),
    canManageLeads: ['admin', 'operations manager', 'operations'].includes(role),
    canViewLeads: ['admin', 'operations manager', 'operations', 'agent manager'].includes(role),
    canViewClients: ['admin', 'operations manager', 'operations', 'agent manager', 'team_leader'].includes(role)
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
  canViewProperties,
  canManageUsers,
  canManageCategoriesAndStatuses,
  canViewCategoriesAndStatuses,
  canViewAllData,
  canManageLeads,
  canViewLeads,
  filterDataByRole,
  hasPermission,
  PERMISSIONS
};
