const mongoose = require("mongoose");
const crypto = require("crypto");

const Stock = require("../models/stock_model");
const Shop = require("../models/shop_details_model");
const Category = require("../models/category_model");
const Brand = require("../models/brand_model");
const imageUpload = require("../utils/imageUpload");
const generateStockItemCode = require("../utils/generateStockItemCode");
const Unit = require("../models/unit_model");

// Generate a date-time based barcode with a cryptographic random suffix
const generateBarcode = () => {
  const now = new Date();

  const dateTime = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
    String(now.getMilliseconds()).padStart(3, "0"),
  ].join("");

  const randomPart = crypto.randomBytes(16).toString("hex").toUpperCase();

  return `FD1${dateTime}${randomPart}`;
};


exports.createStock = async (req, res) => {
  let savedImagePath = "";
  try {
    const {
      itemName,
      barcode,
      productType,
      foodType,
      categoryId,
      brandId,
      unitId,
      unitValue,
      hsnCode,
      basicRate,
      gstPercentage,
      gstType = "EXCLUSIVE",
      salePrice,
      mrp,
      trackStock,
      quantity,
      description,
    } = req.body;

    //============== Find Shop ==============

    const shop = await Shop.findOne({
      shopId: req.user?.shopId,
    })
      .select("_id")
      .lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

   

    //============== Start Check Duplicate Item ==============

const existingItem = await Stock.findOne({
  shopId: shop._id,
  itemName: {
    $regex: `^${itemName.trim().replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    )}$`,
    $options: "i",
  },
}).lean();

if (existingItem) {
  return res.status(409).json({
    success: false,
    message: "This item already exists",
  });
}

//============== End Check Duplicate Item ==============
 //============== Start Item Image ==============

    if (req.file) {
      savedImagePath = await imageUpload.saveImage(
        req.file,
        "Item_image"
      );
    }
    //============== End Item Image ==============
    const finalTrackStock =
      trackStock === true || trackStock === "true";

    const stockData = {
      shopId: shop._id,
      itemName: itemName.trim(),
      itemCode: await generateStockItemCode(shop._id),
      barcode: barcode?.trim() || generateBarcode(),
      productType,
      foodType: productType === "FOOD" ? foodType || null : null,
      categoryId,
      brandId: brandId || null,
      unitId,
      unitValue: Number(unitValue),
      hsnCode: hsnCode || "",
      basicRate: Number(basicRate),
      gstPercentage: Number(gstPercentage),
      gstType,
      salePrice: Number(salePrice),
      mrp: Number(mrp),
      trackStock: finalTrackStock,
      quantity: finalTrackStock ? Number(quantity || 0) : 0,
      allowNegativeStock: false,
      reorderLevel: 0,
      itemImage: savedImagePath,
      description: description || "",
    };

    const stock = await Stock.create(stockData);

    return res.status(201).json({
      success: true,
      message: "Stock created successfully",
      data: stock,
    });
  } catch (error) {
    console.error("Create stock error:", error);

    //============== Remove Image If Creation Fails ==============

    if (savedImagePath) {
      try {
        await imageUpload.deleteImage(
          savedImagePath,
          "Item_image"
        );
      } catch (cleanupError) {
        console.error("Item image cleanup error:", cleanupError);
      }
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Item code or barcode already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create stock",
    });
  }
};

//============== Start Fetch Stock ==============


