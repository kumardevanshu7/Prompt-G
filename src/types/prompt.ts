export type BypassDifficulty = 'easily_pass' | 'difficult_to_bypass';

export interface PromptItem {
  id: string;
  title: string;
  description: string;
  prompt: string;
  images: string[]; // Multi-image support (up to 5 images)
  labels: string[];
  created_at: string;
  updated_at?: string;
  userId?: string;
  userName?: string;
  enableCheckmark?: boolean; // When true, prompt tracks usage status (Pending vs Used)
  isUsed?: boolean; // false = Pending / No (light red), true = Used / Yes (checked)
  publishCategory?: 'direct' | 'unreleased'; // Published sub-category destination
  modelUsed?: string; // 'Nano Pro', 'Nano 2.1', 'Both', or custom model name
  modelBypass?: Record<string, BypassDifficulty>; // e.g. { 'Nano Pro': 'easily_pass', 'Nano 2.1': 'difficult_to_bypass' }
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

