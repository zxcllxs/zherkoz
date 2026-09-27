import { NextResponse } from "next/server";

export function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export function serverError(e: unknown, context: string): NextResponse {
  console.error(`[${context}]`, e);
  return jsonError("Внутренняя ошибка сервера", 500);
}
