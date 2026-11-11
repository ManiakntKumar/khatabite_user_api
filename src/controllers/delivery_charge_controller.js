const DeliveryCharge = require("../models/delivery_charge_model");

// Create delivery charge configuration or update the existing configuration.
exports.saveDeliveryCharge = async (req, res) => {
  try {
    const shopId = String(req.user?.shopId || "").trim();
    const { deliveryCharge, deliveryAmount } = req.body;

    if (!shopId) {
      return res.status(401).json({
        success: false,
        message: "Valid shop authentication is required",
      });
    }

    if (
      typeof deliveryCharge !== "boolean" ||
      deliveryAmount === undefined ||
      deliveryAmount === null ||
      deliveryAmount === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "deliveryCharge and deliveryAmount are required",
      });
    }

    const amount = Number(deliveryAmount);

    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({
        success: false,
        message: "Delivery amount must be a valid non-negative number",
      });
    }

    const deliveryData = await DeliveryCharge.findOneAndUpdate(
      { shopId },
      {
        $set: {
          deliveryCharge,
          deliveryAmount: amount,
        },
        $setOnInsert: {
          shopId,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    const effectiveDeliveryAmount = deliveryData.deliveryCharge
      ? deliveryData.deliveryAmount
      : 0;

    return res.status(200).json({
      success: true,
      message: "Delivery charge saved successfully",
      data: {
        ...deliveryData,
        effectiveDeliveryAmount,
      },
    });
  } catch (error) {
    console.error("Save delivery charge error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save delivery charge",
    });
  }
};

exports.fetchDeliveryCharge = async (req, res) => {
  try {
    const shopId = String(req.user?.shopId || "").trim();

    if (!shopId) {
      return res.status(401).json({
        success: false,
        message: "Valid shop authentication is required",
      });
    }

    const deliveryData = await DeliveryCharge.findOne({ shopId }).lean();

    if (!deliveryData) {
      return res.status(200).json({
        success: true,
        message: "Delivery charge configuration fetched successfully",
        data: {
          deliveryCharge: false,
          deliveryAmount: 0,
          effectiveDeliveryAmount: 0,
        },
      });
    }

    const effectiveDeliveryAmount = deliveryData.deliveryCharge
      ? deliveryData.deliveryAmount
      : 0;

    return res.status(200).json({
      success: true,
      message: "Delivery charge configuration fetched successfully",
      data: {
        ...deliveryData,
        effectiveDeliveryAmount,
      },
    });
  } catch (error) {
    console.error("Fetch delivery charge error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch delivery charge configuration",
    });
  }
};