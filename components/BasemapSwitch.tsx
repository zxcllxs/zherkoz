"use client";

export type Basemap = "osm" | "sat";

export default function BasemapSwitch({
  value,
  onChange,
}: {
  value: Basemap;
  onChange: (b: Basemap) => void;
}) {
  const btn = (b: Basemap, label: string) => (
    <button
      onClick={() => onChange(b)}
      aria-pressed={value === b}
      className={`min-h-11 px-3 text-sm font-medium ${
        value === b ? "bg-slate-800 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="absolute right-3 top-3 z-[1000] flex overflow-hidden rounded-lg shadow-md ring-1 ring-slate-300">
      {btn("osm", "Карта")}
      {btn("sat", "Спутник")}
    </div>
  );
}
