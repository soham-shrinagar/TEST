import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const INTEREST_OPTIONS = ['Lifestyle', 'Sports', 'Fashion', 'Travel', 'Tech', 'Food & Beverage', 'Gaming', 'Health & Fitness', 'Beauty', 'Finance', 'Education', 'Entertainment', 'Parenting', 'Automotive', 'Pets', 'Cafe Hopping', 'Food Review', 'Local Exploration', 'Lifestyle (Local)'];
const PLATFORM_OPTIONS = ['Instagram', 'YouTube', 'TikTok', 'Twitter', 'LinkedIn', 'Other'];
const CAMPAIGN_TYPE_OPTIONS = ['Story mention', 'Dedicated post', 'Long-term ambassador', 'Event coverage', 'Product review', 'Reel/Short video', 'Blog/Article'];
const BRAND_CATEGORY_OPTIONS = ['Sports', 'Tourism', 'Fashion', 'Technology', 'Food & Beverage', 'Health & Wellness', 'Automotive', 'Finance', 'Education', 'Entertainment', 'FMCG', 'Real Estate', 'Other'];
const AVAILABILITY_OPTIONS = ['Paid only', 'Gifting only', 'Both'];
const BUDGET_OPTIONS = ['Micro (< ₹10k)', 'Mid (₹10k–₹50k)', 'Premium (₹50k+)'];

const defaultForm = {
  displayName: '',
  bio: '',
  location: '',
  website: '',
  avatar: null,
  handle: '',
  platform: '',
  followerCount: '',
  engagementRate: '',
  interests: [],
  availability: '',
  pastBrands: '',
  brandCategory: '',
  targetAudience: '',
  campaignInterests: [],
  budgetTier: '',
  campaignTypes: [],
  activeCampaigns: '',
};

const stepTitles = ['Essentials', 'Positioning', 'Match details'];

const proxiedInstagramImage = (url) => {
  if (!url) return '';
  if (!url.startsWith('http')) return url;
  return `/api/instagram/image?url=${encodeURIComponent(url)}`;
};

