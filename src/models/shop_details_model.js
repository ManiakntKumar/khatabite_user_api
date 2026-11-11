const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema(
  {
    shopId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    shopName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    businessCategory: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    shopNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // =========================
    // SHOP ADDRESS
    // =========================

    shopAddress: {
      type: String,
      trim: true,
      default: "",
    },

    area: {
      type: String,
      trim: true,
      index: true,
      default: "",
    },

    city: {
      type: String,
      trim: true,
      index: true,
      default: "",
    },

    state: {
      type: String,
      trim: true,
      index: true,
      default: "",
    },

    pincode: {
      type: String,
      trim: true,
      index: true,
      default: "",
    },

    // =========================
    // OWNER INFORMATION
    // =========================

    ownerName: {
      type: String,
      trim: true,
      default: "",
    },

    ownermobileNumber: {
      type: String,
      trim: true,
      default: "",
    },

    emailAddress: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    // =========================
    // GST
    // =========================

    gstRegistered: {
      type: String,
      default: "",
      index: true,
    },

    gstNo: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    // =========================
    // FSSAI
    // =========================

    fssaiLicenceNo: {
      type: String,
      trim: true,
      default: "",
    },

    // =========================
    // SHOP BRANDING
    // =========================

    logo: {
      type: String,
      trim: true,
      default: "",
    },

    shopSlogan: {
      type: String,
      trim: true,
      default: "",
    },

    // =========================
    // ADMIN VERIFICATION
    // =========================

    verificationStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },

    // =========================
    // SHOP STATUS
    // =========================

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // =========================
    // LOGIN SECURITY
    // =========================

    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },
    // =========================
    // SHOP LOCATION
    // =========================

    location: {
      address: {
        type: String,
        trim: true,
        default: "",
      },

      area: {
        type: String,
        trim: true,
        default: "",
      },

      city: {
        type: String,
        trim: true,
        default: "",
      },

      state: {
        type: String,
        trim: true,
        default: "",
      },

      pincode: {
        type: String,
        trim: true,
        default: "",
      },

      geo: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },

        coordinates: {
          type: [Number],
          default: undefined,
        },
      },
      source: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // =========================
    // SINGLE DEVICE SESSION
    // =========================

    sessionVersion: {
      type: Number,
      default: 0,
    },

    activeSessionId: {
      type: String,
      default: null,
    },

    deviceId: {
      type: String,
      default: null,
    },

    deviceType: {
      type: String,
      enum: ["ANDROID", "IOS"],
      default: null,
    },

    deviceName: {
      type: String,
      trim: true,
      default: "",
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    lastLoginIp: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// =====================================================
// INDEXES
// =====================================================
shopSchema.index({
  "location.geo": "2dsphere",
});
// Shop listing / active shops
shopSchema.index({
  isActive: 1,
  verificationStatus: 1,
});

// Approved + active shops
shopSchema.index({
  isActive: 1,
  isVerified: 1,
});

// Business category based shop search
shopSchema.index({
  businessCategory: 1,
  isActive: 1,
});

// Location based shop search
shopSchema.index({
  state: 1,
  area: 1,
  pincode: 1,
  isActive: 1,
});

// Verification queue for admin
shopSchema.index({
  verificationStatus: 1,
  createdAt: -1,
});

// Latest shops
shopSchema.index({
  createdAt: -1,
});

// Shop name search/sorting
shopSchema.index({
  shopName: 1,
  isActive: 1,
});

const Shop = mongoose.model("ShopDetails", shopSchema);

module.exports = Shop;
