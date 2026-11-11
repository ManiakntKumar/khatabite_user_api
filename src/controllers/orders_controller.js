
const Order = require('../models/orders_model');
const OrderCounter = require('../models/orders_counter_model');
const Shop = require('../models/shop_details_model');

const {
  getFinancialYear
} = require('./order_counter_controller');

const parseReportDate = (dateValue, endOfDay = false) => {
  if (typeof dateValue !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return null;
  }

  const [year, month, day] = dateValue.split('-').map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));

  if (calendarDate.toISOString().slice(0, 10) !== dateValue) {
    return null;
  }

  const nextDay = day + (endOfDay ? 1 : 0);
  return new Date(Date.UTC(year, month - 1, nextDay) - (5.5 * 60 * 60 * 1000));
};


// ==========================================
// CREATE ORDER
// ==========================================

exports.createOrder = async (req, res) => {
  try {

    // 1. GET SHOP FROM AUTH TOKEN
    const userShopId = req.user?.shopId;

    if (!userShopId) {
      return res.status(401).json({
        success: false,
        message: 'Valid shop authentication is required'
      });
    }

    // 2. FIND SHOP MONGODB ID
    let shop = await Shop.findOne({
      shopId: userShopId
    }).select('_id');

    // Support MongoDB ObjectId
    if (!shop && require('mongoose').Types.ObjectId.isValid(userShopId)) {
      shop = await Shop.findById(userShopId).select('_id');
    }

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }


    // 3. GET REQUEST BODY
    const {
      orderType,
      orderStatus,

      customerName,
      customerMobile,

      items,

      itemTotal,
      packingCharge,
      deliveryCharge,
      subTotal,

      discountType,
      discountValue,
      discountAmount,

      netAmount,

      paymentMode,
      cashReceived,
      remainingOnline,

      totalProfit

    } = req.body;


    // 4. VALIDATE ORDER TYPE
    const validOrderTypes = [
      'dine_in',
      'take_away',
      'home_delivery'
    ];

    if (!validOrderTypes.includes(orderType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order type'
      });
    }


    // 5. VALIDATE ITEMS
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one item is required'
      });
    }


    // 6. VALIDATE NET AMOUNT
    if (
      netAmount === undefined ||
      !Number.isFinite(Number(netAmount)) ||
      Number(netAmount) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid net amount is required'
      });
    }


    // 7. GET FINANCIAL YEAR
    // Reusing existing function
    const financialYear = getFinancialYear();


    // 8. GENERATE ORDER NUMBER
    // Reusing existing OrderCounter model function
    const orderNumber = await OrderCounter.generateOrderNumber(
      shop._id,
      financialYear
    );


    // 9. CREATE ORDER DATA
    const orderData = {

      // Shop Information
      shopId: shop._id,

      // Auto Generated Fields
      orderNumber,
      financialYear,

      // Order Information
      orderType,
      orderStatus: orderStatus || 'COMPLETED',

      // Customer Information
      customerName: customerName || '',
      customerMobile: customerMobile || '',

      // Cart Items
      items,

      // Billing Summary
      itemTotal: Number(itemTotal ?? 0),
      packingCharge: Number(packingCharge ?? 0),
      deliveryCharge: Number(deliveryCharge ?? 0),
      subTotal: Number(subTotal ?? 0),

      // Discount Details
      discountType: discountType || 'percentage',
      discountValue: Number(discountValue ?? 0),
      discountAmount: Number(discountAmount ?? 0),

      // Net Bill Amount
      netAmount: Number(netAmount),

      // Payment Information
      paymentMode: paymentMode || 'cash',
      cashReceived: Number(cashReceived ?? 0),
      remainingOnline: Number(remainingOnline ?? 0),

      // Total Profit
      totalProfit: Number(totalProfit ?? 0)
    };


    // 10. SAVE ORDER
    const order = await Order.create(orderData);


    // 11. SUCCESS RESPONSE
    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });


  } catch (error) {

    console.error('CREATE ORDER ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });

  }
};



// ==========================================================================
// Dashborad and Reporting functions can be added here in the future
// ==========================================================================

