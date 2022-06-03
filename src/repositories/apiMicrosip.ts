import axios from 'axios';
import https from 'https'

const ApiMicrosip = axios.create({
  baseURL: 'https://localhost:44320/api/',
  headers: {
    'Content-Type': 'application/json',
  },
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

export { ApiMicrosip };