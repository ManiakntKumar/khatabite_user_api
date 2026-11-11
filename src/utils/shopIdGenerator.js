const crypto = require("crypto");
const Counter = require("../models/shop_id_model");

const generateShopId = async () => {
  const random5 = Math.floor(10000 + Math.random() * 90000);

  const timePart = Date.now();

  const cryptoPart = crypto
    .randomBytes(4)
    .toString("hex");

  const counter = await Counter.findOneAndUpdate(
    { name: "shop" },
    { $inc: { sequence: 1 } },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  const shopId =
    `${random5}${timePart}${cryptoPart}${counter.sequence}`;

  return shopId;
};

module.exports = generateShopId;