import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthRole, setOauthRole] = useState('creator');

  const handleChange = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', form);
      login(data);
      navigate(data.onboardingComplete ? '/feed' : '/onboarding');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell flex min-h-[calc(100vh-2rem)] items-center py-10">
      <div className="grid w-full gap-10 lg:grid-cols-[0.9fr_1fr] lg:items-center">
        <section className="hidden max-w-lg lg:block">
          <div className="eyebrow">Welcome back</div>
          <h1 className="mt-4 text-5xl font-extrabold leading-none text-ink">
            Pick up where your partnerships left off.
          </h1>
          <p className="page-lead">
            Review matches, profile views, and discovery opportunities in one place.
          </p>
        </section>

        <section className="panel mx-auto w-full max-w-md overflow-hidden p-6 sm:p-7 lg:max-w-none">
          <div className="mb-6 lg:hidden">
            <Link to="/" className="shrink-0">
              <BrandLogo />
            </Link>
          </div>

          <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-ink">Sign in</h2>
          <p className="mt-2 text-sm text-ink/55">Continue to your CreatorSync account.</p>

          <div className="mt-6 rounded-lg border border-ink/10 bg-white p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-ink/42">Continue as</p>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-ink/[0.04] p-1">
              {['creator', 'brand'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setOauthRole(role)}
                  className={`rounded-md px-3 py-2 text-sm font-extrabold capitalize transition ${
                    oauthRole === role ? 'bg-white text-ink shadow-sm' : 'text-ink/50 hover:text-ink'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <a href={`/auth/google?role=${oauthRole}`} className="btn-secondary w-full justify-center py-3 text-center">
                Continue with Google
              </a>
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-lg border border-[#ff7a1a]/25 bg-[#fff5ec] px-4 py-3 text-sm font-bold text-[#b64c00]">
              {error}
            </div>
          ) : null}

          <div className="mt-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.12em] text-ink/35">
            <span className="h-px flex-1 bg-ink/10" />
            Email sign in
            <span className="h-px flex-1 bg-ink/10" />
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
                required
                placeholder="Your password"
              />
            </div>
            <button disabled={loading} type="submit" className="btn-primary mt-1 w-full py-3">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-ink/50">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-bold text-[#4140c8] hover:text-ink">
              Create one
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
