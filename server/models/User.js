const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['influencer', 'creator', 'brand', 'store', null],
    default: null,
  },
  accountStatus: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active',
  },
  google_id: { type: String, unique: true, sparse: true },
  instagram_auth_id: { type: String, unique: true, sparse: true },
  display_name: { type: String, trim: true, default: '' },
  profile_pic: { type: String, default: '' },
  auth_provider: {
    type: String,
    enum: ['google', 'instagram', 'local'],
    default: 'local',
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: { type: String, default: null },
  emailVerificationExpires: { type: Date, default: null },
  instagram_access_token: { type: String, default: '' },
  instagram_verified: { type: Boolean, default: false },
  instagram_last_synced_at: { type: Date },
  follower_count: { type: Number, default: 0 },
  following_count: { type: Number, default: 0 },
  media_count: { type: Number, default: 0 },
  biography: { type: String, default: '' },
  instagram_handle: { type: String, trim: true, default: '' },
  instagram_profile_pic: { type: String, default: '' },
  engagement_rate: { type: Number, default: 0 },
  avg_like_count: { type: Number, default: 0 },
  avg_comment_count: { type: Number, default: 0 },
  instagram_source: { type: String, default: '' },
  instagram_recent_posts: [{
    shortcode: { type: String, default: '' },
    display_url: { type: String, default: '' },
    like_count: { type: Number, default: 0 },
    comment_count: { type: Number, default: 0 },
    is_video: { type: Boolean, default: false },
    timestamp: { type: Date },
  }],
  onboardingComplete: {
    type: Boolean,
    default: false,
  },
  lastActiveAt: { type: Date },

  // Store-specific profile (only populated when role === 'store')
  storeProfile: {
    storeName: { type: String, default: '' },
    storeType: {
      type: String,
      enum: ['cafe', 'restaurant', 'retail_store', 'salon_spa', 'gym_fitness', 'bakery', 'bar_lounge', 'bookstore', 'clothing_boutique', 'other', ''],
      default: '',
    },
    description: { type: String, maxlength: 500, default: '' },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      googleMapsLink: { type: String, default: '' },
    },
    contactPhone: { type: String, default: '' },
    websiteUrl: { type: String, default: '' },
    instagramHandle: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    logoImage: { type: String, default: '' },
    openingHours: { type: String, default: '' },
    averageSpend: { type: String, default: '' },
    // Verification
    storeVerified: { type: Boolean, default: false },
    verificationRequested: { type: Boolean, default: false },
    gstNumber: { type: String, default: '' },
    // Active deal tracking
    activeDealId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreDeal', default: null },
    totalDealsPosted: { type: Number, default: 0 },
    totalCreatorsWorkedWith: { type: Number, default: 0 },
    // Reviews (aggregated from StoreDealApplication.review)
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
