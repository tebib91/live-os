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
import { LogOut, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function UserMenu() {
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

  if (loading || !user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-center hover:opacity-80 transition-opacity">
          <User className="h-4 w-4 text-white/80" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-zinc-900 border-zinc-800"
      >
        <DropdownMenuLabel className="text-zinc-200">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.username}</p>
            <p className="text-xs text-zinc-500 font-normal">{user.role}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem
          className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer"
          disabled
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
