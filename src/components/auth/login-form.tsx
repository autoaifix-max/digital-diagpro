"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";

export function LoginForm({ portal }: { portal: "admin" | "customer" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("بيانات الدخول غير صحيحة أو الحساب غير مفعّل.");
      setLoading(false);
      return;
    }

    const fallback = portal === "admin" ? "/admin" : "/customer";
    const requested = searchParams.get("next");
    const next = requested?.startsWith(portal === "admin" ? "/admin" : "/customer") ? requested : fallback;
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <Field label="البريد الإلكتروني"><Input name="email" type="email" autoComplete="email" required placeholder="name@example.com" dir="ltr" /></Field>
      <Field label="كلمة المرور"><Input name="password" type="password" autoComplete="current-password" required minLength={6} placeholder="••••••••" dir="ltr" /></Field>
      {error ? <div role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}
      <Button type="submit" size="lg" disabled={loading}>
        {loading ? <><Loader2 size={19} className="animate-spin" /> جارٍ الدخول</> : <><LogIn size={19} /> تسجيل الدخول</>}
      </Button>
    </form>
  );
}
