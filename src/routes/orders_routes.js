
const express = require('express');
const router = express.Router();

const {
  createOrder,
  getDashboardPayment,
  getDashboardOrderSummary,
  getDashboardSalesTrend,
  getdashboardTopTenTredningItems,
  billWiseDayReport,
  billwiseItemDetails,
  itemWiseSaleReport
} = require('../controllers/orders_controller');

const authMiddleware = require('../middleware/auth.middleware');

// Create New Order
router.post(
  '/create-order',
  authMiddleware,
  createOrder
);

router.get(
  '/dashboard-payment',
  authMiddleware,
  getDashboardPayment
);

router.get(
  '/dashboard-orders_summary',
  authMiddleware,
  getDashboardOrderSummary
);

router.get(
  '/dashboard-sales-trend',
  authMiddleware,
  getDashboardSalesTrend
);

router.get(
  '/dashboard-top-ten-trending-items',
  authMiddleware,
  getdashboardTopTenTredningItems
);

// GET /api/orders/billWiseDayReport?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&page=1&limit=30
// Shop-wise completed bills; Authorization: Bearer <shop-token>.
router.get(
  '/billWiseDayReport',
  authMiddleware,
  billWiseDayReport
);

// GET /api/orders/billwiseItemDetails/:orderId
// orderId is the orderNumber from billWiseDayReport; Bearer token scopes the lookup to its shop.
router.get(
  '/billwiseItemDetails/:orderId',
  authMiddleware,
  billwiseItemDetails
);

// GET /api/orders/itemWiseSaleReport?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&page=1&limit=30
// Shop-wise item quantities and sales; Authorization: Bearer <shop-token>.
router.get(
  '/itemWiseSaleReport',
  authMiddleware,
  itemWiseSaleReport
);

module.exports = router;
