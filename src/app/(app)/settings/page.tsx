import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateProfile } from "./actions";
import { getUserColor } from "@/lib/colors";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return <div className="p-8">Error loading profile.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 p-4 sm:p-8 w-full">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account settings and preferences.</p>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/20">
          <h2 className="font-semibold tracking-tight">Profile Information</h2>
        </div>
        
        <form action={updateProfile} className="p-6 space-y-6">
          <div className="flex items-center gap-4 pb-4 border-b border-border/50">
            <Avatar className="h-16 w-16 border-2 border-border">
              <AvatarImage src={user.user_metadata?.avatar_url || ""} />
              <AvatarFallback 
                className="text-lg text-white"
                style={{ backgroundColor: getUserColor(user.id) }}
              >
                {profile.full_name?.substring(0, 2).toUpperCase() || <User className="h-6 w-6" />}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{profile.full_name}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input 
              id="email" 
              type="email" 
              defaultValue={profile.email} 
              disabled 
              className="bg-muted/30"
            />
            <p className="text-xs text-muted-foreground">Your email address cannot be changed right now.</p>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <div>
              <Badge variant={profile.role === "Admin" ? "default" : "secondary"}>
                {profile.role}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Contact an administrator to change your role.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input 
              id="fullName" 
              name="fullName" 
              defaultValue={profile.full_name} 
              required 
            />
          </div>

          <div className="pt-2">
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
