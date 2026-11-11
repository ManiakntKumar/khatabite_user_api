
const mongoose = require('mongoose');

// ==========================================
// ORDER ITEM SUB SCHEMA
// ==========================================

const orderItemSchema = new mongoose.Schema({
  cartId: { type: String },

  itemId: { type: String, required: true },
  itemName: { type: String, required: true },
  itemCode: { type: String },
  barcode: { type: String },

  productType: {
    type: String,
    default: 'FOOD'
  },

  foodType: { type: String },

  categoryId: { type: String },
  categoryName: { type: String },

  brandId: { type: String },
  brandName: { type: String },

  unitId: { type: String },
  unitName: { type: String },
  unitValue: { type: Number, default: 1 },

  hsnCode: { type: String },

  basicRate: { type: Number, default: 0 },
  gstPercentage: { type: Number, default: 0 },
  gstType: { type: String },

  mrp: { type: Number, default: 0 },
  salePrice: { type: Number, required: true },

  quantity: {
    type: Number,
    required: true,
    min: 1
  },

  totalPrice: {
    type: Number,
    required: true
  },

  profitAmount: {
    type: Number,
    default: 0
  },

  itemImage: { type: String }

}, { _id: false });


// ==========================================
// ORDER MAIN SCHEMA
// ==========================================

const orderSchema = new mongoose.Schema({

  // Shop Information
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },

  orderNumber: {
    type: String,
    required: true
  },

  // Order Information
  orderType: {
    type: String,
    enum: ['dine_in', 'take_away', 'home_delivery'],
    required: true
  },

  orderStatus: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'CANCELLED'],
    default: 'COMPLETED'
  },

  // Customer Information
  customerName: {
    type: String,
    default: ''
  },

  customerMobile: {
    type: String,
    default: ''
  },

  // Cart Items
  items: [orderItemSchema],

  // Billing Summary
  itemTotal: {
    type: Number,
    required: true,
    default: 0
  },

  packingCharge: {
    type: Number,
    default: 0
  },

  deliveryCharge: {
    type: Number,
    default: 0
  },

  subTotal: {
    type: Number,
    required: true,
    default: 0
  },

  // Discount Details
  discountType: {
    type: String,
    enum: ['percentage', 'amount'],
    default: 'percentage'
  },

  discountValue: {
    type: Number,
    default: 0
  },

  discountAmount: {
    type: Number,
    default: 0
  },

  // Final Bill Amount
  netAmount: {
    type: Number,
    required: true,
    default: 0
  },

  // Payment Information
  paymentMode: {
    type: String,
    enum: ['cash', 'online'],
    default: 'cash'
  },

  cashReceived: {
    type: Number,
    default: 0
  },

  remainingOnline: {
    type: Number,
    default: 0
  },

  // Total Profit
  totalProfit: {
    type: Number,
    default: 0
  },
  
  financialYear: {
  type: String,
  required: true
  // Example: "2026-2027"
},

  

}, {
  timestamps: true
});


// ==========================================
// REPORTING INDEXES
// ==========================================

// 1. Shop-wise daily, monthly, quarterly,
// yearly and date-range reports
orderSchema.index(
  { shopId: 1, createdAt: -1 },
  { name: 'idx_shop_createdAt' }
);

// 2. Shop-wise order status reports
orderSchema.index(
  { shopId: 1, orderStatus: 1, createdAt: -1 },
  { name: 'idx_shop_status_createdAt' }
);

// 3. Shop-wise item-wise sales reports
orderSchema.index(
  { shopId: 1, 'items.itemId': 1, createdAt: -1 },
  { name: 'idx_shop_item_createdAt' }
);

// 4. Shop-wise dine-in, takeaway,
// home delivery reports
orderSchema.index(
  { shopId: 1, orderType: 1, createdAt: -1 },
  { name: 'idx_shop_orderType_createdAt' }
);

// 5. Shop-wise unique order number
orderSchema.index(
  { shopId: 1, orderNumber: 1 },
  {
    unique: true,
    name: 'idx_shop_orderNumber'
  }
);


// ==========================================
// EXPORT MODEL
// ==========================================

module.exports = mongoose.model('Order', orderSchema);
