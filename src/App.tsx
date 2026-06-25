/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MuseumGallery } from './components/MuseumGallery';

export default function App() {
  return (
    <div className="min-h-screen bg-[#0c0c0c] text-[#f2f2f2] font-sans selection:bg-[#c5a059] selection:text-black relative">
      {/* Ornate grid pattern representing a classic museum architectural layout */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-60" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(197,160,89,0.01)_1px,transparent_1px)] pointer-events-none" />
      
      <div className="relative z-10">
        <MuseumGallery />
      </div>
    </div>
  );
}

