const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const router = require('./routers/routes');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const app = express();
const mongoDB = require('./config/mDB')
mongoDB();

app.set('trust proxy', true);
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: [
    'https://job-applyer-via-mail-frontend.vercel.app',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie']
}));

app.use('/', router);

app.listen(process.env.PORT || 5000, () => {
  console.log("this app is running on port 5000 or some other");
})

