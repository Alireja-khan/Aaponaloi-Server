const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Firebase Admin SDK
const serviceAccount = require("./aaponaloi-firebase-admin-key.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vgnu9ma.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Middleware to verify Firebase token
async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const idToken = authHeader.split(' ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
  }
}

async function run() {
  try {
    await client.connect();
    const db = client.db('aaponaloiDB');

    const usersCollection = db.collection('users');
    const apartmentsCollection = db.collection('apartments');
    const agreementsCollection = db.collection('agreements');
    const paymentsCollection = db.collection('payments');
    const couponsCollection = db.collection('coupons');
    const announcementsCollection = db.collection('announcements');

    // 🛡️ Protected: Get current user's profile
    app.get('/api/users/profile', verifyFirebaseToken, async (req, res) => {
      const email = req.user.email;
      try {
        const user = await usersCollection.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
      } catch (err) {
        console.error('Error getting profile:', err);
        res.status(500).json({ message: 'Server error' });
      }
    });

    // ✅ NEW: Update or create user by email (used in AuthProvider.jsx)
    app.put('/api/users/profile/:email', async (req, res) => {
      const email = req.params.email;
      const updatedUser = req.body;

      try {
        const filter = { email };
        const update = {
          $set: {
            ...updatedUser,
            updatedAt: new Date(),
          },
        };
        const options = { upsert: true };
        const result = await usersCollection.updateOne(filter, update, options);
        res.json(result);
      } catch (error) {
        console.error('Error upserting user:', error);
        res.status(500).json({ message: 'Server error' });
      }
    });

    // ✅ NEW: Get a specific user profile by email (optional, but useful)
    app.get('/api/users/profile/:email', async (req, res) => {
      const email = req.params.email;
      try {
        const user = await usersCollection.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
      } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Server error' });
      }
    });

    // 🏘️ Public: Get all apartments
    app.get('/api/apartments', async (req, res) => {
      try {
        const apartments = await apartmentsCollection.find().toArray();
        res.json(apartments);
      } catch (err) {
        console.error('Error fetching apartments:', err);
        res.status(500).json({ message: 'Server error' });
      }
    });

    // 🛡️ Protected: Get all users
    app.get('/api/users', verifyFirebaseToken, async (req, res) => {
      try {
        const users = await usersCollection.find().toArray();
        res.json(users);
      } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Server error' });
      }
    });

    // 🆕 Public: Add a user manually (optional)
    app.post('/api/users', async (req, res) => {
      try {
        const newUser = req.body;
        const result = await usersCollection.insertOne(newUser);
        res.status(201).json(result);
      } catch (err) {
        console.error('Error adding user:', err);
        res.status(500).json({ message: 'Server error' });
      }
    });

    // 🚧 Add more routes as needed for agreements, payments, etc...

  } catch (err) {
    console.error('DB connection error:', err);
  }
}

run().catch(console.dir);

// Root
app.get('/', (req, res) => {
  res.send('Aaponaloi Backend Server Running 🚀');
});

// Catch-all 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
