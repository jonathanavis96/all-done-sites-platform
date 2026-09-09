/**
 * POST /api/contribute — store one contributed meter sample.
 *
 * Accepts either the sample body itself as JSON, or `{"cut1": "CUT1:..."}` carrying
 * the same body as the url-safe base64 line `sample.py --compact` prints (the page's
 * paste box sends that form). Both are validated exactly the same way: every field
 * checked, every unknown key refused at every level, so nothing beyond the
 * documented fields can be stored. Answers 400 with a one-line reason otherwise.
 *
 * Rate limited to 4 samples per contributor id and 30 per IP per hour (429).
 * Success: `{ ok, me_url, samples }`, where samples counts this contributor's rows.
 */
import {
  MAX_BODY_BYTES,
  MAX_PER_ID_PER_HOUR,
  MAX_PER_IP_PER_HOUR,
  MAX_RAW_BYTES,
  ME_PATH,
  RATE_WINDOW_SECONDS,
  SAMPLE_TTL_SECONDS,
  SITE,
  byteLength,
  decodeCut1,
  idRateKey,
  ipRateKey,
  json,
  listAllKeys,
  originCheck,
  sampleKey,
  samplePrefix,
  sha256Hex,
  validateSample,
} from "./_lib";

export async function onRequestOptions({ request }) {
  const { allow } = originCheck(request);
  if (!allow) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": allow,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
      vary: "origin",
    },
  });
}

export async function onRequestPost({ request, env }) {
  const kv = env.NOTIFY_KV;
  if (!kv) return json({ error: "Contributions are not available right now." }, 503);

  const { allow, foreign } = originCheck(request);
  if (foreign) return json({ error: "origin not allowed" }, 403);

  const raw = await request.text();
  if (byteLength(raw) > MAX_RAW_BYTES) {
    return json({ error: `body must be under ${MAX_BODY_BYTES} bytes` }, 400, allow);
  }
  let outer;
  try {
    outer = JSON.parse(raw);
  } catch {
    return json({ error: "body must be JSON" }, 400, allow);
  }

  // The wrapper form: exactly one key, `cut1`, holding the compact line.
  let text = raw;
  let body = outer;
  const isWrapper = outer && typeof outer === "object" && !Array.isArray(outer)
    && Object.keys(outer).length === 1 && "cut1" in outer;
  if (isWrapper) {
    try {
      text = decodeCut1(outer.cut1);
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : "bad CUT1 line" }, 400, allow);
    }
    try {
      body = JSON.parse(text);
    } catch {
      return json({ error: "CUT1 line does not decode to JSON" }, 400, allow);
    }
  }
  if (byteLength(text) >= MAX_BODY_BYTES) {
    return json({ error: `body must be under ${MAX_BODY_BYTES} bytes` }, 400, allow);
  }

  const v = validateSample(body);
  if (!v.ok) return json({ error: v.reason }, 400, allow);
  const sample = v.value;
  const id = sample.contributor_id;

  // Throttles. KV counters are eventually consistent, so this is a speed bump
  // against a runaway script or a hostile poster, not an exact meter.
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const ipHash = await sha256Hex(ip);
  const [idSeen, ipSeen] = await Promise.all([kv.get(idRateKey(id)), kv.get(ipRateKey(ipHash))]);
  if (Number(idSeen || 0) >= MAX_PER_ID_PER_HOUR) {
    return json({ error: "Too many samples from this contributor id. Try again in an hour." }, 429, allow);
  }
  if (Number(ipSeen || 0) >= MAX_PER_IP_PER_HOUR) {
    return json({ error: "Too many samples from here. Try again in an hour." }, 429, allow);
  }
  await Promise.all([
    kv.put(idRateKey(id), String(Number(idSeen || 0) + 1), { expirationTtl: RATE_WINDOW_SECONDS }),
    kv.put(ipRateKey(ipHash), String(Number(ipSeen || 0) + 1), { expirationTtl: RATE_WINDOW_SECONDS }),
  ]);

  // Stored: the validated fields and when it arrived. The IP hash is only ever a
  // rate-limit key, never part of a sample.
  const key = sampleKey(id, sample.ts);
  await kv.put(key, JSON.stringify({ ...sample, received_at: new Date().toISOString() }), {
    expirationTtl: SAMPLE_TTL_SECONDS,
  });

  // A list right after a put may not include the new key yet; count it anyway.
  const keys = await listAllKeys(kv, samplePrefix(id));
  const samples = keys.includes(key) ? keys.length : keys.length + 1;
  return json({ ok: true, me_url: `${SITE}${ME_PATH}${id}`, samples }, 200, allow);
}
