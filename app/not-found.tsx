import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Страница не найдена</h1>
      <Link href="/" className="text-sm text-blue-700 hover:underline">
        Вернуться к панели инспектора
      </Link>
    </div>
  );
}
