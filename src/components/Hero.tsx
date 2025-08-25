export default function Hero() {
  const base = import.meta.env.BASE_URL || "/";

  return (
    <header className="relative min-h-[70vh] w-full overflow-hidden flex items-center justify-center bg-black">
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src={`${base}hero.mp4`}
        poster={`${base}hero-poster.webp`}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        fetchpriority="high"
      />
    </header>
  );
}
