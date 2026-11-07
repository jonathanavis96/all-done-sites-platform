// Shared chrome for the redesigned site: nav, footer, a page shell for content
// pages, and a hash-scroll helper. All of it lives inside the `.adsx` scope so
// it uses the new cyan/Bricolage design system (see styles/home.css).

import { ReactNode, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { WHATSAPP, WHATSAPP_HELLO, EMAIL, PHONE_TEL, PHONE_DISPLAY } from "@/lib/site";

const base = import.meta.env.BASE_URL || "/";

/** Smooth-scrolls to a hash target on navigation, or to top on a plain route change. */
export function ScrollToHash() {
  const { pathname, hash, key } = useLocation();
  const firstRun = useRef(true);
  useEffect(() => {
    // Hydration is deferred until first interaction or idle, so on a prerendered
    // page this runs after the visitor may have started scrolling: the first run
    // must not send them back to the top.
    const isFirstRun = firstRun.current;
    firstRun.current = false;
    if (hash) {
      const t = window.setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
      return () => window.clearTimeout(t);
    }
    // "instant" overrides the smooth scrolling set on html for in-page anchors;
    // a new page should start at the top, not roll up to it.
    if (!isFirstRun) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    // `key` as well as the URL: tapping a menu link for the section you already
    // visited leaves the URL unchanged and should still go there.
  }, [pathname, hash, key]);
  return null;
}

const NAV_LINKS = [
  { to: "/#how", label: "How it works" },
  { to: "/#pf", label: "Portfolio" },
  { to: "/#pricing", label: "Pricing" },
  { to: "/guides/", label: "Guides" },
  { to: "/#faq", label: "FAQ" },
];

export function RedesignNav() {
  const navigate = useNavigate();
  const { pathname, key } = useLocation();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const onBrand = (e: React.MouseEvent) => {
    e.preventDefault();
    if (pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" });
    else navigate("/");
  };
  useEffect(() => {
    const onPointer = (e: Event) => {
      const menu = menuRef.current;
      if (menu?.open && !menu.contains(e.target as Node)) menu.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menuRef.current) menuRef.current.open = false;
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return (
    <nav>
      <div className="wrap navinner">
        <a href={base} className="brand" onClick={onBrand} aria-label="All Done Sites home">
          <img src={`${base}logo.png`} alt="" width={32} height={32} />
          <b>All Done Sites</b>
        </a>
        <div className="navright">
          <div className="nl">
            {NAV_LINKS.map((l) => (
              <Link to={l.to} key={l.to}>{l.label}</Link>
            ))}
          </div>
          <Link to="/#getquote" className="btn">Get a quote</Link>
          {/* Phones only. <details> opens before the page has hydrated, and the
              key closes it again whenever a link is followed. */}
          <details className="mnav" key={key} ref={menuRef}>
            <summary aria-label="Menu"><Menu size={22} aria-hidden="true" /></summary>
            <div className="mnav-panel">
              {NAV_LINKS.map((l) => (
                <Link to={l.to} key={l.to}>{l.label}</Link>
              ))}
              <a href={WHATSAPP_HELLO} target="_blank" rel="noopener noreferrer">WhatsApp us</a>
            </div>
          </details>
        </div>
      </div>
    </nav>
  );
}

export function RedesignFooter() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onBrand = (e: React.MouseEvent) => {
    e.preventDefault();
    if (pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" });
    else navigate("/");
  };
  return (
    <footer>
      <div className="wrap">
        <div className="fcols">
          <div className="col" style={{ maxWidth: "260px" }}>
            <a href={base} className="brand" style={{ marginBottom: "12px" }} onClick={onBrand} aria-label="All Done Sites home">
              <img src={`${base}logo.png`} alt="" width={32} height={32} />
              <b style={{ fontSize: "16px" }}>All Done Sites</b>
            </a>
            <p style={{ fontSize: "13px" }}>
              <span style={{ whiteSpace: "nowrap" }}>Your website, done for you,</span>{" "}
              <span style={{ whiteSpace: "nowrap" }}>for one simple monthly fee.</span>
            </p>
          </div>
          <div className="col">
            <div className="ftitle">Product</div>
            <Link to="/#how">How it works</Link>
            <Link to="/#pf">Portfolio</Link>
            <Link to="/#pricing">Pricing</Link>
            <Link to="/guides/">Guides</Link>
            <Link to="/#faq">FAQ</Link>
            <Link to="/claude-usage-tracker/">Claude usage tracker</Link>
          </div>
          <div className="col">
            <div className="ftitle">Company</div>
            <Link to="/#getquote">Contact</Link>
            <Link to="/privacy/">Privacy</Link>
            <Link to="/terms/">Terms</Link>
          </div>
          <div className="col">
            <div className="ftitle">Get in touch</div>
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            <a href={PHONE_TEL}>{PHONE_DISPLAY}</a>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">WhatsApp us</a>
            <Link to="/#getquote">Get a quote</Link>
          </div>
        </div>
        <div className="fbot">
          <span>© {new Date().getFullYear()} All Done Sites</span>
          <span className="mono">Built and maintained by us.</span>
        </div>
      </div>
    </footer>
  );
}

/** Page shell for redesigned content pages: nav + a header + content + footer. */
export function PageShell({
  eyebrow,
  title,
  sub,
  children,
}: {
  eyebrow?: string;
  title?: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="adsx">
      <RedesignNav />
      {/* Layout already wraps every page in <main>. */}
      <div>
        <section className="pagewrap">
          <div className="wrap">
            {(eyebrow || title || sub) && (
              <header className="pagehead">
                {eyebrow && <span className="eyebrow kicker">{eyebrow}</span>}
                {title && <h1>{title}</h1>}
                {sub && <div className="sub">{sub}</div>}
              </header>
            )}
            {children}
          </div>
        </section>
      </div>
      <RedesignFooter />
    </div>
  );
}
