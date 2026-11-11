const express = require("express");
const router = express.Router();

const shopController = require("../controllers/shop_details_controller");
const authMiddleware = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

// Create Shop
router.post("/create-shop", shopController.createShop);

// Fetch the authenticated shop's details.
router.get(
  "/fetch_shop_detail",
  authMiddleware,
  shopController.fetch_shop_detail
);

// Update editable fields for the authenticated shop.
router.put(
  "/update-shop",
  authMiddleware,
  shopController.update_shop_detail
);



router.put(
  "/update-shop-detail",
  authMiddleware,
  upload.single("logo"),
 shopController.update_shop_detail
);


module.exports = router;