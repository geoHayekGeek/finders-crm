// middlewares/permissions.js
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Role constants - use normalized format (space-separated, lowercase)
const ROLES = {
  ADMIN: 'admin',
  OPERATIONS_MANAGER: 'operations manager',
  OPERATIONS: 'operations',
  AGENT_MANAGER: 'agent manager',
  TEAM_LEADER: 'team leader',
  AGENT: 'agent',
  ACCOUNTANT: 'accountant',
  HR: 'hr'
};

// Role groups for common permission checks
const ADMIN_ROLES = [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER];
const MANAGEMENT_ROLES = [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.OPERATIONS, ROLES.AGENT_MANAGER];
const PROPERTY_VIEW_ROLES = [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.OPERATIONS, ROLES.AGENT_MANAGER, ROLES.TEAM_LEADER, ROLES.AGENT];
const PROPERTY_MANAGE_ROLES = [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.OPERATIONS, ROLES.AGENT_MANAGER];
const USER_MANAGE_ROLES = [ROLES.ADMIN, ROLES.HR, ROLES.OPERATIONS_MANAGER];
const LEAD_VIEW_ROLES = [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.OPERATIONS, ROLES.AGENT_MANAGER, ROLES.AGENT, ROLES.TEAM_LEADER];
const LEAD_MANAGE_ROLES = [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.OPERATIONS, ROLES.AGENT, ROLES.TEAM_LEADER];
const VIEWING_VIEW_ROLES = [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.OPERATIONS, ROLES.AGENT_MANAGER, ROLES.AGENT, ROLES.TEAM_LEADER];
const VIEWING_MANAGE_ROLES = [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.OPERATIONS, ROLES.AGENT_MANAGER];
const AGENT_PERFORMANCE_ROLES = [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.AGENT_MANAGER, ROLES.TEAM_LEADER];
const CATEGORY_STATUS_VIEW_ROLES = [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.OPERATIONS, ROLES.AGENT_MANAGER, ROLES.AGENT, ROLES.TEAM_LEADER];
const CATEGORY_STATUS_MANAGE_ROLES = [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.OPERATIONS, ROLES.AGENT_MANAGER];

// Normalize role to handle both 'operations_manager' and 'operations manager' formats
const normalizeRole = (role) => {
  if (!role) return '';
  // Convert to lowercase and replace underscores with spaces, then trim
  return role.toLowerCase().replace(/_/g, ' ').trim();
};

