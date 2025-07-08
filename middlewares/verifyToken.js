const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).send({ message: 'Unauthorized' });

  const token = authHeader.split(' ')[1]; // Bearer TOKEN
  jwt.verify(token, secret, (err, decoded) => {
    if (err) return res.status(403).send({ message: 'Forbidden' });

    req.user = decoded; // Save decoded user info to req.user
    next();
  });
};

module.exports = verifyToken;
