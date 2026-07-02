"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TeamFilter({ 
  projects, 
  currentProject 
}: { 
  projects: any[], 
  currentProject?: string 
}) {
  const router = useRouter();

  function onValueChange(value: string | null) {
    if (!value || value === "all_users") {
      router.push("/admin/team");
    } else {
      router.push(`/admin/team?projectId=${value}`);
    }
  }

  return (
    <Select value={currentProject || "all_users"} onValueChange={onValueChange}>
      <SelectTrigger className="w-[180px] bg-background border-border h-9">
        <SelectValue placeholder="Filter by project" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all_users">All Users</SelectItem>
        <SelectItem value="all_projects">All Projects</SelectItem>
        {projects?.map(p => (
          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
