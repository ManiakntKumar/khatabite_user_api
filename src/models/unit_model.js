const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    unitName: {
      type: String,
      required: true,
      trim: true,
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

// Same unit name cannot be duplicated for the same shop
unitSchema.index(
  { shopId: 1, unitName: 1 },
  { unique: true }
);

module.exports = mongoose.model("Unit", unitSchema);