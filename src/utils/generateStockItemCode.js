const StockItemCounter = require("../models/StockItemCounter");

async function generateStockItemCode(shopId) {
  const counter = await StockItemCounter.findOneAndUpdate(
    { shopId },
    { $inc: { sequence: 1 } },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  return String(counter.sequence);
}

module.exports = generateStockItemCode;
