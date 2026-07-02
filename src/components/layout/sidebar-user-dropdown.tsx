"use client"

import Link from "next/link"
import { Archive } from "lucide-react"
import { logout } from "@/app/auth/actions"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

export function SidebarUserDropdown({ 
  initials, 
  userName, 
  userRole 
}: { 
  initials: string
  userName: string
  userRole: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#1A1A1A] transition-colors group cursor-pointer border-none outline-none text-left bg-transparent">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded bg-accent ring-1 ring-[#333] flex items-center justify-center shrink-0 text-[10px] font-bold text-[#888]">
            {initials}
          </div>
          <div className="flex-1 min-w-0 text-left group-data-[state=closed]/sidebar:hidden">
            <div className="text-[13px] font-semibold text-white truncate">{userName}</div>
            <div className="text-[11px] text-muted-foreground truncate group-hover:text-[#888]">
              {userRole}
            </div>
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-card border-border text-white ml-2" align="start">
        
        <DropdownMenuItem className="focus:bg-accent focus:text-white cursor-pointer p-0">
          <Link href="/settings" className="w-full h-full px-2 py-1.5 flex items-center gap-2 block">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#888]"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            Profile Settings
          </Link>
        </DropdownMenuItem>
        
        {userRole === "Admin" && (
          <>
            <DropdownMenuItem className="focus:bg-accent focus:text-white cursor-pointer p-0">
              <Link href="/admin/team" className="w-full h-full px-2 py-1.5 flex items-center gap-2 block">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#888]"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Manage Team
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="focus:bg-accent focus:text-white cursor-pointer p-0">
              <Link href="/admin/archives" className="w-full h-full px-2 py-1.5 flex items-center gap-2 block">
                <Archive className="w-4 h-4 text-[#888]" />
                Manage Archives
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator className="bg-accent" />
        
        <DropdownMenuItem className="focus:bg-red-900/20 focus:text-red-400 cursor-pointer text-red-400 p-0">
          <form action={logout} className="w-full">
            <button type="submit" className="w-full h-full px-2 py-1.5 text-left block">
              Log out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
