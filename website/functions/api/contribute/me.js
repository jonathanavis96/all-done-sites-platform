/**
 * GET /api/contribute/me?id=<contributor id> — one contributor's samples for their
 * personal page, newest first, at most 200, each reduced to the fields the page
 * draws (ts, plan, both meters, both token maps). Never cached.
 *
 * 400 for an id that is not a UUID4, 404 for one with no samples.
 */
import { PUBLIC_FIELDS, getManyJson, isContributorId, json, listAllKeys, samplePrefix } from "./_lib";

export const MAX_SAMPLES = 200;

export async function onRequestGet({ request, env }) {
  const kv = env.NOTIFY_KV;
  if (!kv) return json({ error: "Contributions are not available right now." }, 503);

  const id = (new URL(request.url).searchParams.get("id") || "").trim().toLowerCase();
  if (!isContributorId(id)) return json({ error: "id must be a contributor id (UUID4)" }, 400);

  // Keys are `contrib:s:<id>:<ts>` with ISO timestamps, so lexical order is time order.
  const keys = (await listAllKeys(kv, samplePrefix(id))).sort();
  if (keys.length === 0) return json({ error: "no samples for that id" }, 404);
  const newest = keys.slice(-MAX_SAMPLES).reverse();

  const rows = await getManyJson(kv, newest);
  const samples = rows
    .filter((r) => r && typeof r === "object")
    .map((r) => Object.fromEntries(PUBLIC_FIELDS.map((f) => [f, r[f]])));
  return json({ id, samples });
}
