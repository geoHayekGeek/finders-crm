// controllers/propertyController.js
const Property = require('../models/propertyModel');
const PropertyReferral = require('../models/propertyReferralModel');
const Status = require('../models/statusModel');
const User = require('../models/userModel');
const Notification = require('../models/notificationModel');
const CalendarEvent = require('../models/calendarEventModel');
const { uploadSingle, uploadMultiple, handleUploadError } = require('../middlewares/fileUpload');

// Helper function to filter created_by info based on user role
// Only admin, operations manager, agent manager, and operations can see who created the property
const filterCreatedByInfo = (properties, userRole) => {
  // Normalize role for comparison
  const normalizedRole = userRole ? userRole.toLowerCase().replace(/_/g, ' ').trim() : '';
  const canSeeCreatedBy = ['admin', 'operations manager', 'operations', 'agent manager'].includes(normalizedRole);
  
  if (canSeeCreatedBy) {
    return properties; // Return as-is for authorized roles
  }
  
  // Remove created_by info for unauthorized roles
  return properties.map(property => {
    const { created_by, created_by_name, created_by_role, ...rest } = property;
    return rest;
  });
};

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
    } else if (roleFilters.role === 'team leader') {
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

    // Filter created_by info based on role
    properties = filterCreatedByInfo(properties, roleFilters.role);

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
    } else if (roleFilters.role === 'team leader') {
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

    // Filter created_by info based on role
    properties = filterCreatedByInfo(properties, roleFilters.role);

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
        
        if (filters.agent_id && filters.agent_id !== 'All') {
          const filterAgentId = parseInt(filters.agent_id, 10);
          if (!isNaN(filterAgentId) && property.agent_id !== filterAgentId) {
            matches = false;
          }
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
        
        if (filters.location && property.location && !property.location.toLowerCase().includes(filters.location.toLowerCase())) {
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
        
        // Helper function to extract number from string
        const extractNumber = (str) => {
          if (!str) return null;
          const numMatch = str.toString().match(/\d+/);
          return numMatch ? parseInt(numMatch[0], 10) : null;
        };
        
        // Helper function to check yes/no values
        const checkYesNo = (value, filterValue) => {
          if (!value) return false;
          const valueStr = value.toString().toLowerCase().trim();
          const filterStr = filterValue.toString().toLowerCase().trim();
          // Check for yes/no variations
          if (filterStr === 'true' || filterStr === 'yes' || filterStr === '1') {
            return valueStr === 'yes' || valueStr === 'true' || valueStr === '1' || 
                   valueStr.includes('yes') || valueStr.includes('true');
          }
          if (filterStr === 'false' || filterStr === 'no' || filterStr === '0') {
            return valueStr === 'no' || valueStr === 'false' || valueStr === '0' || 
                   valueStr.includes('no') || valueStr.includes('false');
          }
          // Fallback to string includes
          return valueStr.includes(filterStr);
        };
        
        // Property Details filters
        // Floor Number - handle both numeric and text matching
        if (matches && filters.floor_number && filters.floor_number.trim() !== '') {
          try {
            const details = typeof property.details === 'string' ? JSON.parse(property.details) : property.details;
            if (!details || !details.floor_number) {
              matches = false;
            } else {
              const filterValue = filters.floor_number.trim().toLowerCase();
              const floorValue = details.floor_number.toString().toLowerCase();
              
              // Try numeric matching first
              const filterNum = extractNumber(filterValue);
              const valueNum = extractNumber(floorValue);
              
              if (filterNum !== null && valueNum !== null) {
                // Numeric match
                if (filterNum !== valueNum) {
                  matches = false;
                }
              } else {
                // String match fallback (case-insensitive)
                if (!floorValue.includes(filterValue)) {
                  matches = false;
                }
              }
            }
          } catch (e) {
            matches = false;
          }
        }
        
        // Balcony - checkbox (yes/no)
        if (matches && filters.balcony !== undefined && filters.balcony !== null && filters.balcony !== '') {
          try {
            const details = typeof property.details === 'string' ? JSON.parse(property.details) : property.details;
            if (!details || !details.balcony) {
              matches = false;
            } else {
              const balconyValue = details.balcony.toString().toLowerCase().trim();
              const filterValue = filters.balcony.toString().toLowerCase().trim();
              // Check if it's a yes/no filter
              if (filterValue === 'true' || filterValue === 'yes' || filterValue === '1') {
                if (balconyValue !== 'yes' && balconyValue !== 'true' && balconyValue !== '1' && 
                    !balconyValue.includes('yes') && !balconyValue.includes('true')) {
                  matches = false;
                }
              } else if (filterValue === 'false' || filterValue === 'no' || filterValue === '0') {
                if (balconyValue !== 'no' && balconyValue !== 'false' && balconyValue !== '0' && 
                    !balconyValue.includes('no') && !balconyValue.includes('false')) {
                  matches = false;
                }
              } else {
                // String match
                if (!balconyValue.includes(filterValue)) {
                  matches = false;
                }
              }
            }
          } catch (e) {
            matches = false;
          }
        }
        
        if (matches && filters.covered_parking && filters.covered_parking.trim() !== '') {
          try {
            const details = typeof property.details === 'string' ? JSON.parse(property.details) : property.details;
            if (!details || !details.covered_parking || 
                !details.covered_parking.toLowerCase().includes(filters.covered_parking.toLowerCase().trim())) {
              matches = false;
            }
          } catch (e) {
            matches = false;
          }
        }
        
        if (matches && filters.outdoor_parking && filters.outdoor_parking.trim() !== '') {
          try {
            const details = typeof property.details === 'string' ? JSON.parse(property.details) : property.details;
            if (!details || !details.outdoor_parking || 
                !details.outdoor_parking.toLowerCase().includes(filters.outdoor_parking.toLowerCase().trim())) {
              matches = false;
            }
          } catch (e) {
            matches = false;
          }
        }
        
        // Cave - checkbox (yes/no)
        if (matches && filters.cave !== undefined && filters.cave !== null && filters.cave !== '') {
          try {
            const details = typeof property.details === 'string' ? JSON.parse(property.details) : property.details;
            if (!details || !details.cave) {
              matches = false;
            } else {
              const caveValue = details.cave.toString().toLowerCase().trim();
              const filterValue = filters.cave.toString().toLowerCase().trim();
              // Check if it's a yes/no filter
              if (filterValue === 'true' || filterValue === 'yes' || filterValue === '1') {
                if (caveValue !== 'yes' && caveValue !== 'true' && caveValue !== '1' && 
                    !caveValue.includes('yes') && !caveValue.includes('true')) {
                  matches = false;
                }
              } else if (filterValue === 'false' || filterValue === 'no' || filterValue === '0') {
                if (caveValue !== 'no' && caveValue !== 'false' && caveValue !== '0' && 
                    !caveValue.includes('no') && !caveValue.includes('false')) {
                  matches = false;
                }
              } else {
                // String match
                if (!caveValue.includes(filterValue)) {
                  matches = false;
                }
              }
            }
          } catch (e) {
            matches = false;
          }
        }
        
        // Interior Details filters - numeric matching
        if (matches && filters.living_rooms && filters.living_rooms.trim() !== '') {
          try {
            const interiorDetails = typeof property.interior_details === 'string' ? JSON.parse(property.interior_details) : property.interior_details;
            if (!interiorDetails || !interiorDetails.living_rooms) {
              matches = false;
            } else {
              const filterNum = extractNumber(filters.living_rooms);
              const valueNum = extractNumber(interiorDetails.living_rooms);
              if (filterNum !== null && valueNum !== null) {
                // Numeric match
                if (filterNum !== valueNum) {
                  matches = false;
                }
              } else {
                // String match fallback
                if (!interiorDetails.living_rooms.toLowerCase().includes(filters.living_rooms.toLowerCase().trim())) {
                  matches = false;
                }
              }
            }
          } catch (e) {
            matches = false;
          }
        }
        
        if (matches && filters.bedrooms && filters.bedrooms.trim() !== '') {
          try {
            const interiorDetails = typeof property.interior_details === 'string' ? JSON.parse(property.interior_details) : property.interior_details;
            if (!interiorDetails || !interiorDetails.bedrooms) {
              matches = false;
            } else {
              const filterNum = extractNumber(filters.bedrooms);
              const valueNum = extractNumber(interiorDetails.bedrooms);
              if (filterNum !== null && valueNum !== null) {
                // Numeric match
                if (filterNum !== valueNum) {
                  matches = false;
                }
              } else {
                // String match fallback
                if (!interiorDetails.bedrooms.toLowerCase().includes(filters.bedrooms.toLowerCase().trim())) {
                  matches = false;
                }
              }
            }
          } catch (e) {
            matches = false;
          }
        }
        
        if (matches && filters.bathrooms && filters.bathrooms.trim() !== '') {
          try {
            const interiorDetails = typeof property.interior_details === 'string' ? JSON.parse(property.interior_details) : property.interior_details;
            if (!interiorDetails || !interiorDetails.bathrooms) {
              matches = false;
            } else {
              const filterNum = extractNumber(filters.bathrooms);
              const valueNum = extractNumber(interiorDetails.bathrooms);
              if (filterNum !== null && valueNum !== null) {
                // Numeric match
                if (filterNum !== valueNum) {
                  matches = false;
                }
              } else {
                // String match fallback
                if (!interiorDetails.bathrooms.toLowerCase().includes(filters.bathrooms.toLowerCase().trim())) {
                  matches = false;
                }
              }
            }
          } catch (e) {
            matches = false;
          }
        }
        
        // Maid Room - checkbox (yes/no)
        if (matches && filters.maid_room !== undefined && filters.maid_room !== null && filters.maid_room !== '') {
          try {
            const interiorDetails = typeof property.interior_details === 'string' ? JSON.parse(property.interior_details) : property.interior_details;
            if (!interiorDetails || !interiorDetails.maid_room) {
              matches = false;
            } else {
              const maidRoomValue = interiorDetails.maid_room.toString().toLowerCase().trim();
              const filterValue = filters.maid_room.toString().toLowerCase().trim();
              // Check if it's a yes/no filter
              if (filterValue === 'true' || filterValue === 'yes' || filterValue === '1') {
                if (maidRoomValue !== 'yes' && maidRoomValue !== 'true' && maidRoomValue !== '1' && 
                    !maidRoomValue.includes('yes') && !maidRoomValue.includes('true')) {
                  matches = false;
                }
              } else if (filterValue === 'false' || filterValue === 'no' || filterValue === '0') {
                if (maidRoomValue !== 'no' && maidRoomValue !== 'false' && maidRoomValue !== '0' && 
                    !maidRoomValue.includes('no') && !maidRoomValue.includes('false')) {
                  matches = false;
                }
              } else {
                // String match
                if (!maidRoomValue.includes(filterValue)) {
                  matches = false;
                }
              }
            }
          } catch (e) {
            matches = false;
          }
        }
        
        return matches;
      });
      
      // Filter by serious viewings if requested
      if (filters.has_serious_viewings === true || filters.has_serious_viewings === 'true') {
        try {
          const pool = require('../config/db');
          const propertyIds = properties.map(p => p.id);
          
          if (propertyIds.length > 0) {
            // Query to find properties with serious viewings
            const seriousViewingsResult = await pool.query(
              `SELECT DISTINCT property_id 
               FROM viewings 
               WHERE property_id = ANY($1::int[]) 
               AND is_serious = true`,
              [propertyIds]
            );
            
            const propertiesWithSeriousViewings = new Set(
              seriousViewingsResult.rows.map(row => row.property_id)
            );
            
            // Filter to only properties with serious viewings
            properties = properties.filter(property => 
              propertiesWithSeriousViewings.has(property.id)
            );
          } else {
            properties = [];
          }
        } catch (viewingsError) {
          console.error('Error filtering by serious viewings:', viewingsError);
          // If there's an error, don't filter by serious viewings
        }
      }
      
      console.log('📊 After filtering properties:', properties.length);
    }

    // Filter created_by info based on role (already done earlier, but ensure it's still applied)
    properties = filterCreatedByInfo(properties, roleFilters.role);

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
    } else if (roleFilters.role === 'team leader') {
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

    // Filter created_by info based on role
    const filteredProperty = filterCreatedByInfo([property], roleFilters.role)[0];

    res.json({
      success: true,
      data: filteredProperty,
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
      payment_facilities,
      payment_facilities_specification,
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
      payment_facilities: payment_facilities || false,
      payment_facilities_specification: payment_facilities ? payment_facilities_specification : null,
      built_year,
      view_type,
      concierge: processedConcierge,
      agent_id: finalAgentId,
      price,
      notes,
      property_url: property_url || null, // Optional
      referrals: referrals || [], // Required - validation happens in middleware and model
      main_image: main_image || null, // Optional
      image_gallery: image_gallery || [], // Optional
      created_by: req.user.id // Track who created the property
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
        
        // If platform_id is not provided, default to the lead's reference_source_id (if owner_id exists)
        if (!updates.platform_id && property.owner_id) {
          const Lead = require('../models/leadsModel');
          const lead = await Lead.getLeadById(property.owner_id);
          if (lead && lead.reference_source_id) {
            updates.platform_id = lead.reference_source_id;
            console.log('📱 Auto-setting platform_id from lead reference_source_id:', updates.platform_id);
          }
        }
      } else if (newStatus && newStatus.code !== 'closed') {
        // If changing away from closed, clear the closed_date and closing fields
        updates.closed_date = null;
        updates.sold_amount = null;
        updates.buyer_id = null;
        updates.commission = null;
        updates.platform_id = null;
        console.log('📅 Clearing closed_date and closing fields (moving away from closed)');
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
    
    // Permission is already checked by canDeleteProperties middleware
    // Only admin and operations manager can reach this point

    const property = await Property.getPropertyById(propertyId);
    console.log('🔍 Property lookup result:', property ? 'Found' : 'Not found', { propertyId: propertyId });
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
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

// Refer a property to an agent
const referPropertyToAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { referred_to_agent_id } = req.body;
    const { roleFilters } = req;
    const userId = req.user.id;

    // Check if user can view properties (agents and team leaders can refer)
    if (!roleFilters.canViewProperties) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to refer properties.' 
      });
    }

    if (!referred_to_agent_id) {
      return res.status(400).json({ message: 'referred_to_agent_id is required' });
    }

    // Check if property exists
    const property = await Property.getPropertyById(id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // For agents and team leaders, they can only refer properties assigned to them
    if (roleFilters.role === 'agent' || roleFilters.role === 'team leader') {
      if (property.agent_id !== userId) {
        return res.status(403).json({ 
          message: 'Access denied. You can only refer properties that are assigned to you.' 
        });
      }
    }

    // Check if property status allows referrals
    if (property.status_can_be_referred === false) {
      return res.status(400).json({ 
        message: `Properties with status "${property.status_name}" cannot be referred.` 
      });
    }

    // Create the referral
    const referral = await PropertyReferral.referPropertyToAgent(
      parseInt(id),
      parseInt(referred_to_agent_id),
      userId
    );

    // Create notification for the referred agent
    try {
      await Notification.createNotification({
        user_id: parseInt(referred_to_agent_id),
        type: 'property_referral',
        title: 'New Property Referral',
        message: `${req.user.name} referred property ${property.reference_number} to you`,
        property_id: parseInt(id),
        is_read: false
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      data: referral,
      message: 'Property referred successfully'
    });
  } catch (error) {
    console.error('Error referring property:', error);
    res.status(500).json({ 
      message: error.message || 'Server error' 
    });
  }
};

