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

  // Keys are `contrib:s:<id>:<ts>`. A ts may carry an offset, so order by the instant it
  // names rather than by its text, which only matches time order for UTC timestamps.
  const prefix = samplePrefix(id);
  const at = (k) => Date.parse(k.slice(prefix.length));
  const keys = (await listAllKeys(kv, prefix)).sort((a, b) => at(a) - at(b) || (a < b ? -1 : a > b ? 1 : 0));
  if (keys.length === 0) return json({ error: "no samples for that id" }, 404);
  const newest = keys.slice(-MAX_SAMPLES).reverse();

  const rows = await getManyJson(kv, newest);
  const samples = rows
    .filter((r) => r && typeof r === "object")
    .map((r) => Object.fromEntries(PUBLIC_FIELDS.map((f) => [f, r[f]])));
  return json({ id, samples });
}
