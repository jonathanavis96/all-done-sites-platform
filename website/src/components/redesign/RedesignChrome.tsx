// Shared chrome for the redesigned site: nav, footer, a page shell for content
// pages, and a hash-scroll helper. All of it lives inside the `.adsx` scope so
// it uses the new cyan/Bricolage design system (see styles/home.css).

import { ReactNode, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { WHATSAPP, EMAIL, PHONE_TEL, PHONE_DISPLAY } from "@/lib/site";

const base = import.meta.env.BASE_URL || "/";

/** Smooth-scrolls to a hash target on navigation, or to top on a plain route change. */
export function ScrollToHash() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const t = window.setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
      return () => window.clearTimeout(t);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export function RedesignNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onBrand = (e: React.MouseEvent) => {
    e.preventDefault();
    if (pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" });
    else navigate("/");
  };
  return (
    <nav>
      <div className="wrap navinner">
        <a href={base} className="brand" onClick={onBrand} aria-label="All Done Sites home">
          <img src={`${base}logo.png`} alt="All Done Sites" width={32} height={32} />
          <b>All Done Sites</b>
        </a>
        <div className="navright">
          <div className="nl">
            <Link to="/#how">How it works</Link>
            <Link to="/#pf">Portfolio</Link>
            <Link to="/#pricing">Pricing</Link>
            <Link to="/guides">Guides</Link>
            <Link to="/#faq">FAQ</Link>
          </div>
          <Link to="/#getquote" className="btn">Get a quote</Link>
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
            <a href={base} className="brand" style={{ marginBottom: "12px" }} onClick={onBrand}>
              <img src={`${base}logo.png`} alt="All Done Sites" width={32} height={32} />
              <b style={{ fontSize: "16px" }}>All Done Sites</b>
            </a>
            <p style={{ fontSize: "13px" }}>
              <span style={{ whiteSpace: "nowrap" }}>Your website, done for you,</span>{" "}
              <span style={{ whiteSpace: "nowrap" }}>for one simple monthly fee.</span>
            </p>
          </div>
          <div className="col">
            <h5>Product</h5>
            <Link to="/#how">How it works</Link>
            <Link to="/#pf">Portfolio</Link>
            <Link to="/#pricing">Pricing</Link>
            <Link to="/guides">Guides</Link>
            <Link to="/#faq">FAQ</Link>
          </div>
          <div className="col">
            <h5>Company</h5>
            <Link to="/#getquote">Contact</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
          <div className="col">
            <h5>Get in touch</h5>
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            <a href={PHONE_TEL}>{PHONE_DISPLAY}</a>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">WhatsApp us</a>
            <Link to="/#getquote">Book a call</Link>
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
      <main>
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
      </main>
      <RedesignFooter />
    </div>
  );
}
