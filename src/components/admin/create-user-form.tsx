"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { createUserProfile } from "@/app/(app)/admin/team/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export function CreateUserForm({ allProjects = [] }: { allProjects?: any[] }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [role, setRole] = useState("Member");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("role", role);
    selectedProjects.forEach(id => formData.append("projectIds", id));

    try {
      await createUserProfile(formData);
      setOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to create user");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-[#858CE9] text-white hover:bg-[#858CE9]/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px] bg-[#0c0c0e] border border-border">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Create a new user profile. Note: Ensure you share the initial password with the user.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {error && (
              <div className="bg-red-500/10 text-red-500 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                name="full_name"
                placeholder="John Doe"
                required
                className="bg-background border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                required
                className="bg-background border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Initial Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Required for first login"
                required
                minLength={6}
                className="bg-background border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(val) => setRole(val || "Member")}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Member">Member</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role !== "Admin" && allProjects && allProjects.length > 0 && (
              <div className="space-y-3 mt-2 border-t border-border pt-4">
                <Label>Assign Projects (Optional)</Label>
                <div className="max-h-[150px] overflow-y-auto space-y-2 pr-2">
                  {allProjects.map(p => (
                    <label key={p.id} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/10 transition-colors">
                      <Checkbox 
                        checked={selectedProjects.includes(p.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedProjects(prev => [...prev, p.id]);
                          else setSelectedProjects(prev => prev.filter(id => id !== p.id));
                        }}
                        className="border-white/20 data-[state=checked]:bg-[#858CE9] data-[state=checked]:border-[#858CE9]"
                      />
                      <span className="text-sm">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-[#858CE9] text-white hover:bg-[#858CE9]/90">
              {isLoading ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
