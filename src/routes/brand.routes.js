
const express = require("express");
const router = express.Router();

const {
  createBrand,
  getAllBrands,
  updateBrand,
  deleteBrand,
} = require("../controllers/brand_controller");

const authMiddleware = require("../middleware/auth.middleware");

// All routes require authentication
router.post("/create-brand", authMiddleware, createBrand);

router.get("/find-all-brands", authMiddleware, getAllBrands);

router.put("/update-brand/:id", authMiddleware, updateBrand);

router.delete("/delete-brand/:id", authMiddleware, deleteBrand);

module.exports = router;
