export interface Service {
  id: string;
  name: string;
  url: string;
  icon: string; // Lucide icon name
  category?: string;
}

export type IconName = string;
