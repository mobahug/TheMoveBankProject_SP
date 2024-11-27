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
      baseURL: "https://www.movebank.org/movebank/service",
      auth: {
        username: process.env.MOVEBANK_USERNAME || "",
        password: process.env.MOVEBANK_PASSWORD || "",
      },
      responseType: "text",
    });

    let response = await axiosInstance.get("/direct-read", {
      params: {
        entity_type: "study",
      },
    });

    if (response.data.includes("License Terms:")) {
      const licenseTerms = response.data;
      const md5sum = crypto
        .createHash("md5")
        .update(licenseTerms)
        .digest("hex");

      response = await axiosInstance.get("/direct-read", {
        params: {
          entity_type: "study",
          "license-md5": md5sum,
        },
      });
    }

    const jsonData = await csvtojson().fromString(response.data);

    const studies = jsonData.map(study => ({
      id: study.id,
      name: study.name,
      main_location_lat: study.main_location_lat,
      main_location_long: study.main_location_long,
    }));

    res.json(studies);
  } catch (error) {
    console.error("Error fetching data from Movebank:", error);
    res.status(500).json({ error: "Failed to fetch data from Movebank" });
  }
});

app.get("/api/movebank-data/:study_id", async (req, res) => {
  const { study_id } = req.params;

  try {
    const axiosInstance = axios.create({
      baseURL: "https://www.movebank.org/movebank/service",
      auth: {
        username: process.env.MOVEBANK_USERNAME || "",
        password: process.env.MOVEBANK_PASSWORD || "",
      },
      responseType: "text",
    });

    let response = await axiosInstance.get("/direct-read", {
      params: {
        entity_type: "event",
        study_id: study_id,
        attributes: "timestamp,location_long,location_lat,individual_id",
      },
    });

    if (response.data.includes("License Terms:")) {
      const licenseTerms = response.data;
      const md5sum = crypto
        .createHash("md5")
        .update(licenseTerms)
        .digest("hex");

      response = await axiosInstance.get("/direct-read", {
        params: {
          entity_type: "event",
          study_id: study_id,
          attributes: "timestamp,location_long,location_lat,individual_id",
          "license-md5": md5sum,
        },
      });
    }

    const jsonData = await csvtojson().fromString(response.data);

    res.json(jsonData);
  } catch (error) {
    console.error("Error fetching data from Movebank:", error);
    res.status(500).json({ error: "Failed to fetch data from Movebank" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
