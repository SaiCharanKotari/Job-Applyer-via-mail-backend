const mongoose = require('mongoose');

const ipSchema = new mongoose.Schema({
  ip: {
    type: String,
  }
})
const IP = mongoose.model('ip_address', ipSchema);

module.exports = IP;