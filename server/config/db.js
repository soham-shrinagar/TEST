const mongoose = require('mongoose');
const { configureMongoDns } = require('./mongoDns');

const getMongoHelpMessage = (errorMessage) => {
  if (/bad auth|authentication failed/i.test(errorMessage)) {
    return 'Atlas rejected the database username or password. Reset the Atlas database user password in Database Access, then update MONGO_URI in server/.env.';
  }

  if (/querySrv|ENOTFOUND|ECONNREFUSED/i.test(errorMessage)) {
    return 'Atlas could not be reached. Double-check the cluster hostname in MONGO_URI, your internet/DNS, and Atlas Network Access IP allowlist.';
  }

  if (/IP|whitelist|not allowed/i.test(errorMessage)) {
    return 'Your current IP is not allowed by Atlas. Add it in Atlas Network Access, or use 0.0.0.0/0 temporarily for development.';
  }

  return null;
};

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI?.trim();

  if (!mongoUri) {
    console.error('MongoDB connection error: MONGO_URI is missing in server/.env');
    process.exit(1);
  }

  await configureMongoDns(mongoUri);

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    const errorMessage = error?.message || 'Unknown MongoDB error';
    const helpMessage = getMongoHelpMessage(errorMessage);

    console.error(`MongoDB connection error: ${errorMessage}`);
    if (helpMessage) {
      console.error(helpMessage);
    }
    process.exit(1);
  }
};

module.exports = connectDB;
