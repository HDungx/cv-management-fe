"use client";

import { BarChart3, FileUp, Kanban, LogOut, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/candidates", label: "Ứng viên", icon: Users },
  { href: "/board", label: "Kanban", icon: Kanban },
  { href: "/import", label: "Import CV", icon: FileUp },
  { href: "/dashboard", label: "Thống kê", icon: BarChart3 },
];

/**
 * Trang dạng bảng/bảng điều khiển dùng gần hết bề rộng màn hình; trang đọc/form
 * (chi tiết, import) giữ khung vừa phải cho dễ đọc.
 */
const WIDE_ROUTES = ["/candidates", "/board", "/dashboard"];
const WIDE_CLASS = "max-w-[1800px]";
const READING_CLASS = "max-w-7xl";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const containerWidth = WIDE_ROUTES.includes(pathname)
    ? WIDE_CLASS
    : READING_CLASS;

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  if (loading || !session) {
    return (
      <div className={cn("mx-auto w-full space-y-4 p-6", containerWidth)}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b bg-background">
        <div
          className={cn(
            "mx-auto flex h-14 w-full items-center justify-between px-4 sm:px-6",
            containerWidth,
          )}
        >
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/candidates"
              className="flex items-center gap-2 font-semibold"
            >
              <Users className="size-5" />
              <span className="hidden sm:inline">CV Import HR</span>
            </Link>
            <nav className="flex items-center gap-1">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-muted",
                      active
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    <span className="max-sm:sr-only">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {session.user.email}
            </span>
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              <LogOut />
              Đăng xuất
            </Button>
          </div>
        </div>
      </header>
      <main className={cn("mx-auto w-full flex-1 p-4 sm:p-6", containerWidth)}>
        {children}
      </main>
    </div>
  );
}
