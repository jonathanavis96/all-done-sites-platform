import React from "react";

/** Works on Vite/CRA/GitHub Pages */
function publicUrl(path: string) {
  // Vite
  // @ts-ignore
  if (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) {
    // @ts-ignore
    return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
  }
  // CRA/default
  // @ts-ignore
  const base = (typeof process !== "undefined" && process.env?.PUBLIC_URL) || "";
  return `${base}/${path.replace(/^\/+/, "")}`;
}

export default function Hero() {
  const videoSrc = publicUrl("hero.mp4");
  const posterSrc = publicUrl("hero-poster.png");

  return (
    <header className="relative min-h-[70vh] w-full overflow-hidden flex items-center justify-center text-white bg-black">
      {/* VIDEO ONLY */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src={videoSrc}
        poster={posterSrc}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />

      {/* CONTENT */}
      <div className="relative z-10 max-w-3xl px-6 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Websites built, hosted, and done for you.
        </h1>
        <p className="mt-4 text-lg md:text-xl text-gray-200">
          All Done Sites — one simple monthly fee. No hassles.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <a
            href="#pricing"
            className="rounded-2xl px-5 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md"
          >
            See Pricing
          </a>
          <a
            href="/book"
            className="rounded-2xl px-5 py-3 bg-indigo-500 hover:bg-indigo-600"
          >
            Book a Call
          </a>
        </div>
      </div>
    </header>
  );
}
