import { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Code,
  Terminal,
  Download,
  Database,
  MapPin,
  Activity,
  Phone,
  Mail,
  Facebook,
  Copy,
  Check,
  ExternalLink,
  Shield,
  RefreshCw,
  Info,
  Layers,
  Globe,
  Cpu,
  Bookmark,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon
} from 'lucide-react';
import { SCRIPTS_DATA } from './scriptsData';
import { Lead, ScrapeLog, ScrapeSource } from './types';
import { initAuth, googleSignIn, logout } from './auth';
import { exportLeadsToGoogleSheets } from './googleSheetsHelper';
import { User } from 'firebase/auth';

// Default initial simulation mock leads so the user has an immediate hands-on feel
const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead_1',
    name: "Gamer's Haven Dhanmondi",
    address: "House 54, Road 27, Dhanmondi, Dhaka 1209",
    phone: "+880 171 123 4567",
    website: "https://gamershaven.com.bd",
    facebook: "https://facebook.com/gamershaven.dhaka",
    email: "info@gamershaven.com.bd",
    status: 'completed',
    notes: "Direct contact crawl matched. Matches verified email regex expression inside Contact page HTML document."
  },
  {
    id: 'lead_2',
    name: "Pixel Point Gaming Hub",
    address: "Zigatola Crossing, Dhanmondi, Dhaka 1205",
    phone: "+880 181 234 5678",
    website: "https://pixelpoint.bd",
    facebook: "https://facebook.com/pixelpoint.bd",
    email: "contact@pixelpoint.bd",
    status: 'completed',
    notes: "Home page parsing. Metatag content matched: 'Facebook: facebook.com/pixelpoint.bd'"
  },
  {
    id: 'lead_3',
    name: "Dhanmondi Console Lab",
    address: "Rangs Fortune Square, Dhanmondi 2A, Dhaka 1209",
    phone: "+880 191 345 6789",
    website: "https://consolelab.net",
    facebook: "https://facebook.com/consolelab",
    email: "support@consolelab.net",
    status: 'completed',
    notes: "Sourced through contact anchor scan. Fully structured meta output parsed."
  },
  {
    id: 'lead_4',
    name: "The Rig Shop Bangladesh",
    address: "House 12/A, Dhanmondi Road 12, Dhaka",
    phone: "+880 161 456 7890",
    website: "https://therigshop.com",
    facebook: "https://facebook.com/therigshop.bd",
    email: "N/A",
    status: 'completed',
    notes: "Crawled website successfully. Facebook social page scraped. Email addresses not published on external header files."
  },
];

const INITIAL_LOGS: ScrapeLog[] = [
  { timestamp: '09:15:02', type: 'info', message: 'LeadGen Engine booted successfully. Defaulting to local crawler environment.' },
  { timestamp: '09:15:05', type: 'success', message: 'Identified Node.js standard target libraries: Puppeteer, Cheerio, Axios.' },
  { timestamp: '09:15:08', type: 'info', message: 'Awaiting local query input for live generation or local workspace simulations.' }
];

