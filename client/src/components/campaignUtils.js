import React from 'react';

export const niches = [
  'Lifestyle',
  'Sports',
  'Fashion',
  'Travel',
  'Tech',
  'Food & Beverage',
  'Gaming',
  'Health & Fitness',
  'Beauty',
  'Finance',
  'Education',
  'Entertainment',
  'Cafe Hopping',
  'Food Review',
  'Local Exploration',
  'Lifestyle (Local)',
];

export const emptyCampaign = {
  title: '',
  productName: '',
  description: '',
  brief: '',
  dos: [''],
  donts: [''],
  requiredHashtags: [],
  requiredMentions: [],
  referenceLinks: [''],
  deliverables: {
    reels: { count: 0, ratePerPost: 0 },
    stories: { count: 0, ratePerPost: 0 },
    staticPosts: { count: 0, ratePerPost: 0 },
  },
  requirements: {
    minFollowers: 0,
    maxFollowers: 0,
    minEngagementRate: 0,
    niches: [],
    locations: [''],
    audienceGenderPreference: 'Any',
    totalCreatorsNeeded: 1,
  },
  budgetPerCreator: 0,
  totalBudget: 0,
  applicationDeadline: '',
  contentDeadline: '',
  approvalMode: 'pre_approval',
};

export const statusClass = (status) => ({
  active: 'bg-[#d9f7ec] text-[#0f7655]',
  draft: 'bg-ink/[0.06] text-ink/55',
  paused: 'bg-[#fff1cc] text-[#8a5a00]',
  completed: 'bg-[#e9ebff] text-[#4140c8]',
  cancelled: 'bg-[#ffe1df] text-[#a8322b]',
  pending: 'bg-[#fff1cc] text-[#8a5a00]',
  accepted: 'bg-[#d9f7ec] text-[#0f7655]',
  rejected: 'bg-[#ffe1df] text-[#a8322b]',
  live: 'bg-[#d9f7ec] text-[#0f7655]',
  approved: 'bg-[#e9ebff] text-[#4140c8]',
  paid: 'bg-[#d9f7ec] text-[#0f7655]',
  partial: 'bg-[#e4f1ff] text-[#1f5f99]',
  visited: 'bg-[#f0f4ff] text-[#4140c8]',
})[status] || 'bg-ink/[0.06] text-ink/55';

export const Badge = ({ children, status }) => React.createElement(
  'span',
  { className: `inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold capitalize ${statusClass(status)}` },
  children || status,
);

export const money = (value) => `INR ${Number(value || 0).toLocaleString('en-IN')}`;

export const formatDate = (date) => {
  if (!date) return 'Not set';
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const daysUntil = (date) => {
  if (!date) return null;
  return Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
};

export const deliverableRows = (campaign) => [
  ['reels', 'Reel', 'reel'],
  ['stories', 'Story', 'story'],
  ['staticPosts', 'Static Post', 'static_post'],
].map(([key, label, apiValue]) => ({
  key,
  label,
  apiValue,
  count: campaign?.deliverables?.[key]?.count || 0,
  rate: campaign?.deliverables?.[key]?.ratePerPost || 0,
})).filter((item) => item.count > 0);

export const totalPerCreator = (campaign) => deliverableRows(campaign)
  .reduce((sum, item) => sum + (item.count * item.rate), 0);

export const requiredPostCount = (campaign) => deliverableRows(campaign)
  .reduce((sum, item) => sum + item.count, 0);
