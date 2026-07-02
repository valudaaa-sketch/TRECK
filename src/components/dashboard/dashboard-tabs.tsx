"use client"

import Link from "next/link";
import { LayoutList, FolderGit2, Activity } from "lucide-react";
import { usePathname } from "next/navigation";

export function DashboardTabs({ currentTab, projectId }: { currentTab?: string, projectId: string }) {
  const pathname = usePathname();

  const tabs = [
    { id: "tasks", label: "Tasks", icon: LayoutList },
    { id: "details", label: "Details & Resources", icon: FolderGit2 },
    { id: "activity", label: "Updates & Activity", icon: Activity },
  ];

  let activeTab = "tasks";
  
  if (pathname.includes('/details')) {
    activeTab = "details";
  } else if (pathname.includes('/activity')) {
    activeTab = "activity";
  } else if (pathname.includes('/tasks')) {
    activeTab = "tasks";
  }

  return (
    <div className="flex items-center gap-6 h-full">
      {tabs.map((t) => {
        const isActive = activeTab === t.id;
        const Icon = t.icon;
        return (
          <Link
            key={t.id}
            href={`/projects/${projectId}/${t.id}`}
            className={`flex items-center gap-2 text-sm font-medium h-full border-b-2 px-1 transition-colors ${
              isActive 
                ? "border-[#858ce9] text-white" 
                : "border-transparent text-muted-foreground hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