// ==========================================
// GET DASHBOARD PAYMENT SUMMARY
// ==========================================
exports.getDashboardPayment = async (req, res) => {
  try {
    const userShopId = req.user?.shopId;

    if (!userShopId) {
      return res.status(401).json({
        success: false,
        message: 'Valid shop authentication is required'
      });
    }

    let shop = await Shop.findOne({
      shopId: userShopId
    }).select('_id');

    if (!shop && require('mongoose').Types.ObjectId.isValid(userShopId)) {
      shop = await Shop.findById(userShopId).select('_id');
    }

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const [paymentSummary] = await Order.aggregate([
      {
        $match: {
          shopId: shop._id,
          orderStatus: 'COMPLETED',
          createdAt: {
            $gte: todayStart,
            $lt: tomorrowStart
          }
        }
      },
      {
        $group: {
          _id: null,
          cash: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $gt: [{ $ifNull: ['$cashReceived', 0] }, 0] },
                    { $gt: [{ $ifNull: ['$remainingOnline', 0] }, 0] }
                  ]
                },
                { $ifNull: ['$cashReceived', 0] },
                {
                  $cond: [
                    { $eq: ['$paymentMode', 'cash'] },
                    { $ifNull: ['$netAmount', 0] },
                    0
                  ]
                }
              ]
            }
          },
          online: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $gt: [{ $ifNull: ['$cashReceived', 0] }, 0] },
                    { $gt: [{ $ifNull: ['$remainingOnline', 0] }, 0] }
                  ]
                },
                { $ifNull: ['$remainingOnline', 0] },
                {
                  $cond: [
                    { $eq: ['$paymentMode', 'online'] },
                    { $ifNull: ['$netAmount', 0] },
                    0
                  ]
                }
              ]
            }
          },
          totalSale: { $sum: { $ifNull: ['$netAmount', 0] } }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      message: "Today's payment summary fetched successfully",
      dashboardPaymentData: {
        cash: paymentSummary?.cash || 0,
        online: paymentSummary?.online || 0,
        totalSale: paymentSummary?.totalSale || 0
      }
    });
  } catch (error) {
    console.error('GET DASHBOARD PAYMENT ERROR:', error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch today's payment summary",
      error: error.message
    });
  }
};

