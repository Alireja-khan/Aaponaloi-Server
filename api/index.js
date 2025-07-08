const app = require('../server'); // path to your main server file
const serverless = require('serverless-http');

module.exports = serverless(app);
