import {
  BookOpen,
  Briefcase,
  Bus,
  Car,
  ChefHat,
  CircleEllipsis,
  Coins,
  Dumbbell,
  Film,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  type LucideIcon,
  PartyPopper,
  PawPrint,
  PiggyBank,
  Pill,
  Plane,
  Receipt,
  Shirt,
  ShoppingCart,
  Smartphone,
  Tag,
  TrendingUp,
  Utensils,
  Wallet,
  Zap,
} from 'lucide-react';

/**
 * Conjunto curto de ícones Lucide para categorias (doc 13 §4). A chave é o nome kebab-case gravado
 * em `categories.icon`; ícone fora da lista (vindo de outra versão) aparece como `tag`.
 */
export const CATEGORY_ICONS = {
  utensils: Utensils,
  'shopping-cart': ShoppingCart,
  'chef-hat': ChefHat,
  house: House,
  zap: Zap,
  bus: Bus,
  car: Car,
  fuel: Fuel,
  'heart-pulse': HeartPulse,
  pill: Pill,
  'graduation-cap': GraduationCap,
  'book-open': BookOpen,
  'party-popper': PartyPopper,
  film: Film,
  plane: Plane,
  shirt: Shirt,
  dumbbell: Dumbbell,
  'paw-print': PawPrint,
  gift: Gift,
  smartphone: Smartphone,
  receipt: Receipt,
  landmark: Landmark,
  briefcase: Briefcase,
  coins: Coins,
  wallet: Wallet,
  'piggy-bank': PiggyBank,
  'trending-up': TrendingUp,
  tag: Tag,
  'circle-ellipsis': CircleEllipsis,
} as const satisfies Record<string, LucideIcon>;

export type CategoryIconName = keyof typeof CATEGORY_ICONS;

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS) as CategoryIconName[];

export function isCategoryIcon(name: string): name is CategoryIconName {
  return Object.hasOwn(CATEGORY_ICONS, name);
}
