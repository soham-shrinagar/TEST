import React from 'react';
import { lineupStatusLabel } from '../constants/lineupCopy';

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
  active: 'bg-accent text-paper',
  draft: 'bg-paper text-inkSoft border border-ink',
  paused: 'bg-paper text-ink border border-ink',
  completed: 'bg-ink text-paper',
  cancelled: 'bg-ink text-paper',
  pending: 'bg-paper text-ink border border-accent',
  accepted: 'bg-accent text-paper',
  rejected: 'bg-ink text-paper',
  live: 'bg-accent text-paper',
  approved: 'bg-accent text-paper',
  paid: 'bg-ink text-paper',
  partial: 'bg-paper text-ink border border-ink',
  visited: 'bg-paper text-ink border border-ink',
})[status] || 'bg-paper text-inkSoft border border-ink';

export const Badge = ({ children, status }) => React.createElement(
  'span',
  { className: `inline-flex px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${statusClass(status)}` },
  children || lineupStatusLabel(status) || status,
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
