const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion } = require('mongodb');

dotenv.config();

const app = express();

// ✅ Middlewares
app.use(cors());
app.use(express.json());

// ✅ MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vgnu9ma.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// ✅ Create MongoDB Client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let isConnected = false;

// ✅ Initialize app only once (for serverless)
async function initApp() {
  if (!isConnected) {
    try {
      await client.connect();
      isConnected = true;
      console.log('✅ MongoDB connected!');

      const db = client.db('aaponaloiDB');

      // ✅ Collections
      const usersCollection = db.collection('users');
      const apartmentsCollection = db.collection('apartments');
      const agreementsCollection = db.collection('agreements');
      const paymentsCollection = db.collection('payments');
      const couponsCollection = db.collection('coupons');
      const announcementsCollection = db.collection('announcements');

      // ✅ Routes
      const authRoutes = require('./routes/auth.routes');
      const usersRoutes = require('./routes/users.routes');

      // ✅ Attach Routes
      app.use('/api/auth', authRoutes);
      app.use('/api/users', usersRoutes(usersCollection));

      // (Add more route setup as needed, e.g., for apartments, payments, etc.)

    } catch (err) {
      console.error('❌ MongoDB connection error:', err);
    }
  }
}

// ✅ Run initApp once
initApp();

// ✅ Test root route
app.get('/', (req, res) => {
  res.send('Aaponaloi Backend Server Running 🚀');
});

// ❗ Do NOT add app.listen() — Vercel handles it
module.exports = app;
