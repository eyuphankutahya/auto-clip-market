import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
      { property: "og:description", content: "Hesabınıza giriş yapın." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/sifre-sifirla` });
      setBusy(false);
      if (error) { toast.error("Gönderilemedi: " + error.message); return; }
      toast.success("Şifre yenileme bağlantısı e-postanıza gönderildi.");
      setMode("in");
      return;
    }
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) { toast.error("Giriş başarısız: " + error.message); return; }
      navigate({ to: "/" });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { full_name: name } } });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      if (data.session) navigate({ to: "/" });
      else { toast.success("Kayıt alındı. E-postanıza gelen bağlantı ile hesabınızı onaylayın."); setMode("in"); }
    }
  };
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-md border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold">{mode === "in" ? "Giriş yap" : mode === "up" ? "Hesap oluştur" : "Şifremi unuttum"}</h1>
        {mode === "forgot" && <p className="mt-2 text-sm text-muted-foreground">E-posta adresinizi yazın, şifre yenileme bağlantısı gönderelim.</p>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "up" && <div><Label>Ad Soyad</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>}
          <div><Label>E-posta</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          {mode !== "forgot" && (
            <div>
              <div className="flex items-center justify-between"><Label>Şifre</Label>
                {mode === "in" && <button type="button" className="text-xs text-accent hover:underline" onClick={() => setMode("forgot")}>Şifremi unuttum</button>}</div>
              <Input type="password" minLength={mode === "up" ? 8 : 6} value={password} onChange={(e) => setPassword(e.target.value)} required />
              {mode === "up" && <p className="mt-1 text-xs text-muted-foreground">En az 8 karakter. Daha önce internette sızdırılmış şifreler kabul edilmez.</p>}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={busy}>{mode === "in" ? "Giriş yap" : mode === "up" ? "Kayıt ol" : "Bağlantı gönder"}</Button>
          {mode === "up" && <p className="text-xs text-muted-foreground">Kayıt olarak <Link to="/kvkk" className="text-accent underline">KVKK Aydınlatma Metni</Link>'ni okuduğunuzu kabul edersiniz.</p>}
        </form>
        <button className="mt-4 text-sm text-accent" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Hesabınız yok mu? Kayıt olun" : mode === "up" ? "Zaten hesabınız var mı? Giriş yapın" : "← Girişe dön"}
        </button>
      </div>
    </div>
  );
}