// Permission levels for different roles
const PERMISSIONS = {
  // Admin: Full access to everything
  admin: {
    properties: ['create', 'read', 'update', 'delete', 'view_all'],
    clients: ['create', 'read', 'update', 'delete', 'view_all'],
    leads: ['create', 'read', 'update', 'delete', 'view_all'],
    viewings: ['create', 'read', 'update', 'delete', 'view_all'],
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
    viewings: ['create', 'read', 'update', 'delete', 'view_all'],
    analytics: ['view_all', 'view_financial', 'view_agent_performance'],
    users: ['create', 'read', 'update', 'delete', 'view_all'],
    settings: ['full_access'],
    dashboard: ['full_access'],
    categories: ['create', 'read', 'update', 'delete', 'view_all'],
    statuses: ['create', 'read', 'update', 'delete', 'view_all']
  },
  
  // Operations: Everything except financial data and agent performance
  operations: {
    properties: ['create', 'read', 'update', 'view_all'],
    clients: ['create', 'read', 'update', 'delete', 'view_all'],
    leads: ['create', 'read', 'update', 'delete', 'view_all'],
    viewings: ['create', 'read', 'update', 'delete', 'view_all'],
    analytics: ['view_all'], // No financial or agent performance data
    users: ['read', 'view_all'], // Can view but not modify
    settings: ['read_only'],
    dashboard: ['full_access'],
    categories: ['create', 'read', 'update', 'delete', 'view_all'],
    statuses: ['create', 'read', 'update', 'delete', 'view_all']
  },
  
  // Agent Manager: Can manage properties and view agent data, read-only access to leads (cannot add or edit)
  'agent manager': {
    properties: ['create', 'read', 'update', 'view_all'],
    clients: ['create', 'read', 'update', 'delete', 'view_all'],
    leads: ['read', 'view_all'], // Read-only access to leads - cannot create or edit
    viewings: ['create', 'read', 'update', 'delete', 'view_all'],
    analytics: ['view_all', 'view_agent_performance'], // Can see agent performance
    users: ['read', 'view_agents'], // Can view agents but not other roles
    settings: ['read_only'],
    dashboard: ['full_access'],
    categories: ['create', 'read', 'update', 'delete', 'view_all'],
    statuses: ['create', 'read', 'update', 'delete', 'view_all']
  },
  
  // Team Leader: Can view all properties but owner details only for their own and team agent properties
  'team leader': {
    properties: ['read', 'view_all_filtered'], // Can view all properties but owner details are filtered
    clients: ['read', 'view_assigned'], // Can view their own clients and assigned agents' clients
    leads: [], // No access to leads
    viewings: ['create', 'read', 'update', 'view_assigned'], // Can manage viewings for themselves and team
    analytics: ['view_agent_performance'], // Can see performance of assigned agents only
    users: ['read', 'view_assigned_agents'], // Can view only assigned agents
    settings: ['read_self'],
    dashboard: ['limited_access'],
    categories: ['read'], // Can only view categories
    statuses: ['read'] // Can only view statuses
  },
  
  // Agent: Can view all properties but owner details only for properties assigned to them
  agent: {
    properties: ['read', 'view_all_filtered'], // Can view all properties but owner details are filtered
    clients: [], // No access to clients
    leads: [], // No access to leads
    viewings: ['create', 'read', 'update', 'view_own'], // Can manage their own viewings only
    analytics: [], // No access to analytics
    users: ['read_self'], // Can only view their own profile
    settings: ['read_self'],
    dashboard: ['limited_access'],
    categories: ['read'], // Can view categories (needed for properties page functionality)
    statuses: ['read'] // Can view statuses (needed for properties page functionality)
  },
  
  // Accountant: No access to properties, categories, statuses, or leads
  accountant: {
    properties: [], // No access to properties
    clients: ['read', 'view_assigned'], // Only view their assigned clients
    leads: [], // No access to leads
    viewings: [], // No access to viewings
    analytics: ['view_basic'], // Only basic analytics, no financial data
    users: ['read_self'], // Can only view their own profile
    settings: ['read_self'],
    dashboard: ['limited_access'],
    categories: [], // No access to categories
    statuses: [] // No access to statuses
  },
  
  // HR: Full access to users (like admin), but no access to properties, categories, statuses, or leads
  hr: {
    properties: [], // No access to properties
    clients: ['read', 'view_assigned'], // Only view their assigned clients
    leads: [], // No access to leads
    viewings: [], // No access to viewings
    analytics: ['view_basic'], // Only basic analytics, no financial data
    users: ['create', 'read', 'update', 'delete', 'view_all'], // Full access to users like admin
    settings: ['read_self'],
    dashboard: ['limited_access'],
    categories: [], // No access to categories
    statuses: [] // No access to statuses
  }
};

// Helper function to check if user has permission
const hasPermission = (userRole, resource, action) => {
  // Normalize role to match PERMISSIONS object keys (which use space format)
  const normalizedRole = normalizeRole(userRole);
  if (!PERMISSIONS[normalizedRole]) return false;
  
  const rolePermissions = PERMISSIONS[normalizedRole];
  if (!rolePermissions[resource]) return false;
  
  return rolePermissions[resource].includes(action);
};

