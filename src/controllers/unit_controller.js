const mongoose = require("mongoose");
const Unit = require("../models/unit_model");
const Shop = require("../models/shop_details_model");


// =====================================================
// CREATE UNIT
// =====================================================
exports.createUnit = async (req, res) => {
  try {
    const { unitName } = req.body || {};

    // Custom shopId from authenticated user
    const userShopId = req.user?.shopId;

    if (!userShopId) {
      return res.status(400).json({
        success: false,
        message: "Shop ID not found for logged-in user",
      });
    }

    // Find actual Shop document
    const shop = await Shop.findOne({
      shopId: userShopId,
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    // MongoDB Shop _id
    const shopId = shop._id;

    if (!unitName || typeof unitName !== "string" || !unitName.trim()) {
      return res.status(400).json({
        success: false,
        message: "unitName is required",
      });
    }

    const cleanUnitName = unitName.trim();

    // Check duplicate unit inside same shop
    const existingUnit = await Unit.findOne({
      shopId,
      unitName: cleanUnitName,
    });

    if (existingUnit) {
      return res.status(409).json({
        success: false,
        message: "Unit already exists for this shop",
      });
    }

    // Create unit
    const unit = await Unit.create({
      shopId,
      unitName: cleanUnitName,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Unit created successfully",
      data: unit,
    });
  } catch (error) {
    console.error("CREATE UNIT ERROR:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Unit already exists for this shop",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create unit",
      error: error.message,
    });
  }
};

// =====================================================
// GET ALL UNITS
// =====================================================
exports.getUnits = async (req, res) => {
  try {
    // Custom shopId from authenticated user
    const userShopId = req.user?.shopId;

    if (!userShopId) {
      return res.status(400).json({
        success: false,
        message: "Shop ID not found for logged-in user",
      });
    }

    // Find actual Shop document
    const shop = await Shop.findOne({
      shopId: userShopId,
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    // MongoDB Shop _id
    const shopId = shop._id;

    // Get units for this shop
    const units = await Unit.find({
      shopId,
    }).sort({
      unitName: 1,
    });

    return res.status(200).json({
      success: true,
      message: "Units fetched successfully",
      count: units.length,
      unitData: units,
    });
  } catch (error) {
    console.error("GET UNITS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch units",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE UNIT
// =====================================================

exports.updateUnit = async (req, res) => {
  try {
    const userShopId = req.user?.shopId;
    const { unitId } = req.params;
    const { unitName, isActive } = req.body || {};

    // Validate authenticated shop
    if (!userShopId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Shop not found.",
      });
    }

    // Validate MongoDB Unit _id
    if (!mongoose.isValidObjectId(unitId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid unit ID.",
      });
    }

    // Resolve custom shopId to MongoDB _id
    const shop = await Shop.findOne({
      shopId: userShopId,
    })
      .select("_id")
      .lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    const shopId = shop._id;

    // Validate fields
    if (unitName === undefined && isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: "Provide unitName or isActive to update.",
      });
    }

    if (unitName !== undefined) {
      if (
        typeof unitName !== "string" ||
        !unitName.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Unit name cannot be empty.",
        });
      }
    }

    if (
      isActive !== undefined &&
      typeof isActive !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false.",
      });
    }

    // Find unit belonging to this shop
    const unit = await Unit.findOne({
      _id: unitId,
      shopId,
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found in this shop.",
      });
    }

    // Update unit name
    if (unitName !== undefined) {
      const cleanUnitName = unitName.trim();

      const existingUnit = await Unit.findOne({
        shopId,
        unitName: cleanUnitName,
        _id: { $ne: unitId },
      }).lean();

      if (existingUnit) {
        return res.status(409).json({
          success: false,
          message: "This unit already exists in this shop.",
        });
      }

      unit.unitName = cleanUnitName;
    }

    // Update active status
    if (isActive !== undefined) {
      unit.isActive = isActive;
    }

    await unit.save();

    return res.status(200).json({
      success: true,
      message: "Unit updated successfully.",
      data: unit,
    });
  } catch (error) {
    console.error("Update Unit Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This unit already exists in this shop.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update unit.",
    });
  }
};


// =====================================================
// DELETE UNIT
// =====================================================
exports.deleteUnit = async (req, res) => {
  try {
    const userShopId = req.user?.shopId;
    const { unitId } = req.params;

    // Custom shopId from authenticated user
    if (!userShopId) {
      return res.status(400).json({
        success: false,
        message: "Shop ID not found for logged-in user",
      });
    }

    if (!unitId) {
      return res.status(400).json({
        success: false,
        message: "Unit ID is required",
      });
    }

    // Find actual Shop document
    const shop = await Shop.findOne({
      shopId: userShopId,
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    // MongoDB Shop _id
    const shopId = shop._id;

    // Delete only unit belonging to this shop
    const unit = await Unit.findOneAndDelete({
      _id: unitId,
      shopId,
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found for this shop",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Unit deleted successfully",
      data: unit,
    });
  } catch (error) {
    console.error("DELETE UNIT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete unit",
      error: error.message,
    });
  }
};