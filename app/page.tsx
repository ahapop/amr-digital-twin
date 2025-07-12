"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import TopBar from "@/components/TopBar";
import SidePanel from "@/components/SidePanel";
import PresetBox from "@/components/PresetBox";
import BimPanel from "@/components/BimPanel";
import ContextMenu from "@/components/ContextMenu";
import ModelLoadingOverlay from "@/components/ModelLoadingOverlay";

// Dynamically import ThreeScene to avoid SSR issues
const ThreeScene = dynamic(() => import("@/components/ThreeScene"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="text-white">Loading 3D Scene...</div>
    </div>
  ),
});

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-800">
        <div className="text-white">Loading AMR Digital Twin Platform...</div>
      </div>
    );
  }

  return (
    <main className="relative w-full h-screen overflow-hidden">
      {/* Top Navigation Bar */}
      <TopBar />

      {/* Side Panels */}
      <SidePanel />

      {/* Preset Control Box */}
      <PresetBox />

      {/* BIM Panel */}
      <BimPanel />

      {/* Context Menu */}
      <ContextMenu />

      {/* 🔧 NEW: Model Loading Overlay */}
      <ModelLoadingOverlay />

      {/* SVG Overlay for Connectors */}
      <svg
        id="overlay"
        className="absolute inset-0 w-full h-full pointer-events-none z-[110]"
      >
        <line
          id="connector"
          x1="0"
          y1="0"
          x2="0"
          y2="0"
          className="stroke-green-500 stroke-2 hidden"
        />
      </svg>

      {/* Main 3D Scene */}
      <ThreeScene />
    </main>
  );
}
