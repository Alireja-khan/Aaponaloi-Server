const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET;

exports.generateToken = (user) => {
  // user can be { email, role }
  return jwt.sign(user, secret, { expiresIn: '7d' });
};

exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null; // invalid or expired token
  }
};
