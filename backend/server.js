import express from 'express';

import dotenv from 'dotenv';
import cors from 'cors';


const app = express();
const PORT = process.env.PORT || 5000;
dotenv.config();

// Middleware
app.use(cors());
app.use(express.json());

// Sample route
app.get('/', (req, res) => {
  res.send('Welcome to the E-commerce backend!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

