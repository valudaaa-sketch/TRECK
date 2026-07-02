import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { ArchiveTable } from "@/components/admin/archive-table";
import { getArchivedItems, restoreItem, permanentlyDeleteItem, permanentlyDeleteProject, type ArchiveType } from "./actions";
import { Archive } from "lucide-react";
import { MobileSidebarToggle } from "@/components/layout/mobile-sidebar-toggle";
import { Suspense } from "react";
import { cookies } from "next/headers";

const TABS: { id: ArchiveType; label: string }[] = [
  { id: "projects", label: "Projects" },
  { id: "tasks", label: "Tasks" },
  { id: "comments", label: "Comments" },
  { id: "project_documents", label: "Documents" },
  { id: "shared_notes", label: "Shared Notes" },
  { id: "files", label: "Files" },
];

const VALID_TABS = TABS.map(t => t.id);

export default async function ArchivesPage(
  props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }
) {
  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const rawTab = (searchParams.tab as string) || "projects";
  const activeTab: ArchiveType = VALID_TABS.includes(rawTab as ArchiveType) ? (rawTab as ArchiveType) : "projects";
  const projectIdFilter = (searchParams.projectId as string | undefined) || cookieStore.get('treck_last_project_id')?.value;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "Admin") {
    redirect("/");
  }

  const items = await getArchivedItems(activeTab);

  return (
    <div className="relative w-full max-w-7xl mx-auto flex flex-col flex-1 pb-12 selection:bg-indigo-500/30">
      <div className="relative z-10 w-full flex flex-col flex-1 text-white">
        
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-3 sm:pt-5 sm:pb-1 shrink-0 bg-background sm:bg-transparent border-b border-border sm:border-none z-40">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* We do NOT need MobileSidebarToggle here because GlobalProjectHeader handles it! */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-muted border border-border shrink-0">
                <Archive className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-[16px] sm:text-3xl md:text-4xl font-semibold text-white/90 tracking-tight truncate">Archive Management</h1>
                <p className="hidden sm:block text-xs text-white/40 mt-0.5">Manage and restore deleted records across the system. Items auto-delete after 15 days.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Tab Bar */}
        <div className="sticky top-0 z-30 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/80 pt-0 pb-0 px-6 md:px-8 border-b border-border">

          <div className="flex gap-6 h-12 items-center">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={`/admin/archives?tab=${tab.id}${projectIdFilter ? `&projectId=${projectIdFilter}` : ''}`}
                  className={`h-full inline-flex items-center text-[13px] font-semibold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "text-white border-[#858ce9]"
                      : "border-transparent text-muted-foreground hover:text-white"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="px-6 md:px-8 mt-6 mb-8">
          <ArchiveTable
            items={items}
            type={TABS.find((t) => t.id === activeTab)?.label || "Items"}
            onRestore={async (id) => {
              "use server";
              await restoreItem(activeTab, id);
            }}
            onDelete={async (id) => {
              "use server";
              if (activeTab === "projects") {
                await permanentlyDeleteProject(id);
              } else {
                await permanentlyDeleteItem(activeTab, id);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
