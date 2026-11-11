const express = require("express");
const router = express.Router();

const {
  createUnit,
  getUnits,
  updateUnit,
  deleteUnit,
} = require("../controllers/unit_controller");

const authMiddleware = require("../middleware/auth.middleware");

// =====================================================
// CREATE UNIT
// POST /api/unit/create-unit
// =====================================================
router.post(
  "/create-unit",
  authMiddleware,
  createUnit
);

// =====================================================
// GET ALL UNITS
// GET /api/unit/get-units
// =====================================================
router.get(
  "/get-units",
  authMiddleware,
  getUnits
);

// =====================================================
// UPDATE UNIT
// PUT /api/unit/update-unit/:unitId
// =====================================================
router.put(
  "/update-unit/:unitId",
  authMiddleware,
  updateUnit
);

// =====================================================
// DELETE UNIT
// DELETE /api/unit/delete-unit/:unitId
// =====================================================
router.delete(
  "/delete-unit/:unitId",
  authMiddleware,
  deleteUnit
);

module.exports = router;