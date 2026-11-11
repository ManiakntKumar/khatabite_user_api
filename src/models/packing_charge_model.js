
const mongoose = require("mongoose");

const packingChargeSchema = new mongoose.Schema(
  {
    shopId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    // Packing charge ON / OFF
    packingCharge: {
      type: Boolean,
      default: false,
      required: true,
    },

    // Amount saved even when packing charge is OFF
    packingAmount: {
      type: Number,
      default: 0,
      required: true,
      min: [0, "Packing amount cannot be negative"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "PackingCharge",
  packingChargeSchema
);
