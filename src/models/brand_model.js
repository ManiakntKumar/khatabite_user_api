
const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    brandName: {
      type: String,
      required: [true, "Brand name is required"],
      trim: true,
      minlength: [2, "Brand name must be at least 2 characters"],
      maxlength: [100, "Brand name cannot exceed 100 characters"],
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    
  }
);

// One brand name per shop, case-insensitive.
// Also supports efficient shop-wise brand name searches.
brandSchema.index(
  { shopId: 1, brandName: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 },
    name: "unique_brand_per_shop",
  }
);

// Efficient active brand listing for a specific shop.
brandSchema.index(
  { shopId: 1, isActive: 1, brandName: 1 },
  { name: "shop_active_brands" }
);

module.exports = mongoose.model("Brand", brandSchema);
