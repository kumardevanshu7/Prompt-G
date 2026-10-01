export interface PromptItem {
  id: string;
  title: string;
  description: string;
  prompt: string;
  images: string[]; // Multi-image support (up to 5 images)
  labels: string[];
  created_at: string;
  updated_at?: string;
  rating?: number;
  is_verified?: boolean;
  userId?: string;
  userName?: string;
  enableCheckmark?: boolean; // When true, prompt tracks usage status (Pending vs Used)
  isUsed?: boolean; // false = Pending / No (light red), true = Used / Yes (checked)
}

export interface UserProfile {
  uid: string;
  name: string;
  gender?: 'male' | 'female' | 'other';
  email?: string;
  photoURL?: string;
  createdAt?: string;
  securityQuestion?: string;
  securityAnswer?: string;
}

export type BackendProvider = 'firebase_firestore' | 'supabase' | 'local';

export interface DatabaseConfig {
  provider: BackendProvider;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}
