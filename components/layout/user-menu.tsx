"use client";

import { getCurrentUser, logout, type AuthUser } from "@/app/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HelpCircle, LogOut, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UserMenuProps {
  onOpenSettings: () => void;
}

export function UserMenu({ onOpenSettings }: UserMenuProps) {
  // Component now requires an onOpenSettings callback prop
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  // TODO: issue with rerendering infinite loop
  useEffect(() => {
    getCurrentUser().then((userData) => {
      setUser(userData);
      setLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    router.refresh();
  };

  const openShortcuts = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("openShortcuts"));
  };

  if (loading || !user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-center h-9 w-9 border rounded-full bg-black/30 backdrop-blur-xl border border-white/10 transition-all shadow-lg shadow-black/30">
          <User className="h-4 w-4 text-white/80" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 bg-black/80 border border-white/10 backdrop-blur-xl shadow-2xl shadow-black/40 rounded-2xl p-2"
      >
        <DropdownMenuLabel className="text-zinc-100 px-2 py-1.5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-sm font-semibold uppercase text-white/80">
              {user.username?.slice(0, 2) || "U"}
            </div>
            <div className="flex flex-col space-y-0.5">
              <p className="text-sm font-semibold">{user.username}</p>
              <p className="text-[11px] text-zinc-400 font-normal tracking-wide uppercase">
                {user.role}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          className="text-zinc-100 focus:bg-white/10 focus:text-white cursor-pointer rounded-xl px-3 py-2"
          onClick={onOpenSettings}
        >
          <Settings className="mr-2 h-4 w-4 text-white/70" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={openShortcuts}
          className="text-zinc-100 focus:bg-white/10 focus:text-white cursor-pointer rounded-xl px-3 py-2"
        >
          <HelpCircle className="mr-2 h-4 w-4 text-white/70" />
          Shortcut help
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer rounded-xl px-3 py-2"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
