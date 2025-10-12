import { cn } from '@/lib/utils';

interface TierBadgeProps {
  tier: string;
  rarity: string;
  glassColor: string;
  glowColor: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function TierBadge({
  tier,
  rarity,
  glassColor,
  glowColor,
  size = 'md',
  className,
}: TierBadgeProps) {
  const sizes = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-3 rounded-2xl glass border',
        sizes[size],
        className
      )}
      style={{
        borderColor: `${glowColor}40`,
        boxShadow: `0 0 20px ${glowColor}20`,
      }}
    >
      {/* Color swatches */}
      <div className="flex gap-1.5">
        <div
          className="w-4 h-4 rounded-full border border-white/20"
          style={{ backgroundColor: glassColor }}
          title={`Glass: ${glassColor}`}
        />
        <div
          className="w-4 h-4 rounded-full border border-white/20"
          style={{ backgroundColor: glowColor }}
          title={`Glow: ${glowColor}`}
        />
      </div>

      {/* Tier info */}
      <div className="flex flex-col">
        <span className="font-bold" style={{ color: glowColor }}>
          {tier}
        </span>
        <span className="text-xs text-text-muted">
          {rarity}
        </span>
      </div>
    </div>
  );
}
