export type PersonaRole = 'kid' | 'man' | 'woman' | 'elder';

export interface Family {
  id: string;
  name: string;
  access_code: string;
  created_by: string;
  created_at: string;
}

export interface Profile {
  id: string;
  family_id: string;
  display_name: string;
  role: PersonaRole;
  is_admin: boolean;
  avatar_url?: string | null;
  created_at: string;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  predicted_winner: string;
  points_earned: number;
  created_at: string;
}

export interface StylePost {
  id: string;
  family_id: string;
  user_id: string;
  image_url: string;
  caption: string;
  created_at: string;
}

export interface FamilyEvent {
  id: string;
  family_id: string;
  event_date: string;
  title: string;
  type: 'birthday' | 'anniversary' | 'travel';
  created_at: string;
}

export const PERSONA_CONFIG: Record<PersonaRole, {
  label: string;
  icon: string;
  accentVar: string;
}> = {
  kid: { label: 'Chhotu', icon: '🪁', accentVar: '--kids-accent' },
  man: { label: 'Bhaiya', icon: '🏏', accentVar: '--arena-accent' },
  woman: { label: 'Didi', icon: '🌸', accentVar: '--style-accent' },
  elder: { label: 'Dada/Dadi', icon: '🪷', accentVar: '--wisdom-accent' },
};
