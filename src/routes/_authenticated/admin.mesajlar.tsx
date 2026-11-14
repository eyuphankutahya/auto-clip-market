import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Pager, PAGE_SIZE } from "@/components/site/Pager";
import { date } from "@/lib/format";

const messagesQuery = (page: number) => queryOptions({
  queryKey: ["admin-contact-messages", page],
  queryFn: async () => {
    const { data, error, count } = await supabase.from("contact_submissions")
      .select("id,created_at,name,email,subject,message", { count: "exact" })
      .order("created_at", { ascending: false }).order("id")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw new Error("Mesajlar yüklenemedi. Lütfen tekrar deneyin.");
    return { messages: data ?? [], total: count ?? 0 };
  },
});

export const Route = createFileRoute("/_authenticated/admin/mesajlar")({
  head: () => ({ meta: [
    { title: "İletişim Mesajları — KlipsMarket" },
    { name: "description", content: "KlipsMarket ziyaretçilerinin iletişim mesajlarını okuyun." },
    { property: "og:title", content: "İletişim Mesajları — KlipsMarket" },
    { property: "og:description", content: "KlipsMarket ziyaretçilerinin iletişim mesajlarını okuyun." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(messagesQuery(0)),
  component: Messages,
});

function Messages() {
  const [page, setPage] = useState(0);
  const { data } = useSuspenseQuery(messagesQuery(page));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">İletişim mesajları <span className="text-base font-normal text-muted-foreground">({data.total})</span></h1>
        <Pager page={page} total={data.total} onChange={setPage} />
      </div>
      {data.messages.length === 0 && <p className="py-8 text-muted-foreground">Henüz mesaj yok.</p>}
      {data.messages.map((message) => (
        <article key={message.id} className="min-w-0 rounded-md border bg-card p-5">
          <div className="flex flex-wrap justify-between gap-2">
            <h2 className="min-w-0 break-words text-lg font-bold">{message.subject}</h2>
            <time className="text-sm text-muted-foreground" dateTime={message.created_at}>{date(message.created_at)}</time>
          </div>
          <p className="mt-1 break-words text-sm text-muted-foreground">{message.name} · {message.email}</p>
          <p className="mt-4 whitespace-pre-wrap break-words">{message.message}</p>
        </article>
      ))}
      <Pager page={page} total={data.total} onChange={setPage} />
    </div>
  );
}