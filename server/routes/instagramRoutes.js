const express = require('express');
const axios = require('axios');
const User = require('../models/User');
const { requireAuth } = require('../middleware/authMiddleware');
const { encryptToken } = require('../utils/instagramTokenCrypto');
const {
  fetchVerifiedForUser,
  hasFreshInstagramCache,
  markInstagramTokenExpired,
  runPublicScraper,
  savePublicStats,
  serializeInstagramStats,
} = require('../services/instagramService');

const router = express.Router();

const isAllowedInstagramImageHost = (hostname) => (
  hostname === 'instagram.com' ||
  hostname.endsWith('.instagram.com') ||
  hostname.endsWith('.cdninstagram.com') ||
  hostname.includes('fbcdn.net')
);

router.get('/image', async (req, res) => {
  try {
    const imageUrl = String(req.query.url || '');
    if (!imageUrl) {
      return res.status(400).json({ message: 'Image URL is required' });
    }

    const parsedUrl = new URL(imageUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol) || !isAllowedInstagramImageHost(parsedUrl.hostname)) {
      return res.status(400).json({ message: 'Unsupported image URL' });
    }

    const response = await axios.get(imageUrl, {
      responseType: 'stream',
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        Referer: 'https://www.instagram.com/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      },
    });

    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
    return response.data.pipe(res);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Could not load Instagram image' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(serializeInstagramStats(user, { cached: true }));
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not load Instagram stats' });
  }
});

router.post('/fetch-public', requireAuth, async (req, res) => {
  try {
    const username = String(req.body.username || req.user.instagram_handle || '').replace(/^@/, '').trim();
    if (!username) {
      return res.status(400).json({ message: 'Instagram username is required' });
    }

    const user = await User.findById(req.user._id);
    if (!req.body.force && hasFreshInstagramCache(user) && user.instagram_handle?.toLowerCase() === username.toLowerCase()) {
      return res.json(serializeInstagramStats(user, { cached: true }));
    }

    const stats = await runPublicScraper(username);
    const updatedUser = await savePublicStats(req.user._id, stats);

    return res.json(serializeInstagramStats(updatedUser, { cached: false }));
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Could not fetch Instagram stats' });
  }
});

router.get('/auth', requireAuth, async (req, res) => {
  try {
    req.session.instagram_connect_user_id = req.user._id.toString();
    const params = new URLSearchParams({
      client_id: process.env.INSTAGRAM_AUTH_CLIENT_ID || '',
      redirect_uri: process.env.INSTAGRAM_REDIRECT_URI || '',
      scope: 'user_profile,user_media',
      response_type: 'code',
    });
    const url = `https://api.instagram.com/oauth/authorize?${params.toString()}`;

    if (req.accepts('json') && !req.accepts('html')) {
      return res.json({ url });
    }

    return res.redirect(url);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not start Instagram authorization' });
  }
});

router.get('/callback', async (req, res) => {
  try {
    if (!req.query.code) {
      return res.status(400).json({ message: 'Missing Instagram authorization code' });
    }

    const userId = req.user?._id || req.session?.instagram_connect_user_id;
    if (!userId) {
      return res.status(401).json({ message: 'Instagram connection session expired' });
    }

    const form = new URLSearchParams({
      client_id: process.env.INSTAGRAM_AUTH_CLIENT_ID || '',
      client_secret: process.env.INSTAGRAM_AUTH_CLIENT_SECRET || '',
      grant_type: 'authorization_code',
      redirect_uri: process.env.INSTAGRAM_REDIRECT_URI || '',
      code: req.query.code,
    });

    const shortTokenResponse = await axios.post('https://api.instagram.com/oauth/access_token', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const longTokenResponse = await axios.get('https://graph.instagram.com/access_token', {
      params: {
        grant_type: 'ig_exchange_token',
        client_secret: process.env.INSTAGRAM_AUTH_CLIENT_SECRET,
        access_token: shortTokenResponse.data.access_token,
      },
    });

    let user = await User.findByIdAndUpdate(
      userId,
      { $set: { instagram_access_token: encryptToken(longTokenResponse.data.access_token) } },
      { new: true }
    );
    user = await fetchVerifiedForUser(user);

    return res.redirect(`${process.env.CLIENT_URL || ''}/creator/dashboard?verified=true`);
  } catch (error) {
    const message = error.response?.data?.error_message || error.response?.data?.error?.message || error.message;
    return res.status(400).json({ message: message || 'Could not verify Instagram account' });
  }
});

router.get('/fetch-verified', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user?.instagram_access_token) {
      return res.status(400).json({ message: 'No verified Instagram connection found' });
    }

    const updatedUser = await fetchVerifiedForUser(user);
    return res.json(serializeInstagramStats(updatedUser, { cached: false }));
  } catch (error) {
    const code = error.response?.data?.error?.code;
    if (code === 190) {
      await markInstagramTokenExpired(req.user._id);
      return res.status(401).json({ error: 'token_expired' });
    }

    return res.status(400).json({ message: error.message || 'Could not fetch verified Instagram stats' });
  }
});

router.delete('/disconnect', requireAuth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $set: { instagram_verified: false },
      $unset: { instagram_access_token: 1 },
    });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not disconnect Instagram' });
  }
});

module.exports = router;
