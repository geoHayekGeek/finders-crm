const Location = require('../models/locationModel');

class LocationController {
  static async getAllLocations(req, res) {
    try {
      const locations = await Location.getAllLocations();
      res.json({
        success: true,
        data: locations
      });
    } catch (error) {
      console.error('Error getting locations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve locations',
        error: error.message
      });
    }
  }

  static async getAllLocationsForAdmin(req, res) {
    try {
      const locations = await Location.getAllLocationsForAdmin();
      res.json({
        success: true,
        data: locations
      });
    } catch (error) {
      console.error('Error getting locations for admin:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve locations for admin',
        error: error.message
      });
    }
  }

  static async searchLocations(req, res) {
    try {
      const { q = '' } = req.query;
      const locations = await Location.searchLocations(String(q));
      res.json({
        success: true,
        data: locations
      });
    } catch (error) {
      console.error('Error searching locations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search locations',
        error: error.message
      });
    }
  }

  static async getLocationById(req, res) {
    try {
      const { id } = req.params;
      const location = await Location.getLocationById(id);

      if (!location) {
        return res.status(404).json({
          success: false,
          message: 'Location not found'
        });
      }

      res.json({
        success: true,
        data: location
      });
    } catch (error) {
      console.error('Error getting location:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve location',
        error: error.message
      });
    }
  }

  static async createLocation(req, res) {
    try {
      const { name, description, is_active } = req.body;

      if (!name || !String(name).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Name is required'
        });
      }

      const location = await Location.createLocation({
        name,
        description,
        is_active: is_active !== undefined ? is_active : true
      });

      res.status(201).json({
        success: true,
        message: 'Location created successfully',
        data: location
      });
    } catch (error) {
      console.error('Error creating location:', error);

      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          message: 'Location with this name already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create location',
        error: error.message
      });
    }
  }

  static async updateLocation(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      delete updates.id;
      delete updates.created_at;
      delete updates.updated_at;

      const location = await Location.updateLocation(id, updates);

      if (!location) {
        return res.status(404).json({
          success: false,
          message: 'Location not found'
        });
      }

      res.json({
        success: true,
        message: 'Location updated successfully',
        data: location
      });
    } catch (error) {
      console.error('Error updating location:', error);

      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          message: 'Location with this name already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update location',
        error: error.message
      });
    }
  }

  static async deleteLocation(req, res) {
    try {
      const { id } = req.params;
      const location = await Location.deleteLocation(id);

      if (!location) {
        return res.status(404).json({
          success: false,
          message: 'Location not found'
        });
      }

      res.json({
        success: true,
        message: 'Location deleted successfully',
        data: location
      });
    } catch (error) {
      console.error('Error deleting location:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete location',
        error: error.message
      });
    }
  }
}

module.exports = LocationController;
