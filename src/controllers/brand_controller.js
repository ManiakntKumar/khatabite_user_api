
const mongoose = require("mongoose");
const Brand = require("../models/brand_model");
const Shop = require("../models/shop_details_model");

// CREATE BRAND

exports.createBrand = async (req, res) => {
  try {
    const { brandName } = req.body || {};
    const userShopId = req.user?.shopId;

    if (!userShopId) {
      return res.status(401).json({
        success: false,
        code: "SHOP_ID_MISSING",
        message: "Shop ID not found for logged-in user",
      });
    }

    if (typeof brandName !== "string" || !brandName.trim()) {
      return res.status(400).json({
        success: false,
        code: "BRAND_NAME_REQUIRED",
        message: "Please enter a valid brand name",
      });
    }

    const cleanBrandName = brandName.trim();

    // Resolve custom shopId to MongoDB _id
    const shop = await Shop.findOne({
      shopId: userShopId,
    })
      .select("_id")
      .lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        code: "SHOP_NOT_FOUND",
        message: "Shop not found",
      });
    }

    const shopId = shop._id;

    // Case-insensitive duplicate check within the same shop
    const escapedBrandName = cleanBrandName.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const existingBrand = await Brand.findOne({
      shopId,
      brandName: {
        $regex: `^${escapedBrandName}$`,
        $options: "i",
      },
    }).lean();

    if (existingBrand) {
      return res.status(409).json({
        success: false,
        code: "BRAND_ALREADY_EXISTS",
        message: `Brand "${cleanBrandName}" already exists in your shop`,
      });
    }

    const brand = await Brand.create({
      shopId,
      brandName: cleanBrandName,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      code: "BRAND_CREATED",
      message: "Brand created successfully",
      data: brand,
    });
  } catch (error) {
    console.error("CREATE BRAND ERROR:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        code: "BRAND_ALREADY_EXISTS",
        message: "This brand already exists in your shop",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        code: "BRAND_VALIDATION_ERROR",
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      code: "BRAND_CREATE_FAILED",
      message: "Failed to create brand. Please try again.",
    });
  }
};


// FETCH ALL BRANDS (PAGINATION + SEARCH)

exports.getAllBrands = async (req, res) => {
  try {
    const userShopId = req.user?.shopId;

    if (!userShopId) {
      return res.status(400).json({
        success: false,
        message: "Shop ID not found for logged-in user",
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
        message: "Shop not found",
      });
    }

    const shopId = shop._id;

    const page = Math.max(
      1,
      parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 30)
    );

    const skip = (page - 1) * limit;

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim().slice(0, 100)
        : "";

    const filter = {
      shopId,
      isActive: true,
    };

    if (search) {
      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.brandName = {
        $regex: escapedSearch,
        $options: "i",
      };
    }

    const [brands, total] = await Promise.all([
      Brand.find(filter)
        .select("_id shopId brandName isActive createdAt updatedAt")
        .sort({ brandName: 1, _id: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Brand.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Brands fetched successfully",
      brandsData: brands,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + brands.length < total,
      },
    });
  } catch (error) {
    console.error("Fetch Brands Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch brands",
    });
  }
};


// UPDATE BRAND BY MONGODB _id

exports.updateBrand = async (req, res) => {
  try {
    const userShopId = req.user?.shopId;
    const { id } = req.params;
    const { brandName, isActive } = req.body || {};

    // Validate authenticated shop
    if (!userShopId) {
      return res.status(400).json({
        success: false,
        message: "Shop ID not found for logged-in user",
      });
    }

    // Validate MongoDB Brand _id
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid brand ID",
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
        message: "Shop not found",
      });
    }

    // Accept only the two supported fields
    const updateData = {};

    if (brandName !== undefined) {
      if (
        typeof brandName !== "string" ||
        !brandName.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Valid brand name is required",
        });
      }

      updateData.brandName = brandName.trim();
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isActive must be true or false",
        });
      }

      updateData.isActive = isActive;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide brandName or isActive to update",
      });
    }

    const brand = await Brand.findOneAndUpdate(
      {
        _id: id,
        shopId: shop._id,
      },
      {
        $set: updateData,
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    ).lean();

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found in this shop",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Brand updated successfully",
      data: brand,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This brand already exists in your shop",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Update Brand Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update brand",
    });
  }
};



// DELETE BRAND BY MONGODB _id (SOFT DELETE)

exports.deleteBrand = async (req, res) => {
  try {
    const userShopId = req.user?.shopId;
    const { id } = req.params;

    // Validate authenticated shop
    if (!userShopId) {
      return res.status(400).json({
        success: false,
        message: "Shop ID not found for logged-in user",
      });
    }

    // Validate MongoDB Brand _id
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid brand ID",
      });
    }

    // Resolve custom shopId to actual MongoDB _id
    const shop = await Shop.findOne({
      shopId: userShopId,
    })
      .select("_id")
      .lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    const shopId = shop._id;

    // Soft delete only within the authenticated shop
    const brand = await Brand.findOneAndUpdate(
      {
        _id: id,
        shopId,
        isActive: true,
      },
      {
        $set: {
          isActive: false,
        },
      },
      {
       returnDocument: "after",
      runValidators: true,
      }
    )
      .select("_id brandName isActive")
      .lean();

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found or already deleted",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Brand deleted successfully",
      data: brand,
    });
  } catch (error) {
    console.error("Delete Brand Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete brand",
    });
  }
};
