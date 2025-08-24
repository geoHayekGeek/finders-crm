// controllers/propertyController.js
const Property = require('../models/propertyModel');
const User = require('../models/userModel');
const { uploadSingle, uploadMultiple, handleUploadError } = require('../middlewares/fileUpload');

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
  console.log('🚀 getAllProperties called');
  console.log('📊 Request headers:', req.headers);
  console.log('👤 User:', req.user);
  console.log('🔑 Role filters:', req.roleFilters);
  
  try {
    const { roleFilters } = req;
    let properties;

    if (roleFilters.canViewAll) {
      // Admin, operations manager, operations, agent manager can see all properties
      properties = await Property.getAllProperties();
    } else if (roleFilters.role === 'agent') {
      // Agents can only see properties assigned to them or referred by them
      properties = await Property.getPropertiesAssignedOrReferredByAgent(req.user.id);
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
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      code: error.code
    });
  }
};

// Get properties with filters
const getPropertiesWithFilters = async (req, res) => {
  try {
    const { roleFilters } = req;
    const filters = req.query;

    // Add role-based filtering for agents - they should see assigned or referred properties
    let properties;
    if (!roleFilters.canViewAll && roleFilters.role === 'agent') {
      // For agents, we need to use the special method that includes referrals
      // We'll apply filters later if needed
      properties = await Property.getPropertiesAssignedOrReferredByAgent(req.user.id);
      
      // Apply additional filters manually if provided
      if (Object.keys(filters).length > 0) {
        properties = properties.filter(property => {
          let matches = true;
          
          if (filters.status_id && filters.status_id !== 'All' && property.status_id != filters.status_id) {
            matches = false;
          }
          
          if (filters.category_id && filters.category_id !== 'All' && property.category_id != filters.category_id) {
            matches = false;
          }
          
          if (filters.price_min && property.price < filters.price_min) {
            matches = false;
          }
          
          if (filters.price_max && property.price > filters.price_max) {
            matches = false;
          }
          
          if (filters.search && !property.reference_number.toLowerCase().includes(filters.search.toLowerCase()) &&
              !property.location.toLowerCase().includes(filters.search.toLowerCase()) &&
              !property.owner_name.toLowerCase().includes(filters.search.toLowerCase())) {
            matches = false;
          }
          
          if (filters.view_type && filters.view_type !== 'All' && property.view_type !== filters.view_type) {
            matches = false;
          }
          
          if (filters.surface_min && property.surface < filters.surface_min) {
            matches = false;
          }
          
          if (filters.surface_max && property.surface > filters.surface_max) {
            matches = false;
          }
          
          if (filters.built_year_min && property.built_year < filters.built_year_min) {
            matches = false;
          }
          
          if (filters.built_year_max && property.built_year > filters.built_year_max) {
            matches = false;
          }
          
          return matches;
        });
      }
    } else {
      // For other roles, use the normal filtered method
      properties = await Property.getPropertiesWithFilters(filters);
    }

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

    // Check if agent can view this property (assigned or referred)
    if (roleFilters.role === 'agent') {
      const agentProperties = await Property.getPropertiesAssignedOrReferredByAgent(req.user.id);
      const canView = agentProperties.some(p => p.id === parseInt(id));
      
      if (!canView) {
        return res.status(403).json({ message: 'Access denied. You can only view properties assigned to you or referred by you.' });
      }
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
      referral_dates,
      referral_sources, // New field for multiple referrals with dates
      main_image,
      image_gallery
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
      referral_sources,
      referral_source,
      referral_dates,
      main_image: main_image || null, // Optional
      image_gallery: image_gallery || [] // Optional
    });

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: newProperty
    });
  } catch (error) {
    console.error('Error creating property:', error);
    
    // Handle specific validation errors
    if (error.message.includes('base64')) {
      return res.status(400).json({ 
        message: error.message 
      });
    }
    
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
    
    // Handle specific validation errors
    if (error.message.includes('base64')) {
      return res.status(400).json({ 
        message: error.message 
      });
    }
    
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

// New image management methods
const updatePropertyImages = async (req, res) => {
  try {
    const { roleFilters } = req;
    const { id } = req.params;
    const { main_image, image_gallery } = req.body;
    
    if (!roleFilters.canManageProperties) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to update property images.' 
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

    const updatedProperty = await Property.updatePropertyImages(id, main_image, image_gallery);

    res.json({
      success: true,
      message: 'Property images updated successfully',
      data: updatedProperty
    });
  } catch (error) {
    console.error('Error updating property images:', error);
    
    // Handle specific validation errors
    if (error.message.includes('base64')) {
      return res.status(400).json({ 
        message: error.message 
      });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

const addImageToGallery = async (req, res) => {
  try {
    const { roleFilters } = req;
    const { id } = req.params;
    const { base64Image } = req.body;
    
    if (!roleFilters.canManageProperties) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to add images to properties.' 
      });
    }

    if (!base64Image) {
      return res.status(400).json({ message: 'Base64 image is required' });
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

    const updatedProperty = await Property.addImageToGallery(id, base64Image);

    res.json({
      success: true,
      message: 'Image added to gallery successfully',
      data: updatedProperty
    });
  } catch (error) {
    console.error('Error adding image to gallery:', error);
    
    // Handle specific validation errors
    if (error.message.includes('base64')) {
      return res.status(400).json({ 
        message: error.message 
      });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

const removeImageFromGallery = async (req, res) => {
  try {
    const { roleFilters } = req;
    const { id } = req.params;
    const { base64Image } = req.body;
    
    if (!roleFilters.canManageProperties) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to remove images from properties.' 
      });
    }

    if (!base64Image) {
      return res.status(400).json({ message: 'Base64 image is required' });
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

    const updatedProperty = await Property.removeImageFromGallery(id, base64Image);

    res.json({
      success: true,
      message: 'Image removed from gallery successfully',
      data: updatedProperty
    });
  } catch (error) {
    console.error('Error removing image from gallery:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPropertiesWithImages = async (req, res) => {
  try {
    const { roleFilters } = req;
    
    if (!roleFilters.canViewAll) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to view properties with images.' 
      });
    }

    const properties = await Property.getPropertiesWithImages();

    res.json({
      success: true,
      data: properties,
      total: properties.length
    });
  } catch (error) {
    console.error('Error getting properties with images:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Upload main property image
const uploadMainImage = async (req, res) => {
  try {
    const { roleFilters } = req;
    const { id } = req.params;
    
    if (!roleFilters.canManageProperties) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to upload images.' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Generate the file URL path
    const imageUrl = `/assets/properties/${req.file.filename}`;
    
    // Update the property with the new main image
    const updatedProperty = await Property.updateProperty(id, { main_image: imageUrl });
    
    res.json({
      success: true,
      data: updatedProperty,
      message: 'Main image uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading main image:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Upload gallery images
const uploadGalleryImages = async (req, res) => {
  try {
    const { roleFilters } = req;
    const { id } = req.params;
    
    if (!roleFilters.canManageProperties) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to upload images.' 
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No image files provided' });
    }

    // Generate file URL paths for all uploaded images
    const imageUrls = req.files.map(file => `/assets/properties/${file.filename}`);
    
    // Get current property to append to existing gallery
    const property = await Property.getPropertyById(id);
    const currentGallery = property.image_gallery || [];
    const updatedGallery = [...currentGallery, ...imageUrls];
    
    // Update the property with the new gallery images
    const updatedProperty = await Property.updateProperty(id, { image_gallery: updatedGallery });
    
    res.json({
      success: true,
      data: updatedProperty,
      message: `${imageUrls.length} gallery images uploaded successfully`
    });
  } catch (error) {
    console.error('Error uploading gallery images:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get image statistics
const getImageStats = async (req, res) => {
  try {
    const { roleFilters } = req;
    
    if (!roleFilters.canViewAll) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to view image statistics.' 
      });
    }

    const imageStats = await Property.getImageStats();
    
    res.json({
      success: true,
      data: imageStats
    });
  } catch (error) {
    console.error('Error getting image stats:', error);
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
  getDemoProperties,
  uploadMainImage,
  uploadGalleryImages,
  removeImageFromGallery,
  getPropertiesWithImages,
  getImageStats
};
