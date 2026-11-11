const express = require('express');
const router = express.Router();

const {
  generateOrderNumber
} = require('../controllers/order_counter_controller');


const authMiddleware = require("../middleware/auth.middleware");

// Generate Order Number
router.post(
  '/generate-order-number',
  authMiddleware,
  generateOrderNumber
);

module.exports = router;