// ==========================================
// GET TODAY'S DASHBOARD ORDER SUMMARY
// ==========================================
exports.getDashboardOrderSummary = async (req, res) => {
  try {
    const userShopId = req.user?.shopId;

    if (!userShopId) {
      return res.status(401).json({
        success: false,
        message: 'Valid shop authentication is required'
      });
    }

    let shop = await Shop.findOne({
      shopId: userShopId
    }).select('_id');

    if (!shop && require('mongoose').Types.ObjectId.isValid(userShopId)) {
      shop = await Shop.findById(userShopId).select('_id');
    }

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const [orderSummary] = await Order.aggregate([
      {
        $match: {
          shopId: shop._id,
          orderStatus: 'COMPLETED',
          createdAt: {
            $gte: todayStart,
            $lt: tomorrowStart
          }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          itemsSold: {
            $sum: {
              $reduce: {
                input: { $ifNull: ['$items', []] },
                initialValue: 0,
                in: {
                  $add: ['$$value', { $ifNull: ['$$this.quantity', 0] }]
                }
              }
            }
          },
          dineIn: {
            $sum: {
              $cond: [{ $eq: ['$orderType', 'dine_in'] }, 1, 0]
            }
          },
          delivery: {
            $sum: {
              $cond: [{ $eq: ['$orderType', 'home_delivery'] }, 1, 0]
            }
          },
          takeAway: {
            $sum: {
              $cond: [{ $eq: ['$orderType', 'take_away'] }, 1, 0]
            }
          },
          totalProfit: { $sum: { $ifNull: ['$totalProfit', 0] } }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      message: "Today's order summary fetched successfully",
      dashboardOrderData: {
        totalOrders: orderSummary?.totalOrders || 0,
        itemsSold: orderSummary?.itemsSold || 0,
        dineIn: orderSummary?.dineIn || 0,
        delivery: orderSummary?.delivery || 0,
        takeAway: orderSummary?.takeAway || 0,
        totalProfit: orderSummary?.totalProfit || 0
      }
    });
  } catch (error) {
    console.error('GET DASHBOARD ORDER SUMMARY ERROR:', error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch today's order summary",
      error: error.message
    });
  }
};

// ==========================================
// GET TODAY'S TOP TEN TRENDING ITEMS
// ==========================================
exports.getdashboardTopTenTredningItems = async (req, res) => {
  try {
    const userShopId = req.user?.shopId;

    if (!userShopId) {
      return res.status(401).json({
        success: false,
        message: 'Valid shop authentication is required'
      });
    }

    let shop = await Shop.findOne({
      shopId: userShopId
    }).select('_id');

    if (!shop && require('mongoose').Types.ObjectId.isValid(userShopId)) {
      shop = await Shop.findById(userShopId).select('_id');
    }

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }

    const timezone = 'Asia/Kolkata';
    const dateParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const today = Object.fromEntries(
      dateParts.map(({ type, value }) => [type, value])
    );
    const todayStart = new Date(
      `${today.year}-${today.month}-${today.day}T00:00:00+05:30`
    );
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const topTrendingItems = await Order.aggregate([
      {
        $match: {
          shopId: shop._id,
          orderStatus: 'COMPLETED',
          createdAt: {
            $gte: todayStart,
            $lt: tomorrowStart
          }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.itemId',
          itemName: { $first: '$items.itemName' },
          itemImage: { $first: '$items.itemImage' },
          totalQuantity: { $sum: { $ifNull: ['$items.quantity', 0] } },
          totalValue: { $sum: { $ifNull: ['$items.totalPrice', 0] } }
        }
      },
      { $sort: { totalQuantity: -1, totalValue: -1, _id: 1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          itemId: '$_id',
          itemName: 1,
          totalQuantity: 1,
          totalValue: 1,
          itemImage: { $ifNull: ['$itemImage', ''] }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      message: "Today's top trending items fetched successfully",
      topTrendingItems
    });
  } catch (error) {
    console.error('GET DASHBOARD TOP TEN TRENDING ITEMS ERROR:', error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch today's top trending items",
      error: error.message
    });
  }
};

// ==========================================
// GET TODAY'S SALES TREND
// ==========================================
exports.getDashboardSalesTrend = async (req, res) => {
  try {
    const userShopId = req.user?.shopId;

    if (!userShopId) {
      return res.status(401).json({
        success: false,
        message: 'Valid shop authentication is required'
      });
    }

    let shop = await Shop.findOne({
      shopId: userShopId
    }).select('_id');

    if (!shop && require('mongoose').Types.ObjectId.isValid(userShopId)) {
      shop = await Shop.findById(userShopId).select('_id');
    }

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }

    const timezone = 'Asia/Kolkata';
    const dateParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const today = Object.fromEntries(
      dateParts.map(({ type, value }) => [type, value])
    );
    const todayStart = new Date(
      `${today.year}-${today.month}-${today.day}T00:00:00+05:30`
    );
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const hourlySales = await Order.aggregate([
      {
        $match: {
          shopId: shop._id,
          orderStatus: 'COMPLETED',
          createdAt: {
            $gte: todayStart,
            $lt: tomorrowStart
          }
        }
      },
      {
        $group: {
          _id: {
            $hour: {
              date: '$createdAt',
              timezone
            }
          },
          sales: { $sum: { $ifNull: ['$netAmount', 0] } }
        }
      }
    ]);

    const salesByInterval = Array(6).fill(0);
    for (const hourData of hourlySales) {
      if (hourData._id >= 8 && hourData._id <= 23) {
        const intervalIndex = Math.floor((hourData._id - 8) / 3);
        salesByInterval[intervalIndex] += hourData.sales;
      }
    }

    const intervalLabels = ['8AM', '11AM', '2PM', '5PM', '8PM', '11PM'];
    const salesTrendData = intervalLabels.map((time, index) => ({
      time,
      sales: salesByInterval[index]
    }));

    return res.status(200).json({
      success: true,
      message: "Today's sales trend fetched successfully",
      salesTrendData
    });
  } catch (error) {
    console.error('GET DASHBOARD SALES TREND ERROR:', error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch today's sales trend",
      error: error.message
    });
  }
};

