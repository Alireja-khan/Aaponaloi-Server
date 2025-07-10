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
    const usersCollection = db.collection('users');
    const apartmentCollection = db.collection('apartments');
    const agreementCollection = db.collection('agreements');
    const announcementsCollection = db.collection('announcements');




    // ========== Apartments ==========

    // GET all apartments
    app.get('/apartments', async (req, res) => {
      const apartments = await apartmentCollection.find().toArray();
      res.send(apartments);
    });


    // GET all announcements
    app.get('/announcements', async (req, res) => {
      try {
        const announcements = await announcementsCollection.find().sort({ createdAt: -1 }).toArray();
        res.send(announcements);
      } catch (error) {
        res.status(500).send({ message: 'Failed to fetch announcements' });
      }
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

    // Admin: Get all agreement requests (no email required)
    app.get('/all-agreements', async (req, res) => {
      const allAgreements = await agreementCollection.find().toArray();
      res.send(allAgreements);
    });



    // GET agreements by email
    app.get('/agreements', async (req, res) => {
      const { email } = req.query;
      if (!email) return res.status(400).send({ message: 'Email required' });

      const existing = await agreementCollection.findOne({ email });

      if (existing) {
        return res.status(200).json({
          hasApplied: true,
          appliedApartment: existing.apartmentNo, // 👈 Include this!
        });
      }

      res.status(200).json({ hasApplied: false });
    });



    // ✅ Get accepted (checked) agreement for a user
    app.get('/agreements/accepted/:email', async (req, res) => {
      const email = req.params.email;

      try {
        const agreement = await agreementCollection.findOne({ email, status: 'checked' });

        if (!agreement) {
          return res.status(404).send({ message: 'No accepted agreement found' });
        }

        res.send(agreement);
      } catch (error) {
        console.error('Error fetching accepted agreement:', error);
        res.status(500).send({ message: 'Failed to fetch agreement' });
      }
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


    // ========== Users ==========

    // Save or update user on login
    app.put('/users/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;

      const existingUser = await usersCollection.findOne({ email });

      const update = {
        $set: {
          name: user.name,
          photo: user.photo,
          phone: user.phone,
          // Preserve existing role or use incoming role or default to 'user'
          role: existingUser?.role || user.role || 'user',
        },
      };

      const options = { upsert: true };
      const result = await usersCollection.updateOne({ email }, update, options);
      res.send(result);
    });


    // =========== Members ===========

    // Get all members
    app.get('/users/members', async (req, res) => {
      const members = await usersCollection.find({ role: 'member' }).toArray();
      res.send(members);
    });


    // Accept or reject agreement request
    app.patch('/agreements/respond/:id', async (req, res) => {
      const { status, userEmail, approve } = req.body;
      const id = req.params.id;

      try {
        // Step 1: update agreement status
        await agreementCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status } }
        );

        // Step 2: if approved, promote to member
        if (approve && userEmail) {
          await usersCollection.updateOne(
            { email: userEmail },
            { $set: { role: 'member' } }
          );
        }

        res.send({ message: 'Agreement updated successfully' });
      } catch (error) {
        res.status(500).send({ message: 'Failed to update agreement' });
      }
    });



    // Get a single user (for role check)
    app.get('/users/:email', async (req, res) => {
      const user = await usersCollection.findOne({ email: req.params.email });
      res.send(user);
    });




    // Change member role to user
    app.patch('/users/member-to-user/:email', async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.updateOne({ email }, { $set: { role: 'user' } });
      res.send(result);
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



