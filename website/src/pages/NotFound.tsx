import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import Seo from "@/components/Seo";
import { PageShell } from "@/components/redesign/RedesignChrome";

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <PageShell>
      <Seo
        title="Page not found | All Done Sites"
        description="The page you were looking for doesn't exist or may have moved."
      />
      <div className="notfound">
        <div className="big">404</div>
        <h1>This page wandered off.</h1>
        <p>The page you were looking for doesn't exist or may have moved. Let's get you back on track.</p>
        <Link to="/" className="btn lg">Back to home</Link>
      </div>
    </PageShell>
  );
}
