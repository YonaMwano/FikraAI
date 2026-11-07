"use client";

import { Menu, Settings } from "lucide-react";
import { ModelSwitcher } from "@/components/chat/ModelSwitcher";

interface HeaderProps {
  user: any;
  onMenuClick: () => void;
}

export function Header({ user, onMenuClick }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4">
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 hover:bg-muted md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex flex-1 justify-center">
        <ModelSwitcher />
      </div>

      <button className="rounded-md p-2 hover:bg-muted">
        <Settings className="h-5 w-5" />
      </button>
    </header>
  );
}