// Get pending referrals for current user
const getPendingReferrals = async (req, res) => {
  try {
    const { roleFilters } = req;
    const userId = req.user.id;

    // Only agents and team leaders can have pending referrals
    if (roleFilters.role !== 'agent' && roleFilters.role !== 'team leader') {
      return res.status(403).json({ 
        message: 'Access denied. Only agents and team leaders can have pending referrals.' 
      });
    }

    const pendingReferrals = await PropertyReferral.getPendingReferralsForUser(userId);

    res.json({
      success: true,
      data: pendingReferrals,
      count: pendingReferrals.length
    });
  } catch (error) {
    console.error('Error getting pending referrals:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get pending referrals count for current user
const getPendingReferralsCount = async (req, res) => {
  try {
    const { roleFilters } = req;
    const userId = req.user.id;

    // Only agents and team leaders can have pending referrals
    if (roleFilters.role !== 'agent' && roleFilters.role !== 'team leader') {
      return res.json({
        success: true,
        count: 0
      });
    }

    const count = await PropertyReferral.getPendingReferralsCount(userId);

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error getting pending referrals count:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Confirm a referral
const confirmReferral = async (req, res) => {
  try {
    const { id } = req.params;
    const { roleFilters } = req;
    const userId = req.user.id;

    // Only agents and team leaders can confirm referrals
    if (roleFilters.role !== 'agent' && roleFilters.role !== 'team leader') {
      return res.status(403).json({ 
        message: 'Access denied. Only agents and team leaders can confirm referrals.' 
      });
    }

    const result = await PropertyReferral.confirmReferral(parseInt(id), userId);

    // Create notification for the referrer
    try {
      if (result.referral && result.referral.referred_by_user_id) {
        await Notification.createNotification({
          user_id: result.referral.referred_by_user_id,
          type: 'property_referral_confirmed',
          title: 'Property Referral Confirmed',
          message: `Your referral for property ${result.property.reference_number} has been confirmed`,
          property_id: result.property.id,
          is_read: false
        });
      }
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      data: result,
      message: 'Referral confirmed and property assigned successfully'
    });
  } catch (error) {
    console.error('Error confirming referral:', error);
    res.status(500).json({ 
      message: error.message || 'Server error' 
    });
  }
};

// Reject a referral
const rejectReferral = async (req, res) => {
  try {
    const { id } = req.params;
    const { roleFilters } = req;
    const userId = req.user.id;

    // Only agents and team leaders can reject referrals
    if (roleFilters.role !== 'agent' && roleFilters.role !== 'team leader') {
      return res.status(403).json({ 
        message: 'Access denied. Only agents and team leaders can reject referrals.' 
      });
    }

    const referral = await PropertyReferral.rejectReferral(parseInt(id), userId);

    // Create notification for the referrer
    try {
      if (referral.referred_by_user_id) {
        const property = await Property.getPropertyById(referral.property_id);
        await Notification.createNotification({
          user_id: referral.referred_by_user_id,
          type: 'property_referral_rejected',
          title: 'Property Referral Rejected',
          message: `Your referral for property ${property.reference_number} has been rejected`,
          property_id: referral.property_id,
          is_read: false
        });
      }
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      data: referral,
      message: 'Referral rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting referral:', error);
    res.status(500).json({ 
      message: error.message || 'Server error' 
    });
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
  getImageStats,
  referPropertyToAgent,
  getPendingReferrals,
  getPendingReferralsCount,
  confirmReferral,
  rejectReferral
};
