'use client';

import React from 'react';
import Header from '@/components/Header';
import PublicFeed from '@/components/PublicFeed';

export default function Home() {
  return (
    <div className="container">
      <Header />
      <PublicFeed />
      <div className="footer">Make By PEPSEALSEA ©2025</div>
    </div>
  );
}
