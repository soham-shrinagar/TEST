require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const models = {
  User: require('../models/User'),
  Profile: require('../models/Profile'),
  Match: require('../models/Match'),
  Session: require('../models/Session'),
  Campaign: require('../models/Campaign'),
  CampaignApplication: require('../models/CampaignApplication'),
  CampaignPost: require('../models/CampaignPost'),
  RecommendationCache: require('../models/RecommendationCache'),
  UserEvent: require('../models/UserEvent'),
  Conversation: require('../models/Conversation'),
  Message: require('../models/Message'),
  Notification: require('../models/Notification'),
  StoreDeal: require('../models/StoreDeal'),
  StoreDealApplication: require('../models/StoreDealApplication'),
};

const createIndexes = async () => {
  await connectDB();

  await models.User.collection.createIndexes([
    { key: { email: 1 }, unique: true, sparse: true },
    { key: { google_id: 1 }, unique: true, sparse: true },
    { key: { instagram_auth_id: 1 }, unique: true, sparse: true },
    { key: { role: 1, lastActiveAt: -1 } },
    { key: { role: 1, instagram_verified: 1, follower_count: -1 } },
  ]);

  await models.Profile.collection.createIndexes([
    { key: { user: 1 }, unique: true },
    { key: { role: 1, updatedAt: -1 } },
    { key: { role: 1, location: 1 } },
    { key: { role: 1, interests: 1 } },
    { key: { role: 1, availability: 1 } },
    { key: { user: 1, role: 1 } },
  ]);

  await models.Match.collection.createIndexes([
    { key: { user1: 1, user2: 1 }, unique: true },
    { key: { user1: 1, createdAt: -1 } },
    { key: { user2: 1, createdAt: -1 } },
  ]);

  await models.Session.collection.createIndexes([
    { key: { user: 1 } },
    { key: { expiresAt: 1 } },
    { key: { user: 1, revokedAt: 1 } },
    { key: { user: 1, revokedAt: 1, expiresAt: 1 } },
  ]);

  await models.Campaign.collection.createIndexes([
    { key: { brand: 1, status: 1, createdAt: -1 } },
    { key: { status: 1, applicationDeadline: 1 } },
    { key: { status: 1, budgetPerCreator: -1 } },
    { key: { status: 1, 'requirements.niches': 1 } },
    { key: { status: 1, 'requirements.locations': 1 } },
    { key: { brand: 1, updatedAt: -1 } },
  ]);

  await models.CampaignApplication.collection.createIndexes([
    { key: { campaign: 1, creator: 1 }, unique: true },
    { key: { creator: 1, status: 1 } },
    { key: { campaign: 1, status: 1 } },
    { key: { campaign: 1, paymentStatus: 1 } },
    { key: { creator: 1, updatedAt: -1 } },
  ]);

  await models.CampaignPost.collection.createIndexes([
    { key: { campaign: 1, approvalStatus: 1 } },
    { key: { application: 1, deliverableType: 1 } },
    { key: { creator: 1, createdAt: 1 } },
    { key: { creator: 1, approvalStatus: 1 } },
    { key: { approvalStatus: 1, instagramPostUrl: 1 } },
  ]);

  await models.RecommendationCache.collection.createIndexes([
    { key: { userId: 1, contextKey: 1 }, unique: true },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
  ]);

  await models.UserEvent.collection.createIndexes([
    { key: { actor: 1, target: 1, eventType: 1 } },
    { key: { createdAt: 1 } },
    { key: { actor: 1, createdAt: -1 } },
    { key: { target: 1, eventType: 1 } },
  ]);

  await models.Conversation.collection.createIndexes([
    { key: { participants: 1 } },
    { key: { participantsKey: 1, type: 1 }, unique: true },
    { key: { participants: 1, lastMessageAt: -1, updatedAt: -1 } },
  ]);

  await models.Message.collection.createIndexes([
    { key: { conversation: 1 } },
    { key: { conversation: 1, createdAt: 1 } },
    { key: { conversation: 1, sender: 1 } },
    { key: { 'readReceipts.user': 1 }, sparse: true },
    { key: { readBy: 1 }, sparse: true },
  ]);

  await models.Notification.collection.createIndexes([
    { key: { user: 1, createdAt: -1 } },
    { key: { user: 1, read: 1 } },
  ]);

  await models.StoreDeal.collection.createIndexes([
    { key: { store: 1, status: 1 } },
    { key: { status: 1 } },
    { key: { 'requirements.preferredNiches': 1 } },
    { key: { 'requirements.location': 1 } },
    { key: { store: 1, updatedAt: -1 } },
    {
      key: { status: 1, 'requirements.preferredNiches': 1, 'requirements.location': 1 },
      name: 'creator_discover_compound',
    },
  ]);

  await models.StoreDealApplication.collection.createIndexes([
    { key: { storeDeal: 1, creator: 1 }, unique: true, name: 'deal_creator_unique' },
    { key: { storeDeal: 1 } },
    { key: { creator: 1 } },
    { key: { status: 1 } },
    { key: { creator: 1, updatedAt: -1 } },
  ]);

  await mongoose.disconnect();
  console.log('MongoDB indexes created.');
};

createIndexes().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
