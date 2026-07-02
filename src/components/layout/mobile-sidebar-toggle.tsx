"use client";

import { Menu } from "lucide-react";

export function MobileSidebarToggle() {
  return (
    <button
      onClick={() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("toggle-mobile-sidebar"));
        }
      }}
      className="sm:hidden p-1.5 -ml-1.5 text-[#888] hover:text-white transition-colors"
      aria-label="Toggle Menu"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}
