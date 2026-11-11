const jwt = require("jsonwebtoken");


const generateToken = (shopId, sessionVersion) => {
  return jwt.sign(
    {
      shopId,
      sessionVersion,
    },
    process.env.JWT_SECRET
  );
};

module.exports = { generateToken };