// Middleware to verify JWT token and extract user info
const authenticateToken = (req, res, next) => {
  logger.debug('authenticateToken middleware called', {
    url: req.url,
    method: req.method,
    hasAuthHeader: !!req.headers['authorization']
  });
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.security('Authentication attempt without token', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.debug('Token verified successfully', {
      userId: decoded.id,
      role: decoded.role
    });
    req.user = decoded;
    next();
  } catch (error) {
    logger.security('Token verification failed', {
      error: error.message,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to check permissions for specific resources
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      logger.security('checkPermission called without user role', {
        resource,
        action,
        url: req.url,
        method: req.method,
        ip: req.ip
      });
      return res.status(403).json({ message: 'User role not found' });
    }

    // hasPermission already normalizes the role internally
    if (hasPermission(req.user.role, resource, action)) {
      next();
    } else {
      logger.security('Permission denied', {
        userId: req.user.id,
        role: req.user.role,
        resource,
        action,
        url: req.url,
        method: req.method,
        ip: req.ip
      });
      return res.status(403).json({ 
        message: `Access denied. ${req.user.role} cannot ${action} ${resource}` 
      });
    }
  };
};

// Middleware to check if user can view financial data
const canViewFinancialData = (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.security('canViewFinancialData called without user role', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = normalizeRole(req.user.role);
  if (ADMIN_ROLES.includes(role)) {
    next();
  } else {
    logger.security('Financial data access denied', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. Financial data restricted to admin and operations manager only.' 
    });
  }
};

// Middleware to check if user can view agent performance data
const canViewAgentPerformance = (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.security('canViewAgentPerformance called without user role', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = normalizeRole(req.user.role);
  if (AGENT_PERFORMANCE_ROLES.includes(role)) {
    next();
  } else {
    logger.security('Agent performance access denied', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. Agent performance data restricted to admin, operations manager, agent manager, and team leader only.' 
    });
  }
};

// Middleware to check if user can manage properties
const canManageProperties = (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.security('canManageProperties called without user role', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = normalizeRole(req.user.role);
  if (PROPERTY_MANAGE_ROLES.includes(role)) {
    next();
  } else {
    logger.security('Property management access denied', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. Property management restricted to admin, operations manager, operations, and agent manager only.' 
    });
  }
};

// Middleware to check if user can view properties
const canViewProperties = (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.security('canViewProperties called without user role', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = normalizeRole(req.user.role);
  // Accountant and HR roles should not have access to properties
  if (role === ROLES.ACCOUNTANT || role === ROLES.HR) {
    logger.security('Property viewing access denied (accountant/hr)', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. Accountant and HR roles do not have access to properties.' 
    });
  }
  
  if (PROPERTY_VIEW_ROLES.includes(role)) {
    next();
  } else {
    logger.security('Property viewing access denied', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. Property viewing restricted to admin, operations manager, operations, agent manager, team leader, and agent only.' 
    });
  }
};

// Middleware to check if user can manage users
const canManageUsers = (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.security('canManageUsers called without user role', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = normalizeRole(req.user.role);
  if (USER_MANAGE_ROLES.includes(role)) {
    next();
  } else {
    logger.security('User management access denied', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. User management restricted to admin, HR, and operations manager only.' 
    });
  }
};

// Middleware to check if user can view all users (not just themselves)
const canViewAllUsers = (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.security('canViewAllUsers called without user role', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = normalizeRole(req.user.role);
  if (USER_MANAGE_ROLES.includes(role)) {
    next();
  } else {
    logger.security('View all users access denied', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. Viewing all users restricted to admin, HR, and operations manager only.' 
    });
  }
};

// Middleware to check if user can manage categories and statuses
const canManageCategoriesAndStatuses = (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.security('canManageCategoriesAndStatuses called without user role', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = normalizeRole(req.user.role);
  if (CATEGORY_STATUS_MANAGE_ROLES.includes(role)) {
    next();
  } else {
    logger.security('Category/status management access denied', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. Category and status management restricted to admin, operations manager, operations, and agent manager only.' 
    });
  }
};

// Middleware to check if user can view categories and statuses
const canViewCategoriesAndStatuses = (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.security('canViewCategoriesAndStatuses called without user role', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = normalizeRole(req.user.role);
  if (CATEGORY_STATUS_VIEW_ROLES.includes(role)) {
    next();
  } else {
    logger.security('Category/status viewing access denied', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. Category and status viewing restricted to roles with property access.' 
    });
  }
};

// Middleware to check if user can view all data (not just assigned)
const canViewAllData = (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.security('canViewAllData called without user role', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = normalizeRole(req.user.role);
  if (MANAGEMENT_ROLES.includes(role)) {
    next();
  } else {
    logger.security('View all data access denied', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. Viewing all data restricted to admin, operations manager, operations, and agent manager only.' 
    });
  }
};

// Middleware to check if user can manage leads
const canManageLeads = (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.security('canManageLeads called without user role', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = normalizeRole(req.user.role);
  // Allow admin, operations manager, operations, agents, and team leaders to add leads
  if (LEAD_MANAGE_ROLES.includes(role)) {
    next();
  } else {
    logger.security('Lead management access denied', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. Lead management restricted to admin, operations manager, operations, agents, and team leaders only.' 
    });
  }
};

// Roles allowed to use lead import (admin, operations manager, operations, agent manager - NOT agents/team leaders)
const LEAD_IMPORT_ROLES = [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.OPERATIONS, ROLES.AGENT_MANAGER];

