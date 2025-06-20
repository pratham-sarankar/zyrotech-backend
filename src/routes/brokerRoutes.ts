import express from "express";
import { auth } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import axios from "axios";
import * as crypto from "crypto";
import { DeltaRestClient } from "../utils/deltaRestClient";

const router = express.Router();

// All broker routes require authentication
router.use(auth);

const BASE_URL = "https://api.binance.com";

interface BinanceBalance {
  asset: string;
  free: string;
  locked: string;
}

interface BinanceAccountResponse {
  balances: BinanceBalance[];
}

interface DeltaBalanceResponse {
  asset_symbol: string;
  available_balance: string;
  user_id: string;
}

/**
 * Get account information from Binance API
 */
async function getAccountInfo(apiKey: string, apiSecret: string) {
  const endpoint = "/api/v3/account";
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;

  // Create the signature
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(queryString)
    .digest("hex");

  const url = `${BASE_URL}${endpoint}?${queryString}&signature=${signature}`;

  const headers = {
    "X-MBX-APIKEY": apiKey,
  };

  try {
    const response = await axios.get(url, { headers });
    return response;
  } catch (error) {
    throw error;
  }
}

/**
 * Get asset balance from Delta Exchange
 */
async function getAssetBalance(apiKey: string, apiSecret: string) {
  // Get current timestamp in milliseconds
  const timestamp = Date.now();

  const deltaClient = new DeltaRestClient(
    "https://api.india.delta.exchange",
    apiKey,
    apiSecret,
    timestamp
  );

  const response = await deltaClient.getBalances(14);
  return {
    status: "success",
    message: "Balance retrieved successfully.",
    data: response,
  };
}

/**
 * @route POST /api/broker/check-balance
 * @desc Check BTC balance from Binance API
 * @access Private
 */
router.post("/check-balance", async (req, res) => {
  try {
    const { api_key, api_secret } = req.body;
    console.log(api_key, api_secret);

    // Validate required fields
    if (!api_key || !api_secret) {
      throw new AppError(
        "Please provide api_key and api_secret",
        400,
        "missing-credentials"
      );
    }

    const response = await getAccountInfo(api_key, api_secret);

    if (response.status === 200) {
      const profile = response.data as BinanceAccountResponse;
      if ("balances" in profile) {
        const btcBalance = profile.balances.find(
          (item: BinanceBalance) => item.asset === "BTC"
        );
        if (btcBalance) {
          return res.status(200).json({
            status: "success",
            message: "Balance retrieved successfully",
            data: {
              btc_balance: parseFloat(btcBalance.free),
              btc_locked: parseFloat(btcBalance.locked),
            },
          });
        } else {
          return res.status(200).json({
            status: "success",
            message: "No BTC balance found",
            data: null,
          });
        }
      } else {
        return res.status(200).json({
          status: "error",
          message: "No balances found in account",
          data: null,
        });
      }
    } else {
      return res.status(200).json({
        status: "error",
        message: `API Error: ${response.statusText}`,
        data: null,
      });
    }
  } catch (error: any) {
    return res.status(200).json({
      status: "error",
      message: `Error: ${error.message}`,
      data: null,
    });
  }
});

/**
 * @route POST /api/broker/asset-delta-balance
 * @desc Get asset balance from Delta Exchange
 * @access Private
 */
router.post("/asset-delta-balance", async (req, res) => {
  try {
    const { api_key, api_secret } = req.body;

    // Validate required fields
    if (!api_key || !api_secret) {
      throw new AppError(
        "Please provide api_key and api_secret",
        400,
        "missing-credentials"
      );
    }

    // Get current balance
    const response = await getAssetBalance(api_key, api_secret);

    if (response === null) {
      return res.status(200).json({
        status: "error",
        message: "No balance found!",
        data: null,
      });
    }

    if (response.status === "error") {
      return res.status(400).json({
        status: "error",
        message: `Error: ${response.message}`,
        data: response,
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Balance retrieved successfully.",
      data: {
        asset: (response.data as DeltaBalanceResponse).asset_symbol,
        available_balance: parseFloat(
          (response.data as DeltaBalanceResponse).available_balance
        ),
        user_id: parseFloat((response.data as DeltaBalanceResponse).user_id),
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      status: "error",
      message: error.message,
      data: error,
    });
  }
});

export default router;
