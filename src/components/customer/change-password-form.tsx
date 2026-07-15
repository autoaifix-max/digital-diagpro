"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(""); setMessage("");
    if (password.length < 10) return setError("كلمة المرور يجب ألا تقل عن 10 خانات");
    if (password !== confirm) return setError("كلمتا المرور غير متطابقتين");
    setBusy(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (updateError) return setError("تعذر تغيير كلمة المرور. حاول مرة أخرى.");
    setPassword(""); setConfirm(""); setMessage("تم تغيير كلمة المرور بنجاح");
  }

  return <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2"><div className="relative"><KeyRound className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#727986]" size={17} /><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة مرور جديدة" className="pr-11" minLength={10} /></div><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="تأكيد كلمة المرور" minLength={10} /><div className="sm:col-span-2 flex flex-wrap items-center gap-3"><Button type="submit" size="sm" disabled={busy}>{busy ? <Loader2 className="animate-spin" size={16} /> : <KeyRound size={16} />} تغيير كلمة المرور</Button>{message ? <span className="flex items-center gap-1 text-xs text-emerald-300"><CheckCircle2 size={15} /> {message}</span> : null}{error ? <span className="text-xs text-red-300">{error}</span> : null}</div></form>;
}
