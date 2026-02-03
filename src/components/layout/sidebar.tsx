'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Mic,
  BarChart3,
  FileText,
  Settings,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/eval/live', label: 'Eval', icon: Mic },
  { href: '/results', label: 'Results', icon: BarChart3 },
  { href: '/prompts', label: 'Prompts', icon: FileText },
];

const bottomItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-52 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-chart-1/15">
          <Activity className="h-4 w-4 text-chart-1" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-sidebar-primary">
          VoiceBench
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 space-y-0.5 px-2 pt-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors',
              isActive(item.href)
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
            )}
          >
            {isActive(item.href) && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-sm bg-chart-1" />
            )}
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-sidebar-border px-2 py-3 space-y-0.5">
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors',
              isActive(item.href)
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
            )}
          >
            {isActive(item.href) && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-sm bg-chart-1" />
            )}
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        ))}
        <div className="px-2.5 pt-3 text-[10px] font-metric text-sidebar-foreground/30 tracking-wider">
          v3.0.0
        </div>
      </div>
    </aside>
  );
}
