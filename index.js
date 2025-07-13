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
    const couponsCollection = db.collection('coupons');
    const paymentsCollection = db.collection('payments');
    const apartmentCollection = db.collection('apartments');
    const agreementCollection = db.collection('agreements');
    const announcementsCollection = db.collection('announcements');




    // ========== Apartments ==========

    // GET all apartments
    app.get('/apartments', async (req, res) => {
      try {
        const apartments = await apartmentCollection.find().toArray();
        const agreements = await agreementCollection.find().toArray();

        const bookedApartments = new Set(agreements.map(ag => ag.apartmentNo));

        const apartmentsWithStatus = apartments.map(apt => ({
          ...apt,
          isBooked: bookedApartments.has(apt.apartmentNo)
        }));

        res.send(apartmentsWithStatus);
      } catch (error) {
        console.error('Failed to fetch apartments:', error);
        res.status(500).send({ message: 'Failed to fetch apartments' });
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




    // ============ Payment =============

    // GET payment history by email
    app.get('/payments', async (req, res) => {
      const { email } = req.query;
      if (!email) return res.status(400).send({ message: 'Email is required' });

      try {
        const payments = await paymentsCollection
          .find({ email })
          .sort({ paidAt: -1 })
          .toArray();

        res.send(payments);
      } catch (error) {
        res.status(500).send({ message: 'Failed to fetch payment history' });
      }
    });




    // POST new payment
    app.post('/payments', async (req, res) => {
      try {
        const paymentData = req.body;

        // Required fields check
        const requiredFields = ['email', 'month', 'rent', 'apartmentNo'];
        for (const field of requiredFields) {
          if (!paymentData[field]) {
            return res.status(400).send({ message: `${field} is required` });
          }
        }

        // Prevent duplicate payment for the same month and apartment
        const exists = await paymentsCollection.findOne({
          email: paymentData.email,
          apartmentNo: paymentData.apartmentNo,
          month: paymentData.month,
        });

        if (exists) {
          return res.status(409).send({ message: 'Payment already exists for this month' });
        }

        paymentData.paidAt = new Date();

        const result = await paymentsCollection.insertOne(paymentData);
        res.status(201).send(result);
      } catch (error) {
        console.error('Payment error:', error);
        res.status(500).send({ message: 'Failed to save payment' });
      }
    });


    // ========== Users ==========


    // Get all users
    app.get('/users', async (req, res) => {
      try {
        const users = await usersCollection.find().toArray();
        res.send(users);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        res.status(500).send({ message: 'Failed to fetch users' });
      }
    });


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


    // Get a single user (for role check)
    app.get('/users/:email', async (req, res) => {
      const user = await usersCollection.findOne({ email: req.params.email });
      res.send(user);
    });


    // PATCH to make admin
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      try {
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { role: 'admin' } }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Failed to make admin' });
      }
    });


    // PATCH to remove admin (set to member)
    app.patch('/users/remove-admin/:id', async (req, res) => {
      const id = req.params.id;
      try {
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { role: 'user' } }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Failed to remove admin' });
      }
    });





    // =========== Members ===========

    // Get all members
    app.get('/members', async (req, res) => {
      try {
        const members = await usersCollection.find({ role: 'member' }).toArray();
        res.send(members);
      } catch (error) {
        res.status(500).send({ message: 'Failed to fetch members' });
      }
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



    //  ================= Admin ====================


    // Change member role to user
    app.patch('/users/:email', async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.updateOne({ email }, { $set: { role: 'user' } });
      res.send(result);
    });




    // ============= Announcements ===============


    // GET all announcements
    app.get('/announcements', async (req, res) => {
      try {
        const announcements = await announcementsCollection.find().sort({ createdAt: -1 }).toArray();
        res.send(announcements);
      } catch (error) {
        res.status(500).send({ message: 'Failed to fetch announcements' });
      }
    });


    // Create announcement
    app.post('/announcements', async (req, res) => {
      try {
        const { title, description } = req.body;

        if (!title || !description) {
          return res.status(400).send({ message: 'Title and description are required' });
        }

        const newAnnouncement = {
          title,
          description,
          createdAt: new Date(),
        };

        const result = await announcementsCollection.insertOne(newAnnouncement);
        res.status(201).send(result);
      } catch (error) {
        console.error('Failed to create announcement:', error);
        res.status(500).send({ message: 'Failed to create announcement' });
      }
    });


    //================== Coupons ==================== 


    app.get('/coupons', async (req, res) => {
      try {
        const coupons = await couponsCollection.find().sort({ createdAt: -1 }).toArray();
        res.send(coupons);
      } catch (error) {
        console.error('Failed to fetch coupons:', error);
        res.status(500).send({ message: 'Failed to fetch coupons' });
      }
    });


    // Get single coupon by code
    app.get('/coupons/:code', async (req, res) => {
      try {
        const code = req.params.code.toUpperCase(); // ensure case-insensitive match
        const coupon = await couponsCollection.findOne({ code });

        if (!coupon) {
          return res.status(404).send({ message: 'Coupon not found' });
        }

        res.send(coupon);
      } catch (error) {
        console.error('Failed to fetch coupon by code:', error);
        res.status(500).send({ message: 'Failed to fetch coupon' });
      }
    });



    // Get accepted agreement by user email
    app.get('/agreements/accepted/:email', async (req, res) => {
      try {
        const email = req.params.email;

        // Assuming your MongoDB collection is called 'agreementsCollection'
        const agreement = await agreementsCollection.findOne({
          email: email,
          status: 'accepted',
        });

        if (!agreement) {
          return res.status(404).send({ message: 'No accepted agreement found' });
        }

        res.send(agreement);
      } catch (error) {
        console.error('Failed to fetch accepted agreement:', error);
        res.status(500).send({ message: 'Server error while fetching agreement' });
      }
    });




    app.post('/coupons', async (req, res) => {
      try {
        const { code, discount, description } = req.body;

        if (!code || !discount || !description) {
          return res.status(400).send({ message: 'All fields are required' });
        }

        const coupon = {
          code,
          discount: parseFloat(discount),
          description,
          createdAt: new Date(),
        };

        const result = await couponsCollection.insertOne(coupon);
        res.status(201).send(result);
      } catch (error) {
        console.error('Failed to add coupon:', error);
        res.status(500).send({ message: 'Failed to add coupon' });
      }
    });


    app.put('/coupons/:id', async (req, res) => {
      const { id } = req.params;
      const { code, discount, description } = req.body;

      if (!code || !discount || !description) {
        return res.status(400).send({ message: 'All fields are required' });
      }

      try {
        const updatedCoupon = {
          code,
          discount: parseFloat(discount),
          description,
          updatedAt: new Date()
        };

        const result = await couponsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedCoupon }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'Coupon not found' });
        }

        res.status(200).send({ message: 'Coupon updated successfully' });
      } catch (error) {
        console.error('Failed to update coupon:', error);
        res.status(500).send({ message: 'Failed to update coupon' });
      }
    });



    app.delete('/coupons/:id', async (req, res) => {
      const id = req.params.id;
      try {
        const result = await couponsCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 1) {
          res.status(200).send({ success: true });
        } else {
          res.status(404).send({ success: false, message: 'Coupon not found' });
        }
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
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



