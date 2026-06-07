const Status = require('../models/statusModel');

const applyDefaultPropertyStatus = async (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      req.body = {};
    }

    const hasStatusId =
      req.body.status_id !== undefined &&
      req.body.status_id !== null &&
      req.body.status_id !== '';

    if (!hasStatusId) {
      const defaultStatus = await Status.getDefaultStatusForPropertyCreation();
      if (defaultStatus?.id) {
        req.body.status_id = defaultStatus.id;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyDefaultPropertyStatus,
};
