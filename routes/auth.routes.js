const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { generateToken } = require('../utils/jwt');

// Login/Register combined logic
router.post('/jwt', async (req, res) => {
  const user = req.body;
  const token = generateToken(user);
  res.send({ token });
});

module.exports = router;
