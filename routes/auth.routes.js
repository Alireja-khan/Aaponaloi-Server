const express = require('express');
const router = express.Router();
const { generateToken } = require('../utils/jwt');

router.post('/jwt', (req, res) => {
  const user = req.body;
  if (!user?.email) {
    return res.status(400).send({ message: 'Email is required' });
  }

  const token = generateToken({ email: user.email, role: user.role || 'user' });
  res.send({ token });
});

module.exports = router;
