"use client";

import { useState } from "react";
import { MoreHorizontal, KeyRound, Shield, FolderGit2, Power, Trash2 } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { EditUserDialog } from "@/components/admin/edit-user-dialog";
import { AssignUserProjectsDialog } from "@/components/admin/assign-user-projects-dialog";
import { DeleteUserDialog } from "@/components/admin/delete-user-dialog";
import { updateUserStatus, updateUserRole } from "@/app/(app)/admin/team/actions";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function TeamMemberActions({ 
  user, 
  projects, 
  currentProjectIds, 
  currentUserId 
}: { 
  user: any; 
  projects: any[]; 
  currentProjectIds: string[]; 
  currentUserId: string;
}) {
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);
  const [newRole, setNewRole] = useState(user.role);

  const isSelf = user.id === currentUserId;

  const handleToggleStatus = async () => {
    try {
      await updateUserStatus(user.id, !user.is_active);
      toast.success(`User ${!user.is_active ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const handleChangeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await updateUserRole(user.id, newRole);
      toast.success("User role updated successfully");
      setShowRoleDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update role");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="h-8 w-8" />}>
          <MoreHorizontal className="w-4 h-4" />
          <span className="sr-only">Open menu</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-[#0c0c0e] border-border text-white">
          
          <DropdownMenuItem onClick={() => setShowEditDialog(true)} className="cursor-pointer gap-2">
            <KeyRound className="w-4 h-4 text-muted-foreground" />
            Edit Credentials
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setShowRoleDialog(true)} disabled={isSelf} className="cursor-pointer gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            Change Role
          </DropdownMenuItem>
          
          {user.role !== 'Admin' && (
            <DropdownMenuItem onClick={() => setShowAssignDialog(true)} className="cursor-pointer gap-2">
              <FolderGit2 className="w-4 h-4 text-muted-foreground" />
              Manage Projects
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator className="bg-border" />

          <DropdownMenuItem 
            onClick={handleToggleStatus} 
            disabled={isSelf} 
            className="cursor-pointer gap-2"
          >
            <Power className={`w-4 h-4 ${user.is_active ? 'text-rose-500' : 'text-emerald-500'}`} />
            {user.is_active ? 'Deactivate User' : 'Activate User'}
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-border" />

          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)} 
            disabled={isSelf} 
            className="cursor-pointer gap-2 text-rose-500 focus:text-rose-500 focus:bg-rose-500/10"
          >
            <Trash2 className="w-4 h-4" />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Role Change Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="sm:max-w-[425px] bg-[#0c0c0e] border-border text-white">
          <form onSubmit={handleChangeRole}>
            <DialogHeader>
              <DialogTitle>Change Role</DialogTitle>
              <DialogDescription>
                Update the role for {user.full_name}. Admins have full access to all projects and settings.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="w-full bg-background border-border">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Member">Member</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowRoleDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating} className="bg-[#858CE9] text-white hover:bg-[#858CE9]/90">
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <EditUserDialog 
        user={user} 
        open={showEditDialog} 
        onOpenChange={setShowEditDialog} 
        hideTrigger 
      />

      {user.role !== 'Admin' && (
        <AssignUserProjectsDialog 
          user={user} 
          allProjects={projects} 
          currentProjectIds={currentProjectIds} 
          open={showAssignDialog} 
          onOpenChange={setShowAssignDialog} 
          hideTrigger 
        />
      )}

      <DeleteUserDialog 
        user={user} 
        disabled={isSelf}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        hideTrigger
      />
    </>
  );
}
