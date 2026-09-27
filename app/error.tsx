"use client";

// Граница ошибок: вместо белого экрана — понятное сообщение и кнопка повтора.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Что-то пошло не так</h1>
      <p className="max-w-md text-sm text-slate-600">
        Панель столкнулась с ошибкой. Попробуйте обновить страницу.
        {error.digest && <span className="mt-1 block text-xs text-slate-400">Код: {error.digest}</span>}
      </p>
      <button onClick={reset} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
        Повторить
      </button>
    </div>
  );
}
