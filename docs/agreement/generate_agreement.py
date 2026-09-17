#!/usr/bin/env python3
"""Build the branded All Done Sites Subscription Agreement PDF from terms.txt.

terms.txt is the single source of truth for the clause text. This script only
handles branding, layout and the signature page, so the PDF can never drift
away from the terms the website serves.

Usage:
    python3 generate_agreement.py                      # blank agreement, written
                                                       # straight to the served asset
    python3 generate_agreement.py --order order-acme.json   # client copy, beside
                                                          # the Order, never deployed

Requires WeasyPrint: pip install -r docs/agreement/requirements.txt
"""
import argparse
import base64
import html
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
TERMS = ROOT / "website" / "public" / "terms.txt"
PRICING_TS = ROOT / "website" / "src" / "lib" / "pricing.ts"
LOGO = ROOT / "website" / "public" / "logo.png"
# The blank agreement is a served asset: the whole point of generating it from
# terms.txt is defeated if the default run writes somewhere the site never
# deploys, because the live PDF then drifts again exactly as it did before.
DEPLOYED_PDF = ROOT / "website" / "public" / "AllDoneSites_Subscription_Agreement.pdf"
# terms.txt has 19 clauses. Used as a floor, not an equality, so the contract can
# gain a clause 20 without a code change, while losing the last one still aborts.
MIN_CLAUSES = 19

CYAN, INK, BODY, MUTED, LINE = "#11a6e6", "#13202d", "#37444f", "#7c879a", "#e3ebf2"


def parse_terms(raw):
    """Split terms.txt into (snapshot, [(number, heading, [paragraphs])])."""
    lines = raw.strip().split("\n")
    snapshot, sections, cur = "", [], None
    for ln in lines:
        s = ln.strip()
        if not s:
            continue
        if s.upper().startswith("PLAIN"):
            snapshot = s.split(":", 1)[1].strip()
            continue
        m = re.match(r"^(\d+)\.\s+(.+)$", s)
        if m and s[:40].isupper() or (m and m.group(2).isupper()):
            if cur:
                sections.append(cur)
            cur = (m.group(1), m.group(2).title(), [])
            continue
        if cur:
            cur[2].append(s)
    if cur:
        sections.append(cur)
    return snapshot, sections


