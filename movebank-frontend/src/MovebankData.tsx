import React, { useEffect, useState } from "react";
import axios from "axios";
import { Typography, CircularProgress, Alert, Link } from "@mui/material";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getEventData, getStudies } from "./movebankService";

interface StudyData {
  id: string;
  name: string;
  main_location_lat: string;
  main_location_long: string;
}

interface EventData {
  timestamp: string;
  location_lat: string;
  location_long: string;
  individual_id: string;
}

const MovebankData: React.FC = () => {
  const [data, setData] = useState<StudyData[]>([]);
  const [eventData, setEventData] = useState<EventData[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const studies = await getStudies();
        setData(studies);
      } catch (err: any) {
        setError("Error fetching data");
        console.error("Error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchAnimalPath = async (study_id: string) => {
    try {
      const events = await getEventData(study_id);
      setEventData(events);
    } catch (err: any) {
      setError("Error fetching animal path data");
      console.error("Error:", err.message);
    }
  };

  if (loading) {
    return (
      <>
        <Typography variant="h4" align="center" gutterBottom>
          Loading...
        </Typography>
        <CircularProgress style={{ display: "block", margin: "20px auto" }} />
      </>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <MapContainer
      center={[0, 0]}
      zoom={2}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {data.map(study => {
        const lat = parseFloat(study.main_location_lat);
        const lng = parseFloat(study.main_location_long);

        if (isNaN(lat) || isNaN(lng)) {
          console.warn(`Invalid coordinates for study ID ${study.id}:`, study);
          return null;
        }

        return (
          <CircleMarker
            key={study.id}
            center={[lat, lng]}
            radius={1}
            fillColor="blue"
            color="blue"
            fillOpacity={0.7}
          >
            <Popup>
              <Link onClick={() => fetchAnimalPath(study.id)}>
                <strong>{study.name}</strong>
              </Link>
            </Popup>
          </CircleMarker>
        );
      })}

      {eventData.length > 0 && (
        <Polyline
          positions={eventData.map(event => [
            parseFloat(event.location_lat),
            parseFloat(event.location_long),
          ])}
          color="red"
        />
      )}
    </MapContainer>
  );
};

export default MovebankData;
