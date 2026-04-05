export type Role = 'comensal' | 'mozo' | 'cocinero' | 'admin_mesa' | 'superadmin';

export interface UserProfile {
  uid: string;
  phone: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface DailyMenu {
  date: string; // YYYY-MM-DD
  casinoMenuAlmuerzo: string;
  casinoMenuCena: string;
  ranchoMenu: string;
  updatedAt: string;
}

export type MenuType = 'casino' | 'rancho';
export type MealType = 'almuerzo' | 'cena';

export interface Reservation {
  id?: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  meal: MealType;
  menuType: MenuType;
  attended: boolean;
  createdAt: string;
}
