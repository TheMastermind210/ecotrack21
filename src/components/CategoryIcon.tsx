import { Car, Utensils, Zap, Package } from 'lucide-react';

/** Returns a Lucide icon matching the carbon emission category (transport, food, energy, goods). */
export const CategoryIcon = ({ category, size = 14 }: { category: string; size?: number }) => {
  switch (category) {
    case 'transport': return <Car size={size} aria-label="Transport" />;
    case 'food': return <Utensils size={size} aria-label="Food" />;
    case 'energy': return <Zap size={size} aria-label="Energy" />;
    case 'goods': return <Package size={size} aria-label="Goods" />;
    default: return <Package size={size} aria-label="Other" />;
  }
};
