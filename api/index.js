const app = require('../index'); // path to your main server file
const serverless = require('serverless-http');

module.exports = serverless(app);
