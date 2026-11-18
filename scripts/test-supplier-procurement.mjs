import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

// Run with PGlite, or pass --native and an embedded-postgres module for two-session tests.
const native = process.argv[2] === "--native";
const modulePath = process.argv[native ? 3 : 2];
const library = await import(modulePath ? pathToFileURL(resolve(modulePath)).href : native ? "embedded-postgres" : "@electric-sql/pglite");
const temp = resolve(tmpdir());
const tempPrefix = join(temp, "klips-procurement-db-");
const sandbox = native ? await mkdtemp(tempPrefix) : null;
const cluster = sandbox ? new library.default({
  databaseDir: join(sandbox, "data"), user: "postgres", password: randomUUID(), port: 55473, persistent: true,
  initdbFlags: ["--locale=C", "--encoding=UTF8"],
  postgresFlags: ["-c", "listen_addresses=127.0.0.1"], onLog: () => {},
}) : null;
let primary;
let started = false;
let db;
try {
  if (cluster) {
    await cluster.initialise();
    await cluster.start();
    started = true;
    primary = cluster.getPgClient();
    await primary.connect();
    db = { exec: (sql) => primary.query(sql), query: (sql, params) => primary.query(sql, params) };
  } else {
    db = new library.PGlite();
  }
const id = (n) => `11111111-0000-0000-0000-${String(n).padStart(12, "0")}`;
let cursor = 500;
const key = () => id(++cursor);
const [admin, other, customer, supplier, first, second] = [1, 2, 3, 4, 5, 6].map(id);

async function role(user, name = "authenticated") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec(name === "anon" ? "set role anon" : "set role authenticated");
}

