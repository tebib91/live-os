"use client";

export function OrbitLoader() {
  return (
    <div className="relative h-16 w-16">
      <div className="absolute inset-0 rounded-full border border-white/10" />
      <div className="absolute inset-1 rounded-full border-2 border-white/30 border-t-transparent animate-spin" />
      <div className="absolute inset-3 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute inset-0 flex items-center justify-center text-white/80">
        <div className="h-5 w-5 rounded-full bg-gradient-to-tr from-cyan-300 to-indigo-400 animate-ping" />
      </div>
    </div>
  );
}
