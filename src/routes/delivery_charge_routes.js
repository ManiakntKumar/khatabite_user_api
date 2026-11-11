const express = require("express");
const router = express.Router();

const {
  saveDeliveryCharge,
  fetchDeliveryCharge,
} = require("../controllers/delivery_charge_controller");

const authMiddleware = require("../middleware/auth.middleware");

// Create or update delivery charge configuration.
router.put("/create", authMiddleware, saveDeliveryCharge);

// Fetch delivery charge configuration.
router.get("/fetch-delivery-charge", authMiddleware, fetchDeliveryCharge);

module.exports = router;