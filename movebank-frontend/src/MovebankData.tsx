import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Typography, CircularProgress, Alert } from '@mui/material';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface StudyData {
  id: string;
  name: string;
  main_location_lat: string;
  main_location_long: string;
}

const MovebankData: React.FC = () => {
  const [data, setData] = useState<StudyData[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('/api/movebank-data');
        console.log(response.data);
        setData(response.data);
      } catch (err: any) {
        setError('Error fetching data');
        console.error('Error:', err.message);
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);

  if (loading) {
    return (
      <div>
        <Typography variant="h4" align="center" gutterBottom>
          Loading...
        </Typography>
        <CircularProgress style={{ display: 'block', margin: '20px auto' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Alert severity="error">{error}</Alert>
      </div>
    );
  }

  return (
    <div style={{ padding: 0 }}>
      <MapContainer
        center={[0, 0]}
        zoom={2}
        style={{ height: '100vh', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        {data.map((study) => {
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
              radius={5}
              fillColor="blue"
              color="blue"
              fillOpacity={0.7}
            >
              <Popup>
                <Typography variant="subtitle1">
                  <strong>{study.name}</strong>
                </Typography>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MovebankData;
