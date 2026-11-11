const mongoose = require("mongoose");

const stockItemCounterSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },

    sequence: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

stockItemCounterSchema.index(
  { shopId: 1 },
  {
    unique: true,
    name: "unique_stock_item_counter_per_shop",
  }
);

module.exports = mongoose.model(
  "StockItemCounter",
  stockItemCounterSchema
);