const imageUpload = require("../utils/imageUpload");
const Category = require("../models/category_model");
const Shop = require("../models/shop_details_model");



// ===============================
// CREATE CATEGORY
// ===============================

exports.createCategory = async (req, res) => {
let savedImagePath = "";

try {
const { categoryName } = req.body || {};
const userShopId = req.user?.shopId;

if (!userShopId) {
  return res.status(401).json({
    success: false,
    code: "SHOP_ID_MISSING",
    message: "Shop ID not found for logged-in user",
  });
}

if (
  typeof categoryName !== "string" ||
  !categoryName.trim()
) {
  return res.status(400).json({
    success: false,
    code: "CATEGORY_NAME_REQUIRED",
    message: "Please enter a valid category name",
  });
}

const cleanCategoryName = categoryName.trim();

//============== Find Shop ==============

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

//============== Check Duplicate Category ==============

const escapedCategoryName = cleanCategoryName.replace(
  /[.*+?^${}()|[\]\\]/g,
  "\\$&"
);

const existingCategory = await Category.findOne({
  shopId,
  categoryName: {
    $regex: `^${escapedCategoryName}$`,
    $options: "i",
  },
}).lean();

if (existingCategory) {
  return res.status(409).json({
    success: false,
    code: "CATEGORY_ALREADY_EXISTS",
    message: `Category "${cleanCategoryName}" already exists in your shop`,
  });
}

//============== Start Category Image ==============

if (req.file) {
  savedImagePath = await imageUpload.saveImage(
    req.file,
    "category_image"
  );
}

//============== End Category Image ==============

//============== Create Category ==============

const category = await Category.create({
  shopId,
  categoryName: cleanCategoryName,
  categoryImage: savedImagePath,
  isActive: true,
});

return res.status(201).json({
  success: true,
  code: "CATEGORY_CREATED",
  message: "Category created successfully",
  data: category,
});

} catch (error) {
console.error("CREATE CATEGORY ERROR:", error);

//============== Remove Image If Creation Fails ==============

if (savedImagePath) {
  try {
    await imageUpload.deleteImage(
      savedImagePath,
      "category_image"
    );
  } catch (cleanupError) {
    console.error("Category image cleanup error:", cleanupError);
  }
}

if (error.code === 11000) {
  return res.status(409).json({
    success: false,
    code: "CATEGORY_ALREADY_EXISTS",
    message: "This category already exists in your shop",
  });
}

if (error.name === "ValidationError") {
  return res.status(400).json({
    success: false,
    code: "CATEGORY_VALIDATION_ERROR",
    message: error.message,
  });
}

return res.status(500).json({
  success: false,
  code: "CATEGORY_CREATE_FAILED",
  message: "Failed to create category",
});

}
};

// ===============================
// GET CATEGORIES
// ===============================

exports.getCategories = async (req, res) => {
  try {
    // Logged-in user's custom shopId
    const userShopId = req.user?.shopId;

    if (!userShopId) {
      return res.status(400).json({
        success: false,
        message: "Shop ID not found for logged-in user",
      });
    }

    // Find actual Shop document
    const shop = await Shop.findOne(
      { shopId: userShopId },
      { _id: 1 }
    ).lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    // Fetch categories of this shop
    const categories = await Category.find({
      shopId: shop._id,
    })
      .select("_id categoryName categoryImage isActive createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      count: categories.length,
      data: categories,
    });

  } catch (error) {
    console.error("GET CATEGORIES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
};




// ===============================
// DELETE CATEGORY
// ===============================

exports.deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    //============== Start Delete Category Image ==============
    if (category.categoryImage) {
      await imageUpload.deleteImage(
        category.categoryImage,
        "category_image"
      );
    }
    //============== End Delete Category Image ==============

    //============== Start Delete Category DB Record ==============
    await Category.findByIdAndDelete(categoryId);
    //============== End Delete Category DB Record ==============

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });

  } catch (error) {
    console.error("DELETE CATEGORY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete category",
      error: error.message,
    });
  }
};




exports.updateCategory = async (req, res) => {
  let newCategoryImage = "";

  try {
    const { categoryId } = req.params;
    const { categoryName, isActive } = req.body;

    const userShopId = req.user?.shopId;

    if (!userShopId) {
      return res.status(400).json({
        success: false,
        message: "Shop ID not found for logged-in user",
      });
    }

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

    const category = await Category.findOne({
      _id: categoryId,
      shopId,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    //============== Start Update Category Name ==============
    if (categoryName !== undefined) {
      if (typeof categoryName !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid category name",
        });
      }

      const cleanCategoryName = categoryName.trim();

      if (!cleanCategoryName) {
        return res.status(400).json({
          success: false,
          message: "categoryName cannot be empty",
        });
      }

      const escapedCategoryName = cleanCategoryName.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const existingCategory = await Category.findOne({
        _id: { $ne: category._id },
        shopId,
        categoryName: {
          $regex: `^${escapedCategoryName}$`,
          $options: "i",
        },
      }).lean();

      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: "Category already exists for this shop",
        });
      }

      category.categoryName = cleanCategoryName;
    }
    //============== End Update Category Name ==============

    //============== Start Update Active Status ==============
    if (isActive !== undefined) {
      if (isActive !== true && isActive !== false &&
          isActive !== "true" && isActive !== "false") {
        return res.status(400).json({
          success: false,
          message: "Invalid isActive value",
        });
      }

      category.isActive = isActive === true || isActive === "true";
    }
    //============== End Update Active Status ==============

    //============== Start Update Category Image ==============
    const oldCategoryImage = category.categoryImage;

    if (req.file) {
      newCategoryImage = await imageUpload.saveImage(
        req.file,
        "category_image"
      );

      category.categoryImage = newCategoryImage;
    }
    //============== End Update Category Image ==============

    //============== Start Save Category ==============
    await category.save();
    //============== End Save Category ==============

    //============== Start Delete Old Category Image ==============
    if (req.file && oldCategoryImage) {
      try {
        await imageUpload.deleteImage(
          oldCategoryImage,
          "category_image"
        );
      } catch (imageError) {
        console.error("OLD CATEGORY IMAGE DELETE ERROR:", imageError);
      }
    }
    //============== End Delete Old Category Image ==============

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });

  } catch (error) {
    console.error("UPDATE CATEGORY ERROR:", error);

    //============== Start Cleanup New Image On Failure ==============
    if (newCategoryImage) {
      try {
        await imageUpload.deleteImage(
          newCategoryImage,
          "category_image"
        );
      } catch (cleanupError) {
        console.error("NEW CATEGORY IMAGE CLEANUP ERROR:", cleanupError);
      }
    }
    //============== End Cleanup New Image On Failure ==============

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category already exists for this shop",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update category",
      error: error.message,
    });
  }
};
