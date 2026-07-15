import { NextResponse } from "next/server";

export function apiError(message: string, status = 400, details?: unknown) {
  const payload: { ok: false; error: string; details?: unknown } = { ok: false, error: message };
  if (process.env.NODE_ENV !== "production" && details !== undefined) payload.details = details;
  return NextResponse.json(payload, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}
