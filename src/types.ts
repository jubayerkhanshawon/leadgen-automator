export interface Lead {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  facebook: string;
  email: string;
  status: 'pending' | 'scraping' | 'completed' | 'failed';
  notes?: string;
}

export type ScrapeSource = 'gemini' | 'simulation';

export interface ScrapeLog {
  timestamp: string;
  type: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

export interface ScrapingOutput {
  leads: Lead[];
  logs: ScrapeLog[];
}
