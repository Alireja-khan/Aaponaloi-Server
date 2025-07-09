const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Firebase Admin Initialization
const serviceAccount = require('./aaponaloi-firebase-admin-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vgnu9ma.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db('aaponaloiDB');
    const usersCollection = db.collection('users');

    /**
     * PUT /api/users/:email  -- upsert user
     */
    app.put('/api/users/:email', async (req, res) => {
      const email = req.params.email;
      const userData = req.body;

      try {
        const filter = { email };
        const updateDoc = {
          $set: {
            ...userData,
            role: userData.role || 'user',
            updatedAt: new Date(),
          },
        };
        const options = { upsert: true };
        const result = await usersCollection.updateOne(filter, updateDoc, options);
        res.json(result);
      } catch (err) {
        console.error('User registration failed:', err);
        res.status(500).json({ message: 'Server error during user registration' });
      }
    });

    /**
     * GET /api/users/:email -- get user by email
     */
    app.get('/api/users/:email', async (req, res) => {
      const email = req.params.email;
      try {
        const user = await usersCollection.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
      } catch (err) {
        console.error('Fetch user error:', err);
        res.status(500).json({ message: 'Server error fetching user' });
      }
    });
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}

run().catch(console.dir);

// Default Route
app.get('/', (req, res) => {
  res.send('Aaponaloi Backend Running 🚀');
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start Server
app.listen(port, () => {
  console.log(`🚀 Server listening on http://localhost:${port}`);
});
