
const mongoose = require('mongoose');

const OrderCounter = require('../models/orders_counter_model');
const Shop = require('../models/shop_details_model');

// ======================================
// GET CURRENT FINANCIAL YEAR
// ======================================

const getFinancialYear = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric'
  }).formatToParts(new Date());

  const year = Number(parts.find(p => p.type === 'year').value);
  const month = Number(parts.find(p => p.type === 'month').value);

  const startYear = month >= 4 ? year : year - 1;

  return `${startYear}-${startYear + 1}`;
};


// ======================================
// GENERATE ORDER NUMBER
// ======================================

exports.generateOrderNumber = async (req, res) => {
  try {
    const userShopId = req.user?.shopId;

    if (!userShopId) {
      return res.status(401).json({
        success: false,
        message: 'Valid shop authentication is required'
      });
    }

    // Find actual MongoDB Shop _id
    let shop = await Shop.findOne({
      shopId: userShopId
    }).select('_id');

    // Support MongoDB ObjectId if token contains _id
    if (!shop && mongoose.Types.ObjectId.isValid(userShopId)) {
      shop = await Shop.findById(userShopId).select('_id');
    }

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }

    // Automatically calculate Indian financial year
    const financialYear = getFinancialYear();

    // Generate next order number
    const orderNumber = await OrderCounter.generateOrderNumber(
      shop._id,
      financialYear
    );

    return res.status(200).json({
      success: true,
      message: 'Order number generated successfully',
      data: {
        orderNumber,
        financialYear
      }
    });

  } catch (error) {
    console.error('GENERATE ORDER NUMBER ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to generate order number',
      error: error.message
    });
  }
};


exports.getFinancialYear = getFinancialYear;