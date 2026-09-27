import type { Metadata } from "next";
import { getAllParcels, getAllSignals } from "@/lib/redis";
import { computePublicStats, type PublicStats } from "@/lib/public-stats";
import PublicView from "@/components/PublicView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ЖерКөз — открытые итоги",
  description: "Итоги народного контроля за земельными участками г. Тараз",
};

export default async function PublicPage() {
  let stats: PublicStats | null = null;
  try {
    const [parcels, signals] = await Promise.all([getAllParcels(), getAllSignals()]);
    stats = computePublicStats(parcels, signals);
  } catch (e) {
    console.error("[public]", e instanceof Error ? e.message : e);
  }
  const username = process.env.NEXT_PUBLIC_BOT_USERNAME?.replace(/^@/, "").trim();
  const botUrl = username && /^[A-Za-z0-9_]{5,32}$/.test(username) ? `https://t.me/${username}` : null;

  if (!stats) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-center text-sm text-slate-600">
        Данные временно недоступны. Попробуйте обновить страницу позже.
      </div>
    );
  }
  return <PublicView stats={stats} botUrl={botUrl} />;
}
