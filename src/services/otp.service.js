const axios = require("axios");

// Environment variables
const API_KEY = process.env.TWO_FACTOR_API_KEY;
const TEMPLATE = process.env.TWO_FACTOR_TEMPLATE;

async function sendOTP(mobile) {
  try {
    if (!API_KEY || !TEMPLATE) {
      throw new Error("Missing TWO_FACTOR_API_KEY or TWO_FACTOR_TEMPLATE in environment variables");
    }

    const url = `https://2factor.in/API/V1/${API_KEY}/SMS/${mobile}/${TEMPLATE}/Trunkut+App+Registration`;
    //console.log("Sending OTP via URL:", url);

    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Error sending OTP:", error.message);
    throw error;
  }
}

async function verifyOTP(mobile, otp) {
  try {
    if (!API_KEY) {
      throw new Error("Missing TWO_FACTOR_API_KEY in environment variables");
    }

    const url = `https://2factor.in/API/V1/${API_KEY}/SMS/VERIFY3/${mobile}/${otp}`;
    //console.log("Verifying OTP via URL:", url);

    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Error verifying OTP:", error.message);
    throw error;
  }
}

module.exports = {
  sendOTP,
  verifyOTP,
};
