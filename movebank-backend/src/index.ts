import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import crypto from 'crypto';
import csvtojson from 'csvtojson'; // Import csvtojson

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Route to fetch data from Movebank API
app.get('/api/movebank-data', async (req, res) => {
  try {
    const axiosInstance = axios.create({
      baseURL: 'https://www.movebank.org/movebank/service',
      auth: {
        username: process.env.MOVEBANK_USERNAME || '',
        password: process.env.MOVEBANK_PASSWORD || '',
      },
      withCredentials: true,
      responseType: 'text',
    });

    // Step 1: Initial request to get license terms
    let response = await axiosInstance.get('/direct-read', {
      params: {
        entity_type: 'tag_type',
      },
    });

    if (response.data.includes('License Terms:')) {
      console.log('License terms need to be accepted.');

      // Extract the license terms text
      const licenseTerms = response.data;

      // Create md5 checksum of the license terms
      const md5sum = crypto.createHash('md5').update(licenseTerms).digest('hex');

      // Step 2: Accept the license terms by making a second request with 'license-md5'
      response = await axiosInstance.get('/direct-read', {
        params: {
          entity_type: 'tag_type',
          'license-md5': md5sum,
        },
      });
    }

    // Parse CSV data to JSON
    const jsonData = await csvtojson().fromString(response.data);

    res.json(jsonData);
  } catch (error: any) {
    console.error('Error fetching data from Movebank:', error.message);
    res.status(500).json({ error: 'Failed to fetch data from Movebank' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
