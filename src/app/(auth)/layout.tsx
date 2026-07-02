import { ReactNode } from "react";
import { FolderGit2 } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md space-y-6">
        <Link href="/" className="flex items-center justify-center gap-2.5 font-bold text-xl">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FolderGit2 className="h-5 w-5" />
          </div>
          <span className="tracking-tight">TRECK</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