async function command(action, payload, requestKey = key()) {
  const { rows } = await db.query("select public.supplier_order_command($1,$2::jsonb,$3) result", [action, JSON.stringify(payload), requestKey]);
  return rows[0].result;
}
const rows = async (sql, parameters = []) => (await db.query(sql, parameters)).rows;
const stock = async (product = first) => (await rows("select stock from products where id=$1", [product]))[0].stock;
const order = async (orderId) => (await rows("select * from supplier_order_overview where id=$1", [orderId]))[0];
const line = (product_id, quantity) => ({ product_id, quantity, supplier_code: "KL-1", expected_cost: 2.5 });
const delivery = (line_id, quantity) => ({ line_id, quantity, unit_cost: 2.75 });
const document = (order_id, document_no, lines) => ({ order_id, document_no, document_date: "2026-11-18", received_date: "2026-11-18", lines });

  await db.exec(`
    create role authenticated; create role anon; create role service_role;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.role() returns text language sql stable as $$select current_setting('role')$$;
    create table storage.objects(bucket_id text,name text,metadata jsonb);
    alter table storage.objects enable row level security;
    grant usage on schema auth to authenticated,anon;
    create collation if not exists public."tr-x-icu" (provider=icu, locale='tr');
  `);
  const directory = new URL("../drizzle/migrations/", import.meta.url);
  for (const filename of (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort()) {
    await db.exec(await readFile(new URL(filename, directory), "utf8"));
  }
  // Verify manual procurement can be installed independently of the optional purchase draft table.
  await db.exec(await readFile(new URL("../docs/supplier-procurement-schema.sql", import.meta.url), "utf8"));
  await db.query("insert into auth.users(id,email) values($1,'admin@example.test'),($2,'other@example.test'),($3,'customer@example.test')", [admin, other, customer]);
  await db.query("insert into user_roles(user_id,role) values($1,'admin'),($2,'admin')", [admin, other]);
  await db.query("insert into suppliers(id,name) values($1,'Tedarikçi')", [supplier]);
  await db.query("insert into products(id,name,slug,stock) values($1,'İlk ürün','first-fixture',40),($2,'İkinci ürün','second-fixture',10)", [first, second]);
  await db.query("insert into product_supplier_codes(product_id,supplier_id,code) values($1,$3,'KL-1'),($2,$3,'KL-1')", [first, second, supplier]);

  await role(admin);
  const original = { supplier_id: supplier, notes: "Sipariş notu", expected_date: "2026-11-30", lines: [line(first, 300), line(second, 50)] };
  const privateDraft = await command("create", original);
  await command("cancel", { ...privateDraft, revision: 0, reason: "Göndermeden vazgeçildi" });
  const createKey = key();
  const { order_id: orderId } = await command("create", original, createKey);
  assert.deepEqual(await command("create", original, createKey), { order_id: orderId });
  await assert.rejects(command("create", { ...original, notes: "Farklı veri" }, createKey), /farklı veri/);
  await assert.rejects(command("create", { ...original, lines: [line(first, 300), line(first, 1)] }), /tek satırda/);
  await assert.rejects(command("create", { ...original, lines: [{ ...line(first, 300), supplier_code: "INVALID" }] }), /tedarikçiye bağlı değil/);
  assert.equal(await stock(), 40);

  await role(other);
  assert.equal(await order(orderId), undefined);
  assert.equal(await order(privateDraft.order_id), undefined);
  await assert.rejects(command("send", { order_id: orderId, revision: 0 }), /bulunamadı/);
  await role(customer);
  assert.equal(await order(orderId), undefined);
  await assert.rejects(command("create", original), /Yönetici/);
  await role("", "anon");
  await assert.rejects(rows("select * from supplier_order_overview"), { code: "42501" });

  await role(admin);
  await assert.rejects(db.query("update supplier_orders set state='ordered' where id=$1", [orderId]), { code: "42501" });
  await assert.rejects(command("receive", document(orderId, "D-0", [])), /gönderilmiş ve açık/);
  await command("edit", { ...original, order_id: orderId, revision: 0, notes: "Güncel not" });
  await assert.rejects(command("send", { order_id: orderId, revision: 0 }), /Sipariş değişti/);
  await command("send", { order_id: orderId, revision: 1 });
  const orderLines = await rows("select id,product_id from supplier_order_line_progress where order_id=$1", [orderId]);
  const firstLine = orderLines.find((l) => l.product_id === first).id;
  const secondLine = orderLines.find((l) => l.product_id === second).id;
  assert.equal((await order(orderId)).status, "ordered");
  assert.equal(await stock(), 40);

  await role(other);
  assert.equal((await order(orderId)).supplier_id, supplier);
  const firstDoc = document(orderId, "AB 123", [delivery(firstLine, 200)]);
  const receiptKey = key();
  const receipt = await command("receive", firstDoc, receiptKey);
  assert.deepEqual(await command("receive", firstDoc, receiptKey), receipt);
  assert.equal(await stock(), 240);
  assert.equal(Number((await order(orderId)).received_qty), 200);
  assert.equal((await order(orderId)).status, "partial");
  assert.equal((await rows("select current_stock from supplier_order_line_progress where id=$1", [firstLine]))[0].current_stock, 240);
  assert.deepEqual(await rows("select total_cents,quantity::int from procurement_receipt_overview where id=$1", [receipt.receipt_id]), [{ total_cents: "55000", quantity: 200 }]);
  await assert.rejects(command("receive", document(orderId, "ab123", [delivery(firstLine, 1)])), /irsaliye zaten/);
  await assert.rejects(command("receive", document(orderId, "D-FAIL", [delivery(firstLine, 50), delivery(secondLine, 51)])), /Kalan adedi/);
  assert.equal(await stock(), 240);
  assert.equal(await stock(second), 10);
  assert.equal((await rows("select count(*)::int n from goods_receipts where order_id=$1", [orderId]))[0].n, 1);
  await assert.rejects(command("receive", document(orderId, "D-FOREIGN", [delivery(id(202), 1)])), /ait değil/);
  await assert.rejects(command("receive", document(orderId, "D-COST", [{ ...delivery(firstLine, 1), unit_cost: 2.755 }])), /fiyatı geçersiz/);
  assert.equal(await stock(), 240);

  await command("receive", document(orderId, "D-2", [delivery(firstLine, 100), delivery(secondLine, 50)]));
  assert.equal(await stock(), 340);
  assert.equal(await stock(second), 60);
  assert.equal((await order(orderId)).status, "received");
  await assert.rejects(command("receive", document(orderId, "D-EXTRA", [delivery(firstLine, 1)])), /Kalan adedi/);
  const purchased = await rows("select purchase_id from procurement_purchase_links where receipt_id=$1", [receipt.receipt_id]);
  await assert.rejects(db.query("delete from purchases where id=$1", [purchased[0].purchase_id]), /mal kabulüne bağlı/);
  await assert.rejects(db.query("update purchases set unit_cost=0 where id=$1", [purchased[0].purchase_id]), /mal kabulüne bağlı/);

  await db.query("insert into stock_adjustments(product_id,new_stock,reason) values($1,199,'Test stok sayımı')", [first]);
  await assert.rejects(command("reverse", { order_id: orderId, receipt_id: receipt.receipt_id, reason: "Hata" }), /negatife düşürür/);
  assert.equal((await rows("select reversed_at from goods_receipts where id=$1", [receipt.receipt_id]))[0].reversed_at, null);
  await db.query("insert into stock_adjustments(product_id,new_stock,reason) values($1,340,'Test geri yükleme')", [first]);
  const reversePayload = { order_id: orderId, receipt_id: receipt.receipt_id, reason: "Yanlış irsaliye adedi" };
  const reverseKey = key();
  assert.deepEqual(await command("reverse", reversePayload, reverseKey), await command("reverse", reversePayload, reverseKey));
  assert.equal(await stock(), 140);
  assert.equal((await order(orderId)).status, "partial");
  assert.equal((await rows("select count(*)::int n from procurement_movement_links where receipt_id=$1 and reversal_id is not null", [receipt.receipt_id]))[0].n, 1);
  const traced = await rows(`
    select count(*)::int n from procurement_movement_links s join admin_audit_log a
      on a.table_name='products' and a.record_id=s.product_id and (a.after_data->>'revision')::bigint=s.product_revision
    where s.order_id=$1
  `, [orderId]);
  assert.equal(traced[0].n, 4);
  assert.ok((await rows("select reversed_at from procurement_purchase_links where receipt_id=$1", [receipt.receipt_id]))[0].reversed_at);

  let current = await order(orderId);
  await assert.rejects(command("cancel", { order_id: orderId, revision: current.revision, reason: "Test" }), /kalan kısmı/);
  await command("close", { order_id: orderId, revision: current.revision, reason: "Kalanı beklemiyoruz" });
  assert.equal((await order(orderId)).status, "closed");
  await assert.rejects(command("receive", document(orderId, "D-CLOSED", [delivery(firstLine, 1)])), /gönderilmiş ve açık/);
  current = await order(orderId);
  await command("reopen", { order_id: orderId, revision: current.revision, reason: "Tedarikçi yeniden gönderecek" });
  current = await order(orderId);
  await command("increase", { order_id: orderId, revision: current.revision, line_id: firstLine, quantity: 301, reason: "Bir adet fazla teslimat onaylandı" });
  await command("receive", document(orderId, "AB123", [delivery(firstLine, 201)]));
  assert.equal(await stock(), 341);
  assert.equal((await order(orderId)).status, "received");

  console.log("Procurement SQL integration passed: permissions, editing/version checks, partial and full delivery, repeat protection, atomic rollback, source links, reversal, closure and reopening.");

  if (cluster) {
    const competing = cluster.getPgClient();
    try {
      await competing.connect();
      await competing.query("select set_config('request.jwt.claim.sub',$1,false)", [admin]);
      await competing.query("set role authenticated");
      const { order_id: raceOrder } = await command("create", { ...original, lines: [line(second, 100)] });
      await command("send", { order_id: raceOrder, revision: 0 });
      const [{ id: raceLine }] = await rows("select id from supplier_order_line_progress where order_id=$1", [raceOrder]);
      await db.exec("begin");
      await command("receive", document(raceOrder, "RACE-1", [delivery(raceLine, 100)]));
      await db.exec("reset role");
      const contender = competing.query("select public.supplier_order_command('receive',$1::jsonb,$2)", [
        JSON.stringify(document(raceOrder, "RACE-2", [delivery(raceLine, 100)])), key(),
      ]).then(() => ({ completed: true }), (error) => ({ completed: false, error }));
      const [secondSession] = await rows("select wait_event_type from pg_stat_activity where pid=$1", [competing.processID]);
      // The second session may still be parsing. Give it time to contend for the row lock.
      for (let i = 0; i < 30 && secondSession.wait_event_type !== "Lock"; i++) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        const [session] = await rows("select wait_event_type from pg_stat_activity where pid=$1", [competing.processID]);
        secondSession.wait_event_type = session.wait_event_type;
      }
      await db.exec("commit");
      const result = await contender;
      await role(other);
      assert.equal(secondSession.wait_event_type, "Lock");
      assert.equal(result.completed, false);
      assert.match(result.error.message, /Kalan adedi/);
      assert.equal(await stock(second), 160);
      assert.equal(Number((await order(raceOrder)).received_qty), 100);
      console.log("Two PostgreSQL sessions contended for the same order. Exactly one receipt posted.");
    } finally {
      await db.exec("rollback");
      await competing.end();
    }
  }
} finally {
  if (cluster) {
    if (primary) await primary.end();
    if (started) await cluster.stop();
    if (sandbox?.startsWith(tempPrefix) && resolve(sandbox) === sandbox) await rm(sandbox, { recursive: true, force: true });
  } else if (db) {
    await db.close();
  }
}
