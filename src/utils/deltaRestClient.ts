import axios from "axios";
import * as crypto from "crypto";

export class DeltaRestClient {
  private client: ReturnType<typeof axios.create>;
  private apiSecret: string;

  constructor(
    baseUrl: string,
    apiKey: string,
    apiSecret: string,
    timestamp?: number
  ) {
    this.apiSecret = apiSecret;

    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
        timestamp: timestamp?.toString() || Date.now().toString(),
      },
    });
  }

  private generateSignature(
    path: string,
    method: string,
    body: string = ""
  ): string {
    const message = method + path + body;
    return crypto
      .createHmac("sha256", this.apiSecret)
      .update(message)
      .digest("hex");
  }

  async getBalances(assetId?: number) {
    const path = "/v2/wallet/balances";
    const method = "GET";
    const signature = this.generateSignature(path, method);

    const response = await this.client.get(path, {
      headers: {
        signature: signature,
      },
      params: assetId ? { asset_id: assetId } : {},
    });

    return response.data;
  }

  async getAccountInfo() {
    try {
      const path = "/v2/account";
      const method = "GET";
      const signature = this.generateSignature(path, method);

      const response = await this.client.get(path, {
        headers: {
          signature: signature,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to get account info: ${error}`);
    }
  }
}
