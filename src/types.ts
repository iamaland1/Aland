export interface Reciter {
  id: string;
  name: string;
  slug: string;
}

export interface Surah {
  n: number;
  a: string;
  k: string;
  y: number;
  t: string;
  j: number;
  tafsir?: string;
  audio?: string;
}

export interface Hadith {
  a: string;
  k: string;
  s: string;
  t: string;
}

export interface Question {
  q: string;
  o: string[];
  c: number;
}

export interface BioSection {
  t: string;
  p: string;
}

export interface Fatwa {
  q: string;
  a: string;
  r: string;
  rc: string;
}

export interface InheritanceMember {
  id: string;
  l: string;
}

export interface Dhikr {
  id: string;
  a: string; // Arabic
  k: string; // Kurdish
  e: string; // Explanation/Meaning
  c: number; // Count/Repetitions
  audio?: string;
  category: string;
}

export interface DhikrCategory {
  id: string;
  name: string;
  icon: string;
}
