const axios = require("axios");

const squadClient = axios.create({
  baseURL: process.env.SQUAD_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.SQUAD_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

// Test: verify your keys are working
const verifyConnection = async () => {
  const response = await squadClient.get("/merchant/balance", {
    params: { currency_id: "NGN" },
  });
  return response.data;
};

// Create a virtual account for a trader
const createVirtualAccount = async ({
  firstName,
  lastName,
  phone,
  email,
  bvn,
}) => {
  const response = await squadClient.post("/virtual-account", {
    first_name: firstName,
    last_name: lastName,
    mobile_num: phone,
    email,
    bvn,
    beneficiary_account: "0000000000",
  });
  return response.data;
};

module.exports = {
  verifyConnection,
  createVirtualAccount,
  squadClient,
};
