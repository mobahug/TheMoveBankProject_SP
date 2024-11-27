import express from "express";
import dotenv from "dotenv";
import { fetchMovebankData } from "./moveBankHelper";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.get("/api/movebank-data", async (req, res) => {
  try {
    const studies = await fetchMovebankData(
      "study" /* {
      i_have_download_access: "true",
    } */
    );

    const formattedStudies = studies.map(study => ({
      id: study.id,
      name: study.name,
      main_location_lat: study.main_location_lat,
      main_location_long: study.main_location_long,
      license_type: study.license_type,
    }));

    res.json(formattedStudies);
  } catch (error) {
    console.error("Error fetching study data:", error);
    res.status(500).json({ error: "Failed to fetch study data from Movebank" });
  }
});

app.get("/api/movebank-data/:study_id", async (req, res) => {
  const { study_id } = req.params;

  try {
    const events = await fetchMovebankData("event", {
      study_id: study_id,
      attributes: "timestamp,location_long,location_lat,individual_id",
      event_reduction_profile: "EURING_01", // only show a single animal track
    });

    res.json(events);
  } catch (error) {
    console.error("Error fetching event data:", error);
    res.status(500).json({ error: "Failed to fetch event data from Movebank" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
