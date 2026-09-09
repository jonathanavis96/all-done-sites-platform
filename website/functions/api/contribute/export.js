/**
 * GET /api/contribute/export — every stored sample, for the daily aggregation job.
 *
 * Needs `Authorization: Bearer <NOTIFY_TOKEN_SECRET>` (401 otherwise). Streams JSON
 * lines: one stored record per line (the validated body plus `received_at`). One
 * call returns one KV page (up to 1000 keys); when more remain, the last line is
 * `{"next_cursor": "..."}` and the same value is in the `x-next-cursor` header. Pass
 * it back as `?cursor=` for the next page. An empty header means the listing is done.
 */
import { SAMPLE_PREFIX, json, secretsMatch } from "./_lib";

const PAGE_LIMIT = 1000;
const GET_BATCH = 25;

export async function onRequestGet({ request, env }) {
  const kv = env.NOTIFY_KV;
  if (!kv || !env.NOTIFY_TOKEN_SECRET) return json({ error: "Export is not available right now." }, 503);

  const auth = request.headers.get("authorization") || "";
  const presented = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!secretsMatch(presented, env.NOTIFY_TOKEN_SECRET)) return json({ error: "unauthorized" }, 401);

  const cursor = new URL(request.url).searchParams.get("cursor") || undefined;
  const page = await kv.list({ prefix: SAMPLE_PREFIX, cursor, limit: PAGE_LIMIT });
  const next = page.list_complete || !page.cursor ? "" : page.cursor;
  const names = page.keys.map((k) => k.name);

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for (let i = 0; i < names.length; i += GET_BATCH) {
          const rows = await Promise.all(names.slice(i, i + GET_BATCH).map((k) => kv.get(k, { type: "json" })));
          for (const r of rows) if (r) controller.enqueue(enc.encode(JSON.stringify(r) + "\n"));
        }
        if (next) controller.enqueue(enc.encode(JSON.stringify({ next_cursor: next }) + "\n"));
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-next-cursor": next,
    },
  });
}
