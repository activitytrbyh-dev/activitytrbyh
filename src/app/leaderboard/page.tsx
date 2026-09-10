import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatNumber } from "@/lib/utils";
import { Trophy, Medal } from "lucide-react";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: teachers } = await supabase
    .from("teachers")
    .select("id, name, department, total_points, level")
    .order("total_points", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Trophy className="w-7 h-7 text-yellow-500" />
          لوحة المتصدرين
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          ترتيب المعلمين حسب النقاط
        </p>
      </div>

      {/* Top 3 */}
      {teachers && teachers.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 0, 2].map((pos) => {
            const t = teachers[pos];
            if (!t) return null;
            const medals = ["🥇", "🥈", "🥉"];
            const heights = ["h-32", "h-40", "h-28"];
            return (
              <div
                key={t.id}
                className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 text-center flex flex-col items-center justify-end ${heights[pos]}`}
              >
                <span className="text-4xl mb-2">{medals[pos]}</span>
                <p className="font-bold text-gray-900 dark:text-white text-sm truncate w-full">
                  {t.name}
                </p>
                <p className="text-blue-600 font-bold">
                  {formatNumber(t.total_points)}
                </p>
                <p className="text-xs text-gray-400">المستوى {t.level}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {teachers?.map((t, i) => (
            <div
              key={t.id}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
            >
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  i === 0
                    ? "bg-yellow-100 text-yellow-700"
                    : i === 1
                      ? "bg-gray-100 text-gray-600"
                      : i === 2
                        ? "bg-orange-100 text-orange-700"
                        : "bg-gray-50 text-gray-500 dark:bg-gray-800"
                }`}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {t.name}
                </p>
                <p className="text-xs text-gray-500">{t.department || "—"}</p>
              </div>
              <div className="text-left">
                <p className="font-bold text-blue-600">
                  {formatNumber(t.total_points)} نقطة
                </p>
                <p className="text-xs text-gray-400">المستوى {t.level}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
