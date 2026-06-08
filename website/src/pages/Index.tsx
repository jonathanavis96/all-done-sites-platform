// src/pages/Index.tsx
// Redesigned homepage — ported 1:1 from docs/redesign/homepage-reference.html
// (the approved prototype). All markup is scoped under `.adsx` (see styles/home.css)
// so the new cyan/Bricolage design system never leaks into the not-yet-redesigned
// pages. The prototype's vanilla-JS interactions are replicated in one scoped
// useEffect for exact behaviour parity (reveal, count-up, tilt, magnetic buttons,
// how-it-works timeline, live-preview modal, scroll-progress bar, aurora drift,
// hero auto-scroll).

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import { useToast } from "@/hooks/use-toast";
import { RedesignNav, RedesignFooter } from "@/components/redesign/RedesignChrome";
import { WHATSAPP, PHONE_TEL, EMAIL } from "@/lib/site";
import {
  type RegionKey,
  type PlanId,
  REGION_LABELS,
  REGION_ORDER,
  PRICES,
  PAYSTACK_PAGES,
  detectRegion,
  formatAmount,
  recordTermsAcceptance,
} from "@/lib/pricing";
import "@/styles/home.css";

import pcquantiFull from "@/assets/portfolio/pcquanti-full.webp";
import pcquantiFullSm from "@/assets/portfolio/pcquanti-full-sm.webp";
import ranksentinelImg from "@/assets/portfolio/ranksentinel.webp";
import pcquantiImg from "@/assets/portfolio/pcquanti.webp";
import reachrightImg from "@/assets/portfolio/reachright.webp";
import deenesocialImg from "@/assets/portfolio/deenesocial.webp";
import aifocusImg from "@/assets/portfolio/aifocus.webp";
import jacquichowlesImg from "@/assets/portfolio/jacquichowles.webp";
import baobabwinesImg from "@/assets/portfolio/baobabwines.webp";

// Three macOS-style traffic-light dots used in browser chrome bars.
const Lights = () => (
  <>
    <span className="d" style={{ background: "#ff5f57" }} />
    <span className="d" style={{ background: "#febc2e" }} />
    <span className="d" style={{ background: "#28c840" }} />
  </>
);

type Project = {
  img: string;
  url: string;
  host: string;
  name: string;
  status: "live" | "soon";
  label: string;
  delay: string;
};

const PROJECTS: Project[] = [
  { img: pcquantiImg, url: "https://pcquanti.co.za", host: "pcquanti.co.za", name: "PC Quanti", status: "live", label: "Live", delay: ".05s" },
  { img: reachrightImg, url: "https://reachrightmarketing.com", host: "reachrightmarketing.com", name: "ReachRight", status: "live", label: "Live", delay: ".1s" },
  { img: deenesocialImg, url: "https://deenesocial.com", host: "deenesocial.com", name: "Deene Social", status: "live", label: "Live", delay: ".15s" },
  { img: aifocusImg, url: "https://aifocus.work", host: "aifocus.work", name: "AI Focus", status: "live", label: "Live", delay: ".2s" },
  { img: jacquichowlesImg, url: "https://jacquichowles.com", host: "jacquichowles.com", name: "Jacqui Chowles", status: "live", label: "Live", delay: ".25s" },
  { img: baobabwinesImg, url: "https://jonathanavis96.github.io/baobab-wines/", host: "baobab-wines", name: "Baobab Wines", status: "soon", label: "Launching soon", delay: ".3s" },
];

const FAQS: { q: string; a: string }[] = [
  { q: "How fast can you launch my website?", a: "Most sites are ready in 7 to 14 days, depending on the complexity and how quickly we receive your content." },
  { q: "Do I own the website?", a: "Yes. After your first 12 months, the site's code and files can be transferred to you, so it is yours to keep. While you are subscribed, we host, maintain and look after everything for you." },
  { q: "Can I cancel anytime?", a: "Our standard plan runs on a 12-month term. After that you can cancel, and the website becomes yours to keep or move. An introductory 1-month trial is available by invitation." },
  { q: "What counts as a small content update?", a: "Things like swapping photos, changing text, or adding a new section. Larger redesigns or new pages are scoped separately." },
  { q: "Do you handle hosting and maintenance?", a: "Yes. Hosting, updates and security are all included in your subscription while you are an active client." },
  { q: "Do you provide SEO?", a: "Yes, every plan includes SEO. We also build your site to be found and referenced by AI assistants, not just traditional search engines. Higher plans add ongoing analytics, reporting and performance improvements." },
  { q: "Can my website be found and referenced by AI assistants?", a: "Yes. We build every site with clean, well-structured, clearly written content and schema markup, so it can be indexed and referenced by AI assistants and AI search, like ChatGPT, Claude, Perplexity and Google's AI overviews, not just traditional search engines." },
  { q: "What if I do not have all my content ready?", a: "No problem. We can start the design with placeholder text and images until you send us the real thing." },
];

