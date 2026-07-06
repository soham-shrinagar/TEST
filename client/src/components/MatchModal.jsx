import React from 'react';
import { useNavigate } from 'react-router-dom';

const MatchModal = ({ matchedProfile, onClose }) => {
  const navigate = useNavigate();
  const BASE_URL = 'http://localhost:5001';

  const avatarSrc = matchedProfile?.avatar?.startsWith?.('http')
    ? matchedProfile.avatar
    : matchedProfile?.avatar?.startsWith?.('/uploads/')
      ? `${BASE_URL}${matchedProfile.avatar}`
    : matchedProfile?.avatar
      ? `${BASE_URL}/uploads/${matchedProfile.avatar}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(matchedProfile?.displayName || '?')}&background=141414&color=edeae2&size=200`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4">
      <div className="modal-panel w-full max-w-sm overflow-hidden p-0 text-center">
        <div className="border-b-2 border-ink bg-ink px-7 py-8 text-paper">
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden border-2 border-paper bg-paper/10">
            <img src={avatarSrc} alt={matchedProfile?.displayName} className="h-full w-full object-cover" />
          </div>
          <h2 className="mt-5 font-display text-3xl uppercase">It&apos;s a match</h2>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-paper/80">
            You and <span className="font-bold text-paper">{matchedProfile?.displayName}</span> liked each other.
          </p>
        </div>

        <div className="flex flex-col gap-2 p-5">
          <button
            onClick={() => {
              onClose();
              navigate('/matches');
            }}
            className="btn-primary w-full"
          >
            View matches
          </button>
          <button onClick={onClose} className="btn-secondary w-full">
            Keep browsing
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchModal;
