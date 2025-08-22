// controllers/propertyController.js
const Property = require('../models/propertyModel');
const User = require('../models/userModel');

// Get all properties for demo (no authentication required)
const getDemoProperties = async (req, res) => {
  try {
    const properties = await Property.getAllProperties();
    
    res.json({
      success: true,
      data: properties,
      total: properties.length,
      message: 'Demo properties loaded successfully'
    });
  } catch (error) {
    console.error('Error getting demo properties:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all properties with role-based filtering
const getAllProperties = async (req, res) => {
  try {
    const { roleFilters } = req;
    let properties;

    if (roleFilters.canViewAll) {
      // Admin, operations manager, operations, agent manager can see all properties
      properties = await Property.getAllProperties();
    } else if (roleFilters.role === 'agent') {
      // Agents can only see properties assigned to them
      properties = await Property.getPropertiesByAgent(req.user.id);
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      data: properties,
      total: properties.length,
      role: roleFilters.role
    });
  } catch (error) {
    console.error('Error getting properties:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get properties with filters
const getPropertiesWithFilters = async (req, res) => {
  try {
    const { roleFilters } = req;
    const filters = req.query;

    // Add role-based filtering
    if (!roleFilters.canViewAll && roleFilters.role === 'agent') {
      filters.agent_id = req.user.id;
    }

    const properties = await Property.getPropertiesWithFilters(filters);

    res.json({
      success: true,
      data: properties,
      total: properties.length,
      role: roleFilters.role
    });
  } catch (error) {
    console.error('Error getting filtered properties:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single property
const getPropertyById = async (req, res) => {
  try {
    const { roleFilters } = req;
    const { id } = req.params;

    const property = await Property.getPropertyById(id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if agent can view this property
    if (roleFilters.role === 'agent' && property.agent_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You can only view properties assigned to you.' });
    }

    res.json({
      success: true,
      data: property,
      role: roleFilters.role
    });
  } catch (error) {
    console.error('Error getting property:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create new property
const createProperty = async (req, res) => {
  try {
    const { roleFilters } = req;
    
    if (!roleFilters.canManageProperties) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to create properties.' 
      });
    }

    const {
      status_id,
      location,
      category_id,
      building_name,
      owner_name,
      phone_number,
      surface,
      details,
      interior_details,
      built_year,
      view_type,
      concierge,
      agent_id,
      price,
      notes,
      referral_source,
      referral_dates
    } = req.body;

    // Validate required fields
    if (!status_id || !location || !category_id || !owner_name || !price) {
      return res.status(400).json({ 
        message: 'Missing required fields: status_id, location, category_id, owner_name, and price are required' 
      });
    }

    // If agent manager is creating property, they can assign it to any agent
    // If operations/operations manager is creating property, they can assign it to any agent
    // If admin is creating property, they can assign it to any agent
    let finalAgentId = agent_id;
    
    if (roleFilters.role === 'agent manager') {
      // Agent manager can only assign to agents
      if (agent_id) {
        const assignedUser = await User.findById(agent_id);
        if (!assignedUser || assignedUser.role !== 'agent') {
          return res.status(400).json({ 
            message: 'Agent manager can only assign properties to agents' 
          });
        }
      }
    }

    const newProperty = await Property.createProperty({
      status_id,
      location,
      category_id,
      building_name,
      owner_name,
      phone_number,
      surface,
      details,
      interior_details,
      built_year,
      view_type,
      concierge: concierge || false,
      agent_id: finalAgentId,
      price,
      notes,
      referral_source,
      referral_dates
    });

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: newProperty
    });
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update property
const updateProperty = async (req, res) => {
  try {
    const { roleFilters } = req;
    const { id } = req.params;
    
    if (!roleFilters.canManageProperties) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to update properties.' 
      });
    }

    const property = await Property.getPropertyById(id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if agent can update this property
    if (roleFilters.role === 'agent' && property.agent_id !== req.user.id) {
      return res.status(403).json({ 
        message: 'Access denied. You can only update properties assigned to you.' 
      });
    }

    // Agent managers can only update properties assigned to their agents
    if (roleFilters.role === 'agent manager') {
      const assignedUser = await User.findById(property.agent_id);
      if (!assignedUser || assignedUser.role !== 'agent') {
        return res.status(403).json({ 
          message: 'Access denied. You can only update properties assigned to agents.' 
        });
      }
    }

    const updates = req.body;
    const updatedProperty = await Property.updateProperty(id, updates);

    res.json({
      success: true,
      message: 'Property updated successfully',
      data: updatedProperty
    });
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete property
const deleteProperty = async (req, res) => {
  try {
    const { roleFilters } = req;
    const { id } = req.params;
    
    if (!roleFilters.canManageProperties) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to delete properties.' 
      });
    }

    const property = await Property.getPropertyById(id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if agent can delete this property
    if (roleFilters.role === 'agent' && property.agent_id !== req.user.id) {
      return res.status(403).json({ 
        message: 'Access denied. You can only delete properties assigned to you.' 
      });
    }

    // Agent managers can only delete properties assigned to their agents
    if (roleFilters.role === 'agent manager') {
      const assignedUser = await User.findById(property.agent_id);
      if (!assignedUser || assignedUser.role !== 'agent') {
        return res.status(403).json({ 
          message: 'Access denied. You can only delete properties assigned to agents.' 
        });
      }
    }

    await Property.deleteProperty(id);

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get property statistics
const getPropertyStats = async (req, res) => {
  try {
    const { roleFilters } = req;
    
    if (!roleFilters.canViewAll) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to view property statistics.' 
      });
    }

    const stats = await Property.getPropertyStats();
    const locationStats = await Property.getPropertiesByLocation();
    const categoryStats = await Property.getPropertiesByCategory();
    const statusStats = await Property.getPropertiesByStatus();
    const viewStats = await Property.getPropertiesByView();
    const priceRangeStats = await Property.getPropertiesByPriceRange();

    res.json({
      success: true,
      data: {
        overview: stats,
        byLocation: locationStats,
        byCategory: categoryStats,
        byStatus: statusStats,
        byView: viewStats,
        byPriceRange: priceRangeStats
      }
    });
  } catch (error) {
    console.error('Error getting property stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get properties by agent (for agent managers)
const getPropertiesByAgent = async (req, res) => {
  try {
    const { roleFilters } = req;
    const { agentId } = req.params;

    if (!roleFilters.canViewAgentPerformance) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to view agent performance data.' 
      });
    }

    // Agent managers can only view properties assigned to agents
    if (roleFilters.role === 'agent manager') {
      const assignedUser = await User.findById(agentId);
      if (!assignedUser || assignedUser.role !== 'agent') {
        return res.status(403).json({ 
          message: 'Access denied. You can only view properties assigned to agents.' 
        });
      }
    }

    const properties = await Property.getPropertiesByAgent(agentId);

    res.json({
      success: true,
      data: properties,
      total: properties.length
    });
  } catch (error) {
    console.error('Error getting properties by agent:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllProperties,
  getPropertiesWithFilters,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertyStats,
  getPropertiesByAgent,
  getDemoProperties
};
