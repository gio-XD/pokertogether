'use client';

import type { Card } from '@/lib/engine/types';
import { PokerCard } from '@/components/cards/card';
import { useIsMobile } from '@/hooks/use-mobile';

interface CommunityCardsProps {
  cards: Card[];
}

export function CommunityCards({ cards }: CommunityCardsProps) {
  const isMobile = useIsMobile();

  return (
    <div className="flex gap-1 sm:gap-1.5">
      {cards.map((card, i) => (
        <PokerCard
          key={`${card.rank}-${card.suit}`}
          card={card}
          size={isMobile ? 'sm' : 'md'}
          delay={i * 150}
        />
      ))}
    </div>
  );
}
