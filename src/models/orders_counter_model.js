
const mongoose = require('mongoose');

const orderCounterSchema = new mongoose.Schema({

  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },

  financialYear: {
    type: String,
    required: true
  },

  lastOrderNumber: {
    type: Number,
    default: 0
  }

}, {
  timestamps: true
});

// One counter per shop per financial year
orderCounterSchema.index(
  { shopId: 1, financialYear: 1 },
  {
    unique: true,
    name: 'unique_shop_financial_year'
  }
);

// Generate next order number
orderCounterSchema.statics.generateOrderNumber = async function (
  shopId,
  financialYear
) {
  const counter = await this.findOneAndUpdate(
    {
      shopId,
      financialYear
    },
    {
      $inc: { lastOrderNumber: 1 }
    },
    {
      returnDocument: 'after',
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  const year = financialYear.split('-')[0];

  return `ORD-${year}-${counter.lastOrderNumber}`;
};

module.exports = mongoose.model(
  'OrderCounter',
  orderCounterSchema
);
