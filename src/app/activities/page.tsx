import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate, getStatusLabel, getStatusColor } from "@/lib/utils";
import { PlusCircle, Image as ImageIcon } from "lucide-react";

export default async function ActivitiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  let activitiesQuery = supabase
    .from("activities")
    .select(`
      *,
      teacher:teachers(name),
      images:activity_images(id)
    `)
    .order("created_at", { ascending: false });

  if (profile?.role === "teacher") {
    const { data: teacher } = await supabase
      .from("teachers")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (teacher) {
      activitiesQuery = activitiesQuery.eq("teacher_id", teacher.id);
    }
  }

  const { data: activities } = await activitiesQuery;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            الأنشطة
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            إدارة ومتابعة الأنشطة الصفية
          </p>
        </div>
        {profile?.role === "teacher" && (
          <Link
            href="/activities/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition"
          >
            <PlusCircle className="w-5 h-5" />
            إضافة نشاط
          </Link>
        )}
      </div>

      {!activities || activities.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <p className="text-gray-500 mb-4">لا توجد أنشطة بعد</p>
          {profile?.role === "teacher" && (
            <Link
              href="/activities/new"
              className="inline-flex items-center gap-2 text-blue-600 hover:underline"
            >
              <PlusCircle className="w-4 h-4" />
              أضف أول نشاط
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {activities.map((activity: any) => (
            <Link
              key={activity.id}
              href={`/activities/${activity.id}`}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md transition block"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {activity.title}
                    </h3>
                    <span
                      className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        activity.status
                      )}`}
                    >
                      {getStatusLabel(activity.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                    {activity.description || "بدون وصف"}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                    <span>{activity.activity_type}</span>
                    {activity.grade && <span>الصف: {activity.grade}</span>}
                    <span>{formatDate(activity.activity_date)}</span>
                    {activity.teacher && (
                      <span>المعلم: {activity.teacher.name}</span>
                    )}
                    {activity.images?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5" />
                        {activity.images.length}
                      </span>
                    )}
                  </div>
                </div>
                {activity.points > 0 && (
                  <div className="text-left shrink-0">
                    <span className="text-lg font-bold text-blue-600">
                      +{activity.points}
                    </span>
                    <p className="text-xs text-gray-400">نقطة</p>
                  </div>
                )}
              </div>
              {activity.status === "rejected" && activity.rejection_reason && (
                <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-400">
                  سبب الرفض: {activity.rejection_reason}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
