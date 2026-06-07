const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { authenticateToken, filterDataByRole } = require('../middlewares/permissions');

router.use(authenticateToken);
router.use(filterDataByRole);

router.get('/', locationController.getAllLocations);
router.get('/admin', locationController.getAllLocationsForAdmin);
router.get('/search', locationController.searchLocations);
router.get('/:id', locationController.getLocationById);
router.post('/', locationController.createLocation);
router.put('/:id', locationController.updateLocation);
router.delete('/:id', locationController.deleteLocation);

module.exports = router;
