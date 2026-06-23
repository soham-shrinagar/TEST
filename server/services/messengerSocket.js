const jwt = require('jsonwebtoken');
const { WebSocket, WebSocketServer } = require('ws');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Session = require('../models/Session');
const User = require('../models/User');
const { markMessagesAsRead } = require('./messengerService');
const { redis, redisPub, redisSub } = require('../config/redis');

const onlineUsers = new Map();
let notifyParticipants = () => {};
const MESSAGE_CHANNEL = 'messenger:deliver';

const parseToken = (request) => {
  const url = new URL(request.url, 'http://localhost');
  return url.searchParams.get('token');
};

const sendJson = (socket, payload) => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
};

const deliverToParticipants = (conversation, payload) => {
  conversation.participants.forEach((participantId) => {
    const sockets = onlineUsers.get(participantId.toString());
    if (!sockets) return;

    sockets.forEach((socket) => sendJson(socket, payload));
  });
};

const deliverToUser = (userId, payload) => {
  const sockets = onlineUsers.get(userId.toString());
  if (!sockets) return;
  sockets.forEach((socket) => sendJson(socket, payload));
};

const publishDelivery = async (payload) => {
  try {
    await redisPub.publish(MESSAGE_CHANNEL, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error(`[messenger:publish] ${error.message}`);
    return false;
  }
};

const broadcastToParticipants = async (conversation, payload) => {
  const published = await publishDelivery({
    mode: 'participants',
    participantIds: conversation.participants.map((participantId) => participantId.toString()),
    payload,
  });
  if (!published) deliverToParticipants(conversation, payload);
};

const notifyUser = async (userId, payload) => {
  const published = await publishDelivery({
    mode: 'user',
    userId: userId.toString(),
    payload,
  });
  if (!published) deliverToUser(userId, payload);
};

const verifySocketUser = async (request) => {
  const token = parseToken(request);
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId;
    const sessionId = decoded.sid;
    const sessionFilter = {
      user: userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    };
    if (sessionId) {
      sessionFilter._id = sessionId;
    }
    const session = await Session.findOne(sessionFilter);
    if (!session) return null;
    return User.findById(userId).select('-password');
  } catch {
    return null;
  }
};

const revalidateOnlineSessions = async () => {
  await Promise.all(Array.from(onlineUsers.entries()).map(async ([userId, sockets]) => {
    const session = await Session.findOne({
      user: userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
    if (session) return;

    sockets.forEach((socket) => {
      socket.close(4401, 'Session revoked');
    });
    onlineUsers.delete(userId);
  }));
};

const emitReadReceipts = async (conversation, readerId) => {
  const receipts = await markMessagesAsRead(conversation._id, readerId);
  if (!receipts.length) return receipts;

  notifyParticipants(conversation, {
    type: 'read_receipt',
    conversationId: conversation._id,
    receipts,
  });

  return receipts;
};

const initMessengerSocket = (server) => {
  const wss = new WebSocketServer({ server, path: '/ws/messenger' });
  notifyParticipants = broadcastToParticipants;

  redisSub.subscribe(MESSAGE_CHANNEL).catch((error) => {
    console.error(`[messenger:subscribe] ${error.message}`);
  });

  redisSub.on('message', (channel, raw) => {
    if (channel !== MESSAGE_CHANNEL) return;
    try {
      const message = JSON.parse(raw);
      if (message.mode === 'participants') {
        message.participantIds.forEach((participantId) => deliverToUser(participantId, message.payload));
      }
      if (message.mode === 'user') {
        deliverToUser(message.userId, message.payload);
      }
    } catch (error) {
      console.error(`[messenger:deliver] ${error.message}`);
    }
  });

  wss.on('connection', async (socket, request) => {
    const user = await verifySocketUser(request);

    if (!user) {
      sendJson(socket, { type: 'error', message: 'Authentication required' });
      socket.close(1008, 'Authentication required');
      return;
    }

    const userId = user._id.toString();
    const currentSockets = onlineUsers.get(userId) || new Set();
    currentSockets.add(socket);
    onlineUsers.set(userId, currentSockets);
    redis.setex(`online:${userId}`, 300, '1').catch(() => {});

    sendJson(socket, { type: 'connected', userId });

    const presenceInterval = setInterval(() => {
      redis.setex(`online:${userId}`, 300, '1').catch(() => {});
    }, 2 * 60 * 1000);

    socket.on('message', async (raw) => {
      try {
        const payload = JSON.parse(raw.toString());

        if (payload.type === 'ping') {
          sendJson(socket, { type: 'pong' });
          return;
        }

        if (payload.type === 'read') {
          const conversation = await Conversation.findOne({
            _id: payload.conversationId,
            participants: user._id,
          });

          if (!conversation) {
            sendJson(socket, { type: 'error', message: 'Conversation not found' });
            return;
          }

          await emitReadReceipts(conversation, user._id);
          return;
        }

        if (payload.type !== 'message') {
          sendJson(socket, { type: 'error', message: 'Unsupported websocket event' });
          return;
        }

        const body = String(payload.body || '').trim();
        if (!body) {
          sendJson(socket, { type: 'error', message: 'Message cannot be empty' });
          return;
        }

        const conversation = await Conversation.findOne({
          _id: payload.conversationId,
          participants: user._id,
        });

        if (!conversation) {
          sendJson(socket, { type: 'error', message: 'Conversation not found' });
          return;
        }

        const message = await Message.create({
          conversation: conversation._id,
          sender: user._id,
          body,
          readReceipts: [{ user: user._id, readAt: new Date() }],
          readBy: [user._id],
        });

        conversation.lastMessage = body;
        conversation.lastMessageAt = message.createdAt;
        await conversation.save();

        const populated = await message.populate('sender', 'name role');
        await broadcastToParticipants(conversation, {
          type: 'message',
          conversationId: conversation._id,
          message: populated,
        });
      } catch (error) {
        sendJson(socket, { type: 'error', message: error.message || 'Realtime message failed' });
      }
    });

    socket.on('close', () => {
      clearInterval(presenceInterval);
      const sockets = onlineUsers.get(userId);
      if (!sockets) return;

      sockets.delete(socket);
      if (sockets.size === 0) {
        onlineUsers.delete(userId);
        redis.del(`online:${userId}`).catch(() => {});
      }
    });
  });

  const interval = setInterval(() => {
    revalidateOnlineSessions().catch(() => {});
  }, 5 * 60 * 1000);
  wss.on('close', () => clearInterval(interval));

  return wss;
};

module.exports = {
  initMessengerSocket,
  notifyParticipants: (conversation, payload) => notifyParticipants(conversation, payload),
  notifyUser,
  emitReadReceipts,
};
