const mongoose = require("mongoose");

const deliveryChargeSchema = new mongoose.Schema(
  {
    shopId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    // Delivery charge ON / OFF
    deliveryCharge: {
      type: Boolean,
      default: false,
      required: true,
    },

    // Amount saved even when delivery charge is OFF
    deliveryAmount: {
      type: Number,
      default: 0,
      required: true,
      min: [0, "Delivery amount cannot be negative"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("DeliveryCharge", deliveryChargeSchema);