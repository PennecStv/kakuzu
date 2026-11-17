import type { CSSProperties } from 'react';
import {
  Baby, Bike, BookOpen, Briefcase, Car, Cat, Coffee, Coins, Dog, Droplet, Dumbbell, Ellipsis, Film, Flame, Flower,
  Fuel, Gamepad2, Gift, GraduationCap, HandCoins, HeartPulse, House, Landmark, type LucideIcon, Music, PiggyBank,
  Pill, Plane, Repeat, Scissors, Shield, Shirt, ShoppingBag, ShoppingBasket, Smartphone, Tag, Ticket, TrainFront,
  Utensils, Wifi, Wine, Wrench, Zap,
} from 'lucide-react';
import { ICONS, type IconId } from '../store/icons';
import { categoryColor } from '../store/store';
import type { Category } from '../store/types';

const SHAPES: Record<IconId, [LucideIcon, string]> = {
  house: [House, 'Logement'],
  basket: [ShoppingBasket, 'Courses'],
  utensils: [Utensils, 'Restaurant'],
  coffee: [Coffee, 'Café'],
  wine: [Wine, 'Boissons'],
  bag: [ShoppingBag, 'Shopping'],
  shirt: [Shirt, 'Vêtements'],
  car: [Car, 'Voiture'],
  train: [TrainFront, 'Transports en commun'],
  bike: [Bike, 'Vélo'],
  fuel: [Fuel, 'Carburant'],
  plane: [Plane, 'Voyage'],
  health: [HeartPulse, 'Santé'],
  pill: [Pill, 'Pharmacie'],
  sport: [Dumbbell, 'Sport'],
  ticket: [Ticket, 'Sorties'],
  film: [Film, 'Cinéma'],
  music: [Music, 'Musique'],
  game: [Gamepad2, 'Jeux'],
  book: [BookOpen, 'Livres'],
  school: [GraduationCap, 'Études'],
  baby: [Baby, 'Enfants'],
  cat: [Cat, 'Chat'],
  dog: [Dog, 'Chien'],
  gift: [Gift, 'Cadeaux'],
  flower: [Flower, 'Fleurs'],
  scissors: [Scissors, 'Coiffeur et beauté'],
  phone: [Smartphone, 'Téléphone'],
  wifi: [Wifi, 'Internet'],
  bolt: [Zap, 'Électricité'],
  droplet: [Droplet, 'Eau'],
  flame: [Flame, 'Chauffage'],
  repeat: [Repeat, 'Abonnements'],
  tax: [Landmark, 'Impôts'],
  shield: [Shield, 'Assurance'],
  wrench: [Wrench, 'Réparations'],
  briefcase: [Briefcase, 'Salaire'],
  'hand-coins': [HandCoins, 'Extras'],
  coins: [Coins, 'Argent'],
  'piggy-bank': [PiggyBank, 'Épargne'],
  tag: [Tag, 'Étiquette'],
  more: [Ellipsis, 'Autres'],
};

/** The category's icon on a tile of its color. */
export function CategoryIcon({ category }: { category: Category | undefined }) {
  const tile = categoryColor(category);
  const [Shape] = SHAPES[category?.icon ?? 'tag'];
  return (
    <span className="cat-icon" style={{ '--tile': tile } as CSSProperties} aria-hidden="true">
      <Shape />
    </span>
  );
}

export function IconPicker({ value, onChange }: { value: IconId; onChange: (icon: IconId) => void }) {
  return (
    <div className="icon-picker">
      {ICONS.map((id) => {
        const [Shape, label] = SHAPES[id];
        return (
          <button
            key={id}
            type="button"
            className={id === value ? 'is-on' : ''}
            aria-pressed={id === value}
            aria-label={label}
            title={label}
            onClick={() => onChange(id)}
          >
            <Shape aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
