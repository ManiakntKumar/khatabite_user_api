const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    categoryName: {
      type: String,
      required: true,
      trim: true,
    },

    categoryImage: {
      type: String,
      default: "",
      trim: true,
    },
    

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index(
  { shopId: 1, categoryName: 1 },
  { unique: true }
);

categorySchema.index({
  shopId: 1,
  isActive: 1,
});

module.exports = mongoose.model("Category", categorySchema);