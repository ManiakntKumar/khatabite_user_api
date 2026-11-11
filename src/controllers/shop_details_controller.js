const Shop = require("../models/shop_details_model");
const generateShopId = require("../utils/shopIdGenerator");
const { generateToken } = require("../utils/token.util");
const imageUpload = require("../utils/imageUpload");




exports.createShop = async (req, res) => {
  try {
    const {
      shopName,
      businessCategory,
      shopNumber,
      shopAddress,
      area,
      city,
      state,
      pincode,
      location,
      ownerName,
      ownermobileNumber,
      emailAddress,
      gstRegistered,
      gstNo,
      fssaiLicenceNo,
      deviceType,
    } = req.body;

    if (
      typeof shopName !== "string" ||
      !shopName.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Shop name is required",
      });
    }

    if (
      typeof businessCategory !== "string" ||
      !businessCategory.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Business category is required",
      });
    }
    const cleanShopName = shopName.trim();
    const cleanBusinessCategory =
      businessCategory.trim();

    const cleanShopNumber =
      typeof shopNumber === "string"
        ? shopNumber.trim()
        : "";
    const cleanShopAddress =
      typeof shopAddress === "string"
        ? shopAddress.trim()
        : "";

    const cleanArea =
      typeof area === "string"
        ? area.trim()
        : "";

    const cleanCity =
      typeof city === "string"
        ? city.trim()
        : "";

    const cleanState =
      typeof state === "string"
        ? state.trim()
        : "";

    const cleanPincode =
      typeof pincode === "string"
        ? pincode.trim()
        : "";

    const cleanOwnerName =
      typeof ownerName === "string"
        ? ownerName.trim()
        : "";

    const cleanOwnerMobileNumber =
      typeof ownermobileNumber === "string"
        ? ownermobileNumber.trim()
        : "";

    const cleanEmailAddress =
      typeof emailAddress === "string"
        ? emailAddress.trim().toLowerCase()
        : "";

    const cleanGstRegistered =
      typeof gstRegistered === "string"
        ? gstRegistered.trim()
        : "";

    const cleanGstNo =
      typeof gstNo === "string"
        ? gstNo.trim().toUpperCase()
        : "";

    const cleanFssaiLicenceNo =
      typeof fssaiLicenceNo === "string"
        ? fssaiLicenceNo.trim()
        : "";

    const cleanDeviceType =
      typeof deviceType === "string"
        ? deviceType.trim().toUpperCase()
        : "";

    if (cleanShopNumber) {
      const existingShop = await Shop.findOne({
        shopNumber: cleanShopNumber,
      });

      if (existingShop) {
        return res.status(409).json({
          success: false,
          message: "This shop number is already registered",
        });
      }
    }

    const cleanLocation = {
      address:
        typeof location?.address === "string"
          ? location.address.trim()
          : "",

      area:
        typeof location?.area === "string"
          ? location.area.trim()
          : "",

      city:
        typeof location?.city === "string"
          ? location.city.trim()
          : "",

      state:
        typeof location?.state === "string"
          ? location.state.trim()
          : "",

      pincode:
        typeof location?.pincode === "string"
          ? location.pincode.trim()
          : "",

      source:
        typeof location?.source === "string"
          ? location.source.trim().toUpperCase()
          : "MANUAL",
    };
    const latitude = Number(location?.latitude);
    const longitude = Number(location?.longitude);

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    ) {
      cleanLocation.geo = {
        type: "Point",
        coordinates: [
          longitude,
          latitude,
        ],
      };
    }
    const shopId = await generateShopId();
    const shop = await Shop.create({
      shopId,
      shopName: cleanShopName,
      businessCategory: cleanBusinessCategory,
      shopNumber: cleanShopNumber,
      shopAddress: cleanShopAddress,
      area: cleanArea,
      city: cleanCity,
      state: cleanState,
      pincode: cleanPincode,
      ownerName: cleanOwnerName,
      ownermobileNumber: cleanOwnerMobileNumber,
      emailAddress: cleanEmailAddress,
      gstRegistered: cleanGstRegistered,
      gstNo: cleanGstNo,
      fssaiLicenceNo: cleanFssaiLicenceNo,
      deviceType: cleanDeviceType || null,
      location: cleanLocation,
      sessionVersion: 1,
    });

    const token = generateToken(
      shop.shopId,
      shop.sessionVersion
    );
    return res.status(201).json({
      success: true,
      message: "Shop created successfully",
      token,
      data: {
        shopId: shop.shopId,
        shopName: shop.shopName,
        businessCategory: shop.businessCategory,
        shopNumber: shop.shopNumber,
        shopAddress: shop.shopAddress,
        area: shop.area,
        city: shop.city,
        state: shop.state,
        pincode: shop.pincode,
        location: shop.location,
        ownerName: shop.ownerName,
        ownermobileNumber: shop.ownermobileNumber,
        emailAddress: shop.emailAddress,
        gstRegistered: shop.gstRegistered,
        gstNo: shop.gstNo,
        fssaiLicenceNo: shop.fssaiLicenceNo,
        verificationStatus: shop.verificationStatus,
        isVerified: shop.isVerified,
        isActive: shop.isActive,

        deviceType: shop.deviceType,
        sessionVersion:
          shop.sessionVersion,
      },
    });
  } catch (error) {
    console.error(
      "Create shop error:",
      error
    );

    // =========================
    // DUPLICATE KEY
    // =========================

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Shop number or shop ID already exists",
      });
    }

    // =========================
    // SERVER ERROR
    // =========================

    return res.status(500).json({
      success: false,
      message: "Failed to create shop",
      error: error.message,
    });
  }
};


