import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { emptyCampaign, money, niches, totalPerCreator } from './campaignUtils';
import RecommendedCreatorCard from './RecommendedCreatorCard';

const cleanList = (items) => (items || []).map((item) => String(item).trim()).filter(Boolean);

const normalizeCampaign = (campaign) => ({
  ...emptyCampaign,
  ...campaign,
  dos: campaign?.dos?.length ? campaign.dos : [''],
  donts: campaign?.donts?.length ? campaign.donts : [''],
  requiredHashtags: campaign?.requiredHashtags || [],
  requiredMentions: campaign?.requiredMentions || [],
  referenceLinks: campaign?.referenceLinks?.length ? campaign.referenceLinks : [''],
  deliverables: {
    ...emptyCampaign.deliverables,
    ...(campaign?.deliverables || {}),
    reels: { ...emptyCampaign.deliverables.reels, ...(campaign?.deliverables?.reels || {}) },
    stories: { ...emptyCampaign.deliverables.stories, ...(campaign?.deliverables?.stories || {}) },
    staticPosts: { ...emptyCampaign.deliverables.staticPosts, ...(campaign?.deliverables?.staticPosts || {}) },
  },
  requirements: {
    ...emptyCampaign.requirements,
    ...(campaign?.requirements || {}),
    niches: campaign?.requirements?.niches || [],
    locations: campaign?.requirements?.locations?.length ? campaign.requirements.locations : [''],
  },
  applicationDeadline: campaign?.applicationDeadline ? campaign.applicationDeadline.slice(0, 10) : '',
  contentDeadline: campaign?.contentDeadline ? campaign.contentDeadline.slice(0, 10) : '',
});

