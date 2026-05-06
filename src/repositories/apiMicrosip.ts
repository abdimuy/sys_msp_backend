import axios from 'axios';
import https from 'https'

const ApiMicrosip = axios.create({
  baseURL: process.env.MICROSIP_API_BASE_URL || 'https://localhost:44320/api/',
  headers: {
    'Content-Type': 'application/json',
  },
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

export { ApiMicrosip };