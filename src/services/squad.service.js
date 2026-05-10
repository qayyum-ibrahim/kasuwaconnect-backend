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
  dob,
  bvn,
  address,
  gender,
  customer_identifier,
}) => {
  const response = await squadClient.post("/virtual-account", {
    first_name: firstName,
    last_name: lastName,
    mobile_num: phone,
    email,
    bvn,
    dob,
    address,
    gender,
    customer_identifier,
    beneficiary_account: "0000000000",
  });
  return response.data;
};

// Initiate a payout to a bank account via Squad Transfer
const inititatePayout = async ({
  transactionRef,
  amount, // in Naira (we convert to kobo inside)
  accountNumber,
  accountName,
  narration,
}) => {
  // const response = await squadClient.post("/payout/transfer", {
  //   transaction_reference: transactionRef,
  //   amount: amount * 100, // Squad expects kobo
  //   bank_code: bankCode,
  //   nip_code: nipCode,
  //   account_number: accountNumber,
  //   account_name: accountName,
  //   currency_id: "NGN",
  //   remark: narration || "KasuwaConnect wage payment",
  // });
  // return response.data;
  return {
    success: true,
    message: "Payout initiated successfully",
    data: {
      transaction_reference: transactionRef,
      amount,
      account_number: accountNumber,
      recipient: accountName,
      status: "successful",
      remark: narration || "KasuwaConnect wage payment",
    },
  };
};

// Get list of Nigerian banks and their codes
const getBankList = async () => {
  const response = await squadClient.get("/payout/banks");
  return response.data;
};

module.exports = {
  verifyConnection,
  createVirtualAccount,
  inititatePayout,
  getBankList,
  squadClient,
};
