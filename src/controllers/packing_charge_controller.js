
const PackingCharge = require("../models/packing_charge_model");

// Create packing charge configuration or update existing configuration.
exports.savePackingCharge = async (req, res) => {
  try {
    const shopId = String(req.user?.shopId || "").trim();
    const { packingCharge, packingAmount } = req.body;

    // Validate authenticated shop.
    if (!shopId) {
      return res.status(401).json({
        success: false,
        message: "Valid shop authentication is required",
      });
    }

    // Validate required fields.
    if (
      typeof packingCharge !== "boolean" ||
      packingAmount === undefined ||
      packingAmount === null ||
      packingAmount === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "packingCharge and packingAmount are required",
      });
    }

    const amount = Number(packingAmount);

    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({
        success: false,
        message: "Packing amount must be a valid non-negative number",
      });
    }

    // Create the first record or update the existing shop record.
    const packingData = await PackingCharge.findOneAndUpdate(
  { shopId },
  {
    $set: {
      packingCharge,
      packingAmount: amount,
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
    // Only apply the amount when packing charge is enabled.
    const effectivePackingAmount = packingData.packingCharge
      ? packingData.packingAmount
      : 0;

    return res.status(200).json({
      success: true,
      message: "Packing charge saved successfully",
      data: {
        ...packingData,
        effectivePackingAmount,
      },
    });
  } catch (error) {
    console.error("Save packing charge error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save packing charge",
    });
  }
};


exports.fetchPackingCharge = async (req, res) => {
  try {
    const shopId = String(req.user?.shopId || "").trim();
    // Validate authenticated shop.
    if (!shopId) {
      return res.status(401).json({
        success: false,
        message: "Valid shop authentication is required",
      });
    }
    // Fetch the existing packing charge record.
    const packingData = await PackingCharge.findOne({
      shopId,
    }).lean();
    // Return defaults if configuration has not been created yet.
    if (!packingData) {
      return res.status(200).json({
        success: true,
        message: "Packing charge configuration fetched successfully",
        data: {
          packingCharge: false,
          packingAmount: 0,
          effectivePackingAmount: 0,
        },
      });
    }

    // Apply amount only when packing charge is enabled.
    const effectivePackingAmount = packingData.packingCharge
      ? packingData.packingAmount
      : 0;

    return res.status(200).json({
      success: true,
      message: "Packing charge configuration fetched successfully",
      data: {
        ...packingData,
        effectivePackingAmount,
      },
    });
  } catch (error) {
    console.error("Fetch packing charge error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch packing charge configuration",
    });
  }
};