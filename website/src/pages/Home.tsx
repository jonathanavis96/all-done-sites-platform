import { Link } from "react-router-dom"

export default function Home() {
  const features = [
    "One simple monthly fee — no upfront cost",
    "Hosting, maintenance, and updates included",
    "Mobile-friendly, modern design",
    "SEO-friendly builds",
    "Quick turnaround times",
    "1 free small content update each month",
    "Friendly, responsive support",
  ]
  return (
    <section className="grid gap-6">
      <h1 className="text-4xl font-bold max-w-3xl">
        Your website, done for you — for one monthly fee.
      </h1>
      <p className="text-lg max-w-2xl">
        We build, host, maintain, and update professional websites for small to medium businesses.
        No upfront cost, clear billing, and fast turnarounds.
      </p>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f) => (
          <li key={f} className="border rounded-xl p-4">{f}</li>
        ))}
      </ul>
      <div className="flex gap-3">
        <Link to="/pricing" className="px-4 py-2 rounded-xl border">See Pricing</Link>
        <Link to="/contact" className="px-4 py-2 rounded-xl border">Get Started</Link>
      </div>
    </section>
  )
}
