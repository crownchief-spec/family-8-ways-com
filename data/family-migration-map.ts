import map from './family-migration-map.json' assert { type: 'json' };

export type FamilyPageType = 'core' | 'taiwan' | 'overseas' | 'theme' | 'reviews' | 'faq' | 'about';
export interface FamilyMigrationItem {
  id: string;
  oldUrls: string[];
  newUrl: string;
  pageType: FamilyPageType;
  oldTitle: string;
  newTitle: string;
  keywords: string[];
  hashtags: string[];
}

export const familyMigrationMap = map as FamilyMigrationItem[];
