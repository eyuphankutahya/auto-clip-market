import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TITLE = "Yeni Şifre Belirle — KlipsMarket";
const DESC = "KlipsMarket hesabınız için yeni şifre belirleyin.";

export const Route = createFileRoute("/sifre-sifirla")({
  head: () => ({ meta: [{ title: TITLE }, { name: "description", content: DESC }, { property: "og:title", content: TITLE }, { property: "og:description", content: DESC }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const [ready, setReady] = useState<"wait" | "ok" | "invalid">("wait");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") setReady("ok"); });
    const isRecovery = window.location.hash.includes("type=recovery") || new URLSearchParams(window.location.search).has("code");
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session && isRecovery) setReady("ok");
      else if (!isRecovery) setReady("invalid");
    });
    const t = setTimeout(() => setReady((r) => (r === "wait" ? "invalid" : r)), 4000);
    return () => { data.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== again) { toast.error("Şifreler aynı değil"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error("Şifre değiştirilemedi: " + error.message); return; }
    toast.success("Şifreniz güncellendi");
    navigate({ to: "/" });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-md border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold">Yeni şifre belirle</h1>
        {ready === "wait" && <p className="mt-4 text-muted-foreground">Bağlantı kontrol ediliyor…</p>}
        {ready === "invalid" && (
          <p className="mt-4 text-sm text-muted-foreground">Bu bağlantı geçersiz ya da süresi dolmuş. <Link to="/auth" className="text-accent underline">Giriş sayfasından</Link> yeni bir sıfırlama bağlantısı isteyin.</p>
        )}
        {ready === "ok" && (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div><Label htmlFor="pw">Yeni şifre</Label><Input id="pw" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            <div><Label htmlFor="pw2">Yeni şifre (tekrar)</Label><Input id="pw2" type="password" minLength={8} value={again} onChange={(e) => setAgain(e.target.value)} required /></div>
            <Button type="submit" className="w-full" disabled={busy}>Şifreyi kaydet</Button>
          </form>
        )}
      </div>
    </div>
  );
}
