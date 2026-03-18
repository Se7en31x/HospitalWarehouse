'use client';
import React from 'react';
import HistoryContent from './HistoryClient';
import { HISTORY_DATA } from './history.data';

const HistoryPage: React.FC = () => {
  return <HistoryContent data={HISTORY_DATA} />;
};

export default HistoryPage;