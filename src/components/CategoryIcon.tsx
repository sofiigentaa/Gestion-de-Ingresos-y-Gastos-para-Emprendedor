import React from 'react';
import {
  Trees,
  Layers,
  Pipette,
  Wrench,
  Zap,
  Fuel,
  Store,
  Palette,
  Package,
  ShoppingBag,
  Sparkles,
  Globe,
  Truck,
  CreditCard,
  Hammer,
  DollarSign,
  Receipt,
  Tag,
  CircleDot,
} from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-5 h-5', size }) => {
  const iconMap: Record<string, React.ReactNode> = {
    Trees: <Trees className={className} size={size} />,
    Layers: <Layers className={className} size={size} />,
    Pipette: <Pipette className={className} size={size} />,
    Wrench: <Wrench className={className} size={size} />,
    Zap: <Zap className={className} size={size} />,
    Fuel: <Fuel className={className} size={size} />,
    Store: <Store className={className} size={size} />,
    Palette: <Palette className={className} size={size} />,
    Package: <Package className={className} size={size} />,
    ShoppingBag: <ShoppingBag className={className} size={size} />,
    Sparkles: <Sparkles className={className} size={size} />,
    Globe: <Globe className={className} size={size} />,
    Truck: <Truck className={className} size={size} />,
    CreditCard: <CreditCard className={className} size={size} />,
    Hammer: <Hammer className={className} size={size} />,
    DollarSign: <DollarSign className={className} size={size} />,
    Receipt: <Receipt className={className} size={size} />,
    Tag: <Tag className={className} size={size} />,
  };

  return <>{iconMap[name] || <CircleDot className={className} size={size} />}</>;
};
