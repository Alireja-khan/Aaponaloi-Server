const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion } = require('mongodb');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vgnu9ma.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create Mongo Client
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        console.log("✅ MongoDB connected!");

        // All collections
        const db = client.db("aaponaloiDB");

        const usersCollection = db.collection("users");
        const apartmentsCollection = db.collection("apartments");
        const agreementsCollection = db.collection("agreements");
        const paymentsCollection = db.collection("payments");
        const couponsCollection = db.collection("coupons");
        const announcementsCollection = db.collection("announcements");

        // Import routes
        const authRoutes = require('./routes/auth.routes');
        const usersRoutes = require('./routes/users.routes');

        // Use routes
        app.use('/api/auth', authRoutes);
        app.use('/api/users', usersRoutes(usersCollection));
        // Add other routes here later

        // Test route
        app.get('/', (req, res) => {
            res.send('Aaponaloi Backend Server Running 🚀');
        });

    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
    }
}

run().catch(console.dir);

// Start server
app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});