const canImportLeads = (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.security('canImportLeads called without user role', { url: req.url, method: req.method, ip: req.ip });
    return res.status(403).json({ message: 'User role not found' });
  }
  const role = normalizeRole(req.user.role);
  if (LEAD_IMPORT_ROLES.includes(role)) {
    next();
  } else {
    logger.security('Lead import access denied', { userId: req.user.id, role: req.user.role, url: req.url });
    return res.status(403).json({
      message: 'Access denied. Lead import is restricted to admin, operations manager, operations, and agent manager.'
    });
  }
};

// Middleware to check if user can delete leads
const canDeleteLeads = (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.security('canDeleteLeads called without user role', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = normalizeRole(req.user.role);
  // Only admin and operations manager can delete leads
  if (ADMIN_ROLES.includes(role)) {
    next();
  } else {
    logger.security('Lead deletion access denied', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. Only admin and operations manager can delete leads.' 
    });
  }
};

// Middleware to check if user can delete properties
const canDeleteProperties = (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.security('canDeleteProperties called without user role', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = normalizeRole(req.user.role);
  // Only admin and operations manager can delete properties
  if (ADMIN_ROLES.includes(role)) {
    next();
  } else {
    logger.security('Property deletion access denied', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. Only admin and operations manager can delete properties.' 
    });
  }
};

// Middleware to check if user can view leads
const canViewLeads = (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.security('canViewLeads called without user role', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = normalizeRole(req.user.role);
  // HR and Accountant do not have access to leads
  if (role === ROLES.HR || role === ROLES.ACCOUNTANT) {
    logger.security('Lead viewing access denied (hr/accountant)', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. HR and Accountant roles do not have access to leads.' 
    });
  }
  
  // Agents and team leaders can view their own leads, others can view all leads
  if (LEAD_VIEW_ROLES.includes(role)) {
    next();
  } else {
    logger.security('Lead viewing access denied', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. You do not have permission to view leads.' 
    });
  }
};

// Middleware to check if user can access reports
const canViewReports = (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.security('canViewReports called without user role', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = normalizeRole(req.user.role);
  // Block agents from accessing reports entirely
  if (role === ROLES.AGENT) {
    logger.security('Reports access denied (agent)', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. Agents cannot access reports.' 
    });
  }

  // Allow admin, operations manager, operations, agent manager, team leader, accountant, and hr
  const allowedRoles = [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.OPERATIONS, ROLES.AGENT_MANAGER, ROLES.TEAM_LEADER, ROLES.ACCOUNTANT, ROLES.HR];
  if (!allowedRoles.includes(role)) {
    logger.security('Reports access denied', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. You do not have permission to view reports.' 
    });
  }

  next();
};