// ==========================================
// GET SHOP-WISE BILL REPORT
// GET /api/orders/billWiseDayReport?startDate=2026-11-01&endDate=2026-11-30&page=1&limit=30
// Requires: Authorization: Bearer <shop-token>
// Dates are inclusive calendar dates in Asia/Kolkata; limit is capped at 30.
// ==========================================
exports.billWiseDayReport = async (req, res) => {
  try {
    const userShopId = req.user?.shopId;

    if (!userShopId) {
      return res.status(401).json({
        success: false,
        message: 'Valid shop authentication is required'
      });
    }

    const { startDate, endDate } = req.query;
    const rangeStart = parseReportDate(startDate);
    const rangeEnd = parseReportDate(endDate, true);

    if (!rangeStart || !rangeEnd) {
      return res.status(400).json({
        success: false,
        message: 'Valid startDate and endDate are required in YYYY-MM-DD format'
      });
    }

    if (rangeStart >= rangeEnd) {
      return res.status(400).json({
        success: false,
        message: 'startDate must be on or before endDate'
      });
    }

    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? 30 : Number(req.query.limit);

    if (!Number.isSafeInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: 'page must be a positive integer'
      });
    }

    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 30) {
      return res.status(400).json({
        success: false,
        message: 'limit must be an integer between 1 and 30'
      });
    }

    if (!Number.isSafeInteger((page - 1) * limit)) {
      return res.status(400).json({
        success: false,
        message: 'Requested page is too large'
      });
    }

    let shop = await Shop.findOne({
      shopId: userShopId
    }).select('_id');

    if (!shop && require('mongoose').Types.ObjectId.isValid(userShopId)) {
      shop = await Shop.findById(userShopId).select('_id');
    }

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }

    const skip = (page - 1) * limit;
    const [report] = await Order.aggregate([
      {
        $match: {
          shopId: shop._id,
          orderStatus: 'COMPLETED',
          createdAt: {
            $gte: rangeStart,
            $lt: rangeEnd
          }
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalBills: { $sum: 1 },
                totalItems: {
                  $sum: { $size: { $ifNull: ['$items', []] } }
                },
                totalSale: { $sum: { $ifNull: ['$netAmount', 0] } },
                totalProfit: { $sum: { $ifNull: ['$totalProfit', 0] } }
              }
            },
            { $project: { _id: 0 } }
          ],
          bills: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                orderId: '$orderNumber',
                orderNumber: 1,
                dateTime: '$createdAt',
                orderType: 1,
                items: { $size: { $ifNull: ['$items', []] } },
                amount: { $ifNull: ['$netAmount', 0] },
                profit: { $ifNull: ['$totalProfit', 0] },
                orderStatus: 1
              }
            }
          ]
        }
      }
    ]).allowDiskUse(true);

    const summary = report?.summary?.[0] || {
      totalBills: 0,
      totalItems: 0,
      totalSale: 0,
      totalProfit: 0
    };

    return res.status(200).json({
      success: true,
      message: 'Bill wise sale summary fetched successfully',
      summary,
      bills: report?.bills || []
    });
  } catch (error) {
    console.error('GET BILL WISE DAY REPORT ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch bill wise sale summary',
      error: error.message
    });
  }
};

// ==========================================
// GET SHOP-WISE BILL DETAILS
// GET /api/orders/billwiseItemDetails/:orderId
// Requires: Authorization: Bearer <shop-token>
// orderId may be the orderNumber returned by billWiseDayReport or MongoDB _id.
// ==========================================
exports.billwiseItemDetails = async (req, res) => {
  try {
    const userShopId = req.user?.shopId;

    if (!userShopId) {
      return res.status(401).json({
        success: false,
        message: 'Valid shop authentication is required'
      });
    }

    const { orderId } = req.params;
    if (typeof orderId !== 'string' || !orderId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid orderId is required'
      });
    }

    let shop = await Shop.findOne({
      shopId: userShopId
    }).select('_id');

    if (!shop && require('mongoose').Types.ObjectId.isValid(userShopId)) {
      shop = await Shop.findById(userShopId).select('_id');
    }

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }

    const orderIdentifiers = [{ orderNumber: orderId.trim() }];
    if (require('mongoose').Types.ObjectId.isValid(orderId)) {
      orderIdentifiers.push({ _id: orderId });
    }

    const order = await Order.findOne({
      shopId: shop._id,
      $or: orderIdentifiers
    })
      .select(
        '_id orderNumber createdAt orderType orderStatus customerName customerMobile items itemTotal packingCharge deliveryCharge subTotal discountType discountValue discountAmount netAmount paymentMode cashReceived remainingOnline totalProfit'
      )
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const items = order.items || [];
    const totalItems = items.reduce(
      (total, item) => total + (Number(item.quantity) || 0),
      0
    );

    return res.status(200).json({
      success: true,
      message: 'Bill details fetched successfully',
      data: {
        orderId: order.orderNumber,
        mongoOrderId: order._id,
        orderNumber: order.orderNumber,
        dateTime: order.createdAt,
        orderType: order.orderType,
        orderStatus: order.orderStatus,
        customerName: order.customerName,
        customerMobile: order.customerMobile,
        items,
        orderSummary: {
          totalItems,
          totalItemLines: items.length,
          itemTotal: order.itemTotal,
          subTotal: order.subTotal,
          packingCharge: order.packingCharge,
          deliveryCharge: order.deliveryCharge,
          discount: {
            discountType: order.discountType,
            discountValue: order.discountValue,
            discountAmount: order.discountAmount
          },
          netAmount: order.netAmount,
          totalProfit: order.totalProfit
        },
        payment: {
          paymentMode: order.paymentMode,
          cashReceived: order.cashReceived,
          remainingOnline: order.remainingOnline
        }
      }
    });
  } catch (error) {
    console.error('GET BILL DETAILS ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch bill details',
      error: error.message
    });
  }
};