export default function App() {
  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) return savedTheme === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Input states
  const [area, setArea] = useState('Dhanmondi, Dhaka');
  const [category, setCategory] = useState('Gaming Shops');
  const [source, setSource] = useState<ScrapeSource>('simulation');
  
  // App state
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [logs, setLogs] = useState<ScrapeLog[]>(INITIAL_LOGS);
  const [isScraping, setIsScraping] = useState(false);
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'data' | 'guides' | 'logs'>('data');
  const [activeGuide, setActiveGuide] = useState<'node' | 'php' | 'places' | 'proxies'>('node');
  
  // Search state for filtered grids
  const [searchTerm, setSearchTerm] = useState('');
  
  // Copy feedback tracking
  const [copiedText, setCopiedText] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Google Sheets Integration State
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isExportingToSheets, setIsExportingToSheets] = useState(false);
  const [exportedSheetUrl, setExportedSheetUrl] = useState<string | null>(null);

  // Keep OAuth Token bound in memory
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
        showNotice(`Welcome! Connected to Google account: ${result.user.email}`);
      }
    } catch (err: any) {
      console.error(err);
      showNotice("Google Connection was cancelled or failed.");
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logout();
      setGoogleUser(null);
      setGoogleToken(null);
      setExportedSheetUrl(null);
      showNotice("Disconnected Google Account.");
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleExportToSheets = async () => {
    if (!googleToken) {
      showNotice("Connect Sheets button must be clicked first!");
      return;
    }
    if (leads.length === 0) {
      showNotice("No leads found to save! Click 'Initialize Extraction' first.");
      return;
    }

    // Explicit confirmation dialog for updating workspace
    const confirmSave = window.confirm(
      `Do you want to export ${leads.length} leads directly to a new Google Sheet in your Google Account?`
    );
    if (!confirmSave) return;

    setIsExportingToSheets(true);
    setExportedSheetUrl(null);

    const startTime = new Date().toLocaleTimeString();
    setLogs(prev => [
      ...prev,
      { timestamp: startTime, type: 'info', message: 'Readying direct transfer data payload...' }
    ]);

    try {
      const url = await exportLeadsToGoogleSheets(googleToken, category, area, leads);
      setExportedSheetUrl(url);
      showNotice("Leads saved directly to Google Sheets!");
      setLogs(prev => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), type: 'success', message: `Sheet generated successfully! Live Spreadsheet: ${url}` }
      ]);
    } catch (err: any) {
      console.error(err);
      const errTime = new Date().toLocaleTimeString();
      setLogs(prev => [
        ...prev,
        { timestamp: errTime, type: 'error', message: `Sheets write failed: ${err.message}` }
      ]);
      showNotice(`Google sheets save failed: ${err.message}`);
    } finally {
      setIsExportingToSheets(false);
    }
  };


  // Status statistics derivation
  const totalLeadsCount = leads.length;
  const emailsFoundCount = leads.filter(l => l.email && l.email !== 'N/A').length;
  const successRate = totalLeadsCount > 0 
    ? Math.round((leads.filter(l => l.status === 'completed').length / totalLeadsCount) * 100) 
    : 100;

  // Filtered dataset
  const filteredLeads = leads.filter(lead => {
    const term = searchTerm.toLowerCase();
    return (
      lead.name.toLowerCase().includes(term) ||
      lead.address.toLowerCase().includes(term) ||
      lead.website.toLowerCase().includes(term) ||
      lead.email.toLowerCase().includes(term) ||
      lead.phone.toLowerCase().includes(term)
    );
  });

  const triggerCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    showNotice("Code block copied to clipboard!");
    setTimeout(() => setCopiedText(false), 2000);
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRunScrape = async () => {
    if (isScraping) return;
    
    setIsScraping(true);
    setActiveTab('data');
    setLeads([]);
    
    // Initial feedback logs
    const startLogs: ScrapeLog[] = [
      { timestamp: new Date().toLocaleTimeString(), type: 'info', message: 'Starting automation pipeline...' },
      { timestamp: new Date().toLocaleTimeString(), type: 'info', message: `Target Query: "${category}" in "${area}"` }
    ];
    setLogs(startLogs);

    try {
      const response = await fetch('/api/generate-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area, category, source })
      });

      if (!response.ok) {
        throw new Error(`HTTP network response code: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.leads) {
        setLeads(data.leads);
      }
      if (data.logs) {
        // Merge or replace
        setLogs(prev => [...prev, ...data.logs]);
      }

      if (data.warned) {
        showNotice("Gemini Key unset. Substituted simulated leads safely!");
      } else {
        showNotice(`Found ${data.leads?.length || 0} local B2B leads successfully!`);
      }

    } catch (err: any) {
      console.error(err);
      const errTime = new Date().toLocaleTimeString();
      setLogs(prev => [
        ...prev,
        { timestamp: errTime, type: 'error', message: `Extraction Pipeline failure: ${err.message}` },
        { timestamp: errTime, type: 'warn', message: 'Simulating fallback sequence to prevent interface lockout...' }
      ]);

      // Fallback fallback
      const mockResult: Lead[] = [
        {
          id: `lead_err_1_${Date.now()}`,
          name: `${category} Elite Group ${area}`,
          address: `Apartment 14, Block B, Road 11, ${area}`,
          phone: "+880 171 999 5555",
          website: `https://elite${category.toLowerCase().replace(/\s+/g, '')}.com`,
          facebook: `https://facebook.com/elite.${category.toLowerCase().replace(/\s+/g, '')}`,
          email: "support@elitegroup.com",
          status: 'completed',
          notes: "Generated local simulation fallback. Connect your GEMINI_API_KEY in panel for real search-grounding."
        }
      ];
      setLeads(mockResult);
    } finally {
      setIsScraping(false);
    }
  };

  // CSV Exporter client utility
  const downloadCsv = () => {
    if (leads.length === 0) {
      showNotice("No leads data available to export yet. Click 'Initialize Extraction' first!");
      return;
    }

    const headers = ['Business Name', 'Full Address', 'Phone Number', 'Website URL', 'Facebook Page', 'Public Email', 'Source Code Notes'];
    const rows = leads.map(lead => [
      `"${lead.name.replace(/"/g, '""')}"`,
      `"${lead.address.replace(/"/g, '""')}"`,
      `"${lead.phone.replace(/"/g, '""')}"`,
      `"${lead.website.replace(/"/g, '""')}"`,
      `"${lead.facebook.replace(/"/g, '""')}"`,
      `"${lead.email.replace(/"/g, '""')}"`,
      `"${(lead.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `b2b_leads_${category.toLowerCase().replace(/\s+/g, '_')}_${area.toLowerCase().replace(/[\s,]+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotice("Excel-compatible CSV downloaded successfully!");
  };

  return (
    <div className={`min-h-screen flex flex-col antialiased font-serif transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      {/* Toast Notification HUD */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center space-x-2 animate-bounce font-sans">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Warning banner if utilizing Simulation */}
      {source === 'simulation' && (
        <div className={`border-b px-4 py-2 text-center text-xs flex items-center justify-center space-x-2 font-sans transition-all duration-300 ${isDarkMode ? 'bg-amber-950/20 border-amber-900/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          <AlertCircle size={14} className="text-amber-500 animate-pulse shrink-0" />
          <span>
            Currently in <strong>Scraper Simulation & CLI Blueprint</strong> mode. 
            Toggle to <strong>Google Grounding</strong> with a Gemini Key to live search Google's database!
          </span>
        </div>
      )}

      {/* Main Workspace Frame */}
      <div className="flex-1 flex max-w-[1440px] mx-auto w-full overflow-hidden min-h-[90vh]">
        
        {/* SIDE PANEL: Configuration controls & Parameters */}
        <aside className={`w-80 border-r flex flex-col p-6 space-y-6 shrink-0 font-sans transition-all duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-850'}`}>
          <div className={`flex items-center space-x-3 pb-2 border-b ${isDarkMode ? 'border-slate-850' : 'border-slate-100'}`}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-200">
              L
            </div>
            <div>
              <h1 id="app-title" className={`font-bold text-base leading-tight tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>LeadGen Automator</h1>
              <p className="text-[11px] text-slate-500 font-medium">B2B Extraction Shell • v2.4.0</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                  <MapPin size={10} className="text-slate-400" />
                  <span>Geographic Target Area</span>
                </label>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>e.g., zip, city</span>
              </div>
              <input
                id="area-target-input"
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Dhanmondi, Dhaka"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all duration-300 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-850'}`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                  <Search size={10} className="text-slate-400" />
                  <span>Business Category</span>
                </label>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>e.g., niche trade</span>
              </div>
              <input
                id="category-target-input"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Gaming Shops"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all duration-300 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-850'}`}
              />
            </div>            {/* Pipeline Mode / Backend engine trigger */}
            <div className={`py-2.5 border-t border-b space-y-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Extraction Pipeline Source
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="source-simulation-btn"
                  onClick={() => setSource('simulation')}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-center ${
                    source === 'simulation'
                      ? (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 shadow-sm' : 'bg-slate-100 border-slate-300 text-slate-900 shadow-sm')
                      : (isDarkMode ? 'bg-slate-900 border-slate-800/80 text-slate-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50')
                  }`}
                >
                  <Cpu size={12} className="inline mr-1 text-slate-600" />
                  Local Engine
                </button>
                <button
                  id="source-gemini-btn"
                  onClick={() => setSource('gemini')}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-center ${
                    source === 'gemini'
                      ? (isDarkMode ? 'bg-indigo-950/50 border-indigo-900 text-indigo-300 shadow-sm' : 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm')
                      : (isDarkMode ? 'bg-slate-900 border-slate-800/80 text-slate-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50')
                  }`}
                >
                  <Sparkles size={12} className="inline mr-1 text-indigo-505 animate-pulse" />
                  Live Gemini 3.5
                </button>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                {source === 'gemini' 
                  ? 'Real-time search grounding finds live public addresses and digital socials directly using server-side Gemini.'
                  : 'Frictionless full scraping sandbox emulation bypasses API tokens. Instant execution.'
                }
              </p>
            </div>

            <div className="pt-2">
              <button
                id="initialize-extraction-btn"
                onClick={handleRunScrape}
                disabled={isScraping}
                className={`w-full font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-lg flex items-center justify-center space-x-2 cursor-pointer ${
                  isScraping 
                    ? (isDarkMode ? 'bg-slate-850 text-slate-600 border border-slate-800' : 'bg-slate-200 text-slate-400') 
                    : (isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg')
                }`}
              >
                {isScraping ? (
                  <>
                    <RefreshCw size={15} className="animate-spin text-white" />
                    <span>Crawling & Parsing...</span>
                  </>
                ) : (
                  <>
                    <Activity size={15} className="text-emerald-400" />
                    <span>Initialize Extraction</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Google Sheets Sync panel */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3 font-sans">
            <h4 className="text-xs font-bold text-slate-705 flex items-center space-x-1.5">
              <Globe size={13} className="text-emerald-600" />
              <span>Google Sheets Sync</span>
            </h4>
            
            {!googleUser ? (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 leading-normal">
                  Connect your real Google Account to save leads directly to sheets.
                </p>
                <button
                  id="connect-google-btn"
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  <span>Connect Sheets</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-100">
                  {googleUser.photoURL ? (
                    <img
                      src={googleUser.photoURL}
                      alt="Avatar"
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full border border-slate-200"
                    />
                  ) : (
                    <div className="w-7 h-7 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                      {googleUser.displayName?.charAt(0) || googleUser.email?.charAt(0) || 'G'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">
                      {googleUser.displayName || 'Connected User'}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate leading-none mt-0.5">
                      {googleUser.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    id="export-to-google-sheets-sidebar-btn"
                    onClick={handleExportToSheets}
                    disabled={isExportingToSheets || leads.length === 0}
                    className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center space-x-1 shadow-sm shadow-emerald-50 cursor-pointer"
                  >
                    {isExportingToSheets ? (
                      <RefreshCw size={11} className="animate-spin text-white" />
                    ) : (
                      <Check size={11} />
                    )}
                    <span>Sync to Sheets</span>
                  </button>
                  
                  <button
                    id="disconnect-google-btn"
                    onClick={handleGoogleLogout}
                    className={`py-1.5 px-2 border rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                      isDarkMode ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1"></div>

          {/* Rate status / documentation snippet info */}
          <div className={`p-4 rounded-2xl border space-y-3 font-sans transition-all duration-300 ${
            isDarkMode ? 'bg-slate-950/45 border-slate-800/85' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className={`text-xs font-bold flex items-center space-x-1.5 ${isDarkMode ? 'text-slate-350' : 'text-slate-700'}`}>
              <Shield size={12} className="text-indigo-600" />
              <span>Anti-Block Checklist</span>
            </h4>
            <ul className={`text-[11px] space-y-2 list-disc list-inside leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <li>Automatic random User-Agent header rotation</li>
              <li>Calculated sleep margins (1.5s - 4.0s jitter delays)</li>
              <li>Contact relative hyperlink index lookup scan</li>
            </ul>
          </div>
        </aside>

        {/* WORKSPACE CONTENT AREA */}
        <main className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50'}`}>
          
          {/* TOP HEADER CONTROLS */}
          <header className={`h-16 border-b flex items-center justify-between px-8 shrink-0 font-sans transition-all duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex space-x-6 text-sm font-semibold">
              <button
                id="tab-data-trigger"
                onClick={() => setActiveTab('data')}
                className={`py-5 transition-all cursor-pointer relative ${
                  activeTab === 'data' 
                    ? 'border-b-2 border-indigo-500 text-indigo-500 font-bold' 
                    : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600')
                }`}
              >
                Results Data
              </button>
              <button
                id="tab-guides-trigger"
                onClick={() => setActiveTab('guides')}
                className={`py-5 transition-all cursor-pointer relative flex items-center space-x-1.5 ${
                  activeTab === 'guides' 
                    ? 'border-b-2 border-indigo-500 text-indigo-500 font-bold' 
                    : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600')
                }`}
              >
                <Code size={14} />
                <span>Node.js / PHP Scripts</span>
              </button>
              <button
                id="tab-logs-trigger"
                onClick={() => setActiveTab('logs')}
                className={`py-5 transition-all cursor-pointer relative flex items-center space-x-1.5 ${
                  activeTab === 'logs' 
                    ? 'border-b-2 border-indigo-500 text-indigo-500 font-bold' 
                    : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600')
                }`}
              >
                <Terminal size={14} />
                <span>Execution Logs ({logs.length})</span>
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <div className={`flex items-center text-xs font-semibold py-1.5 px-3 rounded-full transition-all duration-300 ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
                <span className={`status-pulse mr-2 ${isScraping ? 'bg-amber-400 text-amber-400' : 'bg-emerald-500'}`}></span>
                <span>{isScraping ? 'Crawl Processing...' : 'Engine Ready'}</span>
              </div>
              
              <button
                id="dark-mode-toggle"
                onClick={() => setIsDarkMode(!isDarkMode)}
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                className={`p-2 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                  isDarkMode 
                    ? 'bg-slate-800 border-slate-700 text-amber-400 hover:text-amber-300' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>

              <button
                id="export-csv-btn"
                onClick={downloadCsv}
                className={`px-3 py-1.5 border hover:bg-slate-50 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 cursor-pointer ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Download size={12} />
                <span>CSV</span>
              </button>

              {googleToken ? (
                <button
                  id="export-sheets-header-btn"
                  onClick={handleExportToSheets}
                  disabled={isExportingToSheets || leads.length === 0}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold hover:shadow-md transition-all flex items-center space-x-1.5 shadow-sm shadow-emerald-100 cursor-pointer"
                >
                  <Globe size={13} />
                  <span>{isExportingToSheets ? 'Saving...' : 'Sync Google Sheet'}</span>
                </button>
              ) : (
                <button
                  id="connect-sheets-header-btn"
                  onClick={handleGoogleLogin}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer ${
                    isDarkMode ? 'bg-indigo-600 hover:bg-indigo-505 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 48 48">
                    <path fill="#fff" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#fff" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#fff" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#fff" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  <span>Connect Sheets</span>
                </button>
              )}
            </div>
          </header>

          {/* DYNAMIC SCENARIO PANEL */}
          <section className="p-8 flex-1 flex flex-col space-y-6 overflow-y-auto">
            
            {/* 3 Metric cards for live tracking statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-sans">
              <div id="stat-card-leads" className={`p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all flex items-center justify-between duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div>
                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-sans">Total Leads Gathered</div>
                  <div className={`text-2xl font-black mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{totalLeadsCount}</div>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isDarkMode ? 'bg-indigo-950/40 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                  <Database size={18} />
                </div>
              </div>

              <div id="stat-card-emails" className={`p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all flex items-center justify-between duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div>
                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-sans">Emails Scraped</div>
                  <div className={`text-2xl font-black mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{emailsFoundCount}</div>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isDarkMode ? 'bg-emerald-950/40 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                  <Mail size={18} />
                </div>
              </div>

              <div id="stat-card-rate" className={`p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all flex items-center justify-between duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div>
                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-sans">Scraper Precision</div>
                  <div className="text-2xl font-black text-emerald-500 mt-1">{successRate}%</div>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isDarkMode ? 'bg-emerald-950/40 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                  <CheckCircle2 size={18} />
                </div>
              </div>
            </div>

            {exportedSheetUrl && (
              <div id="google-sheet-success-banner" className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-sans shadow-sm">
                <div className="flex items-start sm:items-center space-x-3 text-left">
                  <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 shrink-0">
                    <Globe size={18} />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">Direct Google Account Excel Sheets Saved!</h5>
                    <p className="text-[11px] text-emerald-700 mt-0.5">Scraped lead columns synced cleanly. Click the button to inspect the Google spreadsheet.</p>
                  </div>
                </div>
                <a
                  href={exportedSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1 cursor-pointer shrink-0"
                >
                  <span>Open Google Sheet</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}

            {/* TAB CONTENT: TAB 1 (Results and leads spreadsheet with dynamic filters) */}
            {activeTab === 'data' && (
              <div className={`flex-1 rounded-2xl border shadow-sm overflow-hidden flex flex-col min-h-[350px] transition-all duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                {/* Embedded toolbar inside spreadsheets */}
                <div className={`px-6 py-4 border-b flex flex-col sm:flex-row items-center justify-between gap-3 font-sans transition-all duration-300 ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div>
                    <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Leads Database</h3>
                    <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Live matched entries in target {area}</p>
                  </div>
                  
                  <div className="relative w-full sm:w-64">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search size={14} className="text-slate-400" />
                    </span>
                    <input
                      id="data-search-filter"
                      type="text"
                      placeholder="Keyword filter..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full pl-9 pr-4 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all duration-300 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600' : 'bg-white border-slate-200 text-slate-805'}`}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse table-fixed min-w-[700px] font-sans">
                    <thead className={`text-[10px] font-bold uppercase tracking-wider border-b transition-all duration-300 ${isDarkMode ? 'bg-slate-950/60 text-slate-400 border-slate-805' : 'bg-slate-50 text-slate-400 border-slate-200'} h-10`}>
                      <tr>
                        <th className="pl-6 w-1/4">Business Name</th>
                        <th className="w-1/4">Location Address</th>
                        <th className="w-1/6">Phone Number</th>
                        <th className="w-1/5">Digital Socials & Support Email</th>
                        <th className="pr-6 text-right w-1/12">Pipeline</th>
                      </tr>
                    </thead>
                    <tbody className={`text-[12px] divide-y transition-all duration-300 ${isDarkMode ? 'text-slate-300 divide-slate-800' : 'text-slate-600 divide-slate-100'}`}>
                      {isScraping && filteredLeads.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center space-y-3">
                              <RefreshCw size={24} className="animate-spin text-slate-400" />
                              <p className={`font-medium italic ${isDarkMode ? 'text-slate-400' : 'text-slate-505'}`}>Executing live socket crawling loops on target website directories...</p>
                            </div>
                          </td>
                        </tr>
                      )}
                      
                      {!isScraping && filteredLeads.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-12 px-6">
                            <div className="max-w-md mx-auto py-4 text-center">
                              <Database size={32} className={`mx-auto mb-2 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                              <p className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-705'}`}>No active leads match the query filter.</p>
                              <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Change target inputs on the left side configuration list and click 'Initialize Extraction' to harvest B2B candidates.</p>
                            </div>
                          </td>
                        </tr>
                      )}

                      {filteredLeads.map((lead) => (
                        <tr key={lead.id} className={`transition-colors group border-b last:border-0 ${isDarkMode ? 'hover:bg-slate-800/40 border-slate-800/50' : 'hover:bg-slate-50 border-slate-100'}`}>
                          <td className={`pl-6 py-4 font-semibold align-top ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            <div className="flex flex-col">
                              <span>{lead.name}</span>
                              {lead.website && lead.website !== 'N/A' ? (
                                <a
                                  href={lead.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`text-[11px] hover:underline mt-1 inline-flex items-center space-x-1 ${isDarkMode ? 'text-indigo-450' : 'text-indigo-600'}`}
                                >
                                  <span>{lead.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                                  <ExternalLink size={10} />
                                </a>
                              ) : (
                                <span className="text-[11px] text-slate-500 mt-1 italic">No website located</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 pr-3 align-top leading-relaxed text-xs">
                            <span className={`block font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-705'}`}>{lead.address}</span>
                          </td>
                          <td className={`py-4 font-mono align-top text-xs ${isDarkMode ? 'text-slate-350' : 'text-slate-650'}`}>
                            {lead.phone && lead.phone !== 'N/A' ? (
                              <span className="flex items-center space-x-1">
                                <Phone size={10} className="text-slate-400" />
                                <span>{lead.phone}</span>
                              </span>
                            ) : (
                              <span className="text-slate-500 italic">No phone line found</span>
                            )}
                          </td>
                          <td className="py-4 pr-3 align-top text-xs space-y-1.5">
                            {/* Public Email address extracted */}
                            <div className="flex items-center space-x-1.5">
                              <Mail size={11} className={`${lead.email && lead.email !== 'N/A' ? 'text-indigo-500' : 'text-slate-500'}`} />
                              {lead.email && lead.email !== 'N/A' ? (
                                <span className={`px-1.5 py-0.5 rounded font-mono text-[11px] font-medium border ${isDarkMode ? 'bg-indigo-950/40 text-indigo-300 border-indigo-900' : 'bg-indigo-50/50 text-indigo-705 border-indigo-100'}`}>
                                  {lead.email}
                                </span>
                              ) : (
                                <span className="text-slate-500 italic font-mono text-[11px]">N/A</span>
                              )}
                            </div>

                            {/* Public Facebook page extracted */}
                            <div className="flex items-center space-x-1.5">
                              <Facebook size={11} className={`${lead.facebook && lead.facebook !== 'N/A' ? 'text-indigo-400' : 'text-slate-500'}`} />
                              {lead.facebook && lead.facebook !== 'N/A' ? (
                                <a
                                  href={lead.facebook}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`text-[11px] hover:underline font-medium truncate max-w-[200px] ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}
                                >
                                  Facebook Page
                                </a>
                              ) : (
                                <span className="text-slate-500 italic text-[11px]">No page found</span>
                              )}
                            </div>

                            {/* Crawl justification */}
                            <p className="text-[10px] text-slate-450 italic pt-1 leading-normal max-w-sm">
                              {lead.notes}
                            </p>
                          </td>
                          <td className="pr-6 py-4 text-right align-top">
                            <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full tracking-wide ${isDarkMode ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-900' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                              {lead.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: TAB 2 (Interactive clean guide for complete offline codes requested) */}
            {activeTab === 'guides' && (
              <div className={`rounded-2xl border shadow-sm flex flex-col overflow-hidden min-h-[500px] transition-all duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                
                {/* Tab selector for node, php, places, validation and proxies */}
                <div className={`px-6 py-4 border-b flex flex-col md:flex-row items-center justify-between gap-4 font-sans transition-all duration-300 ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div>
                    <h3 className={`font-extrabold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Modular Scripts & Execution Companion</h3>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-505'}`}>Deploy these custom files locally to scrape millions of leads programmatically.</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    <button
                      id="guide-node-tab"
                      onClick={() => setActiveGuide('node')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeGuide === 'node' 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : (isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200/50')
                      }`}
                    >
                      Node.js Script
                    </button>
                    <button
                      id="guide-php-tab"
                      onClick={() => setActiveGuide('php')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeGuide === 'php' 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : (isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200/50')
                      }`}
                    >
                      PHP Script
                    </button>
                    <button
                      id="guide-places-tab"
                      onClick={() => setActiveGuide('places')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeGuide === 'places' 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : (isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200/50')
                      }`}
                    >
                      Places API Integration
                    </button>
                    <button
                      id="guide-proxies-tab"
                      onClick={() => setActiveGuide('proxies')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeGuide === 'proxies' 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : (isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200/50')
                      }`}
                    >
                      Proxies & Rate Limits
                    </button>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col overflow-hidden">
                  
                  {activeGuide === 'node' && (
                    <div className="space-y-4 flex-1 flex flex-col">
                      <div className={`p-4 rounded-xl space-y-1 text-xs font-sans border ${isDarkMode ? 'bg-indigo-950/20 border-indigo-900/40 text-indigo-300' : 'bg-indigo-50 border-indigo-100 text-indigo-900'}`}>
                        <h4 className="font-black flex items-center space-x-1.5">
                          <Bookmark size={13} />
                          <span>Node.js Scraping Engine Workflow</span>
                        </h4>
                        <p className={isDarkMode ? 'text-indigo-400' : 'text-indigo-700'}>Uses <strong>Puppeteer</strong> for automated browser search simulation, and <strong>Cheerio</strong> + <strong>Axios</strong> for high-speed contact index URL extraction. Completely avoids maps API pricing.</p>
                      </div>

                      {/* Header with copy option */}
                      <div className="flex justify-between items-center bg-slate-950 px-4 py-2 text-xs font-mono text-slate-300 rounded-t-xl mb-[-16px]">
                        <span>lead_generator.js</span>
                        <button
                          id="copy-node-script-btn"
                          onClick={() => triggerCopy(SCRIPTS_DATA.nodeScript)}
                          className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 bg-slate-800 px-2.5 py-1 rounded transition-colors text-[11px] cursor-pointer"
                        >
                          <Copy size={11} />
                          <span>{copiedText ? 'Copied!' : 'Copy Code'}</span>
                        </button>
                      </div>
                      
                      <pre className="p-4 bg-slate-950 text-slate-200 rounded-b-xl overflow-auto text-xs font-mono max-h-[400px] leading-relaxed custom-scrollbar flex-1 whitespace-pre-wrap">
                        {SCRIPTS_DATA.nodeScript}
                      </pre>

                      <div className={`text-xs p-4 rounded-xl space-y-2 font-sans border ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-750'}`}>
                        <strong className={`text-xs ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>🚀 Step-by-Step Local Deployment (Node.js):</strong>
                        <ol className={`list-decimal list-inside space-y-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          <li>Install <a href="https://nodejs.org/" target="_blank" rel="noopener" className="text-blue-600 hover:underline">Node.js LTS</a> on your PC.</li>
                          <li>Create a new directory and save the script file as <code>lead_generator.js</code>.</li>
                          <li>Open your terminal/command prompt inside that directory and install packages: <code>npm install puppeteer cheerio csv-writer axios</code></li>
                          <li>Run the execution sequence: <code>node lead_generator.js</code></li>
                          <li>Your final output logs and extracted targets will be exported immediately in <code>leads_output.csv</code>.</li>
                        </ol>
                      </div>
                    </div>
                  )}

                  {activeGuide === 'php' && (
                    <div className="space-y-4 flex-1 flex flex-col">
                      <div className={`p-4 rounded-xl space-y-1 text-xs font-sans border ${isDarkMode ? 'bg-sky-950/20 border-sky-900/40 text-sky-305' : 'bg-sky-50 border-sky-100 text-sky-900'}`}>
                        <h4 className="font-bold flex items-center space-x-1.5">
                          <Bookmark size={13} />
                          <span>PHP B2B Scraper Companion</span>
                        </h4>
                        <p className={isDarkMode ? 'text-sky-400' : 'text-sky-700'}>Engineered with <strong>GuzzleHTTP</strong> (for concurrent network connections) and <strong>Symfony DomCrawler</strong> (for fast regex pattern scanning of social tags). Fully modular and object-oriented.</p>
                      </div>

                      {/* Code Block Header */}
                      <div className="flex justify-between items-center bg-slate-950 px-4 py-2 text-xs font-mono text-slate-300 rounded-t-xl mb-[-16px]">
                        <span>lead_generator.php</span>
                        <button
                          id="copy-php-script-btn"
                          onClick={() => triggerCopy(SCRIPTS_DATA.phpScript)}
                          className="flex items-center space-x-1 text-sky-400 hover:text-sky-300 bg-slate-800 px-2.5 py-1 rounded transition-colors text-[11px] cursor-pointer"
                        >
                          <Copy size={11} />
                          <span>{copiedText ? 'Copied!' : 'Copy Code'}</span>
                        </button>
                      </div>

                      <pre className="p-4 bg-slate-950 text-slate-200 rounded-b-xl overflow-auto text-xs font-mono max-h-[400px] leading-relaxed custom-scrollbar flex-1 whitespace-pre-wrap">
                        {SCRIPTS_DATA.phpScript}
                      </pre>

                      <div className={`text-xs p-4 rounded-xl space-y-2 font-sans border ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-750'}`}>
                        <strong className={`text-xs ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>🐘 Step-by-Step Local Deployment (PHP):</strong>
                        <ol className={`list-decimal list-inside space-y-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          <li>Make sure PHP (&ge; 7.4) is installed. Ensure <code>php -v</code> functions on your terminal.</li>
                          <li>Download <a href="https://getcomposer.org" target="_blank" rel="noopener" className="text-blue-600 hover:underline">Composer dependency manager</a>.</li>
                          <li>Run Composer client downloader inside your directory: <code>composer require guzzlehttp/guzzle symfony/dom-crawler</code></li>
                          <li>Paste the parsed script above in a file called <code>lead_generator.php</code>.</li>
                          <li>Execute the PHP scraping automation logic: <code>php lead_generator.php</code></li>
                          <li>Open the newly structured spreadsheet <code>leads_output.csv</code> inside MS Excel or Google Sheets.</li>
                        </ol>
                      </div>
                    </div>
                  )}

                  {activeGuide === 'places' && (
                    <div className="space-y-4 flex-1 overflow-y-auto">
                      <div className={`p-4 rounded-xl space-y-1 text-xs font-sans border ${isDarkMode ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-305' : 'bg-emerald-50 border-emerald-100 text-emerald-900'}`}>
                        <h4 className="font-bold flex items-center space-x-1.5">
                          <CheckCircle2 size={13} className="text-emerald-500" />
                          <span>Google Places API Integration (Formal Way)</span>
                        </h4>
                        <p className={isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}>Google Places API eliminates manual HTML search parsing. The API remains extremely stable, and because of monthly free credits, is virtually free for light local usage!</p>
                      </div>

                      <div className="prose prose-slate max-w-none text-xs font-sans leading-relaxed text-slate-600 space-y-4">
                        <div className="bg-slate-950 p-4 rounded-xl text-slate-200 font-mono">
                          {SCRIPTS_DATA.placesApiGuide}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeGuide === 'proxies' && (
                    <div className="space-y-4 flex-1 overflow-y-auto font-sans text-xs">
                      <div className={`p-4 rounded-xl space-y-1 border ${isDarkMode ? 'bg-amber-955/20 border-amber-900/40 text-amber-305' : 'bg-amber-50 border-amber-100 text-amber-900'}`}>
                        <h4 className="font-bold flex items-center space-x-1.5">
                          <Info size={13} className="text-amber-500" />
                          <span>Rate Limits, Blocks and Captcha Bypassing</span>
                        </h4>
                        <p className={isDarkMode ? 'text-amber-400/90' : 'text-amber-700'}>Web scraper validation requires elegant throttle timings. Review these guidelines to keep your server IPs pristine and avoid blocks.</p>
                      </div>

                      <div className="bg-slate-950 p-5 rounded-xl font-mono text-slate-200 leading-relaxed">
                        {SCRIPTS_DATA.proxiesGuide}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* TAB CONTENT: TAB 3 (Raw Terminal logs outputs) */}
            {activeTab === 'logs' && (
              <div className="flex-1 terminal-bg rounded-2xl p-5 font-mono text-[11px] text-slate-200 overflow-hidden flex flex-col h-[400px]">
                <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-700">
                  <div className="flex items-center space-x-2 text-slate-400 font-sans font-bold uppercase tracking-wider text-xs">
                    <Terminal size={14} className="text-indigo-400 animate-pulse" />
                    <span>Live Crawler Shell & Target Pipeline Monitoring</span>
                  </div>
                  <button
                    id="clear-logs-btn"
                    onClick={() => setLogs([])}
                    className="text-[10px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition-colors font-sans"
                  >
                    Clear Terminal
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-2 leading-relaxed h-[300px]">
                  {logs.map((log, index) => (
                    <div key={index} className="flex space-x-2">
                      <span className="text-slate-500 font-sans">[{log.timestamp}]</span>
                      <span className={`font-semibold shrink-0 uppercase tracking-wide text-[10px] sm:text-[11px] ${
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'warn' ? 'text-amber-400' :
                        log.type === 'success' ? 'text-emerald-400 font-bold' :
                        'text-indigo-400'
                      }`}>
                        [{log.type.toUpperCase()}]
                      </span>
                      <span className="text-slate-300 break-all">{log.message}</span>
                    </div>
                  ))}
                  {isScraping && (
                    <div className="flex items-center space-x-2 text-indigo-400 animate-pulse mt-3">
                      <span>_</span>
                      <span className="text-slate-400 font-sans text-[10px]">Awaiting subsequent HTTP callback...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

          </section>

          {/* LOWER RUNTIME LOG PANEL FOR VISUAL FEEDBACK */}
          {activeTab !== 'logs' && (
            <footer className={`h-44 mx-8 mb-8 rounded-2xl p-4 font-mono text-[11px] text-slate-300 overflow-hidden border flex flex-col justify-between transition-all duration-300 ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-900 border-slate-950/20'
            }`}>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-500 font-sans font-bold uppercase tracking-wider">Real-time Execution Stream log</span>
                <span className="flex items-center text-emerald-500">
                  <span className="status-pulse mr-1.5"></span>
                  Online
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 my-2 opacity-80 custom-scrollbar text-[11px]">
                {logs.slice(-5).map((log, idx) => (
                  <p key={idx}>
                    <span className="text-slate-500">[{log.timestamp}]</span>{' '}
                    <span className={
                      log.type === 'error' ? 'text-red-400' :
                      log.type === 'warn' ? 'text-amber-400' :
                      log.type === 'success' ? 'text-emerald-400' :
                      'text-indigo-400'
                    }>
                      {log.type.toUpperCase()}
                    </span>{' '}
                    {log.message}
                  </p>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 font-sans text-center">
                Configure your search terms on the sidebar and initiate extraction loops directly inside this window.
              </p>
            </footer>
          )}

        </main>
      </div>
    </div>
  );
}
