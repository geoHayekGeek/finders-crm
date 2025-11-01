// controllers/propertyController.js
const Property = require('../models/propertyModel');
const PropertyReferral = require('../models/propertyReferralModel');
const Status = require('../models/statusModel');
const User = require('../models/userModel');
const Notification = require('../models/notificationModel');
const CalendarEvent = require('../models/calendarEventModel');
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
      // Admin, operations manager, operations, agent manager can see all properties with full owner details
      properties = await Property.getAllProperties();
    } else if (roleFilters.role === 'agent') {
      // Agents can see all properties but owner details are filtered
      properties = await Property.getAllPropertiesWithFilteredOwnerDetails(roleFilters.role, req.user.id);
      
      // Filter owner details for properties not assigned to this agent
      properties = properties.map(property => {
        if (property.agent_id !== req.user.id) {
          // Hide owner details for properties not assigned to this agent
          return {
            ...property,
            owner_name: 'Hidden',
            phone_number: 'Hidden'
          };
        }
        return property;
      });
    } else if (roleFilters.role === 'team_leader') {
      // Team leaders can see all properties but owner details are filtered
      properties = await Property.getAllPropertiesWithFilteredOwnerDetails(roleFilters.role, req.user.id);
      
      // Get agents under this team leader
      const User = require('../models/userModel');
      const teamAgents = await User.getTeamLeaderAgents(req.user.id);
      const teamAgentIds = teamAgents.map(agent => agent.id);
      
      // Filter owner details based on permissions
      properties = properties.map(async (property) => {
        const canSeeOwnerDetails = await Property.canUserSeeOwnerDetails(
          roleFilters.role, 
          req.user.id, 
          property.id
        );
        
        if (!canSeeOwnerDetails) {
          return {
            ...property,
            owner_name: 'Hidden',
            phone_number: 'Hidden'
          };
        }
        return property;
      });
      
      // Wait for all async operations to complete
      properties = await Promise.all(properties);
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

    console.log('🔍 getPropertiesWithFilters called with role:', roleFilters.role, 'filters:', filters);

    // Get all properties first, then apply role-based filtering for owner details
    let properties;
    
    if (roleFilters.canViewAll) {
      // Admin, operations manager, operations, agent manager can see all properties with full owner details
      properties = await Property.getAllProperties();
    } else if (roleFilters.role === 'agent') {
      // Agents can see all properties but owner details are filtered
      properties = await Property.getAllPropertiesWithFilteredOwnerDetails(roleFilters.role, req.user.id);
      
      // Filter owner details for properties not assigned to this agent
      properties = properties.map(property => {
        if (property.agent_id !== req.user.id) {
          // Hide owner details for properties not assigned to this agent
          return {
            ...property,
            owner_name: 'Hidden',
            phone_number: 'Hidden'
          };
        }
        return property;
      });
    } else if (roleFilters.role === 'team_leader') {
      // Team leaders can see all properties but owner details are filtered
      properties = await Property.getAllPropertiesWithFilteredOwnerDetails(roleFilters.role, req.user.id);
      
      // Filter owner details based on permissions
      properties = properties.map(async (property) => {
        const canSeeOwnerDetails = await Property.canUserSeeOwnerDetails(
          roleFilters.role, 
          req.user.id, 
          property.id
        );
        
        if (!canSeeOwnerDetails) {
          return {
            ...property,
            owner_name: 'Hidden',
            phone_number: 'Hidden'
          };
        }
        return property;
      });
      
      // Wait for all async operations to complete
      properties = await Promise.all(properties);
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Apply additional filters manually if provided
    if (Object.keys(filters).length > 0) {
      console.log('🔍 Applying filters to properties:', filters);
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
        
        if (filters.property_type && filters.property_type !== 'All' && property.property_type !== filters.property_type) {
          matches = false;
        }
        
        if (filters.concierge !== undefined && property.concierge !== (filters.concierge === 'true')) {
          matches = false;
        }
        
        return matches;
      });
      console.log('📊 After filtering properties:', properties.length);
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

    // Apply owner detail filtering based on user role
    if (roleFilters.canViewAll) {
      // Admin, operations manager, operations, agent manager can see all owner details
      // No filtering needed
    } else if (roleFilters.role === 'agent') {
      // Agents can only see owner details for properties assigned to them
      if (property.agent_id !== req.user.id) {
        property.owner_name = 'Hidden';
        property.phone_number = 'Hidden';
      }
    } else if (roleFilters.role === 'team_leader') {
      // Team leaders can see owner details for their own properties and team agent properties
      const canSeeOwnerDetails = await Property.canUserSeeOwnerDetails(
        roleFilters.role, 
        req.user.id, 
        parseInt(id)
      );
      
      if (!canSeeOwnerDetails) {
        property.owner_name = 'Hidden';
        property.phone_number = 'Hidden';
      }
    } else {
      return res.status(403).json({ message: 'Access denied' });
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
      property_type,
      location,
      category_id,
      building_name,
      owner_id,
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
      property_url,
      referrals,

      main_image,
      image_gallery
    } = req.body;

    // Validation is now handled by middleware
    // Basic type conversions for safety
    const processedConcierge = concierge === true || concierge === 'true' || concierge === 1;

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
      property_type,
      location,
      category_id,
      building_name,
      owner_id: owner_id || null, // Optional - link to lead
      owner_name: owner_name || null, // Optional - for backward compatibility
      phone_number: phone_number || null, // Optional - for backward compatibility
      surface,
      details,
      interior_details,
      built_year,
      view_type,
      concierge: processedConcierge,
      agent_id: finalAgentId,
      price,
      notes,
      property_url: property_url || null, // Optional
      referrals: referrals || [],

      main_image: main_image || null, // Optional
      image_gallery: image_gallery || [] // Optional
    });

    // Apply the 30-day external rule to all referrals for this property
    if (referrals && referrals.length > 0) {
      try {
        console.log(`🔄 Applying 30-day external rule to property ${newProperty.id} referrals...`);
        const ruleResult = await PropertyReferral.applyExternalRuleToPropertyReferrals(newProperty.id);
        console.log(`✅ External rule applied: ${ruleResult.message}`);
        if (ruleResult.markedExternalReferrals.length > 0) {
          console.log(`   Marked ${ruleResult.markedExternalReferrals.length} referral(s) as external`);
        }
      } catch (referralError) {
        console.error('Error applying external rule to property referrals:', referralError);
        // Don't fail the property creation if referral rule application fails
      }
    }

    // Create notifications for relevant users
    try {
      await Notification.createPropertyNotification(
        newProperty.id,
        'created',
        {
          building_name: newProperty.building_name,
          location: newProperty.location,
          reference_number: newProperty.reference_number
        },
        req.user.id
      );

      // If an agent is assigned, create a specific "Property Assigned" notification for them
      if (finalAgentId && finalAgentId !== req.user.id) {
        await Notification.createNotification({
          user_id: finalAgentId,
          title: 'Property Assigned',
          message: `You have been assigned to the property "${newProperty.building_name || newProperty.location}".`,
          type: 'info',
          entity_type: 'property',
          entity_id: newProperty.id
        });

        // Create a calendar event for the assigned agent
        try {
          const eventData = {
            title: `Property Assignment: ${newProperty.building_name || newProperty.location}`,
            description: `You have been assigned to manage this property. Reference: ${newProperty.reference_number}`,
            start_time: new Date(), // Start immediately
            end_time: new Date(Date.now() + 24 * 60 * 60 * 1000), // End in 24 hours
            all_day: false,
            color: 'blue',
            type: 'property_assignment',
            location: newProperty.location,
            attendees: [],
            notes: `Property Reference: ${newProperty.reference_number}\nProperty Type: ${newProperty.property_type}\nPrice: $${newProperty.price}`,
            created_by: req.user.id,
            assigned_to: finalAgentId,
            property_id: newProperty.id
          };

          await CalendarEvent.createEvent(eventData);
          console.log('📅 Calendar event created for property assignment');
        } catch (calendarError) {
          console.error('❌ Error creating calendar event:', calendarError);
          // Don't fail the property creation if calendar event creation fails
        }
      }

      // If there are referrals, create specific notifications for them
      if (referrals && referrals.length > 0) {
        for (const referral of referrals) {
          if (referral.employee_id) {
            await Notification.createReferralNotification(
              newProperty.id,
              referral.employee_id,
              {
                building_name: newProperty.building_name,
                location: newProperty.location,
                reference_number: newProperty.reference_number
              }
            );
          }
        }
      }
    } catch (notificationError) {
      console.error('Error creating property notifications:', notificationError);
      // Don't fail the property creation if notifications fail
    }

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
    console.log('🔍 Updates being sent to updateProperty:', JSON.stringify(updates, null, 2));
    console.log('🔍 Referrals in updates:', updates.referrals);
    
    // If status_id is being updated, check if it's 'closed' and set closed_date
    if (updates.status_id && updates.status_id !== property.status_id) {
      const newStatus = await Status.getStatusById(updates.status_id);
      console.log('📊 New status:', newStatus);
      
      if (newStatus && newStatus.code === 'closed') {
        // Set closed_date to today if not already set (either not present or empty string)
        if (!updates.closed_date || updates.closed_date === '') {
          updates.closed_date = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
          console.log('📅 Auto-setting closed_date to today:', updates.closed_date);
        } else {
          console.log('📅 Using provided closed_date:', updates.closed_date);
        }
      } else if (newStatus && newStatus.code !== 'closed') {
        // If changing away from closed, clear the closed_date
        updates.closed_date = null;
        console.log('📅 Clearing closed_date (moving away from closed)');
      }
    }
    
    const updatedProperty = await Property.updateProperty(id, updates);
    console.log('🔍 Updated property returned:', JSON.stringify(updatedProperty, null, 2));

    // Apply the 30-day external rule to all referrals for this property if referrals were updated
    if (updates.referrals !== undefined) {
      try {
        console.log(`🔄 Applying 30-day external rule to property ${id} referrals...`);
        const ruleResult = await PropertyReferral.applyExternalRuleToPropertyReferrals(parseInt(id));
        console.log(`✅ External rule applied: ${ruleResult.message}`);
        if (ruleResult.markedExternalReferrals.length > 0) {
          console.log(`   Marked ${ruleResult.markedExternalReferrals.length} referral(s) as external`);
        }
      } catch (referralError) {
        console.error('❌ Error updating property referrals:', referralError);
        console.error('❌ Error stack:', referralError.stack);
        // Don't fail the property update if referral rule application fails
      }
    }

    // Create notifications for relevant users
    try {
      await Notification.createPropertyNotification(
        parseInt(id),
        'updated',
        {
          building_name: updatedProperty.building_name,
          location: updatedProperty.location,
          reference_number: updatedProperty.reference_number
        },
        req.user.id
      );

      // If agent assignment changed, create a specific "Property Assigned" notification for the new agent
      if (updates.agent_id && updates.agent_id !== property.agent_id && updates.agent_id !== req.user.id) {
        await Notification.createNotification({
          user_id: updates.agent_id,
          title: 'Property Assigned',
          message: `You have been assigned to the property "${updatedProperty.building_name || updatedProperty.location}".`,
          type: 'info',
          entity_type: 'property',
          entity_id: parseInt(id)
        });

        // Create a calendar event for the newly assigned agent
        try {
          const eventData = {
            title: `Property Assignment: ${updatedProperty.building_name || updatedProperty.location}`,
            description: `You have been assigned to manage this property. Reference: ${updatedProperty.reference_number}`,
            start_time: new Date(), // Start immediately
            end_time: new Date(Date.now() + 24 * 60 * 60 * 1000), // End in 24 hours
            all_day: false,
            color: 'blue',
            type: 'property_assignment',
            location: updatedProperty.location,
            attendees: [],
            notes: `Property Reference: ${updatedProperty.reference_number}\nProperty Type: ${updatedProperty.property_type}\nPrice: $${updatedProperty.price}`,
            created_by: req.user.id,
            assigned_to: updates.agent_id,
            property_id: parseInt(id)
          };

          await CalendarEvent.createEvent(eventData);
          console.log('📅 Calendar event created for property reassignment');
        } catch (calendarError) {
          console.error('❌ Error creating calendar event for reassignment:', calendarError);
          // Don't fail the property update if calendar event creation fails
        }
      }

      // If referrals were updated, create specific notifications for new referrals
      if (updates.referrals && updates.referrals.length > 0) {
        for (const referral of updates.referrals) {
          if (referral.employee_id) {
            await Notification.createReferralNotification(
              parseInt(id),
              referral.employee_id,
              {
                building_name: updatedProperty.building_name,
                location: updatedProperty.location,
                reference_number: updatedProperty.reference_number
              }
            );
          }
        }
      }
    } catch (notificationError) {
      console.error('Error creating property update notifications:', notificationError);
      // Don't fail the property update if notifications fail
    }

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
    
    // Ensure ID is a number
    const propertyId = parseInt(id, 10);
    if (isNaN(propertyId)) {
      return res.status(400).json({ message: 'Invalid property ID' });
    }
    
    console.log('🔍 Delete property request:', {
      originalId: id,
      parsedId: propertyId,
      type: typeof propertyId,
      roleFilters: roleFilters,
      user: req.user
    });
    
    if (!roleFilters.canManageProperties) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to delete properties.' 
      });
    }

    const property = await Property.getPropertyById(propertyId);
    console.log('🔍 Property lookup result:', property ? 'Found' : 'Not found', { propertyId: propertyId });
    
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

    // Create notifications for relevant users before deleting
    try {
      await Notification.createPropertyNotification(
        propertyId,
        'deleted',
        {
          building_name: property.building_name,
          location: property.location,
          reference_number: property.reference_number
        },
        req.user.id
      );
    } catch (notificationError) {
      console.error('Error creating property deletion notifications:', notificationError);
      // Don't fail the property deletion if notifications fail
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
