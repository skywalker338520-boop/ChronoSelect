"use client";

import dynamic from 'next/dynamic';

const ChronoSelect = dynamic(() => import('@/components/chrono-select'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-black flex items-center justify-center text-white font-headline">Loading ChronoSelect...</div>,
});

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-black">
      <ChronoSelect />
    </main>
  );
}
