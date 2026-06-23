import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';

const roles = [
  { value: 'influencer', title: 'Influencer / Creator', desc: 'Show your voice, audience, and collaboration fit.' },
  { value: 'brand', title: 'Brand', desc: 'Present your campaigns with clarity and intent.' },
  { value: 'store', title: 'Store / Cafe', desc: 'Post local deals, manage creator visits, build buzz.' },
];

const RegisterPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'influencer' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    // Store accounts have a dedicated signup page
    if (form.role === 'store') {
      navigate('/signup/store');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/register', form);
      login(data);
      navigate('/onboarding');
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
          <div className="eyebrow">Create account</div>
          <h1 className="mt-4 text-5xl font-extrabold leading-none text-ink">
            Build a profile that stands out before your first match.
          </h1>
          <p className="page-lead">
            Join as a creator or brand, then refine the details that make partnerships click.
          </p>
        </section>

        <section className="panel mx-auto w-full max-w-md p-6 sm:p-7 lg:max-w-none">
          <div className="mb-6 lg:hidden">
            <Link to="/" className="shrink-0">
              <BrandLogo />
            </Link>
          </div>

          <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-ink">Join CreatorSync</h2>
          <p className="mt-2 text-sm text-ink/55">Set up your account and move into onboarding.</p>

          {error ? (
            <div className="mt-5 rounded-lg border border-[#ff7a1a]/25 bg-[#fff5ec] px-4 py-3 text-sm font-bold text-[#b64c00]">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">Full name</label>
              <input className="field" name="name" value={form.name} onChange={handleChange} required placeholder="Your name" />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="field"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="field"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                minLength={6}
                required
                placeholder="Minimum 6 characters"
              />
            </div>
            <div>
              <label className="label">I&apos;m joining as</label>
              <div className="grid gap-2 sm:grid-cols-3">
                {roles.map((role) => {
                  const active = form.role === role.value;

                  return (
                    <label
                      key={role.value}
                      className={`cursor-pointer rounded-lg border px-4 py-3 transition ${
                        active
                          ? 'border-ink bg-ink text-white'
                          : 'border-ink/8 bg-white/70 text-ink hover:border-ink/15'
                      }`}
                    >
                      <input
                        className="hidden"
                        type="radio"
                        name="role"
                        value={role.value}
                        checked={active}
                        onChange={handleChange}
                      />
                      <div className="text-lg font-extrabold">{role.title}</div>
                      <p className={`mt-1 text-xs leading-5 ${active ? 'text-white/72' : 'text-ink/55'}`}>{role.desc}</p>
                    </label>
                  );
                })}
              </div>
            </div>
            <button disabled={loading} type="submit" className="btn-primary mt-1 w-full py-3">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-ink/50">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[#4140c8] hover:text-ink">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
};

export default RegisterPage;
