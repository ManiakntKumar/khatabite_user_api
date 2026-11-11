const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();


//Routes
const shopRoutes = require("./src/routes/shop_details_routes");
const otpRoutes = require("./src/routes/otp.routes");
const categoryRoutes = require("./src/routes/category.routes");
const unitRoutes = require("./src/routes/unit.routes");
const brandRoutes = require("./src/routes/brand.routes");
const stockRoutes = require("./src/routes/stock_routes");
const packingRoutes= require("./src/routes/packing_charge_routes");
const deliveryChargeRoutes = require("./src/routes/delivery_charge_routes");
const ordersRoutes = require('./src/routes/orders_routes');








const app = express();
app.use(express.json());
const PORT = process.env.PORT || 8080;


//Image Configuration
app.use("/upload_folder", express.static("upload_folder"));

app.use("/api/shop", shopRoutes);
app.use("/api/otp/auth", otpRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/unit", unitRoutes);
app.use("/api/brand", brandRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/packing-charge", packingRoutes);
app.use("/api/delivery-charge", deliveryChargeRoutes);
app.use("/api/orders", ordersRoutes);



mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");

    app.listen(PORT, () => {
      console.log(`Khatabite API running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed!");
    console.error(error.message);
  });