// ==========================================
// GET SHOP-WISE ITEM SALES REPORT
// GET /api/orders/itemWiseSaleReport?startDate=2026-11-01&endDate=2026-11-30&page=1&limit=30
// Requires: Authorization: Bearer <shop-token>
// Dates are inclusive calendar dates in Asia/Kolkata; limit is capped at 30.
// ==========================================
exports.itemWiseSaleReport = async (req, res) => {
  try {
    const userShopId = req.user?.shopId;

    if (!userShopId) {
      return res.status(401).json({
        success: false,
        message: 'Valid shop authentication is required'
      });
    }

    const { startDate, endDate } = req.query;
    const rangeStart = parseReportDate(startDate);
    const rangeEnd = parseReportDate(endDate, true);

    if (!rangeStart || !rangeEnd) {
      return res.status(400).json({
        success: false,
        message: 'Valid startDate and endDate are required in YYYY-MM-DD format'
      });
    }

    if (rangeStart >= rangeEnd) {
      return res.status(400).json({
        success: false,
        message: 'startDate must be on or before endDate'
      });
    }

    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? 30 : Number(req.query.limit);

    if (!Number.isSafeInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: 'page must be a positive integer'
      });
    }

    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 30) {
      return res.status(400).json({
        success: false,
        message: 'limit must be an integer between 1 and 30'
      });
    }

    const skip = (page - 1) * limit;
    if (!Number.isSafeInteger(skip)) {
      return res.status(400).json({
        success: false,
        message: 'Requested page is too large'
      });
    }

    let shop = await Shop.findOne({
      shopId: userShopId
    }).select('_id');

    if (!shop && require('mongoose').Types.ObjectId.isValid(userShopId)) {
      shop = await Shop.findById(userShopId).select('_id');
    }

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }

    const [report] = await Order.aggregate([
      {
        $match: {
          shopId: shop._id,
          orderStatus: 'COMPLETED',
          createdAt: {
            $gte: rangeStart,
            $lt: rangeEnd
          }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.itemId',
          itemName: { $first: '$items.itemName' },
          itemImage: { $first: '$items.itemImage' },
          qty: { $sum: { $ifNull: ['$items.quantity', 0] } },
          saleAmount: { $sum: { $ifNull: ['$items.totalPrice', 0] } }
        }
      },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalProduct: { $sum: 1 },
                totalSoldItem: { $sum: '$qty' },
                totalSale: { $sum: '$saleAmount' }
              }
            },
            { $project: { _id: 0 } }
          ],
          items: [
            { $sort: { saleAmount: -1, qty: -1, _id: 1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                itemId: '$_id',
                itemName: 1,
                itemImage: { $ifNull: ['$itemImage', ''] },
                qty: 1,
                saleAmount: 1,
                rate: {
                  $cond: [
                    { $gt: ['$qty', 0] },
                    { $divide: ['$saleAmount', '$qty'] },
                    0
                  ]
                }
              }
            }
          ]
        }
      }
    ]).allowDiskUse(true);

    const summary = report?.summary?.[0] || {
      totalProduct: 0,
      totalSoldItem: 0,
      totalSale: 0
    };
    const totalPages = Math.ceil(summary.totalProduct / limit);

    return res.status(200).json({
      success: true,
      message: 'Item wise sale report fetched successfully',
      summary,
      pagination: {
        page,
        limit,
        totalRecords: summary.totalProduct,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1 && totalPages > 0
      },
      items: report?.items || []
    });
  } catch (error) {
    console.error('GET ITEM WISE SALE REPORT ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch item wise sale report',
      error: error.message
    });
  }
};
