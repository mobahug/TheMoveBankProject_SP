// movebankHelper.js
import axios from "axios";
import crypto from "crypto";
import csvtojson from "csvtojson";

export async function fetchMovebankData(entityType: string, params = {}) {
  const axiosInstance = axios.create({
    baseURL: "https://www.movebank.org/movebank/service",
    auth: {
      username: process.env.MOVEBANK_USERNAME || "",
      password: process.env.MOVEBANK_PASSWORD || "",
    },
    responseType: "text",
  });

  try {
    let response = await axiosInstance.get("/direct-read", {
      params: {
        entity_type: entityType,
        ...params,
      },
    });

    if (response.data.includes("License Terms:")) {
      const licenseTermsMatch = response.data.includes("License Terms:");
      const licenseTerms = licenseTermsMatch
        ? licenseTermsMatch[1].trim()
        : response.data;
      const md5sum = crypto
        .createHash("md5")
        .update(licenseTerms)
        .digest("hex");

      response = await axiosInstance.get("/direct-read", {
        params: {
          entity_type: entityType,
          "license-md5": md5sum,
          ...params,
        },
      });
    }

    const jsonData = await csvtojson().fromString(response.data);
    return jsonData;
  } catch (error) {
    throw error;
  }
}
