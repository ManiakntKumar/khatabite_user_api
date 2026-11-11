
const express = require("express");
const router = express.Router();

const {
  savePackingCharge,
  fetchPackingCharge
} = require("../controllers/packing_charge_controller");
const authMiddleware = require("../middleware/auth.middleware");

// Create or update packing charge configuration.
router.put(
  "/create",
  authMiddleware,
  savePackingCharge
);

// Fetch packing charge.
router.get(
  "/fetch-packing-charge",
  authMiddleware,
  fetchPackingCharge
);

module.exports = router;
