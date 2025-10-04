const express = require('express');
const contextController = require('../controllers/context.controller');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { contextValidation } = require('../validations');

const router = express.Router();

router.route('/:conversationId')
  .get(auth('getContext'), validate(contextValidation.getContext), contextController.getContext)
  .post(auth('updateContext'), validate(contextValidation.updateContext), contextController.updateContext);

module.exports = router;