def render(snapshot, sections, order, today):
    logo = base64.b64encode(LOGO.read_bytes()).decode()

    def paras(ps):
        out = []
        for p in ps:
            if p.startswith("-") or p.startswith("•"):
                out.append(f'<li>{html.escape(p.lstrip("-• ").strip())}</li>')
            elif " – " in p and len(p.split(" – ")[0]) < 40:
                term, rest = p.split(" – ", 1)
                out.append(f'<p class="def"><span class="dt">{html.escape(term)}</span> {html.escape(rest)}</p>')
            else:
                out.append(f"<p>{html.escape(p)}</p>")
        # wrap consecutive <li> in a <ul>
        buf, res = [], []
        for chunk in out:
            if chunk.startswith("<li>"):
                buf.append(chunk)
            else:
                if buf:
                    res.append("<ul>" + "".join(buf) + "</ul>")
                    buf = []
                res.append(chunk)
        if buf:
            res.append("<ul>" + "".join(buf) + "</ul>")
        return "".join(res)

    body = "".join(
        f'<section class="cl"><h2><span class="n">{n}</span>{html.escape(h)}</h2>{paras(ps)}</section>'
        for n, h, ps in sections
    )

    schedule = ""
    if order:
        rows = "".join(
            f'<tr><td>{html.escape(i["item"])}</td><td>{html.escape(i["detail"])}</td>'
            f'<td class="amt">{html.escape(i["amount"])}</td></tr>'
            for i in order["items"]
        )
        notes = "".join(f"<li>{html.escape(x)}</li>" for x in order.get("notes", []))
        schedule = f'''
        <section class="cl schedule">
          <h2><span class="n">A</span>Schedule A &middot; Order</h2>
          <p>This Order forms part of the Agreement. Where this Order and the Agreement differ on
             pricing, plan tier or term, this Order governs.</p>
          <table class="sch">
            <thead><tr><th>Item</th><th>Detail</th><th class="amt">Amount</th></tr></thead>
            <tbody>{rows}</tbody>
          </table>
          {'<ul class="notes">' + notes + '</ul>' if notes else ''}
        </section>'''

    client = (order or {}).get("client", "")
    sig = f'''
    <section class="cl sig">
      <h2><span class="n">&#9670;</span>Signatures</h2>
      <p>By signing below, each party agrees to be bound by this Agreement{" and the Order in Schedule A" if order else ""}.</p>
      <div class="sigrow">
        <div class="sigbox">
          <div class="sl">Client</div>
          <div class="f"><span class="fl">Business name</span><span class="rule">{html.escape(client)}</span></div>
          <div class="f"><span class="fl">Signed by (full name)</span><span class="rule"></span></div>
          <div class="f"><span class="fl">Capacity</span><span class="rule"></span></div>
          <div class="f sign"><span class="fl">Signature</span><span class="rule"></span></div>
          <div class="two">
            <div class="f"><span class="fl">Date</span><span class="rule"></span></div>
            <div class="f"><span class="fl">Place</span><span class="rule"></span></div>
          </div>
        </div>
        <div class="sigbox">
          <div class="sl">Provider</div>
          <div class="f"><span class="fl">Business name</span><span class="rule">All Done Sites</span></div>
          <div class="f"><span class="fl">Signed by (full name)</span><span class="rule">Jonathan Avis</span></div>
          <div class="f"><span class="fl">Capacity</span><span class="rule">Owner</span></div>
          <div class="f sign"><span class="fl">Signature</span><span class="rule"></span></div>
          <div class="two">
            <div class="f"><span class="fl">Date</span><span class="rule"></span></div>
            <div class="f"><span class="fl">Place</span><span class="rule"></span></div>
          </div>
        </div>
      </div>
      <a class="sendback" href="https://wa.me/27822227457?text=Hi%20Jonathan%2C%20here%20is%20the%20signed%20agreement.">Send the signed agreement &#8594;</a>
      <p class="sendnote">Tap the button, then attach a photo or a scan of these signed pages. Or email them to hello@alldonesites.com.</p>
    </section>'''

    return f'''<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Subscription Agreement</title>
<style>
  @page {{ size: A4; margin: 20mm 18mm 18mm; @bottom-center {{
      content: "All Done Sites  ·  Subscription Agreement  ·  Page " counter(page) " of " counter(pages);
      font-family: Inter, sans-serif; font-size: 8pt; color: {MUTED}; }} }}
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ font-family: Inter, "DejaVu Sans", sans-serif; font-size: 9.2pt; line-height: 1.55; color: {BODY}; }}
  .cover {{ background: linear-gradient(120deg,#0c1a26,#14344a 55%,#0b6196); color:#fff;
            padding: 26px 28px; border-radius: 10px; margin-bottom: 20px; }}
  .brand {{ display:flex; align-items:center; gap:10px; margin-bottom:16px; }}
  .brand img {{ width:34px; height:34px; border-radius:8px; }}
  .brand span {{ font-size:13pt; font-weight:700; }}
  .bar {{ width:44px; height:3px; background:{CYAN}; border-radius:2px; margin-bottom:12px; }}
  .cover h1 {{ font-size:23pt; font-weight:800; line-height:1.1; letter-spacing:-.4px; }}
  .cover .sub {{ color:#bfe0f4; font-size:10pt; margin-top:5px; }}
  .cover .meta {{ font-size:8pt; color:#9fc4dc; margin-top:12px; }}
  .snap {{ background:#f3fafe; border:1px solid {LINE}; border-left:3px solid {CYAN};
           padding:12px 15px; border-radius:0 8px 8px 0; margin-bottom:20px; font-size:8.8pt; }}
  .snap b {{ color:{INK}; }}
  .cl {{ margin-bottom:14px; }}
  .cl h2 {{ font-size:10.5pt; font-weight:700; color:{INK}; margin-bottom:5px;
            border-bottom:1px solid {LINE}; padding-bottom:4px; }}
  .cl h2 .n {{ color:{CYAN}; font-weight:700; margin-right:8px; }}
  .cl p {{ margin-bottom:5px; text-align:justify; }}
  .cl ul {{ margin:4px 0 6px 16px; }}
  .cl li {{ margin-bottom:2px; }}
  .def .dt {{ font-weight:700; color:{INK}; }}
  .schedule {{ page-break-before: always; }}
  table.sch {{ width:100%; border-collapse:collapse; margin:8px 0; font-size:8.8pt; }}
  table.sch th {{ text-align:left; font-size:7.5pt; text-transform:uppercase; letter-spacing:.6px;
                  color:{MUTED}; border-bottom:1px solid {LINE}; padding:6px 8px; }}
  table.sch td {{ padding:7px 8px; border-bottom:1px solid {LINE}; vertical-align:top; }}
  table.sch .amt {{ text-align:right; white-space:nowrap; font-weight:600; color:{INK}; }}
  ul.notes {{ margin-top:8px; font-size:8.5pt; color:{BODY}; }}
  .sig {{ page-break-before: always; }}
  .sigrow {{ display:flex; gap:16px; margin-top:12px; }}
  .sigbox {{ flex:1; border:1px solid {LINE}; border-radius:9px; padding:16px 18px; }}
  .sl {{ font-size:8pt; text-transform:uppercase; letter-spacing:1px; color:{CYAN};
         font-weight:700; margin-bottom:14px; }}
  .f {{ margin-bottom:15px; }}
  .fl {{ display:block; font-size:7.5pt; text-transform:uppercase; letter-spacing:.5px;
         color:{MUTED}; margin-bottom:3px; }}
  .rule {{ display:block; border-bottom:1px solid #b9c7d4; min-height:17px;
           font-size:9.5pt; color:{INK}; }}
  .f.sign .rule {{ min-height:38px; }}
  .sendback {{ display:inline-block; margin-top:18px; padding:9px 17px; border-radius:9px;
    background:{CYAN}; border:1px solid {CYAN}; color:#fff; font-size:11pt; font-weight:600;
    text-decoration:none; }}
  .sendnote {{ margin-top:8px; font-size:9pt; color:{MUTED}; }}
  .two {{ display:flex; gap:12px; }} .two .f {{ flex:1; }}
</style></head><body>
<div class="cover">
  <div class="brand"><img src="data:image/png;base64,{logo}"><span>All Done Sites</span></div>
  <div class="bar"></div>
  <h1>Subscription Agreement</h1>
  <div class="sub">Website design, hosting and maintenance</div>
  <div class="meta">Version {today}{"  &middot;  Prepared for " + html.escape(client) if client else ""}</div>
</div>
<div class="snap"><b>In plain English:</b> {html.escape(snapshot)}</div>
{body}{schedule}{sig}
</body></html>'''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--order")
    ap.add_argument("--out")
    a = ap.parse_args()

    order = json.loads(pathlib.Path(a.order).read_text()) if a.order else None
    if a.out:
        out = pathlib.Path(a.out)
    elif order:
        # A client copy carries that client's Schedule A, with their prices in it.
        # It must never default to the deployed blank asset, or generating one
        # quietly publishes the client's commercial terms to the live site. It
        # lands beside its Order instead, where .gitignore already excludes it.
        out = pathlib.Path(a.order).resolve().with_name(
            "AllDoneSites_Agreement_" + pathlib.Path(a.order).stem.replace("order-", "") + ".pdf")
    else:
        out = DEPLOYED_PDF
    if order and out.resolve() == DEPLOYED_PDF.resolve():
        sys.exit(f"Refusing to write a client agreement over the deployed blank asset at {DEPLOYED_PDF}.")
    snapshot, sections = parse_terms(TERMS.read_text(encoding="utf-8"))
    # Every clause must be present, not merely most of them. The failure this
    # guards against is a heading that stops matching the uppercase-heading
    # parser, which drops that clause silently and yields a shorter contract
    # than the one the site serves. Checking the numbers run 1..N contiguously
    # catches a dropped clause at any position without pinning the count, so
    # terms.txt can still grow a clause 20 without editing this script. It cannot
    # see a dropped *final* clause, though, because 1..18 is still contiguous, so
    # MIN_CLAUSES above is checked first and covers that end.
    numbers = [int(n) for n, _, _ in sections]
    if len(numbers) < MIN_CLAUSES:
        sys.exit(
            f"Only parsed {len(numbers)} clauses from terms.txt, expected at least "
            f"{MIN_CLAUSES}. A trailing clause heading has probably stopped matching "
            "the parser. Aborting."
        )
    if numbers != list(range(1, len(numbers) + 1)):
        missing = sorted(set(range(1, max(numbers, default=0) + 1)) - set(numbers))
        sys.exit(
            f"terms.txt parsed as clauses {numbers}, which is not a contiguous "
            f"1..{len(numbers)} run (missing: {missing or 'none, but out of order'}). "
            "A clause heading has probably stopped matching the parser. Aborting."
        )

    # The document version must be the legal terms version, not the day the PDF
    # happened to be generated: regenerating an unchanged contract must not make
    # it look like a different version from the one the checkout recorded.
    m = re.search(r'TERMS_VERSION\s*=\s*"([^"]+)"', PRICING_TS.read_text(encoding="utf-8"))
    if not m:
        sys.exit(f"Could not read TERMS_VERSION from {PRICING_TS}. Aborting.")
    html_doc = render(snapshot, sections, order, m.group(1))
    try:
        from weasyprint import HTML
    except (ImportError, OSError) as exc:
        sys.exit(
            "WeasyPrint is not installed. Run:\n"
            "    pip install -r docs/agreement/requirements.txt\n"
            "It also needs the system libraries pango and cairo.\n"
            f"Underlying error: {exc}"
        )
    out.parent.mkdir(parents=True, exist_ok=True)
    HTML(string=html_doc, base_url=str(ROOT)).write_pdf(out)
    print(f"{len(sections)} clauses -> {out}")


if __name__ == "__main__":
    main()
