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
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(matchedProfile?.displayName || '?')}&background=d67a51&color=fff&size=200`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 px-4 backdrop-blur-md">
      <div className="panel w-full max-w-sm animate-pop-in overflow-hidden p-0 text-center">
        <div className="mesh-dark px-7 py-8 text-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-white/20 bg-white/10">
            <img src={avatarSrc} alt={matchedProfile?.displayName} className="h-full w-full object-cover" />
          </div>
          <h2 className="mt-5 text-3xl font-extrabold tracking-[-0.03em]">It&apos;s a match</h2>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-white/68">
            You and <span className="font-bold text-white">{matchedProfile?.displayName}</span> liked each other.
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
