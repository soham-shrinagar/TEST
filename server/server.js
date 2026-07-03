const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const http = require('http');
const fs = require('fs');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const passport = require('passport');
const cron = require('node-cron');
const connectDB = require('./config/db');
const configurePassport = require('./config/passport');
const { configureMongoDns } = require('./config/mongoDns');
const { initMessengerSocket } = require('./services/messengerSocket');
const User = require('./models/User');
const campaignRoutes = require('./routes/campaignRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { instagramQueue, recommendationsQueue, addJob } = require('./config/queues');
const { startWorkers } = require('./workers');

const app = express();
const server = http.createServer(app);
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json());

const registerSessionAndRoutes = () => {
  app.use(session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'creatorsync-dev-session',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  }));
  configurePassport();
  app.use(passport.initialize());
  app.use(passport.session());
  app.use('/uploads', express.static(uploadsDir));

  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/auth', require('./routes/authRoutes'));
  app.use('/api/user', require('./routes/userRoutes'));
  app.use('/api/profile', require('./routes/profileRoutes'));
  app.use('/api/matches', require('./routes/matchRoutes'));
  app.use('/api/analytics', require('./routes/analyticsRoutes'));
  app.use('/api/instagram', require('./routes/instagramRoutes'));
  app.use('/api/messenger', require('./routes/messengerRoutes'));
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api/feed', require('./routes/feedRoutes'));
  app.use('/api/recommendations', require('./routes/recommendationRoutes'));
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/store', require('./routes/storeRoutes'));
};

app.get('/', (req, res) => res.send('CreatorSync API is running'));

app.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ message: err.message || 'Request failed' });
  }
  return next();
});

const startServer = async () => {
  await configureMongoDns(process.env.MONGO_URI);
  registerSessionAndRoutes();
  await connectDB();
  startWorkers();
  cron.schedule('0 3 * * *', async () => {
    try {
      const users = await User.find({ instagram_verified: true, instagram_access_token: { $exists: true, $ne: '' } });
      await Promise.all(users.map((user) => (
        addJob(instagramQueue, 'fetch-verified', { userId: user._id.toString() })
      )));
    } catch (error) {
      console.error(`Instagram refresh failed: ${error.message}`);
    }
  });
  cron.schedule('0 */6 * * *', async () => {
    try {
      console.log('Refreshing campaign post stats...');
      await addJob(instagramQueue, 'refresh-live-posts');
    } catch (error) {
      console.error(`Campaign post refresh failed: ${error.message}`);
    }
  });
  cron.schedule('0 3 * * *', async () => {
    console.log('Generating recommendations...');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [activeBrands, activeCreators] = await Promise.all([
      User.find({ role: 'brand', lastActiveAt: { $gt: sevenDaysAgo } }).select('_id'),
      User.find({ role: { $in: ['creator', 'influencer'] }, lastActiveAt: { $gt: sevenDaysAgo } }).select('_id'),
    ]);

    for (const brand of activeBrands) {
      try {
        await addJob(recommendationsQueue, 'generate-brand', { userId: brand._id.toString(), contextKey: '' });
      } catch (error) {
        console.error('Reco gen failed for brand', brand._id, error.message);
      }
    }

    for (const creator of activeCreators) {
      try {
        await addJob(recommendationsQueue, 'generate-creator', { userId: creator._id.toString() });
      } catch (error) {
        console.error('Reco gen failed for creator', creator._id, error.message);
      }
    }
    console.log('Recommendations generated.');
  });
  initMessengerSocket(server);
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

startServer().catch((error) => {
  console.error(`Server startup failed: ${error.message}`);
  process.exit(1);
});