exports.fetch_shop_detail = async (req, res) => {
  try {
    const shopId = String(req.user?.shopId || "").trim();

    if (!shopId) {
      return res.status(401).json({
        success: false,
        message: "Valid shop authentication is required",
      });
    }

    const shop = await Shop.findOne({ shopId }).lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop details not found",
      });
    }

    const {
      _id,
      shopId: fetchedShopId,
      shopName,
      businessCategory,
      shopNumber,
      shopAddress,
      area,
      city,
      state,
      pincode,
      location,
      ownerName,
      ownermobileNumber,
      emailAddress,
      gstRegistered,
      gstNo,
      fssaiLicenceNo,
      logo = "",
      shopSlogan = "",
      verificationStatus,
      isVerified,
      verifiedBy,
      verifiedAt,
      rejectionReason,
      isActive,
      deviceType,
      deviceId,
      deviceName,
      createdAt,
      updatedAt,
    } = shop;

    return res.status(200).json({
      success: true,
      message: "Shop details fetched successfully",
      shopData: {
        _id,
        shopId: fetchedShopId,
        shopName,
        businessCategory,
        shopNumber,
        shopAddress,
        area,
        city,
        state,
        pincode,
        location,
        ownerName,
        ownermobileNumber,
        emailAddress,
        gstRegistered,
        gstNo,
        fssaiLicenceNo,
        logo,
        shopSlogan,
        verificationStatus,
        isVerified,
        verifiedBy,
        verifiedAt,
        rejectionReason,
        isActive,
        deviceType,
        deviceId,
        deviceName,
        createdAt,
        updatedAt,
      },
    });
  } catch (error) {
    console.error("Fetch shop details error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch shop details",
    });
  }
};



exports.update_shop_detail = async (req, res) => {
  let newLogo = "";

  console.log("REQ FILE:", req.file);

  try {
    const shopId = String(req.user?.shopId || "").trim();

    if (!shopId) {
      return res.status(401).json({
        success: false,
        message: "Valid shop authentication is required",
      });
    }

    const allowedFields = [
      "shopName",
      "businessCategory",
      "shopNumber",
      "shopAddress",
      "area",
      "city",
      "state",
      "pincode",
      "ownerName",
      "ownermobileNumber",
      "emailAddress",
      "gstRegistered",
      "gstNo",
      "fssaiLicenceNo",
      "shopSlogan",
    ];

    const updateData = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) {
        const value = req.body[field];

        if (typeof value !== "string") {
          return res.status(400).json({
            success: false,
            message: `${field} must be a string`,
          });
        }

        updateData[field] = value.trim();
      }
    }

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop details not found",
      });
    }

    const oldLogo = shop.logo || "";

    // Upload new logo only when a file is provided.
    if (req.file) {
      newLogo = await imageUpload.saveImage(req.file, "logo");
      updateData.logo = newLogo;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields or logo provided for update",
      });
    }

    // Update only explicitly allowed fields.
    Object.assign(shop, updateData);
    await shop.save();

    // Delete old logo only after the new logo is saved successfully.
    if (req.file && oldLogo && oldLogo !== newLogo) {
      try {
        await imageUpload.deleteImage(oldLogo, "logo");
      } catch (imageError) {
        console.error("OLD SHOP LOGO DELETE ERROR:", imageError);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Shop details updated successfully",
      shopData: shop,
    });
  } catch (error) {
    console.error("UPDATE SHOP DETAILS ERROR:", error);

    // Clean up the newly uploaded logo if the update fails.
    if (newLogo) {
      try {
        await imageUpload.deleteImage(newLogo, "logo");
      } catch (cleanupError) {
        console.error("NEW SHOP LOGO CLEANUP ERROR:", cleanupError);
      }
    }

    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop details provided",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update shop details",
    });
  }
};
