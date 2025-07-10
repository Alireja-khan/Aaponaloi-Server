const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vgnu9ma.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// MongoDB client setup
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
    const apartmentCollection = db.collection('apartments');
    const agreementCollection = db.collection('agreements');

    // ========== Apartments ==========

    // GET all apartments
    app.get('/apartments', async (req, res) => {
      const apartments = await apartmentCollection.find().toArray();
      res.send(apartments);
    });

    // Optional: POST new apartment
    app.post('/apartments', async (req, res) => {
      try {
        const apartment = req.body;
        const result = await apartmentCollection.insertOne(apartment);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ message: 'Failed to create apartment' });
      }
    });

    // ========== Agreements ==========

    // GET agreements by email
    app.get('/agreements', async (req, res) => {
      const { email } = req.query;
      if (!email) return res.status(400).send({ message: 'Email required' });

      const userAgreements = await agreementCollection.find({ email }).toArray();
      res.send(userAgreements);
    });

    // POST new agreement (with duplicate check)
    app.post('/agreements', async (req, res) => {
      try {
        const { email, apartmentNo } = req.body;

        if (!email || !apartmentNo) {
          return res.status(400).send({ message: 'Missing required fields' });
        }

        // Check if already applied for the same apartment
        const existing = await agreementCollection.findOne({ email, apartmentNo });
        if (existing) {
          return res.status(409).send({ message: 'Already applied for this apartment' });
        }

        const agreement = {
          ...req.body,
          status: 'pending',
          createdAt: new Date(),
        };

        const result = await agreementCollection.insertOne(agreement);
        res.status(201).send(result);
      } catch (error) {
        console.error('Agreement creation error:', error);
        res.status(500).send({ message: 'Failed to create agreement' });
      }
    });

    // PATCH status update (optional, for admin panel)
    app.patch('/agreements/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const { status } = req.body;

        if (!status) return res.status(400).send({ message: 'Status is required' });

        const result = await agreementCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status } }
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Failed to update status' });
      }
    });

    await client.db('admin').command({ ping: 1 });
    console.log('✅ Connected to MongoDB');
  } finally {
    // keep alive for server
  }
}
run().catch(console.dir);

// Default route
app.get('/', (req, res) => {
  res.send('🏡 Aaponaloi Backend Running 🚀');
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});



