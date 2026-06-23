import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/axios';
import ChatMessage from './ChatMessage';
import { useAuth } from '../context/AuthContext';
import { avatarUrl } from '../utils/images';
import { getReadReceiptForUser, getUserId, isImageAttachment, isVideoAttachment } from '../utils/messenger';

const getSocketUrl = (token) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = import.meta.env.DEV ? '127.0.0.1:5001' : window.location.host;
  return `${protocol}//${host}/ws/messenger?token=${encodeURIComponent(token)}`;
};

const applyReadReceipts = (messages, receipts) => {
  if (!receipts?.length) return messages;

  return messages.map((message) => {
    const incoming = receipts.filter((receipt) => getUserId(receipt.messageId) === getUserId(message._id));
    if (!incoming.length) return message;

    const nextReceipts = [...(message.readReceipts || [])];
    incoming.forEach(({ readerId, readAt }) => {
      const alreadyRecorded = nextReceipts.some((receipt) => getUserId(receipt.user) === getUserId(readerId));
      if (!alreadyRecorded) {
        nextReceipts.push({ user: readerId, readAt });
      }
    });

    return { ...message, readReceipts: nextReceipts };
  });
};

const ChatModal = ({ conversation: initialConversation, participantId, onClose, onConversationReady }) => {
  const { user } = useAuth();
  const [conversation, setConversation] = useState(initialConversation || null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connectionState, setConnectionState] = useState('connecting');
  const [error, setError] = useState('');
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const dragRef = useRef(null);
  const [position, setPosition] = useState({ x: Math.max(16, window.innerWidth - 560), y: 88 });
  const [size, setSize] = useState({ width: 520, height: Math.min(720, window.innerHeight - 120) });

  const profile = conversation?.profile || conversation?.otherUser || {};
  const title = profile?.displayName || conversation?.otherUser?.name || 'Conversation';
  const otherUserId = conversation?.otherUser?._id || conversation?.profile?.userId;

  const groupedMessages = useMemo(() => messages.map((message) => ({
    ...message,
    mine: getUserId(message.sender) === getUserId(user?._id),
  })), [messages, user?._id]);

  useEffect(() => {
    if (!attachment) {
      setAttachmentPreviewUrl('');
      return undefined;
    }

    if (!attachment.type?.startsWith('image/') && !attachment.type?.startsWith('video/')) {
      setAttachmentPreviewUrl('');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(attachment);
    setAttachmentPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [attachment]);

  useEffect(() => {
    let cancelled = false;

    const openConversation = async () => {
      try {
        setLoading(true);
        setError('');

        let activeConversation = initialConversation;
        if (!activeConversation && participantId) {
          const { data } = await api.post('/messenger/conversations', { participantId });
          activeConversation = data;
          if (!cancelled) {
            setConversation(data);
            onConversationReady?.(data);
          }
        }

        if (!activeConversation?._id) {
          throw new Error('Conversation could not be opened');
        }

        const { data: history } = await api.get(`/messenger/conversations/${activeConversation._id}/messages`);
        if (!cancelled) {
          setMessages(history);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || 'Could not open chat');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    openConversation();

    return () => {
      cancelled = true;
    };
  }, [initialConversation, participantId, onConversationReady]);

  useEffect(() => {
    if (!conversation?._id || !user?.token) return undefined;

    const socket = new WebSocket(getSocketUrl(user.token));
    socketRef.current = socket;
    setConnectionState('connecting');

    socket.addEventListener('open', () => setConnectionState('live'));
    socket.addEventListener('close', () => setConnectionState('offline'));
    socket.addEventListener('error', () => setConnectionState('offline'));
    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'message' && getUserId(payload.conversationId) === getUserId(conversation._id)) {
          setMessages((current) => (
            current.some((message) => message._id === payload.message._id)
              ? current
              : [...current, payload.message]
          ));
        }

        if (payload.type === 'read_receipt' && getUserId(payload.conversationId) === getUserId(conversation._id)) {
          setMessages((current) => applyReadReceipts(current, payload.receipts));
        }

        if (payload.type === 'error') {
          setError(payload.message);
        }
      } catch {
        setError('Realtime message could not be read');
      }
    });

    return () => {
      socket.close();
    };
  }, [conversation?._id, user?.token]);

  useEffect(() => {
    if (!conversation?._id || loading) return undefined;

    const hasUnreadFromOther = messages.some((message) => {
      const mine = getUserId(message.sender) === getUserId(user?._id);
      return !mine && !getReadReceiptForUser(message, user?._id);
    });

    if (!hasUnreadFromOther) return undefined;

    const markRead = async () => {
      try {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type: 'read', conversationId: conversation._id }));
          return;
        }
        const { data } = await api.post(`/messenger/conversations/${conversation._id}/read`);
        setMessages((current) => applyReadReceipts(current, data.receipts));
      } catch {
        // Ignore read receipt failures so chat stays usable.
      }
    };

    markRead();
  }, [messages, conversation?._id, loading, user?._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, loading]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const nextBody = body.trim();
    if ((!nextBody && !attachment) || !conversation?._id) return;

    setSending(true);
    setError('');

    try {
      const socket = socketRef.current;
      if (attachment) {
        const payload = new FormData();
        payload.append('body', nextBody);
        payload.append('attachment', attachment);
        const { data } = await api.post(`/messenger/conversations/${conversation._id}/messages`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessages((current) => [...current, data]);
      } else if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'message', conversationId: conversation._id, body: nextBody }));
      } else {
        const { data } = await api.post(`/messenger/conversations/${conversation._id}/messages`, { body: nextBody });
        setMessages((current) => [...current, data]);
      }
      setBody('');
      setAttachment(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Message could not be sent');
    } finally {
      setSending(false);
    }
  };

  const startDrag = (event) => {
    if (event.target.closest('button')) return;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };
    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('mouseup', stopDrag);
  };

  const handleDrag = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    setPosition({
      x: Math.min(Math.max(8, drag.originX + event.clientX - drag.startX), window.innerWidth - 220),
      y: Math.min(Math.max(8, drag.originY + event.clientY - drag.startY), window.innerHeight - 160),
    });
  };

  const stopDrag = () => {
    dragRef.current = null;
    window.removeEventListener('mousemove', handleDrag);
    window.removeEventListener('mouseup', stopDrag);
  };

  const handleResize = (event) => {
    setSize({ width: event.currentTarget.offsetWidth, height: event.currentTarget.offsetHeight });
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <section
        className="panel pointer-events-auto fixed flex min-h-[28rem] min-w-[20rem] flex-col overflow-hidden"
        onMouseUp={handleResize}
        style={{
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height,
          resize: 'both',
          maxWidth: 'calc(100vw - 16px)',
          maxHeight: 'calc(100vh - 16px)',
        }}
      >
        <header onMouseDown={startDrag} className="flex cursor-move items-center gap-3 border-b border-ink/10 px-4 py-3">
          <img src={avatarUrl(profile, title)} alt={title} className="h-11 w-11 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-extrabold text-ink">{title}</h2>
            <p className="text-xs font-bold capitalize text-ink/42">
              {conversation?.type === 'outreach' ? 'Outreach' : 'Matched chat'} · {connectionState}
            </p>
          </div>
          <button onClick={onClose} className="btn-secondary px-3 py-2 text-xs">
            Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto bg-white px-4 py-4">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-pulse rounded-lg bg-ink/10" />
                <p className="mt-3 text-sm font-bold text-ink/46">Opening chat...</p>
              </div>
            </div>
          ) : messages.length ? (
            <div className="space-y-3">
              {groupedMessages.map((message) => (
                <ChatMessage
                  key={message._id}
                  message={message}
                  mine={message.mine}
                  otherUserId={otherUserId}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <h3 className="text-lg font-extrabold text-ink">Start the conversation</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-ink/55">
                  Send a clear first message about the collaboration, budget, timing, or audience fit.
                </p>
              </div>
            </div>
          )}
        </div>

        {error ? (
          <div className="border-t border-[#ff7a1a]/20 bg-[#fff5ec] px-4 py-2 text-xs font-bold text-[#b64c00]">
            {error}
          </div>
        ) : null}

        <form onSubmit={sendMessage} className="grid gap-2 border-t border-ink/10 bg-white p-3 sm:grid-cols-[auto_1fr_auto]">
          <label className="btn-secondary cursor-pointer px-3 py-2 text-xs">
            File
            <input
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={(event) => setAttachment(event.target.files?.[0] || null)}
              disabled={loading}
            />
          </label>
          <input
            className="field min-w-0 flex-1"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write a message"
            disabled={loading}
            maxLength={2000}
          />
          <button disabled={loading || sending || (!body.trim() && !attachment)} className="btn-primary shrink-0 px-4 disabled:cursor-not-allowed disabled:opacity-45">
            {sending ? 'Sending' : 'Send'}
          </button>
          {attachment ? (
            <div className="sm:col-span-3 rounded-lg border border-ink/10 bg-ink/[0.035] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {attachmentPreviewUrl && isImageAttachment({ mimetype: attachment.type }) ? (
                    <img src={attachmentPreviewUrl} alt={attachment.name} className="mb-2 max-h-28 rounded-md object-cover" />
                  ) : null}
                  {attachmentPreviewUrl && isVideoAttachment({ mimetype: attachment.type }) ? (
                    <video src={attachmentPreviewUrl} className="mb-2 max-h-28 rounded-md object-cover" muted />
                  ) : null}
                  <span className="block truncate text-xs font-bold text-ink/55">{attachment.name}</span>
                </div>
                <button type="button" onClick={() => setAttachment(null)} className="text-xs font-bold text-ink">
                  Remove
                </button>
              </div>
            </div>
          ) : null}
        </form>
      </section>
    </div>
  );
};

export default ChatModal;
