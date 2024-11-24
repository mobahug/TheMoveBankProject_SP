import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';

interface TagType {
  description: string;
  external_id: string;
  id: string;
  is_location_sensor: boolean;
  name: string;
}

const MovebankData: React.FC = () => {
  const [data, setData] = useState<TagType[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('/api/movebank-data');
        console.log(response)
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
      <Container>
        <Typography variant="h4" align="center" gutterBottom>
          Movebank Sensor Types
        </Typography>
        <CircularProgress style={{ display: 'block', margin: '20px auto' }} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Typography variant="h4" align="center" gutterBottom>
          Movebank Sensor Types
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container>
      <Typography variant="h4" align="center" gutterBottom>
        Movebank Sensor Types
      </Typography>
      <TableContainer component={Paper}>
        <Table aria-label="sensor types table">
          <TableHead>
            <TableRow>
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>External ID</strong></TableCell>
              <TableCell><strong>Description</strong></TableCell>
              <TableCell><strong>Is Location Sensor</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((sensor) => (
              <TableRow key={sensor.id}>
                <TableCell>{sensor.id}</TableCell>
                <TableCell>{sensor.name}</TableCell>
                <TableCell>{sensor.external_id}</TableCell>
                <TableCell>{sensor.description}</TableCell>
                <TableCell>{sensor.is_location_sensor ? 'Yes' : 'No'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default MovebankData;
