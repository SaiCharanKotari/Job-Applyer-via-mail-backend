const mongoose = require('mongoose');

async function mongoDB() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Mongo successfully connected");
  } catch (error) {
    console.log("error DB");
  }
}

module.exports = mongoDB;