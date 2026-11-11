const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    itemName: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
      minlength: 1,
      maxlength: 150,
    },

    itemCode: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },

    barcode: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    searchName: {
      type: String,
      required: true,
      select: false,
    },

    productType: {
      type: String,
      enum: ["FOOD", "RETAIL"],
      required: true,
    },

    foodType: {
      type: String,
      default: null,
      trim: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      default: null,
    },

    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    },

    unitValue: {
      type: Number,
      required: true,
      min: 0.000001,
    },

    hsnCode: {
      type: String,
      trim: true,
      default: "",
      maxlength: 20,
    },

    basicRate: {
      type: Number,
      required: true,
      min: 0,
    },

    gstPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    gstType: {
      type: String,
      enum: ["INCLUSIVE", "EXCLUSIVE", "NONE"],
      default: "EXCLUSIVE",
      required: true,
    },

    salePrice: {
      type: Number,
      required: true,
      min: 0,
    },

    mrp: {
      type: Number,
      required: true,
      min: 0,
    },

    // Stock tracking
    trackStock: {
      type: Boolean,
      default: false,
      required: true,
    },

    quantity: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },

    // Backend defaults; no UI fields required
    allowNegativeStock: {
      type: Boolean,
      default: false,
    },

    reorderLevel: {
      type: Number,
      default: 0,
      min: 0,
    },

    itemImage: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Normalize item name and enforce stock-entry defaults
stockSchema.pre("validate", function () {
  if (typeof this.itemName === "string") {
    this.searchName = this.itemName.trim().toLowerCase();
  }

  if (this.productType === "RETAIL") {
    this.foodType = null;
  }

  if (this.trackStock === false) {
    this.quantity = 0;
    this.allowNegativeStock = false;
    this.reorderLevel = 0;
  }
});

// Unique item code per shop
stockSchema.index(
  { shopId: 1, itemCode: 1 },
  {
    unique: true,
    name: "unique_stock_item_code_per_shop",
  }
);

// Unique non-empty barcode per shop
stockSchema.index(
  { shopId: 1, barcode: 1 },
  {
    unique: true,
    name: "unique_stock_barcode_per_shop",
    partialFilterExpression: {
      barcode: { $gt: "" },
    },
  }
);


/* Normal shop-wise listing, newest first */
stockSchema.index(
  {
    shopId: 1,
    isDeleted: 1,
    isActive: 1,
    _id: -1,
  },
  { name: "stock_shop_listing" }
);

/* Category-wise listing */
stockSchema.index(
  {
    shopId: 1,
    categoryId: 1,
    isDeleted: 1,
    isActive: 1,
    _id: -1,
  },
  { name: "stock_category_listing" }
);

/* Brand-wise listing */
stockSchema.index(
  {
    shopId: 1,
    brandId: 1,
    isDeleted: 1,
    isActive: 1,
    _id: -1,
  },
  { name: "stock_brand_listing" }
);

/* Unit-wise listing */
stockSchema.index(
  {
    shopId: 1,
    unitId: 1,
    isDeleted: 1,
    isActive: 1,
    _id: -1,
  },
  { name: "stock_unit_listing" }
);

/* Product type: FOOD / RETAIL */
stockSchema.index(
  {
    shopId: 1,
    productType: 1,
    isDeleted: 1,
    isActive: 1,
    _id: -1,
  },
  { name: "stock_product_type_listing" }
);

/* Food type: VEG / NON_VEG */
stockSchema.index(
  {
    shopId: 1,
    foodType: 1,
    isDeleted: 1,
    isActive: 1,
    _id: -1,
  },
  { name: "stock_food_type_listing" }
);


module.exports = mongoose.model("Stock", stockSchema);