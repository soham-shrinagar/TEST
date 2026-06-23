import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';

const STORE_TYPES = [
  { value: 'cafe', label: 'Cafe ☕' },
  { value: 'restaurant', label: 'Restaurant 🍽️' },
  { value: 'retail_store', label: 'Retail Store 🛍️' },
  { value: 'salon_spa', label: 'Salon / Spa 💅' },
  { value: 'gym_fitness', label: 'Gym / Fitness 💪' },
  { value: 'bakery', label: 'Bakery 🥐' },
  { value: 'bar_lounge', label: 'Bar / Lounge 🍸' },
  { value: 'bookstore', label: 'Bookstore 📚' },
  { value: 'clothing_boutique', label: 'Clothing Boutique 👗' },
  { value: 'other', label: 'Other' },
];

const StoreSignupPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    storeName: '',
    storeType: '',
    city: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((c) => ({ ...c, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/store/register', {
        storeName: form.storeName,
        storeType: form.storeType,
        city: form.city,
        email: form.email,
        password: form.password,
      });
      login(data);
      navigate('/store/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell flex min-h-[calc(100vh-2rem)] items-center py-10">
      <div className="grid w-full gap-10 lg:grid-cols-[0.9fr_1fr] lg:items-start">
        <section className="hidden max-w-lg lg:block lg:pt-6">
          <div className="eyebrow">For physical businesses</div>
          <h1 className="mt-4 text-5xl font-extrabold leading-none text-ink">
            Let creators visit, experience, and tell your story.
          </h1>
          <p className="page-lead">
            Join as a store to post local deals, manage creator visits, and track real content from your space.
          </p>
          <div className="mt-8 space-y-4">
            {[
              { icon: '🎯', title: 'Post one deal at a time', desc: 'Focused, simple, no overhead.' },
              { icon: '📍', title: 'Local-first discovery', desc: 'Creators in your city find you first.' },
              { icon: '✅', title: 'Full visit workflow', desc: 'From application to live content, tracked.' },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-extrabold text-ink">{item.title}</p>
                  <p className="text-sm text-ink/55">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel mx-auto w-full max-w-md p-6 sm:p-7 lg:max-w-none">
          <div className="mb-6 lg:hidden">
            <Link to="/" className="shrink-0"><BrandLogo /></Link>
          </div>

          <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-ink">Create a Store account</h2>
          <p className="mt-2 text-sm text-ink/55">Built for cafes, restaurants, and offline businesses.</p>

          {error ? (
            <div className="mt-5 rounded-lg border border-[#ff7a1a]/25 bg-[#fff5ec] px-4 py-3 text-sm font-bold text-[#b64c00]">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">Store name</label>
              <input className="field" name="storeName" value={form.storeName} onChange={handleChange} required placeholder="The Brew Lab" />
            </div>
            <div>
              <label className="label">Store type</label>
              <select className="field" name="storeType" value={form.storeType} onChange={handleChange} required>
                <option value="">Select type</option>
                {STORE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">City</label>
              <input className="field" name="city" value={form.city} onChange={handleChange} required placeholder="Mumbai" />
            </div>
            <div>
              <label className="label">Work email</label>
              <input className="field" type="email" name="email" value={form.email} onChange={handleChange} required placeholder="hello@yourstore.com" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Password</label>
                <input className="field" type="password" name="password" value={form.password} onChange={handleChange} minLength={6} required placeholder="Min 6 characters" />
              </div>
              <div>
                <label className="label">Confirm password</label>
                <input className="field" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required placeholder="Repeat password" />
              </div>
            </div>
            <button disabled={loading} type="submit" className="btn-primary mt-1 w-full py-3">
              {loading ? 'Creating account…' : 'Create Store account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-ink/50">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[#4140c8] hover:text-ink">Sign in</Link>
          </p>
          <p className="mt-3 text-center text-sm text-ink/50">
            Not a store?{' '}
            <Link to="/register" className="font-bold text-ink/70 hover:text-ink">Back to regular signup</Link>
          </p>
        </section>
      </div>
    </div>
  );
};

export default StoreSignupPage;