exports.fetchStock = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 30;
    const skip = (page - 1) * limit;

    const search = String(req.query.search || "")
      .trim()
      .slice(0, 100);

    const categoryName = String(req.query.categoryName || "")
      .trim()
      .slice(0, 100);

    const brandName = String(req.query.brandName || "")
      .trim()
      .slice(0, 100);

    const foodType = String(req.query.foodType || "")
      .trim()
      .toUpperCase();

    if (foodType && !["VEG", "NON_VEG"].includes(foodType)) {
      return res.status(400).json({
        success: false,
        message: "foodType must be VEG or NON_VEG",
      });
    }

    const escapeRegex = (value) =>
      value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const shop = await Shop.findOne({
      shopId: req.user?.shopId,
    })
      .select("_id")
      .lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    const filter = {
      shopId: shop._id,
      isDeleted: false,
      isActive: true,
    };

    if (foodType) {
      filter.foodType = foodType;
    }

    const sendResponse = (stockData, totalItems) => {
      const totalPages = Math.ceil(totalItems / limit);

      return res.status(200).json({
        success: true,
        message: "Stock fetched successfully",
        pagination: {
          currentPage: page,
          limit,
          totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        stockData,
      });
    };

    // Resolve category name within the current shop.
    if (categoryName) {
      const categories = await Category.find({
        shopId: shop._id,
        categoryName: {
          $regex: escapeRegex(categoryName),
          $options: "i",
        },
      })
        .select("_id")
        .lean();

      const categoryIds = categories.map((item) => item._id);

      if (!categoryIds.length) {
        return sendResponse([], 0);
      }

      filter.categoryId = { $in: categoryIds };
    }

    // Resolve brand name.
    if (brandName) {
      const brands = await Brand.find({
        brandName: {
          $regex: escapeRegex(brandName),
          $options: "i",
        },
        isActive: true,
      })
        .select("_id")
        .lean();

      const brandIds = brands.map((item) => item._id);

      if (!brandIds.length) {
        return sendResponse([], 0);
      }

      filter.brandId = { $in: brandIds };
    }

    // Normal listing with pagination.
    if (!search) {
      const [stockData, totalItems] = await Promise.all([
        Stock.find(filter)
          .sort({ _id: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        Stock.countDocuments(filter),
      ]);

      return sendResponse(stockData, totalItems);
    }

    // Exact barcode/itemCode lookup.
    const exactMatch = await Stock.findOne({
      ...filter,
      $or: [
        { barcode: search },
        { itemCode: search },
      ],
    }).lean();

    if (exactMatch) {
      return sendResponse([exactMatch], 1);
    }

    // Resolve category and brand names matching the search text.
    const [matchingCategories, matchingBrands] = await Promise.all([
      Category.find({
        shopId: shop._id,
        categoryName: {
          $regex: escapeRegex(search),
          $options: "i",
        },
      })
        .select("_id")
        .lean(),

      Brand.find({
        brandName: {
          $regex: escapeRegex(search),
          $options: "i",
        },
        isActive: true,
      })
        .select("_id")
        .lean(),
    ]);

    // Try Atlas Search first.
    const should = [
      {
        autocomplete: {
          query: search,
          path: "itemName",
          tokenOrder: "any",
          fuzzy: {
            maxEdits: 2,
            prefixLength: 1,
            maxExpansions: 100,
          },
        },
      },
    ];

    if (matchingCategories.length) {
      should.push({
        in: {
          path: "categoryId",
          value: matchingCategories.map((item) => item._id),
        },
      });
    }

    if (matchingBrands.length) {
      should.push({
        in: {
          path: "brandId",
          value: matchingBrands.map((item) => item._id),
        },
      });
    }

    const atlasFilters = [
      {
        equals: {
          path: "shopId",
          value: shop._id,
        },
      },
      {
        equals: {
          path: "isDeleted",
          value: false,
        },
      },
      {
        equals: {
          path: "isActive",
          value: true,
        },
      },
    ];

    if (foodType) {
      atlasFilters.push({
        equals: {
          path: "foodType",
          value: foodType,
        },
      });
    }

    if (filter.categoryId) {
      atlasFilters.push({
        in: {
          path: "categoryId",
          value: filter.categoryId.$in,
        },
      });
    }

    if (filter.brandId) {
      atlasFilters.push({
        in: {
          path: "brandId",
          value: filter.brandId.$in,
        },
      });
    }

    const pipeline = [
      {
        $search: {
          index: "stock_search",
          compound: {
            filter: atlasFilters,
            should,
            minimumShouldMatch: 1,
          },
        },
      },
      {
        $facet: {
          results: [
            { $skip: skip },
            { $limit: limit },
          ],
          total: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await Stock.aggregate(pipeline);

    let stockData = result?.results || [];
    let totalItems = result?.total?.[0]?.count || 0;

    // Fallback to case-insensitive MongoDB partial matching.
    // This is not fuzzy/typo-tolerant search.
    if (totalItems === 0) {
      const fallbackConditions = [
        {
          itemName: {
            $regex: escapeRegex(search),
            $options: "i",
          },
        },
      ];

      if (matchingCategories.length) {
        fallbackConditions.push({
          categoryId: {
            $in: matchingCategories.map((item) => item._id),
          },
        });
      }

      if (matchingBrands.length) {
        fallbackConditions.push({
          brandId: {
            $in: matchingBrands.map((item) => item._id),
          },
        });
      }

      const fallbackFilter = {
        ...filter,
        $or: fallbackConditions,
      };

      const [fallbackData, fallbackCount] = await Promise.all([
        Stock.find(fallbackFilter)
          .sort({ _id: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        Stock.countDocuments(fallbackFilter),
      ]);

      stockData = fallbackData;
      totalItems = fallbackCount;
    }

    return sendResponse(stockData, totalItems);
  } catch (error) {
    console.error("FETCH STOCK ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch stock",
    });
  }
};

//============== End Fetch Stock ==============



///Ye APi ka kam hai   category wise item show ker hia Firts index me jo v 
/// category hoga uske index ka item show ker rha hai
exports.getActiveStockCategories = async (req, res) => {
  try {
    const shop = await Shop.findOne({
      shopId: req.user?.shopId,
    })
      .select("_id")
      .lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    const categories = await Category.aggregate([
      {
        $match: {
          shopId: shop._id,
          isActive: true,
        },
      },
      {
        $lookup: {
          from: Stock.collection.name,
          let: { categoryId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$categoryId", "$$categoryId"],
                },
                shopId: shop._id,
                isDeleted: false,
                isActive: true,
              },
            },
            {
              $count: "count",
            },
          ],
          as: "stockCountData",
        },
      },
      {
        $addFields: {
          itemCount: {
            $ifNull: [
              { $arrayElemAt: ["$stockCountData.count", 0] },
              0,
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          categoryName: 1,
          categoryImage: 1,
          itemCount: 1,
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Active categories fetched successfully",
      categoryData: categories,
      defaultCategoryId: categories[0]?._id || null,
    });
  } catch (error) {
    console.error("GET ACTIVE STOCK CATEGORIES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch active categories",
    });
  }
};



//Categiory wise item show ker rha hai
// Tap on Category all item view



exports.getStockItemsByCategory = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 30;
    const skip = (page - 1) * limit;

    const categoryId = String(req.query.categoryId || "").trim();
    const search = String(req.query.search || "").trim().slice(0, 100);

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Valid categoryId is required",
      });
    }

    const userShopId = String(req.user?.shopId || "").trim();

    if (!userShopId) {
      return res.status(401).json({
        success: false,
        message: "Valid shop authentication is required",
      });
    }

    const shop = await Shop.findOne({ shopId: userShopId })
      .select("_id")
      .lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    const category = await Category.findOne({
      _id: categoryId,
      shopId: shop._id,
      isActive: true,
    })
      .select("_id categoryName")
      .lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Active category not found",
      });
    }

    const filter = {
      shopId: shop._id,
      categoryId: category._id,
      isDeleted: false,
      isActive: true,
    };

    // Add names using the related collections.
    const addItemNames = async (items) => {
      if (!items.length) return items;

      const brandIds = [
        ...new Set(
          items
            .map((item) => String(item.brandId || ""))
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
        ),
      ];

      const unitIds = [
        ...new Set(
          items
            .map((item) => String(item.unitId || ""))
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
        ),
      ];

      const [brands, units] = await Promise.all([
        brandIds.length
          ? Brand.find({
              _id: { $in: brandIds },
            })
              .select("_id brandName")
              .lean()
          : [],

        unitIds.length
          ? Unit.find({
              _id: { $in: unitIds },
            })
              .select("_id unitName")
              .lean()
          : [],
      ]);

      const brandMap = new Map(
        brands.map((brand) => [
          String(brand._id),
          brand.brandName || "",
        ])
      );

      const unitMap = new Map(
        units.map((unit) => [
          String(unit._id),
          unit.unitName || "",
        ])
      );

      return items.map((item) => ({
        ...item,
        categoryName: category.categoryName || "",
        brandName:
          item.brandName ||
          brandMap.get(String(item.brandId || "")) ||
          "",
        unitName:
          item.unitName ||
          unitMap.get(String(item.unitId || "")) ||
          "",
      }));
    };

    const sendResponse = async (items, totalItems) => {
      const enrichedItems = await addItemNames(items);
      const totalPages = Math.ceil(totalItems / limit);

      return res.status(200).json({
        success: true,
        message: "Category stock fetched successfully",
        category: {
          _id: category._id,
          categoryName: category.categoryName,
        },
        pagination: {
          currentPage: page,
          limit,
          totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        categoryWiseItemsData: enrichedItems,
      });
    };

    // No search: normal indexed pagination.
    if (!search) {
      const [items, totalItems] = await Promise.all([
        Stock.find(filter)
          .sort({ _id: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        Stock.countDocuments(filter),
      ]);

      return await sendResponse(items, totalItems);
    }

    const escapeRegex = (value) =>
      value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // First search: exact barcode match.
    const barcodeFilter = {
      ...filter,
      barcode: search,
    };

    const [barcodeItems, barcodeCount] = await Promise.all([
      Stock.find(barcodeFilter)
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Stock.countDocuments(barcodeFilter),
    ]);

    if (barcodeCount > 0) {
      return await sendResponse(barcodeItems, barcodeCount);
    }

    // Search item name using Atlas Search, including fuzzy matching.
    const pipeline = [
      {
        $search: {
          index: "stock_search",
          compound: {
            filter: [
              {
                equals: {
                  path: "shopId",
                  value: shop._id,
                },
              },
              {
                equals: {
                  path: "categoryId",
                  value: category._id,
                },
              },
              {
                equals: {
                  path: "isDeleted",
                  value: false,
                },
              },
              {
                equals: {
                  path: "isActive",
                  value: true,
                },
              },
            ],
            must: [
              {
                autocomplete: {
                  query: search,
                  path: "itemName",
                  tokenOrder: "any",
                  fuzzy: {
                    maxEdits: 2,
                    prefixLength: 1,
                    maxExpansions: 100,
                  },
                },
              },
            ],
          },
        },
      },
      {
        $facet: {
          results: [
            { $skip: skip },
            { $limit: limit },
          ],
          total: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await Stock.aggregate(pipeline);

    let items = result?.results || [];
    let totalItems = result?.total?.[0]?.count || 0;

    // Fallback: normal partial item-name search.
    if (totalItems === 0) {
      const fallbackFilter = {
        ...filter,
        itemName: {
          $regex: escapeRegex(search),
          $options: "i",
        },
      };

      const [fallbackItems, fallbackCount] = await Promise.all([
        Stock.find(fallbackFilter)
          .sort({ _id: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        Stock.countDocuments(fallbackFilter),
      ]);

      items = fallbackItems;
      totalItems = fallbackCount;
    }

    return await sendResponse(items, totalItems);
  } catch (error) {
    console.error("GET STOCK BY CATEGORY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch category stock",
    });
  }
};





// exports.getStockItemsByCategory = async (req, res) => {
//   try {
//     const page = Math.max(1, parseInt(req.query.page, 10) || 1);
//     const limit = 30;
//     const skip = (page - 1) * limit;

//     const categoryId = String(req.query.categoryId || "").trim();
//     const search = String(req.query.search || "").trim().slice(0, 100);

//     if (!mongoose.Types.ObjectId.isValid(categoryId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Valid categoryId is required",
//       });
//     }

//     const shop = await Shop.findOne({
//       shopId: req.user?.shopId,
//     })
//       .select("_id")
//       .lean();

//     if (!shop) {
//       return res.status(404).json({
//         success: false,
//         message: "Shop not found",
//       });
//     }

//     const category = await Category.findOne({
//       _id: categoryId,
//       shopId: shop._id,
//       isActive: true,
//     })
//       .select("_id categoryName")
//       .lean();

//     if (!category) {
//       return res.status(404).json({
//         success: false,
//         message: "Active category not found",
//       });
//     }

//     const filter = {
//       shopId: shop._id,
//       categoryId: category._id,
//       isDeleted: false,
//       isActive: true,
//     };

//     const sendResponse = (items, totalItems) => {
//       const totalPages = Math.ceil(totalItems / limit);

//       return res.status(200).json({
//         success: true,
//         message: "Category stock fetched successfully",
//         category: {
//           _id: category._id,
//           categoryName: category.categoryName,
//         },
//         pagination: {
//           currentPage: page,
//           limit,
//           totalItems,
//           totalPages,
//           hasNextPage: page < totalPages,
//           hasPreviousPage: page > 1,
//         },
//         categoryWiseItemsData: items,
//       });
//     };

//     // No search: use indexed MongoDB pagination.
//     if (!search) {
//       const [items, totalItems] = await Promise.all([
//         Stock.find(filter)
//           .sort({ _id: -1 })
//           .skip(skip)
//           .limit(limit)
//           .lean(),

//         Stock.countDocuments(filter),
//       ]);

//       return sendResponse(items, totalItems);
//     }

//     const escapeRegex = (value) =>
//       value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

//     // Atlas Search for partial and typo-tolerant item-name matching.
//     const pipeline = [
//       {
//         $search: {
//           index: "stock_search",
//           compound: {
//             filter: [
//               {
//                 equals: {
//                   path: "shopId",
//                   value: shop._id,
//                 },
//               },
//               {
//                 equals: {
//                   path: "categoryId",
//                   value: category._id,
//                 },
//               },
//               {
//                 equals: {
//                   path: "isDeleted",
//                   value: false,
//                 },
//               },
//               {
//                 equals: {
//                   path: "isActive",
//                   value: true,
//                 },
//               },
//             ],
//             must: [
//               {
//                 autocomplete: {
//                   query: search,
//                   path: "itemName",
//                   tokenOrder: "any",
//                   fuzzy: {
//                     maxEdits: 2,
//                     prefixLength: 1,
//                     maxExpansions: 100,
//                   },
//                 },
//               },
//             ],
//           },
//         },
//       },
//       {
//         $facet: {
//           results: [
//             { $skip: skip },
//             { $limit: limit },
//           ],
//           total: [{ $count: "count" }],
//         },
//       },
//     ];

//     const [result] = await Stock.aggregate(pipeline);

//     let items = result?.results || [];
//     let totalItems = result?.total?.[0]?.count || 0;

//     // Fallback for normal partial name matching if Atlas returns zero.
//     if (totalItems === 0) {
//       const fallbackFilter = {
//         ...filter,
//         itemName: {
//           $regex: escapeRegex(search),
//           $options: "i",
//         },
//       };

//       const [fallbackItems, fallbackCount] = await Promise.all([
//         Stock.find(fallbackFilter)
//           .sort({ _id: -1 })
//           .skip(skip)
//           .limit(limit)
//           .lean(),

//         Stock.countDocuments(fallbackFilter),
//       ]);

//       items = fallbackItems;
//       totalItems = fallbackCount;
//     }

//     return sendResponse(items, totalItems);
//   } catch (error) {
//     console.error("GET STOCK BY CATEGORY ERROR:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch category stock",
//     });
//   }
// };