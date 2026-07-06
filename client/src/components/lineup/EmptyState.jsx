import React from 'react';
import LineupScene from './LineupScene';

const EmptyState = ({ title = "No shows booked yet.", message = "This slot's still open." }) => (
  <div className="torn-top flex flex-col items-center border-2 border-ink bg-paper px-6 py-12 text-center">
    <LineupScene mode="empty" />
    <h3 className="mt-6 font-display text-2xl uppercase text-ink">{title}</h3>
    <p className="mt-2 max-w-sm text-sm text-inkSoft">{message}</p>
  </div>
);

export default EmptyState;
