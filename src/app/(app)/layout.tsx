import { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarWrapper } from "@/components/layout/sidebar-wrapper";
import { GlobalProjectHeader } from "@/components/layout/global-project-header";
import { GlobalRealtimeProvider } from "@/components/layout/global-realtime-provider";
import { cookies } from "next/headers";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const activeProjectId = cookieStore.get('treck_last_project_id')?.value;
  return (
    <GlobalRealtimeProvider projectId={activeProjectId || ""}>
      <div className="flex flex-col md:flex-row fixed inset-0 bg-black overflow-hidden text-white">
        <SidebarWrapper>
          <AppSidebar />
        </SidebarWrapper>
        <main className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden">
          <GlobalProjectHeader projectId={activeProjectId || ""} />
          <div className="flex-1 overflow-y-auto min-h-0">
            {children}
          </div>
        </main>
      </div>
    </GlobalRealtimeProvider>
  );
}
