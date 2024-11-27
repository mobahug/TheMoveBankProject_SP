import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import crypto from "crypto";
import csvtojson from "csvtojson";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.get("/api/movebank-data", async (req, res) => {
  try {
    const axiosInstance = axios.create({
      baseURL:
        "https://www.movebank.org/movebank/service/direct-read?entity_type=study&i_have_download_access=true",
      auth: {
        username: process.env.MOVEBANK_USERNAME || "",
        password: process.env.MOVEBANK_PASSWORD || "",
      },
      withCredentials: true,
      responseType: "text",
    });

    let response = await axiosInstance.get("/direct-read", {
      params: {
        entity_type: "tag_type",
      },
    });

    if (response.data.includes("License Terms:")) {
      console.log("License terms need to be accepted.");

      const licenseTerms = response.data;

      const md5sum = crypto
        .createHash("md5")
        .update(licenseTerms)
        .digest("hex");

      response = await axiosInstance.get("/direct-read", {
        params: {
          entity_type: "tag_type",
          "license-md5": md5sum,
        },
      });
    }

    const jsonData = await csvtojson().fromString(response.data);

    res.json(jsonData);
  } catch (error: any) {
    console.error("Error fetching data from Movebank:", error.message);
    res.status(500).json({ error: "Failed to fetch data from Movebank" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