const ListInput = ({ label, values, onChange, placeholder }) => {
  const update = (index, value) => onChange(values.map((item, itemIndex) => (itemIndex === index ? value : item)));
  return (
    <div>
      <label className="label">{label}</label>
      <div className="space-y-2">
        {values.map((item, index) => (
          <div key={index} className="flex gap-2">
            <input className="field" value={item} onChange={(event) => update(index, event.target.value)} placeholder={placeholder} />
            <button type="button" className="btn-secondary px-3" onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={() => onChange([...values, ''])}>Add</button>
      </div>
    </div>
  );
};

const TagInput = ({ label, values, onChange, placeholder }) => {
  const [draft, setDraft] = useState('');
  const addTag = () => {
    const value = draft.trim();
    if (!value) return;
    onChange([...new Set([...values, value])]);
    setDraft('');
  };
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-2">
        <input
          className="field"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
        />
        <button type="button" className="btn-secondary" onClick={addTag}>Add</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((tag) => (
          <button key={tag} type="button" className="rounded-full bg-ink/[0.06] px-3 py-1 text-xs font-bold" onClick={() => onChange(values.filter((item) => item !== tag))}>
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
};

const CampaignForm = ({ initialCampaign, mode = 'create' }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => normalizeCampaign(initialCampaign));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [matchingCreators, setMatchingCreators] = useState([]);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const activeLocked = mode === 'edit' && initialCampaign?.status === 'active';

  const computedBudget = useMemo(() => totalPerCreator(form), [form]);
  const totalPosts = useMemo(() => (
    (form.deliverables.reels.count || 0)
    + (form.deliverables.stories.count || 0)
    + (form.deliverables.staticPosts.count || 0)
  ), [form]);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setRequirement = (key, value) => setForm((current) => ({
    ...current,
    requirements: { ...current.requirements, [key]: value },
  }));
  const setDeliverable = (key, field, value) => setForm((current) => ({
    ...current,
    deliverables: {
      ...current.deliverables,
      [key]: { ...current.deliverables[key], [field]: Number(value) || 0 },
    },
  }));

  useEffect(() => {
    if (step !== 3) return undefined;
    const timer = window.setTimeout(async () => {
      setMatchingLoading(true);
      try {
        const params = new URLSearchParams({
          limit: '5',
          requirements: JSON.stringify({
            ...form.requirements,
            minFollowers: Number(form.requirements.minFollowers) || 0,
            maxFollowers: Number(form.requirements.maxFollowers) || 0,
            minEngagementRate: Number(form.requirements.minEngagementRate) || 0,
            locations: cleanList(form.requirements.locations),
          }),
          deliverables: JSON.stringify(form.deliverables),
          budgetPerCreator: String(form.budgetPerCreator || computedBudget || 0),
        });
        const campaignId = initialCampaign?._id || 'draft';
        const { data } = await api.get(`/recommendations/campaign/${campaignId}?${params.toString()}`);
        setMatchingCreators(data.recommendations || []);
      } catch {
        setMatchingCreators([]);
      } finally {
        setMatchingLoading(false);
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [step, form.requirements, form.deliverables, form.budgetPerCreator, computedBudget, initialCampaign?._id]);

  const inviteCreator = async (recommendation) => {
    if (!initialCampaign?._id) return;
    await api.post(`/campaigns/${initialCampaign._id}/invite/${recommendation.targetId}`);
    setMatchingCreators((current) => current.filter((item) => item.targetId !== recommendation.targetId));
  };

  const payloadFor = (status) => {
    const budgetPerCreator = form.budgetPerCreator || computedBudget;
    return {
      ...form,
      status,
      dos: cleanList(form.dos),
      donts: cleanList(form.donts),
      referenceLinks: cleanList(form.referenceLinks),
      requirements: {
        ...form.requirements,
        locations: cleanList(form.requirements.locations),
        totalCreatorsNeeded: Number(form.requirements.totalCreatorsNeeded) || 1,
      },
      budgetPerCreator,
      totalBudget: budgetPerCreator * (Number(form.requirements.totalCreatorsNeeded) || 1),
    };
  };

  const save = async (status) => {
    setSaving(true);
    setError('');
    try {
      const { data } = mode === 'edit'
        ? await api.patch(`/campaigns/${initialCampaign._id}`, payloadFor(status || initialCampaign.status))
        : await api.post('/campaigns', payloadFor(status));
      navigate(`/brand/campaigns/${data._id}/dashboard`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="border-b border-ink/10 pb-6">
        <div className="eyebrow">{mode === 'edit' ? 'Edit Campaign' : 'New Campaign'}</div>
        <h1 className="mt-4 page-title">{mode === 'edit' ? form.title : 'Build an Instagram campaign'}</h1>
        {activeLocked ? (
          <div className="mt-4 rounded-lg border border-[#ffbd4a]/30 bg-[#fff7e6] px-4 py-3 text-sm font-bold text-[#7a4d00]">
            Campaign is live. Deliverables, rates, and approval mode are locked.
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {['Brief', 'Deliverables', 'Requirements', 'Review'].map((label, index) => (
          <button key={label} type="button" onClick={() => setStep(index + 1)} className={`rounded-full px-4 py-2 text-sm font-bold ${step === index + 1 ? 'bg-ink text-white' : 'border border-ink/10 bg-white text-ink/55'}`}>
            {index + 1}. {label}
          </button>
        ))}
      </div>

      {error ? <div className="mt-5 rounded-lg border border-[#d64f4f]/25 bg-[#fff0ef] px-4 py-3 text-sm font-bold text-[#a8322b]">{error}</div> : null}

      <section className="panel mt-6 p-5 sm:p-6">
        {step === 1 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <label className="label">Campaign title</label>
              <input className="field" value={form.title} onChange={(event) => setField('title', event.target.value)} />
            </div>
            <div>
              <label className="label">Product or service</label>
              <input className="field" value={form.productName} onChange={(event) => setField('productName', event.target.value)} />
            </div>
            <div className="lg:col-span-2">
              <label className="label">Description ({form.description.length}/500)</label>
              <textarea className="field min-h-[120px]" maxLength={500} value={form.description} onChange={(event) => setField('description', event.target.value)} />
            </div>
            <div className="lg:col-span-2">
              <label className="label">Campaign brief</label>
              <textarea className="field min-h-[140px]" value={form.brief} onChange={(event) => setField('brief', event.target.value)} />
            </div>
            <ListInput label="Do's" values={form.dos} onChange={(values) => setField('dos', values)} placeholder="Show the product in use" />
            <ListInput label="Don'ts" values={form.donts} onChange={(values) => setField('donts', values)} placeholder="Avoid competitor products" />
            <TagInput label="Required hashtags" values={form.requiredHashtags} onChange={(values) => setField('requiredHashtags', values)} placeholder="#campaign" />
            <TagInput label="Required mentions" values={form.requiredMentions} onChange={(values) => setField('requiredMentions', values)} placeholder="@brand" />
            <div className="lg:col-span-2">
              <ListInput label="Reference links" values={form.referenceLinks} onChange={(values) => setField('referenceLinks', values)} placeholder="https://..." />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            {[
              ['reels', 'Reels'],
              ['stories', 'Stories'],
              ['staticPosts', 'Static Posts'],
            ].map(([key, label]) => (
              <div key={key} className="grid gap-3 rounded-lg border border-ink/10 p-4 sm:grid-cols-3">
                <label className="flex items-center gap-3 text-sm font-extrabold">
                  <input type="checkbox" disabled={activeLocked} checked={form.deliverables[key].count > 0} onChange={(event) => setDeliverable(key, 'count', event.target.checked ? 1 : 0)} />
                  {label}
                </label>
                <input className="field" type="number" min="0" disabled={activeLocked || form.deliverables[key].count === 0} value={form.deliverables[key].count} onChange={(event) => setDeliverable(key, 'count', event.target.value)} placeholder="Posts" />
                <input className="field" type="number" min="0" disabled={activeLocked || form.deliverables[key].count === 0} value={form.deliverables[key].ratePerPost} onChange={(event) => setDeliverable(key, 'ratePerPost', event.target.value)} placeholder="Rate per post" />
              </div>
            ))}
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <label className="label">Total creators needed</label>
                <input className="field" type="number" min="1" value={form.requirements.totalCreatorsNeeded} onChange={(event) => setRequirement('totalCreatorsNeeded', event.target.value)} />
              </div>
              <div>
                <label className="label">Budget per creator</label>
                <input className="field" type="number" min="0" value={form.budgetPerCreator || computedBudget} onChange={(event) => setField('budgetPerCreator', Number(event.target.value) || 0)} />
                <p className="mt-2 text-sm font-bold text-ink/45">Calculated from rates: {money(computedBudget)}</p>
              </div>
              <div>
                <label className="label">Application deadline</label>
                <input className="field" type="date" value={form.applicationDeadline} onChange={(event) => setField('applicationDeadline', event.target.value)} />
              </div>
              <div>
                <label className="label">Content deadline</label>
                <input className="field" type="date" value={form.contentDeadline} onChange={(event) => setField('contentDeadline', event.target.value)} />
              </div>
              <div className="lg:col-span-2">
                <label className="label">Approval mode</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="button" disabled={activeLocked} onClick={() => setField('approvalMode', 'pre_approval')} className={`rounded-lg border px-4 py-3 text-left text-sm font-bold ${form.approvalMode === 'pre_approval' ? 'border-ink bg-ink text-white' : 'border-ink/10 bg-white'}`}>Review before live</button>
                  <button type="button" disabled={activeLocked} onClick={() => setField('approvalMode', 'post_approval')} className={`rounded-lg border px-4 py-3 text-left text-sm font-bold ${form.approvalMode === 'post_approval' ? 'border-ink bg-ink text-white' : 'border-ink/10 bg-white'}`}>Review after live</button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_21rem]">
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <label className="label">Minimum followers</label>
                <input className="field" type="number" value={form.requirements.minFollowers} onChange={(event) => setRequirement('minFollowers', Number(event.target.value) || 0)} />
              </div>
              <div>
                <label className="label">Maximum followers</label>
                <input className="field" type="number" value={form.requirements.maxFollowers} onChange={(event) => setRequirement('maxFollowers', Number(event.target.value) || 0)} />
              </div>
              <div>
                <label className="label">Minimum engagement rate</label>
                <input className="field" type="range" min="0" max="10" step="0.1" value={form.requirements.minEngagementRate} onChange={(event) => setRequirement('minEngagementRate', Number(event.target.value) || 0)} />
                <p className="mt-2 text-sm font-bold text-ink/55">{form.requirements.minEngagementRate}%</p>
              </div>
              <div>
                <label className="label">Audience gender preference</label>
                <select className="field" value={form.requirements.audienceGenderPreference} onChange={(event) => setRequirement('audienceGenderPreference', event.target.value)}>
                  <option>Any</option>
                  <option>Mostly Female</option>
                  <option>Mostly Male</option>
                </select>
              </div>
              <div className="lg:col-span-2">
                <label className="label">Niches</label>
                <div className="flex flex-wrap gap-2">
                  {niches.map((niche) => {
                    const selected = form.requirements.niches.includes(niche);
                    return (
                      <button key={niche} type="button" onClick={() => setRequirement('niches', selected ? form.requirements.niches.filter((item) => item !== niche) : [...form.requirements.niches, niche])} className={`rounded-full px-3 py-2 text-sm font-bold ${selected ? 'bg-ink text-white' : 'border border-ink/10 bg-white'}`}>
                        {niche}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="lg:col-span-2">
                <ListInput label="Location preference" values={form.requirements.locations} onChange={(values) => setRequirement('locations', values)} placeholder="Mumbai, remote, India" />
              </div>
            </div>
            <aside className="rounded-lg border border-ink/10 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-extrabold text-ink">Creators matching these requirements</h2>
                {matchingLoading ? <span className="text-xs font-bold text-ink/45">Loading</span> : null}
              </div>
              <div className="mt-4 space-y-3">
                {matchingCreators.length ? matchingCreators.map((recommendation) => (
                  <RecommendedCreatorCard
                    key={recommendation.targetId}
                    recommendation={recommendation}
                    compact
                    action={initialCampaign?._id ? (
                      <button type="button" onClick={() => inviteCreator(recommendation)} className="btn-secondary text-sm">
                        Invite
                      </button>
                    ) : null}
                  />
                )) : (
                  <div className="rounded-lg bg-ink/[0.04] p-4 text-sm font-bold text-ink/45">
                    Matching creators will appear as requirements change.
                  </div>
                )}
              </div>
            </aside>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="space-y-4">
              <h2 className="text-2xl font-extrabold text-ink">{form.title || 'Untitled campaign'}</h2>
              <p className="text-sm leading-6 text-ink/60">{form.description || 'No description yet.'}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-ink/[0.04] p-4"><p className="label">Creators</p><p className="text-xl font-extrabold">{form.requirements.totalCreatorsNeeded}</p></div>
                <div className="rounded-lg bg-ink/[0.04] p-4"><p className="label">Posts</p><p className="text-xl font-extrabold">{totalPosts * form.requirements.totalCreatorsNeeded}</p></div>
                <div className="rounded-lg bg-ink/[0.04] p-4"><p className="label">Budget</p><p className="text-xl font-extrabold">{money((form.budgetPerCreator || computedBudget) * form.requirements.totalCreatorsNeeded)}</p></div>
              </div>
            </div>
            <div className="rounded-lg border border-ink/10 bg-white p-5">
              <p className="label">Estimated reach</p>
              <p className="text-3xl font-extrabold">{Number((form.requirements.totalCreatorsNeeded || 1) * ((form.requirements.minFollowers || 10000) || 10000)).toLocaleString('en-IN')}</p>
              <p className="mt-2 text-sm text-ink/55">Based on creator count and follower range.</p>
            </div>
          </div>
        ) : null}
      </section>

      <div className="mt-6 flex flex-wrap justify-between gap-3">
        <button type="button" className="btn-secondary" disabled={step === 1} onClick={() => setStep((current) => Math.max(current - 1, 1))}>Back</button>
        <div className="flex flex-wrap gap-3">
          {step < 4 ? <button type="button" className="btn-primary" onClick={() => setStep((current) => current + 1)}>Continue</button> : null}
          {step === 4 ? (
            <>
              <button type="button" className="btn-secondary" disabled={saving} onClick={() => save('draft')}>Save as Draft</button>
              <button type="button" className="btn-primary" disabled={saving} onClick={() => save('active')}>Launch Campaign</button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default CampaignForm;
