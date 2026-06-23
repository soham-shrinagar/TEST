import React from 'react';
import {
  attachmentUrl,
  formatMessageTime,
  formatReadReceiptTime,
  getReadReceiptForUser,
  isImageAttachment,
  isVideoAttachment,
} from '../utils/messenger';
import { BASE_URL } from '../utils/images';

const ReadReceipt = ({ message, otherUserId, mine }) => {
  if (!mine || !otherUserId) return null;

  const receipt = getReadReceiptForUser(message, otherUserId);
  const tone = mine ? 'text-white/55' : 'text-ink/36';

  if (receipt?.readAt) {
    return (
      <span className={`text-[10px] font-bold ${tone}`} title={`Seen ${formatReadReceiptTime(receipt.readAt)}`}>
        Seen {formatReadReceiptTime(receipt.readAt)}
        <span className="ml-1 inline-block translate-y-px text-[11px] leading-none text-sky-300">✓✓</span>
      </span>
    );
  }

  return (
    <span className={`text-[10px] font-bold ${tone}`}>
      Sent
      <span className="ml-1 inline-block translate-y-px text-[11px] leading-none opacity-70">✓</span>
    </span>
  );
};

const MediaAttachment = ({ attachment, mine }) => {
  if (!attachment?.url) return null;

  const url = attachmentUrl(attachment, BASE_URL);
  const label = attachment.originalName || 'Attachment';

  if (isImageAttachment(attachment)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={`mt-2 block overflow-hidden rounded-md border ${
          mine ? 'border-white/15' : 'border-ink/10'
        }`}
      >
        <img
          src={url}
          alt={label}
          className="max-h-52 w-full bg-black/5 object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  if (isVideoAttachment(attachment)) {
    return (
      <div className={`mt-2 overflow-hidden rounded-md border ${mine ? 'border-white/15' : 'border-ink/10'}`}>
        <video
          src={url}
          controls
          preload="metadata"
          className="max-h-52 w-full bg-black object-cover"
        />
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`mt-2 flex items-center gap-3 rounded-md border px-3 py-2 text-xs font-bold ${
        mine ? 'border-white/20 bg-white/10 text-white' : 'border-ink/10 bg-white text-ink'
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-black/10 text-[10px] uppercase">
        {label.split('.').pop()?.slice(0, 4) || 'file'}
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </a>
  );
};

const ChatMessage = ({ message, mine, otherUserId }) => (
  <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
    <div
      className={`max-w-[78%] rounded-lg px-3 py-2 ${
        mine ? 'bg-ink text-white' : 'border border-ink/10 bg-ink/[0.035] text-ink'
      }`}
    >
      <MediaAttachment attachment={message.attachment} mine={mine} />
      {message.body ? (
        <p className={`whitespace-pre-wrap break-words text-sm leading-6 ${message.attachment?.url ? 'mt-2' : ''}`}>
          {message.body}
        </p>
      ) : null}
      <div className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 ${mine ? 'justify-end' : 'justify-start'}`}>
        <span className={`text-[10px] font-bold ${mine ? 'text-white/45' : 'text-ink/36'}`}>
          {formatMessageTime(message.createdAt)}
        </span>
        <ReadReceipt message={message} otherUserId={otherUserId} mine={mine} />
      </div>
    </div>
  </div>
);

export default ChatMessage;
