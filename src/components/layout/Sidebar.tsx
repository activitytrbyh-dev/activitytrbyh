"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Activity,
  Trophy,
  FileText,
  Award,
  Bell,
  User,
  Settings,
  Users,
  GraduationCap,
  BarChart3,
  LogOut,
  Menu,
  X,
  PlusCircle,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

interface SidebarProps {
  role: UserRole;
  userName: string;
}

const teacherLinks = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/activities", label: "أنشطتي", icon: Activity },
  { href: "/activities/new", label: "إضافة نشاط", icon: PlusCircle },
  { href: "/leaderboard", label: "المتصدرين", icon: Trophy },
  { href: "/badges", label: "الشارات", icon: Award },
  { href: "/notifications", label: "الإشعارات", icon: Bell },
  { href: "/profile", label: "الملف الشخصي", icon: User },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

const supervisorLinks = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/admin/activities", label: "مراجعة الأنشطة", icon: Activity },
  { href: "/leaderboard", label: "المتصدرين", icon: Trophy },
  { href: "/reports", label: "التقارير", icon: FileText },
  { href: "/notifications", label: "الإشعارات", icon: Bell },
  { href: "/profile", label: "الملف الشخصي", icon: User },
];

const adminLinks = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/admin/users", label: "المستخدمين", icon: Users },
  { href: "/admin/teachers", label: "المعلمين", icon: GraduationCap },
  { href: "/admin/activities", label: "الأنشطة", icon: Activity },
  { href: "/admin/points", label: "نظام النقاط", icon: BarChart3 },
  { href: "/reports", label: "التقارير", icon: FileText },
  { href: "/leaderboard", label: "المتصدرين", icon: Trophy },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
];

export default function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  const links =
    role === "admin"
      ? adminLinks
      : role === "supervisor"
        ? supervisorLinks
        : teacherLinks;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-900 shadow-md border border-gray-200 dark:border-gray-700"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-72 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-gray-900 dark:text-white">
                منصة الأنشطة
              </h2>
              <p className="text-xs text-gray-500 truncate max-w-[140px]">
                {userName}
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {links.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/dashboard" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <link.icon className="w-5 h-5 shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  );
}
