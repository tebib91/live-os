type InfoRowProps = {
  label: string;
  value?: string | number | null;
};

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex">
      <span className="w-36 text-white/60">{label}</span>
      <span className="text-white">{value ?? "Unknown"}</span>
    </div>
  );
}
