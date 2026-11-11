const express = require("express");
const router = express.Router();

const { createStock,
          fetchStock,
          getActiveStockCategories,
          getStockItemsByCategory
        } = require("../controllers/stock_controller");
        
const authMiddleware = require("../middleware/auth.middleware");

const upload = require("../middleware/upload.middleware");


// CREATE STOCK
router.post(
  "/create-stock",
  authMiddleware,
  upload.single("itemImage"),
  createStock
);

router.get("/fetch-stock", authMiddleware, fetchStock);


router.get(
  "/active-categories",
  authMiddleware,
  getActiveStockCategories
);

router.get(
  "/category-items",
  authMiddleware,
  getStockItemsByCategory
);

module.exports = router;