// Middleware to filter data based on user role
const filterDataByRole = (req, res, next) => {
  logger.debug('filterDataByRole middleware called', {
    userId: req.user?.id,
    role: req.user?.role
  });
  
  if (!req.user || !req.user.role) {
    logger.security('filterDataByRole called without user role', {
      url: req.url,
      method: req.method
    });
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = normalizeRole(req.user.role);
  
  // Add role-based filters to request
  req.roleFilters = {
    role: role,
    canViewAll: MANAGEMENT_ROLES.includes(role),
    canViewFinancial: ADMIN_ROLES.includes(role),
    canViewAgentPerformance: AGENT_PERFORMANCE_ROLES.includes(role),
    canManageProperties: PROPERTY_MANAGE_ROLES.includes(role),
    canViewProperties: PROPERTY_VIEW_ROLES.includes(role) && ![ROLES.ACCOUNTANT, ROLES.HR].includes(role),
    canManageUsers: USER_MANAGE_ROLES.includes(role),
    canViewAllUsers: USER_MANAGE_ROLES.includes(role),
    canManageCategoriesAndStatuses: CATEGORY_STATUS_MANAGE_ROLES.includes(role),
    canViewCategoriesAndStatuses: CATEGORY_STATUS_VIEW_ROLES.includes(role),
    canManageLeads: [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.OPERATIONS].includes(role),
    canDeleteLeads: ADMIN_ROLES.includes(role),
    canViewLeads: LEAD_VIEW_ROLES.includes(role) && ![ROLES.HR, ROLES.ACCOUNTANT].includes(role),
    canViewClients: [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.OPERATIONS, ROLES.AGENT_MANAGER, ROLES.TEAM_LEADER].includes(role),
    canManageViewings: VIEWING_MANAGE_ROLES.includes(role),
    canViewViewings: VIEWING_VIEW_ROLES.includes(role),
    canManageAllViewings: VIEWING_MANAGE_ROLES.includes(role)
  };

  logger.debug('Role filters set', { role, userId: req.user.id });
  next();
};

// Middleware to check if user can access DCSR reports
const canViewDCSR = (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.security('canViewDCSR called without user role', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = normalizeRole(req.user.role);
  
  // Allow admin, operations manager, operations, agent manager, and team leader
  const allowedRoles = [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.OPERATIONS, ROLES.AGENT_MANAGER, ROLES.TEAM_LEADER];
  if (!allowedRoles.includes(role)) {
    logger.security('DCSR access denied', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. You do not have permission to view DCSR reports.' 
    });
  }

  next();
};

// Middleware to check if user can create/edit/delete DCSR reports
const canManageDCSR = (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.security('canManageDCSR called without user role', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = normalizeRole(req.user.role);
  
  // Only admin, operations manager, and operations can create/edit/delete
  const allowedRoles = [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.OPERATIONS];
  if (!allowedRoles.includes(role)) {
    logger.security('DCSR management access denied', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. You do not have permission to manage DCSR reports.' 
    });
  }

  next();
};

// Middleware to check if user can access Sale & Rent Source reports
const canViewSaleRentSource = (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.security('canViewSaleRentSource called without user role', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = normalizeRole(req.user.role);
  
  // Allow admin, operations manager, operations, and agent manager
  const allowedRoles = [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.OPERATIONS, ROLES.AGENT_MANAGER];
  if (!allowedRoles.includes(role)) {
    logger.security('Sale & Rent Source access denied', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. You do not have permission to view Sale & Rent Source reports.' 
    });
  }

  next();
};

// Middleware to check if user can manage Sale & Rent Source reports (create/edit/delete)
const canManageSaleRentSource = (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.security('canManageSaleRentSource called without user role', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = normalizeRole(req.user.role);
  
  // Only admin, operations manager, and operations can manage
  const allowedRoles = ['admin', 'operations manager', 'operations'];
  if (!allowedRoles.includes(role)) {
    logger.security('Sale & Rent Source management access denied', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. You do not have permission to manage Sale & Rent Source reports.' 
    });
  }

  next();
};

// Middleware to check if user can access Operations Commission reports
const canViewOperationsCommission = (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.security('canViewOperationsCommission called without user role', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = normalizeRole(req.user.role);
  
  // Allow admin, operations manager, hr, and operations
  const allowedRoles = [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.HR, ROLES.OPERATIONS];
  if (!allowedRoles.includes(role)) {
    logger.security('Operations Commission access denied', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. You do not have permission to view Operations Commission reports.' 
    });
  }

  next();
};

// Middleware to check if user can manage Operations Commission reports (create/edit/delete)
const canManageOperationsCommission = (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.security('canManageOperationsCommission called without user role', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = normalizeRole(req.user.role);
  
  // Only admin, operations manager, and hr can manage
  const allowedRoles = [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.HR];
  if (!allowedRoles.includes(role)) {
    logger.security('Operations Commission management access denied', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. You do not have permission to manage Operations Commission reports.' 
    });
  }

  next();
};

// Middleware to check if user can manage settings (admin and operations manager only)
const canManageSettings = (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.security('canManageSettings called without user role', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ message: 'User role not found' });
  }

  const role = normalizeRole(req.user.role);
  
  // Only admin and operations manager can manage settings
  const allowedRoles = [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER];
  if (!allowedRoles.includes(role)) {
    logger.security('Settings management access denied', {
      userId: req.user.id,
      role: req.user.role,
      normalizedRole: role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      message: 'Access denied. Settings management restricted to admin and operations manager only.' 
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  checkPermission,
  canViewFinancialData,
  canViewAgentPerformance,
  canManageProperties,
  canViewProperties,
  canDeleteProperties,
  canManageUsers,
  canViewAllUsers,
  canManageCategoriesAndStatuses,
  canViewCategoriesAndStatuses,
  canViewAllData,
  canManageLeads,
  canImportLeads,
  canDeleteLeads,
  canViewLeads,
  canViewReports,
  canViewDCSR,
  canManageDCSR,
  canViewSaleRentSource,
  canManageSaleRentSource,
  canViewOperationsCommission,
  canManageOperationsCommission,
  canManageSettings,
  filterDataByRole,
  hasPermission,
  PERMISSIONS
};