const OnboardingPage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(defaultForm);
  const [instagramPreview, setInstagramPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [instagramLoading, setInstagramLoading] = useState(false);

  const isInfluencer = user?.role === 'influencer' || user?.role === 'creator';

  const stepValid = useMemo(() => {
    if (step === 1) {
      return form.displayName.trim() && form.bio.trim() && form.location.trim();
    }
    if (step === 2) {
      return isInfluencer
        ? form.interests.length > 0 && form.availability
        : form.brandCategory && form.targetAudience.trim() && form.campaignInterests.length > 0;
    }
  return isInfluencer
      ? form.handle.trim() && form.platform
      : form.budgetTier && form.campaignTypes.length > 0 && form.activeCampaigns.trim();
  }, [form, isInfluencer, step]);

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const toggleSelection = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
  };

  const nextStep = () => {
    if (!stepValid) {
      setError('Please complete all required fields before continuing.');
      return;
    }
    setError('');
    setStep((current) => Math.min(current + 1, 3));
  };

  const prevStep = () => {
    setError('');
    setStep((current) => Math.max(current - 1, 1));
  };

  const applyInstagramStats = (data) => {
    setInstagramPreview(data);
    updateUser({
      instagram_handle: data.username,
      follower_count: data.follower_count,
      following_count: data.following_count,
      media_count: data.media_count,
      engagement_rate: data.engagement_rate,
      avg_like_count: data.avg_like_count,
      avg_comment_count: data.avg_comment_count,
      instagram_profile_pic: data.profile_pic_url,
      instagram_verified: data.instagram_verified,
      instagram_last_synced_at: data.last_synced_at,
    });
  };

  const fetchInstagramPreview = async () => {
    if (!form.handle.trim()) {
      setError('Enter your Instagram handle before fetching analytics.');
      return null;
    }

    setError('');
    setInstagramLoading(true);

    try {
      const { data } = await api.post('/instagram/fetch-public', { username: form.handle });
      applyInstagramStats(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || 'Could not fetch Instagram analytics');
      return null;
    } finally {
      setInstagramLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stepValid) {
      setError('Please complete all required fields before finishing onboarding.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value === null || value === '') return;
        if (Array.isArray(value)) {
          payload.append(key, JSON.stringify(value));
          return;
        }
        if (key === 'avatar' && value instanceof File) {
          payload.append(key, value);
          return;
        }
        payload.append(key, value);
      });

      if (form.pastBrands.trim()) {
        payload.set('pastBrands', JSON.stringify(form.pastBrands.split(',').map((item) => item.trim()).filter(Boolean)));
      }

      if (form.activeCampaigns.trim()) {
        payload.set('activeCampaigns', JSON.stringify(form.activeCampaigns.split(',').map((item) => item.trim()).filter(Boolean)));
      }

      await api.put('/profile/me', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      let fetchedStats = null;
      if (isInfluencer) {
        const normalizedHandle = form.handle.replace(/^@/, '').trim().toLowerCase();
        fetchedStats = instagramPreview?.username?.toLowerCase() === normalizedHandle
          ? instagramPreview
          : await fetchInstagramPreview();
        if (!fetchedStats) {
          setLoading(false);
          return;
        }
      }

      updateUser({ onboardingComplete: true });
      navigate(isInfluencer ? '/creator/dashboard' : '/feed');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const pillClass = (selected) => `rounded-full border px-3.5 py-2 text-sm font-medium transition ${
    selected
      ? 'border-ink bg-ink text-white'
      : 'border-ink/8 bg-white/75 text-ink/60 hover:border-ink/15 hover:text-ink'
  }`;

  const stepCopy = [
    {
      title: 'Set the basics',
      copy: 'Your name, location, biography, and optional website link.',
    },
    {
      title: isInfluencer ? 'Define your positioning' : 'Define your campaign lens',
      copy: isInfluencer
        ? 'Choose niches and collaboration style that help brands understand your space.'
        : 'Choose category and interest signals for your campaigns.',
    },
    {
      title: isInfluencer ? 'Add your platform proof' : 'Add your campaign details',
      copy: isInfluencer
        ? 'Platform, handle, and performance details for stronger decisions.'
        : 'Budget, campaign types, and live opportunities for creator fit.',
    },
  ];

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-2xl">
        <h1 className="page-title">Set up your profile</h1>
        <p className="page-lead">Step {step} of 3 — {stepTitles[step - 1]}</p>

        <div className="mt-5 flex gap-2">
          {stepTitles.map((title, index) => (
            <div
              key={title}
              className={`h-1.5 flex-1 rounded-full transition ${
                index + 1 <= step ? 'bg-ink' : 'bg-ink/10'
              }`}
              title={title}
            />
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="panel mx-auto mt-8 max-w-2xl p-5 sm:p-7">
        {error ? (
          <div className="mb-5 rounded-lg border border-[#ff7a1a]/25 bg-[#fff5ec] px-4 py-3 text-sm font-bold text-[#b64c00]">
            {error}
          </div>
        ) : null}

        <div className="border-b border-ink/10 pb-5">
          <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-ink">
            {stepCopy[step - 1].title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink/55">{stepCopy[step - 1].copy}</p>
        </div>

        <div className="mt-6">
          {step === 1 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Display name</label>
                <input className="field" value={form.displayName} onChange={(e) => setField('displayName', e.target.value)} required />
              </div>
              <div>
                <label className="label">Location</label>
                <input className="field" value={form.location} onChange={(e) => setField('location', e.target.value)} required placeholder="City, Country" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Bio</label>
                <textarea
                  className="field min-h-[120px]"
                  value={form.bio}
                  onChange={(e) => setField('bio', e.target.value)}
                  required
                  maxLength={400}
                  placeholder="Tell people what makes you a strong collaboration fit."
                />
              </div>
              <div>
                <label className="label">Website</label>
                <input className="field" value={form.website} onChange={(e) => setField('website', e.target.value)} placeholder="https://example.com" />
              </div>
              <div>
                <label className="label">Avatar</label>
                <input
                  className="field file:mr-4 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-white"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setField('avatar', e.target.files?.[0] || null)}
                />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            isInfluencer ? (
              <div className="space-y-6">
                <div>
                  <label className="label">Interests / niches</label>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_OPTIONS.map((option) => (
                      <button type="button" key={option} className={pillClass(form.interests.includes(option))} onClick={() => toggleSelection('interests', option)}>
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Availability</label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABILITY_OPTIONS.map((option) => (
                      <button type="button" key={option} className={pillClass(form.availability === option)} onClick={() => setField('availability', option)}>
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Past brand partners</label>
                  <input className="field" value={form.pastBrands} onChange={(e) => setField('pastBrands', e.target.value)} placeholder="Nike, Airbnb, Red Bull" />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label">Brand category</label>
                    <select className="field" value={form.brandCategory} onChange={(e) => setField('brandCategory', e.target.value)} required>
                      <option value="">Select a category</option>
                      {BRAND_CATEGORY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Target audience</label>
                    <input className="field" value={form.targetAudience} onChange={(e) => setField('targetAudience', e.target.value)} required placeholder="Gen Z beauty shoppers" />
                  </div>
                </div>
                <div>
                  <label className="label">Campaign interest tags</label>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_OPTIONS.map((option) => (
                      <button type="button" key={option} className={pillClass(form.campaignInterests.includes(option))} onClick={() => toggleSelection('campaignInterests', option)}>
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          ) : null}

          {step === 3 ? (
            isInfluencer ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Handle</label>
                  <input className="field" value={form.handle} onChange={(e) => setField('handle', e.target.value)} required placeholder="@yourhandle" />
                </div>
                <div>
                  <label className="label">Primary platform</label>
                  <select className="field" value={form.platform} onChange={(e) => setField('platform', e.target.value)} required>
                    <option value="">Select platform</option>
                    {PLATFORM_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 rounded-lg border border-ink/10 bg-ink/[0.035] px-4 py-3 text-sm font-bold text-ink/55">
                  Follower count and engagement rate are fetched from Instagram during onboarding and saved to your dashboard.
                </div>
                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={fetchInstagramPreview}
                    disabled={instagramLoading || !form.handle.trim()}
                    className="btn-secondary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {instagramLoading ? 'Fetching Instagram analytics...' : 'Preview Instagram analytics'}
                  </button>
                </div>
                {instagramPreview ? (
                  <div className="md:col-span-2 rounded-lg border border-ink/10 bg-white p-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={proxiedInstagramImage(instagramPreview.profile_pic_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(instagramPreview.username || 'IG')}&background=4b7f75&color=fff&size=128`}
                        alt={instagramPreview.username}
                        className="h-14 w-14 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-extrabold text-ink">{instagramPreview.full_name || instagramPreview.username}</p>
                        <p className="text-sm font-bold text-[#4140c8]">@{instagramPreview.username}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-lg bg-ink/[0.035] px-3 py-2">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/42">Followers</p>
                        <p className="font-extrabold text-ink">{Number(instagramPreview.follower_count || 0).toLocaleString()}</p>
                      </div>
                      <div className="rounded-lg bg-ink/[0.035] px-3 py-2">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/42">Posts</p>
                        <p className="font-extrabold text-ink">{Number(instagramPreview.media_count || 0).toLocaleString()}</p>
                      </div>
                      <div className="rounded-lg bg-ink/[0.035] px-3 py-2">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/42">Engagement</p>
                        <p className="font-extrabold text-ink">{instagramPreview.engagement_rate || 0}%</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label">Budget tier</label>
                    <select className="field" value={form.budgetTier} onChange={(e) => setField('budgetTier', e.target.value)} required>
                      <option value="">Select budget tier</option>
                      {BUDGET_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Active campaigns</label>
                    <input className="field" value={form.activeCampaigns} onChange={(e) => setField('activeCampaigns', e.target.value)} required placeholder="Summer drop, festive launch" />
                  </div>
                </div>
                <div>
                  <label className="label">Campaign types</label>
                  <div className="flex flex-wrap gap-2">
                    {CAMPAIGN_TYPE_OPTIONS.map((option) => (
                      <button type="button" key={option} className={pillClass(form.campaignTypes.includes(option))} onClick={() => toggleSelection('campaignTypes', option)}>
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          ) : null}
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-ink/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={prevStep} disabled={step === 1} className="btn-secondary disabled:cursor-not-allowed disabled:opacity-40">
            Back
          </button>

          {step < 3 ? (
            <button type="button" onClick={nextStep} className="btn-primary">
              Continue
            </button>
          ) : (
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving…' : 'Complete onboarding'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default OnboardingPage;