type Tier = { id: PlanId; name: string; sub: string; pages: string; features: string[]; featured: boolean; delay: string };
const TIERS: Tier[] = [
  { id: "launch", name: "Launch", sub: "Your digital starting point", pages: "Single-page website", features: ["Mobile-friendly design", "Hosting, SSL & backups", "1 small update / month", "2 pro mailboxes at your domain"], featured: false, delay: ".05s" },
  { id: "business", name: "Business", sub: "Grow your online presence", pages: "Up to 5 pages", features: ["Everything in Launch", "Custom branding & styling", "2 small updates / month", "6 pro mailboxes at your domain"], featured: false, delay: ".13s" },
  { id: "premium", name: "Premium", sub: "Advanced features & priority care", pages: "Up to 12 pages", features: ["Everything in Business", "Advanced interactive sections", "Priority support & faster turnaround", "14 pro mailboxes at your domain"], featured: true, delay: ".21s" },
];

export default function Index() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  // region-aware pricing + Paystack terms-acceptance flow
  // Default to ZA (primary market) so the prerendered HTML shows rand pricing;
  // the client re-detects the real region on mount.
  const [region, setRegion] = useState<RegionKey>("ZA");
  const [terms, setTerms] = useState<{ id: PlanId; name: string; payLink: string } | null>(null);
  const [termsChecked, setTermsChecked] = useState(false);
  const [termsText, setTermsText] = useState("");
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => setRegion(detectRegion()), []);

  // Load the agreement text lazily, only when a plan's terms modal is opened
  // (keeps terms.txt off the initial critical path).
  function openTerms(id: PlanId, name: string) {
    setTerms({ id, name, payLink: PAYSTACK_PAGES[region][id] });
    setTermsChecked(false);
    if (!termsText) {
      const b = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      fetch(`${b}/terms.txt`)
        .then((r) => r.text())
        .then(setTermsText)
        .catch(() => setTermsText("The agreement could not be loaded. Please see the Terms page."));
    }
  }
  async function acceptTerms() {
    if (!terms) return;
    setRedirecting(true);
    await recordTermsAcceptance(terms.id, region);
    window.location.href = terms.payLink;
  }

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "All Done Sites",
    url: typeof window !== "undefined" ? window.location.origin : "",
    slogan: "Your website, done for you, for one simple monthly fee",
    description:
      "Done-for-you websites on a simple monthly fee. We design, host, maintain and update your site, and build it to be found by both search engines and AI assistants.",
    sameAs: [],
    logo: "/favicon.png",
  };
  // Local/service-business schema: entity grounding for search + AI (NAP,
  // area served, price range). sameAs is left for the Google Business Profile
  // and social links once they exist.
  const localBizJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "All Done Sites",
    url: typeof window !== "undefined" ? window.location.origin : "https://alldonesites.com",
    image: "/og.png",
    logo: "/favicon.png",
    telephone: "+27 82 222 7457",
    email: "hello@alldonesites.com",
    priceRange: "R799 to R3600 per month",
    description:
      "Done-for-you websites for South African small businesses on one simple monthly fee. We design, build, host, maintain and update your site, with no upfront cost.",
    serviceType: "Website design, hosting and maintenance subscription",
    areaServed: ["South Africa", "United States", "United Kingdom", "European Union"],
    sameAs: [],
  };
  // FAQPage schema so the homepage FAQ is eligible for rich results and is easy
  // for AI assistants / answer engines to extract and cite.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  async function onQuoteSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (data.get("_gotcha")) return; // honeypot tripped — silently drop
    setSubmitting(true);
    try {
      const res = await fetch("https://formspree.io/f/mnnbavdj", {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("bad response");
      toast({
        title: "Request sent",
        description: "Thanks! We'll reply within 1 business day.",
      });
      form.reset();
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please WhatsApp or call us and we'll sort it out.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Replicates the prototype's interactions, scoped to this page's DOM subtree.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const cleanups: Array<() => void> = [];

    // scroll-reveal fade-ups
    const revealIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            revealIO.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    root.querySelectorAll(".reveal, .reveal-fade").forEach((el) => revealIO.observe(el));
    cleanups.push(() => revealIO.disconnect());

    // how-it-works synced loading bar + sequential step pop-in
    const steps = root.querySelector(".steps");
    if (steps) {
      const howIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              steps.classList.add("play");
              howIO.disconnect();
            }
          });
        },
        { threshold: 0.55 }
      );
      howIO.observe(steps);
      cleanups.push(() => howIO.disconnect());
    }

    // count-up on the "7" stat
    const countUp = (el: Element) => {
      const target = +(el.getAttribute("data-count") || "0");
      let n = 0;
      const t = window.setInterval(() => {
        n += 1;
        el.textContent = String(n);
        if (n >= target) window.clearInterval(t);
      }, 110);
      cleanups.push(() => window.clearInterval(t));
    };
    const countIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            countUp(e.target);
            countIO.unobserve(e.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    root.querySelectorAll("[data-count]").forEach((el) => countIO.observe(el));
    cleanups.push(() => countIO.disconnect());

    // Cursor tilt + magnetic buttons are mouse-only flourishes. Skip them on
    // touch devices, and wire them at idle so they never compete with load.
    const wireHoverEffects = () => {
      if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

      // subtle cursor 3D tilt on cards
      root.querySelectorAll<HTMLElement>(".tilt").forEach((card) => {
        const move = (e: MouseEvent) => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform =
            "perspective(800px) rotateX(" + (-py * 8).toFixed(2) + "deg) rotateY(" + (px * 8).toFixed(2) + "deg) translateY(-6px) scale(1.02)";
        };
        const leave = () => {
          card.style.transform = "";
        };
        card.addEventListener("mousemove", move);
        card.addEventListener("mouseleave", leave);
        cleanups.push(() => {
          card.removeEventListener("mousemove", move);
          card.removeEventListener("mouseleave", leave);
        });
      });

      // magnetic CTA buttons
      root.querySelectorAll<HTMLElement>(".btn").forEach((b) => {
        const move = (e: MouseEvent) => {
          const r = b.getBoundingClientRect();
          const x = (e.clientX - (r.left + r.width / 2)) / r.width;
          const y = (e.clientY - (r.top + r.height / 2)) / r.height;
          b.style.transform = "translate(" + (x * 14).toFixed(1) + "px," + (y * 10).toFixed(1) + "px) scale(1.06)";
        };
        const leave = () => {
          b.style.transform = "";
        };
        b.addEventListener("mousemove", move);
        b.addEventListener("mouseleave", leave);
        cleanups.push(() => {
          b.removeEventListener("mousemove", move);
          b.removeEventListener("mouseleave", leave);
        });
      });
    };
    const ric: (cb: () => void) => number =
      (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback ||
      ((cb: () => void) => window.setTimeout(cb, 200));
    const cic: (id: number) => void =
      (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback || window.clearTimeout;
    const idleId = ric(wireHoverEffects);
    cleanups.push(() => cic(idleId));

    // live-site preview modal
    const modal = root.querySelector<HTMLElement>("#vmodal");
    const vframe = root.querySelector<HTMLIFrameElement>("#vframe");
    const vurl = root.querySelector<HTMLAnchorElement>("#vurl");
    const vopen = root.querySelector<HTMLAnchorElement>("#vopen");
    const vclose = root.querySelector<HTMLButtonElement>("#vclose");
    const openSite = (url: string) => {
      if (!modal || !vframe || !vurl || !vopen) return;
      vframe.src = url;
      vurl.textContent = url;
      vurl.href = url;
      vopen.href = url;
      modal.classList.add("show");
      document.body.style.overflow = "hidden";
    };
    const closeSite = () => {
      if (!modal || !vframe) return;
      modal.classList.remove("show");
      vframe.src = "";
      document.body.style.overflow = "";
    };
    root.querySelectorAll<HTMLElement>("[data-url]").forEach((c) => {
      const onClick = (ev: MouseEvent) => {
        if ((ev.target as HTMLElement).closest("a")) return;
        const url = c.getAttribute("data-url");
        if (url) openSite(url);
      };
      c.addEventListener("click", onClick);
      cleanups.push(() => c.removeEventListener("click", onClick));
    });
    if (vclose) {
      vclose.addEventListener("click", closeSite);
      cleanups.push(() => vclose.removeEventListener("click", closeSite));
    }
    if (modal) {
      const onBackdrop = (e: MouseEvent) => {
        if (e.target === modal) closeSite();
      };
      modal.addEventListener("click", onBackdrop);
      cleanups.push(() => modal.removeEventListener("click", onBackdrop));
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSite();
    };
    document.addEventListener("keydown", onKey);
    cleanups.push(() => document.removeEventListener("keydown", onKey));

    // scroll-progress bar (cyan, top edge)
    const sb = document.createElement("div");
    sb.className = "ads-scrollbar";
    document.body.appendChild(sb);
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      sb.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    cleanups.push(() => {
      window.removeEventListener("scroll", onScroll);
      sb.remove();
    });

    // aurora drift behind the hero
    const hero = root.querySelector(".hero");
    if (hero) {
      const a = document.createElement("div");
      a.className = "aurora";
      hero.insertBefore(a, hero.firstChild);
      cleanups.push(() => a.remove());
    }

    // (hero preview auto-scroll is now handled purely in CSS — see .frame img)

    return () => {
      document.body.style.overflow = "";
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <div className="adsx" ref={rootRef}>
      <Seo
        title="Hassle-Free Website Subscription for SMEs | All Done Sites"
        description="We design, host, and maintain your site for one simple monthly fee. Built to be found by Google and AI assistants. No upfront cost, just fast setup and ongoing support."
        jsonLd={[orgJsonLd, localBizJsonLd, faqJsonLd]}
      />

      {/* ===== nav ===== */}
      <RedesignNav />

      {/* ===== hero ===== */}
      <section className="hero">
        <div className="wrap herogrid">
          <div>
            <span className="eyebrow">Done-for-you websites</span>
            <h1 className="h1">
              Your website,
              <br />
              <span className="acc">done for you.</span>
            </h1>
            <p className="lede">
              We design it, host it, and look after it for you, for one simple monthly fee. We build it free to start, and you barely lift a finger.
            </p>
            <div className="ctarow">
              <a href="#getquote" className="btn lg">Get my free quote</a>
              <a href="#pf" className="ghost">See our work →</a>
            </div>
            <div className="stats">
              <div className="stat">
                <div className="n"><span data-count={7}>0</span></div>
                <div className="l">sites built and maintained</div>
              </div>
              <div className="stat">
                <div className="n">&lt;1s</div>
                <div className="l">average load time</div>
              </div>
              <div className="stat">
                <div className="n">R0</div>
                <div className="l">to build your site</div>
              </div>
            </div>
            <div className="hero-ai"><span className="cyandot" />Built to be found by AI, not just Google.</div>
          </div>
          <div className="heroframe-wrap">
            <div className="frame clickable" data-url="https://pcquanti.co.za">
              <div className="fbar">
                <Lights />
                <span className="u">pcquanti.co.za</span>
              </div>
              <button className="expand" title="Open preview" type="button">⤢</button>
              <picture>
                <source media="(max-width: 860px)" srcSet={pcquantiFullSm} type="image/webp" />
                <img src={pcquantiFull} alt="PC Quanti website preview" decoding="async" />
              </picture>
            </div>
          </div>
        </div>
      </section>

      {/* ===== proof strip ===== */}
      <section className="proof">
        <div className="wrap proofinner">
          <div className="p"><span className="cyandot" /><b>7</b> sites built and maintained</div>
          <div className="p"><span className="cyandot" />Every site is easy to update</div>
          <div className="p"><span className="cyandot" /><b>&lt;1s</b> average load time</div>
          <div className="p"><span className="cyandot" />Hosting and security included</div>
        </div>
      </section>

      {/* ===== problem ===== */}
      <section className="sec prob">
        <div className="wrap reveal">
          <span className="eyebrow kicker">The old way is broken</span>
          <div className="oldway">R30k quotes. 3-month builds. Then you maintain it yourself.</div>
          <div className="flip">There's <span className="acc">a better way.</span></div>
          <p className="lead2">
            Traditional agencies charge a fortune up front, take months, and hand you a site you are then stuck updating yourself. We flipped it: we build your site for free, then run it for you on a flat monthly fee and keep it fast and up to date.
          </p>
        </div>
      </section>

      {/* ===== how it works ===== */}
      <section className="sec gridbg" id="how" style={{ borderTop: "1px solid var(--ads-line)", borderBottom: "1px solid var(--ads-line)" }}>
        <div className="wrap">
          <span className="eyebrow kicker reveal">How it works</span>
          <h2 className="h2 reveal">You barely lift a finger.</h2>
          <div className="steps">
            <div className="progress"><div className="fill" /></div>
            <div className="step" style={{ transitionDelay: "0s" }}>
              <div className="num" style={{ transitionDelay: "0s" }}>01</div>
              <h3>Tell us about your business</h3>
              <p>A quick chat about what you do and the look you want.</p>
            </div>
            <div className="step" style={{ transitionDelay: ".97s" }}>
              <div className="num" style={{ transitionDelay: ".97s" }}>02</div>
              <h3>We design and build it</h3>
              <p>We create a fast, modern, mobile-friendly site and show you a draft.</p>
            </div>
            <div className="step" style={{ transitionDelay: "1.93s" }}>
              <div className="num" style={{ transitionDelay: "1.93s" }}>03</div>
              <h3>You review and approve</h3>
              <p>Ask for changes until you love it, then give it the go-ahead.</p>
            </div>
            <div className="step" style={{ transitionDelay: "2.9s" }}>
              <div className="num" style={{ transitionDelay: "2.9s" }}>04</div>
              <h3>We launch and look after it</h3>
              <p>Hosting, security and updates are all handled for you.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== benefits bento ===== */}
      <section className="sec">
        <div className="wrap">
          <span className="eyebrow kicker reveal">Everything included</span>
          <h2 className="h2 reveal">One fee. We handle all of it.</h2>
          <div className="bento">
            <div className="cell big reveal">
              <span className="eyebrow">Simple and predictable</span>
              <h3 style={{ fontSize: "24px", marginTop: "14px" }}>One monthly fee</h3>
              <p style={{ marginTop: "8px", fontSize: "14px" }}>Design, hosting, security, email and updates, all in one subscription. No big bill to get started.</p>
              <div className="big-n">from R799<span style={{ fontSize: "15px", color: "var(--ads-mut)" }}>/mo</span></div>
            </div>
            <div className="cell reveal" style={{ transitionDelay: ".06s" }}>
              <h3>Hosting &amp; security</h3>
              <p>Fast, SSL, backups, monitored.</p>
            </div>
            <div className="cell reveal" style={{ transitionDelay: ".12s" }}>
              <h3>Mobile-friendly</h3>
              <p>Looks great on every screen.</p>
            </div>
            <div className="cell wide reveal" style={{ transitionDelay: ".18s" }}>
              <h3>Free monthly updates</h3>
              <p>Need a change? We make it for you. You never touch the code.</p>
            </div>
            <div className="cell reveal" style={{ transitionDelay: ".24s" }}>
              <h3>SEO &amp; AI-ready</h3>
              <p>Built to rank on Google and be referenced by AI assistants like ChatGPT and Perplexity.</p>
            </div>
            <div className="cell reveal" style={{ transitionDelay: ".3s" }}>
              <h3>Pro email included</h3>
              <p>Mailboxes at your domain.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== portfolio ===== */}
      <section className="sec" id="pf" style={{ borderTop: "1px solid var(--ads-line)" }}>
        <div className="wrap">
          <span className="eyebrow kicker reveal">Recent work</span>
          <h2 className="h2 reveal">Real sites. Real businesses.</h2>
          <p className="lead2 reveal">Click any project to open the live site right here, scroll and click around inside it, or open it full screen.</p>

          <div className="feature reveal-fade tilt" data-url="https://ranksentinel.co">
            <div className="fimg">
              <div className="cbar">
                <Lights />
                <span className="u">ranksentinel.co</span>
              </div>
              <img src={ranksentinelImg} alt="RankSentinel website preview" loading="lazy" decoding="async" />
            </div>
            <div className="fbody">
              <div className="lab">Featured project</div>
              <h3>RankSentinel</h3>
              <p>A sharp, technical SaaS site for an SEO rank-tracking tool. Fast, focused, and built to convert sign-ups.</p>
              <div className="tags">
                <span className="tag">SaaS</span>
                <span className="tag">Technical</span>
                <span className="tag">Conversion</span>
              </div>
              <div className="frow">
                <span className="status"><span className="sd live" />Live site</span>
                <span className="ghost">Open preview ⤢</span>
                <a href="https://ranksentinel.co" target="_blank" rel="noopener noreferrer" className="ghost" onClick={(e) => e.stopPropagation()}>Open live ↗</a>
              </div>
            </div>
          </div>

          <div className="pf">
            {PROJECTS.map((p) => (
              <div className="card reveal-fade tilt" data-url={p.url} style={{ transitionDelay: p.delay }} key={p.name}>
                <div className="cbar">
                  <Lights />
                  <span className="u">{p.host}</span>
                </div>
                <button className="expand" title="Open preview" type="button">⤢</button>
                <div className="cimg">
                  <img src={p.img} alt={`${p.name} website preview`} loading="lazy" />
                </div>
                <div className="cmeta">
                  <h4>{p.name}</h4>
                  <span className="status"><span className={`sd ${p.status}`} />{p.label}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="hint">⤢ Hover a card and click to open the live site inside a window, scroll and interact, or open it full screen.</div>

          <div className="marq">
            <div className="track">
              {[0, 1].map((dup) =>
                ["ReachRight", "Deene Social", "Jacqui Chowles", "RankSentinel", "PC Quanti", "AI Focus", "Baobab Wines"].map((n) => (
                  <span key={`${dup}-${n}`}>{n}</span>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== pricing ===== */}
      <section className="sec gridbg" id="pricing" style={{ borderTop: "1px solid var(--ads-line)", borderBottom: "1px solid var(--ads-line)" }}>
        <div className="wrap">
          <div className="pricetop">
            <div>
              <span className="eyebrow kicker reveal">Simple monthly pricing</span>
              <h2 className="h2 reveal">No big upfront fee. Pick a plan.</h2>
            </div>
            <label className="regionsel reveal">
              <span>Currency</span>
              <select value={region} onChange={(e) => setRegion(e.target.value as RegionKey)} aria-label="Choose your region / currency">
                {REGION_ORDER.map((r) => (
                  <option key={r} value={r}>{REGION_LABELS[r]}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="tiers">
            {TIERS.map((t) => (
              <div className={`tier ${t.featured ? "feat " : ""}reveal`} style={{ transitionDelay: t.delay }} key={t.id}>
                {t.featured && <div className="badge">Most popular</div>}
                <div className="tname">{t.name}</div>
                <div className="tsub">{t.sub}</div>
                <div className="price">{formatAmount(region, PRICES[region][t.id])}<small>/mo</small></div>
                <div className="pages">{t.pages}</div>
                <ul>
                  {t.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <button type="button" className={`tbtn ${t.featured ? "solid" : "outl"}`} onClick={() => openTerms(t.id, t.name)}>
                  Get started
                </button>
              </div>
            ))}
          </div>
          <div className="customcard reveal">
            <div>
              <h3>Custom / Enterprise</h3>
              <p>For bigger or bespoke projects (e-commerce, bookings, integrations), we scope a tailored monthly plan.</p>
            </div>
            <Link to="/contact-enterprise" className="btn">Talk to us</Link>
          </div>
          <p className="pricenote">Free build to get started. Hosting, SSL, backups and pro email included. Need separate mailboxes? Add professional mailbox aliases at R40/month each.</p>
        </div>
      </section>

      {/* ===== faq ===== */}
      <section className="sec" id="faq">
        <div className="wrap">
          <span className="eyebrow kicker reveal">Before you ask</span>
          <h2 className="h2 reveal">Questions, answered.</h2>
          <div className="faq reveal">
            {FAQS.map((item, i) => (
              <Faq key={item.q} q={item.q} a={item.a} defaultOpen={i === 0} />
            ))}
          </div>
          <div className="faqmore">Still have a question? <a href="#getquote">Talk to us →</a></div>
        </div>
      </section>

      {/* ===== quote form ===== */}
      <section className="quote" id="getquote">
        <div className="wrap quotegrid">
          <div className="reveal">
            <span className="eyebrow kicker">Get started</span>
            <h2>Ready for a website that's <span className="acc">done for you?</span></h2>
            <p className="qp">Tell us a little about your business and we will send you a free, no-obligation quote. We reply within 1 business day.</p>
            <form className="form" onSubmit={onQuoteSubmit}>
              <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" style={{ display: "none" }} aria-hidden="true" />
              <input type="hidden" name="_subject" value="New quote request — All Done Sites" />
              <div className="frow2">
                <div className="field"><label htmlFor="q-name">Name</label><input id="q-name" name="name" type="text" placeholder="Jane Smith" required /></div>
                <div className="field"><label htmlFor="q-company">Company</label><input id="q-company" name="company" type="text" placeholder="Your business" /></div>
              </div>
              <div className="frow2">
                <div className="field"><label htmlFor="q-email">Email</label><input id="q-email" name="email" type="email" placeholder="jane@business.co.za" required /></div>
                <div className="field"><label htmlFor="q-phone">Phone</label><input id="q-phone" name="phone" type="tel" placeholder="072 000 0000" /></div>
              </div>
              <div className="field">
                <label htmlFor="q-plan">Which plan are you interested in?</label>
                <select id="q-plan" name="plan" defaultValue="Not sure yet">
                  <option>Not sure yet</option>
                  <option>Launch</option>
                  <option>Business</option>
                  <option>Premium</option>
                  <option>Custom / Enterprise</option>
                </select>
              </div>
              <div className="field"><label htmlFor="q-msg">Tell us about your business</label><textarea id="q-msg" name="message" placeholder="What you do, and what you'd like from a website." /></div>
              <button className="btn lg formbtn" type="submit" disabled={submitting}>
                {submitting ? "Sending…" : "Send my request"}
              </button>
            </form>
          </div>
          <div className="alts reveal">
            <h3>Prefer to chat?</h3>
            <a className="alt" href={WHATSAPP} target="_blank" rel="noopener noreferrer">
              <span className="ic">
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="#25D366" d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.413c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.738-.981zm5.464-6.07c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414z" /></svg>
              </span>
              <span><span className="at">WhatsApp us</span><br /><span className="as">Quickest reply, usually same day</span></span>
            </a>
            <a className="alt" href={PHONE_TEL}>
              <span className="ic">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              </span>
              <span><span className="at">Call us</span><br /><span className="as">Speak to a real person</span></span>
            </a>
            <a className="alt" href={`mailto:${EMAIL}?subject=Book a call`}>
              <span className="ic">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              </span>
              <span><span className="at">Book a call</span><br /><span className="as">Pick a time that suits you</span></span>
            </a>
            <div className="reassure">No upfront cost. We build your site free to start, then it's one simple monthly fee.</div>
          </div>
        </div>
      </section>

      {/* ===== footer ===== */}
      <RedesignFooter />

      {/* ===== live-site preview modal ===== */}
      <div className="vmodal" id="vmodal">
        <div className="vbox">
          <div className="vtop">
            <span className="d" style={{ background: "#ff5f57" }} />
            <span className="d" style={{ background: "#febc2e" }} />
            <span className="d" style={{ background: "#28c840" }} />
            <a className="vurl" id="vurl" href="#" target="_blank" rel="noopener noreferrer">&nbsp;</a>
            <a className="vbtn solid" id="vopen" href="#" target="_blank" rel="noopener noreferrer">Open live ↗</a>
            <button className="vbtn" id="vclose" type="button">Close ✕</button>
          </div>
          <iframe id="vframe" title="Live site preview" />
        </div>
      </div>

      {/* ===== terms-acceptance modal (before Paystack) ===== */}
      {terms && (
        <div className="tmodal" onClick={(e) => { if (e.target === e.currentTarget && !redirecting) setTerms(null); }}>
          <div className="tbox">
            <div className="thead">
              <h3>All Done Sites Subscription Agreement</h3>
              <p>Please review and accept the agreement before continuing to payment for the {terms.name} plan.</p>
            </div>
            <div className="tbody">{termsText || "Loading…"}</div>
            <label className="tcheck">
              <input type="checkbox" checked={termsChecked} onChange={(e) => setTermsChecked(e.target.checked)} />
              <span>I have read, understood and agree to be bound by the All Done Sites Subscription Agreement.</span>
            </label>
            <div className="tfoot">
              <button type="button" className="vbtn" onClick={() => setTerms(null)} disabled={redirecting}>Cancel</button>
              <button type="button" className="btn" disabled={!termsChecked || redirecting} onClick={acceptTerms}>
                {redirecting ? "Redirecting…" : "Accept & continue to payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Faq({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className={`qa${open ? " open" : ""}`}>
      <div className="q" onClick={() => setOpen((o) => !o)} role="button" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen((o) => !o)}>
        {q}
        <span className="chev">{open ? "–" : "+"}</span>
      </div>
      <div className="a">{a}</div>
    </div>
  );
}
