const express = require('express');
const router = express.Router();

module.exports = (usersCollection) => {
  router.get('/', async (req, res) => {
    const users = await usersCollection.find().toArray();
    res.send(users);
  });



  router.get('/profile/:email', async (req, res) => {
    const email = req.params.email;
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(404).send({ message: 'User not found' });
    res.send(user);
  });



  router.put('/profile/:email', async (req, res) => {
    const email = req.params.email;
    const updateData = req.body;
    const result = await usersCollection.updateOne(
      { email },
      { $set: updateData },
      { upsert: true }
    );
    res.send(result);
  });

  return router;
};
