"use client";

import { useState, ReactNode, useEffect } from "react";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";

export function SidebarWrapper({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true); // desktop collapse state
  const [isMobileOpen, setIsMobileOpen] = useState(false); // mobile drawer state
  const pathname = usePathname();

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleToggle = () => setIsMobileOpen(prev => !prev);
    window.addEventListener("toggle-mobile-sidebar", handleToggle);
    return () => window.removeEventListener("toggle-mobile-sidebar", handleToggle);
  }, []);

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-50 backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div 
        onClick={() => {
          if (!isOpen && window.innerWidth >= 768) setIsOpen(true);
        }}
        className={`
          fixed md:relative inset-y-0 left-0 z-50 md:z-40 h-[100dvh] bg-background border-r border-border transition-all duration-300 ease-in-out shrink-0 group/sidebar overflow-hidden
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${isOpen ? 'w-[280px]' : 'md:w-[72px] md:cursor-pointer md:hover:bg-[#111] w-[280px]'}
        `}
        data-state={isOpen || isMobileOpen ? "open" : "closed"}
      >
        <div className="w-[280px] h-full flex flex-col relative">
          {children}
          
          {/* Mobile Close Button (Inside Drawer) */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden absolute top-4 right-4 p-2 text-[#888] hover:text-white bg-card rounded-md border border-input"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop Collapse Toggle */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="hidden md:flex absolute top-4 right-2 z-50 bg-transparent text-muted-foreground hover:text-white p-1.5 rounded-md transition-colors"
          title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </>
  );
}
