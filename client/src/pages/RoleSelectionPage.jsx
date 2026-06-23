import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const RoleSelectionPage = () => {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [error, setError] = useState('');

  const chooseRole = async (role) => {
    try {
      setError('');
      const { data } = await api.patch('/user/role', { role });
      updateUser({ role: data.role });
      navigate(role === 'brand' ? '/brand/dashboard' : '/creator/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save role');
    }
  };

  return (
    <div className="page-shell flex min-h-[calc(100vh-2rem)] items-center justify-center py-10">
      <section className="panel w-full max-w-2xl p-6 text-center sm:p-8">
        <div className="eyebrow">Choose your path</div>
        <h1 className="mt-4 page-title">How will you use CreatorSync?</h1>
        {error ? (
          <div className="mt-5 rounded-lg border border-[#ff7a1a]/25 bg-[#fff5ec] px-4 py-3 text-sm font-bold text-[#b64c00]">
            {error}
          </div>
        ) : null}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <button type="button" onClick={() => chooseRole('brand')} className="btn-primary min-h-28 text-lg">
            I&apos;m a Brand
          </button>
          <button type="button" onClick={() => chooseRole('creator')} className="btn-secondary min-h-28 text-lg">
            I&apos;m a Creator
          </button>
          <button type="button" onClick={() => navigate('/signup/store')} className="btn-secondary min-h-28 text-lg">
            I&apos;m a Store / Cafe
          </button>
        </div>
      </section>
    </div>
  );
};

export default RoleSelectionPage;
