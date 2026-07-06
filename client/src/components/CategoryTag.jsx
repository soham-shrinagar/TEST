import React from 'react';

const colors = [
  'border-ink bg-paper text-inkSoft',
  'border-accent bg-accent text-paper',
  'border-ink bg-ink text-paper',
  'border-ink bg-paper text-ink',
];

const CategoryTag = ({ label, index = 0 }) => (
  <span className={`inline-flex items-center border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${colors[index % colors.length]}`}>
    {label}
  </span>
);

export default CategoryTag;
