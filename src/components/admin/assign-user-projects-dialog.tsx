"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { updateUserProjects } from "@/app/(app)/projects/team-actions";
import { toast } from "sonner";

export function AssignUserProjectsDialog({
  user,
  allProjects,
  currentProjectIds,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  hideTrigger = false,
}: {
  user: any;
  allProjects: any[];
  currentProjectIds: string[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;
  const [selectedIds, setSelectedIds] = useState<string[]>(currentProjectIds);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await updateUserProjects(user.id, selectedIds);
      toast.success("Projects updated successfully");
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update projects");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (val) setSelectedIds(currentProjectIds); // reset state on open
    }}>
      {!hideTrigger && (
        <DialogTrigger 
          render={
            <Button variant="ghost" size="sm" className="h-8 gap-2 px-2 text-xs">
              <Plus className="w-3 h-3" />
              Assign Projects
            </Button>
          } 
        />
      )}
      <DialogContent className="sm:max-w-[425px] bg-[#0F0F0F] border-border text-white">
        <DialogHeader>
          <DialogTitle>Assign Projects for {user.full_name}</DialogTitle>
        </DialogHeader>
        <div className="py-4 flex flex-col gap-3 max-h-[300px] overflow-y-auto">
          {allProjects.length === 0 ? (
            <div className="text-sm text-muted-foreground">No projects found.</div>
          ) : (
            allProjects.map(p => (
              <label key={p.id} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/10 transition-colors">
                <Checkbox 
                  checked={selectedIds.includes(p.id)}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedIds(prev => [...prev, p.id]);
                    else setSelectedIds(prev => prev.filter(id => id !== p.id));
                  }}
                  className="border-white/20 data-[state=checked]:bg-[#858CE9] data-[state=checked]:border-[#858CE9]"
                />
                <span className="text-sm">{p.name}</span>
              </label>
            ))
          )}
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            className="bg-[#858CE9] text-white hover:bg-[#858CE9]/90"
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Assignments"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
