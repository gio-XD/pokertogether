'use client';

interface PotDisplayProps {
  amount: number;
}

export function PotDisplay({ amount }: PotDisplayProps) {
  return (
    <div className="pot-glow px-4 py-1.5 rounded-full bg-black/70 border border-[var(--gold)]/30">
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded-full bg-gradient-to-b from-[var(--gold)] to-[var(--gold-dim)] shadow-sm" />
        <span className="text-sm font-bold text-[var(--gold)]">
          ${amount.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
