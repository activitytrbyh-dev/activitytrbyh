import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, locale = "ar-SA") {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat("ar-SA").format(num);
}

export function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "قيد المراجعة",
    approved: "معتمد",
    rejected: "مرفوض",
  };
  return labels[status] || status;
}

export function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    admin: "مدير النظام",
    supervisor: "مشرف",
    teacher: "معلم",
  };
  return labels[role] || role;
}

export function calculateLevel(points: number) {
  return Math.max(1, Math.floor(points / 100) + 1);
}

export function pointsToNextLevel(points: number) {
  const currentLevel = calculateLevel(points);
  const nextLevelPoints = currentLevel * 100;
  return nextLevelPoints - points;
}

export function levelProgress(points: number) {
  const currentLevel = calculateLevel(points);
  const prevLevelPoints = (currentLevel - 1) * 100;
  const progress = points - prevLevelPoints;
  return Math.min(100, (progress / 100) * 100);
}
