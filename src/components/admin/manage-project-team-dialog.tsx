"use client";

import { useState, useEffect } from "react";
import { Users, Check } from "lucide-react";
import { addProjectMember, removeProjectMember, getProjectMembers } from "@/app/(app)/projects/team-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function ManageProjectTeamDialog({ 
  project,
  users 
}: { 
  project: any;
  users: any[];
}) {
  const [open, setOpen] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      loadMembers();
    }
  }, [open, project.id]);

  async function loadMembers() {
    setLoadingMembers(true);
    try {
      const ids = await getProjectMembers(project.id);
      setMemberIds(ids);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  }

  async function toggleMember(userId: string, isMember: boolean) {
    setProcessingId(userId);
    try {
      if (isMember) {
        await removeProjectMember(project.id, userId);
        setMemberIds(prev => prev.filter(id => id !== userId));
        toast.success("Member removed");
      } else {
        await addProjectMember(project.id, userId);
        setMemberIds(prev => [...prev, userId]);
        toast.success("Member added");
      }
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update member");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button className="text-xs bg-white text-black hover:bg-gray-100 px-3 py-1 rounded-full border border-transparent font-medium flex items-center gap-1.5 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            <Users className="h-3 w-3" /> Team
          </button>
        }
      />
      <DialogContent className="sm:max-w-[425px] bg-[#0c0c0e] border border-border">
        <DialogHeader>
          <DialogTitle>Project Team</DialogTitle>
          <DialogDescription>
            Manage who has access to {project.name}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          {loadingMembers ? (
            <div className="text-center text-sm text-muted-foreground py-4">Loading members...</div>
          ) : (
            <div className="space-y-2">
              {users.map(u => {
                const isMember = memberIds.includes(u.id);
                const isProcessing = processingId === u.id;
                
                return (
                  <div key={u.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium text-white shrink-0">
                        {u.full_name?.substring(0, 2).toUpperCase() || "U"}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{u.full_name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={isProcessing}
                      onClick={() => toggleMember(u.id, isMember)}
                      className={isMember ? "border-[#858CE9] text-[#858CE9] hover:bg-[#858CE9]/10" : "text-muted-foreground hover:text-white"}
                    >
                      {isProcessing ? "..." : isMember ? (
                        <><Check className="w-3 h-3 mr-1" /> Added</>
                      ) : (
                        "Add"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
