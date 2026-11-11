const express = require("express");
const router = express.Router();

const {
  createCategory,
  getCategories,
  deleteCategory,
  updateCategory
} = require("../controllers/category_controller");

const authMiddleware = require("../middleware/auth.middleware");

const upload = require("../middleware/upload.middleware");

// CREATE CATEGORY
router.post(
  "/create-category",
  authMiddleware,
  upload.single("categoryImage"),
  createCategory
);

// GET CATEGORIES
router.get(
  "/get-categories",
  authMiddleware,
  getCategories
);

// DELETE CATEGORY
router.delete(
  "/delete-category/:categoryId",
  authMiddleware,
  deleteCategory
);


router.put(
  "/update-category/:categoryId",
  authMiddleware,
  upload.single("categoryImage"),
  updateCategory
);

module.exports = router;