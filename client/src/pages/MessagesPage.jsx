import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import ChatModal from '../components/ChatModal';
import CategoryTag from '../components/CategoryTag';
import { useAuth } from '../context/AuthContext';
import { avatarUrl } from '../utils/images';

const ConversationRow = ({ conversation, onOpen }) => {
  const tags = conversation.profile?.role === 'influencer'
    ? conversation.profile?.interests
    : conversation.profile?.campaignInterests;

  return (
    <button onClick={() => onOpen(conversation)} className="panel flex w-full items-center gap-4 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-lift">
      <img
        src={avatarUrl(conversation.profile || conversation.otherUser, conversation.otherUser?.name)}
        alt={conversation.profile?.displayName || conversation.otherUser?.name}
        className="h-14 w-14 rounded-lg object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-lg font-extrabold text-ink">
            {conversation.profile?.displayName || conversation.otherUser?.name}
          </h3>
          <span className="rounded-full border border-ink/10 bg-white px-2 py-0.5 text-xs font-bold capitalize text-ink/45">
            {conversation.otherUser?.role}
          </span>
        </div>
        <p className="mt-1 truncate text-sm text-ink/50">
          {conversation.lastMessage || 'No messages yet'}
        </p>
        {tags?.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((tag, index) => (
              <CategoryTag key={tag} label={tag} index={index} />
            ))}
          </div>
        ) : null}
      </div>
      <span className="hidden shrink-0 rounded-full bg-ink px-3 py-1.5 text-sm font-bold text-white sm:inline">Chat</span>
      {conversation.unreadCount > 0 ? (
        <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-[#d64f4f] px-2 text-xs font-extrabold text-white">
          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
        </span>
      ) : null}
    </button>
  );
};

const ConversationSection = ({ title, copy, conversations, empty, onOpen }) => (
  <section>
    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-xl font-extrabold text-ink">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-ink/55">{copy}</p>
      </div>
      <span className="w-fit rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-bold text-ink/45">
        {conversations.length} chat{conversations.length === 1 ? '' : 's'}
      </span>
    </div>

    {conversations.length ? (
      <div className="grid gap-3">
        {conversations.map((conversation) => (
          <ConversationRow key={conversation._id} conversation={conversation} onOpen={onOpen} />
        ))}
      </div>
    ) : (
      <div className="panel px-5 py-8 text-center text-sm font-bold text-ink/45">
        {empty}
      </div>
    )}
  </section>
);

const MessagesPage = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState({ matched: [], outreach: [] });
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchConversations = async () => {
    try {
      setError('');
      const { data } = await api.get('/messenger/conversations');
      setConversations(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-5 border-b border-ink/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <div className="eyebrow">Messenger</div>
          <h1 className="mt-4 page-title">Messages</h1>
          <p className="page-lead">
            Keep matched conversations and brand outreach in separate, focused sections.
          </p>
        </div>
        <button onClick={fetchConversations} className="btn-secondary w-fit">
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mt-6 rounded-lg border border-[#ff7a1a]/25 bg-[#fff5ec] px-4 py-3 text-sm font-bold text-[#b64c00]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 grid gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-lg border border-ink/10 bg-white" />
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-10">
          <ConversationSection
            title="Matched chats"
            copy="Conversations unlocked by mutual interest."
            conversations={conversations.matched}
            empty="Matched chats will appear here after both sides connect."
            onOpen={setSelectedConversation}
          />
          <ConversationSection
            title={user?.role === 'brand' ? 'Creator outreach' : 'Brand outreach'}
            copy={user?.role === 'brand'
              ? 'Creators you contacted before a mutual match.'
              : 'Brands that reached out before a mutual match.'}
            conversations={conversations.outreach}
            empty={user?.role === 'brand'
              ? 'Open an influencer profile to start an outreach chat.'
              : 'Brand outreach will appear here when a brand contacts you.'}
            onOpen={setSelectedConversation}
          />
        </div>
      )}

      {selectedConversation ? (
        <ChatModal
          conversation={selectedConversation}
          onClose={() => {
            setSelectedConversation(null);
            fetchConversations();
          }}
        />
      ) : null}
    </div>
  );
};

export default MessagesPage;
