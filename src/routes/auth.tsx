import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Giriş Yap — KlipsMarket" },
      { name: "description", content: "KlipsMarket hesabınıza giriş yapın veya yeni hesap oluşturun." },
      { property: "og:title", content: "Giriş Yap — KlipsMarket" },
      { property: "og:description", content: "Hesabınıza giriş yapın." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return toast.error("Giriş başarısız: " + error.message);
      navigate({ to: "/" });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { full_name: name } } });
      setBusy(false);
      if (error) return toast.error(error.message);
      if (data.session) navigate({ to: "/" });
      else { toast.success("Kayıt alındı. E-postanıza gelen bağlantı ile hesabınızı onaylayın."); setMode("in"); }
    }
  };
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-md border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold">{mode === "in" ? "Giriş yap" : "Hesap oluştur"}</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "up" && <div><Label>Ad Soyad</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>}
          <div><Label>E-posta</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label>Şifre</Label><Input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <Button type="submit" className="w-full" disabled={busy}>{mode === "in" ? "Giriş yap" : "Kayıt ol"}</Button>
        </form>
        <button className="mt-4 text-sm text-accent" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Hesabınız yok mu? Kayıt olun" : "Zaten hesabınız var mı? Giriş yapın"}
        </button>
      </div>
    </div>
  );
}
