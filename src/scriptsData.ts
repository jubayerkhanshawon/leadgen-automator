export interface GuideContent {
  nodeScript: string;
  phpScript: string;
  placesApiGuide: string;
  proxiesGuide: string;
}

export const SCRIPTS_DATA: GuideContent = {
  nodeScript: `/**
 * B2B Lead Generation Scraper Tool (Node.js)
 * 
 * Dependencies to install before running:
 * npm install puppeteer cheerio csv-writer axios dotenv
 * 
 * Run with:
 * node lead_generator.js
 */

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');

// --- Configuration ---
const GEOGRAPHIC_AREA = "Dhanmondi, Dhaka";
const BUSINESS_CATEGORY = "Restaurants";
const OUTPUT_FILE = "leads_output.csv";

// Regex patterns
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/g;
const FACEBOOK_REGEX = /https?:\\/\\/(www\\.)?facebook\\.com\\/[a-zA-Z0-9._%-]+/i;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Step 1: Scrape Google Maps / Google Search results directly
 * (Direct Map Scraper Workaround - No API Key Needed)
 */
async function scrapeGoogleMaps(area, category) {
  console.log(\`[INFO] Launching Puppeteer to search for: "\${category} in \${area}"\`);
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled' // Bypass basic bot checks
    ]
  });

  const page = await browser.newPage();
  
  // Set realistic viewport and user agent
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

  // Search query format: https://www.google.com/maps/search/Restaurants+Dhanmondi+Dhaka
  const query = encodeURIComponent(\`\${category} \${area}\`);
  const searchUrl = \`https://www.google.com/maps/search/\${query}\`;
  
  await page.goto(searchUrl, { waitUntil: 'networkidle2' });
  console.log('[INFO] Loaded Google Maps. Scrolling results container to lazy-load leads...');

  // Target the Google Maps results sidebar/container with a scroll-down loop
  let listSelector = '.m6QErb[aria-label^="Results for"]';
  
  // Let's scroll the results list pane several times to load more items
  try {
    await page.evaluate(async () => {
      // Find the scrollable container in Google Maps sidebar
      const container = document.querySelector('div[role="feed"]') || document.querySelector('.m6QErb');
      if (container) {
        for (let i = 0; i < 5; i++) {
          container.scrollBy(0, 1000);
          await new Promise(r => setTimeout(r, 1200)); // Sleep between scrolls
        }
      }
    });
  } catch (err) {
    console.log('[WARN] Scrolling pane failed. Switched to immediate parsing.');
  }

  // Parse HTML
  const html = await page.content();
  const $ = cheerio.load(html);
  const leads = [];

  // Search for business links/cards in Google Maps results page
  // Each result generally sits within a clear wrapper (e.g., class '.Nv2yUd' or '.UaTe6')
  const cards = $('div[role="article"]');
  console.log(\`[INFO] Identified \${cards.length} potential business listings.\`);

  cards.each((index, element) => {
    try {
      const name = $(element).find('.qBF1Pd').text().trim();
      
      // Extract details. Text details are often inside span/div elements nested below the card
      // In Maps, buttons/links with addresses or telephone selectors are present
      // Phone numbers usually start with + or have numbers, addresses match location patterns
      let phone = "N/A";
      let address = "N/A";
      let website = "N/A";

      // Look for a website link in the article card
      const websiteLink = $(element).find('a[data-item-id="authority"]').attr('href');
      if (websiteLink) {
        website = websiteLink;
      }

      // Read secondary lines to parse address & phone (Google Maps changes classes, so we check text values)
      $(element).find('.W4E75c').each((i, subEl) => {
        const text = $(subEl).text().trim();
        if (text) {
          if (text.includes("+88") || text.match(/^[+0-9\\s-]{8,15}$/)) {
            phone = text;
          } else if (text.length > 10 && !text.includes("Open") && !text.includes("Closed")) {
            address = text;
          }
        }
      });

      // Quick backup for address
      if (address === "N/A") {
        // Try fallback selectors
        address = $(element).find('.StyledMq9be').first().text().trim() || area;
      }

      if (name) {
        leads.push({
          name,
          address: address || "N/A",
          phone: phone || "N/A",
          website: website || "N/A",
          facebook: "N/A",
          email: "N/A"
        });
      }
    } catch (err) {
      console.log('[ERROR] Failed parsing card item: ', err.message);
    }
  });

  await browser.close();
  return leads;
}

/**
 * Step 2 & 3: Crawl the business website for Facebook Page and Email
 * Contact pages are crawled first.
 */
async function scrapeSocialsAndEmail(websiteUrl) {
  if (!websiteUrl || websiteUrl === "N/A" || !websiteUrl.startsWith("http")) {
    return { facebook: "N/A", email: "N/A" };
  }

  console.log(\`[CRAWLER] Querying website: \${websiteUrl}\`);
  let facebook = "N/A";
  let email = "N/A";

  try {
    // 1. Fetch homepage
    const response = await axios.get(websiteUrl, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebkit/537.36'
      }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);

    // Extract Facebook Link
    facebook = findFacebookLink($);

    // Extract Email from frontpage
    email = findEmailInHtml(html);

    // 2. Scan for Contact / About Us page links to crawl deeper
    if (email === "N/A" || facebook === "N/A") {
      const contactPageUrl = findContactPageUrl($, websiteUrl);
      if (contactPageUrl) {
        console.log(\`[CRAWLER] Found potential contact page: \${contactPageUrl}. Deep scanning...\`);
        await sleep(1500); // Friendly pause

        const contactResult = await axios.get(contactPageUrl, {
          timeout: 6000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        const contactHtml = contactResult.data;
        const $contact = cheerio.load(contactHtml);

        if (facebook === "N/A") {
          facebook = findFacebookLink($contact);
        }
        if (email === "N/A") {
          email = findEmailInHtml(contactHtml);
        }
      }
    }
  } catch (err) {
    console.log(\`[CRAWLER WARNING] Error accessing \${websiteUrl}: \${err.message}\`);
  }

  return { facebook, email };
}

// Helpers
function findFacebookLink($) {
  let matchedUrl = "N/A";
  $('a').each((i, linkEl) => {
    const href = $(linkEl).attr('href');
    if (href && href.match(FACEBOOK_REGEX)) {
      matchedUrl = href;
    }
  });
  return matchedUrl;
}

function findEmailInHtml(html) {
  const matches = html.match(EMAIL_REGEX);
  if (matches && matches.length > 0) {
    // Basic filter to ignore static image extensions matching emails, e.g. .svg
    const validEmails = matches.filter(e => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.gif') && !e.endsWith('.svg'));
    return validEmails.length > 0 ? validEmails[0] : "N/A";
  }
  return "N/A";
}

function findContactPageUrl($, baseUrl) {
  let contactUrl = null;
  $('a').each((i, el) => {
    const text = $(el).text().toLowerCase();
    const href = $(el).attr('href');

    if (href && (text.includes('contact') || text.includes('about') || text.includes('support') || text.includes('reach'))) {
      if (href.startsWith('http')) {
        contactUrl = href;
      } else {
        // Resolve absolute/relative paths
        const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const normalizedHref = href.startsWith('/') ? href : '/' + href;
        contactUrl = base + normalizedHref;
      }
    }
  });
  return contactUrl;
}

/**
 * Main Controller Workflow
 */
async function run() {
  console.log(\`=========================================================
🚀 B2B LEAD GENERATION AUTOMATION STARTED
Target: \${BUSINESS_CATEGORY} in \${GEOGRAPHIC_AREA}
=========================================================\`);

  // Step 1: Get Initial Listings from Maps Scraper
  const baseLeads = await scrapeGoogleMaps(GEOGRAPHIC_AREA, BUSINESS_CATEGORY);
  
  if (baseLeads.length === 0) {
    console.log("[ERROR] No lead list entries fetched. Change parameters or check network.");
    return;
  }

  console.log(\`\\n[SUCCESS] Retrieved \${baseLeads.length} initial B2B business candidates. Starting web crawlers for social links & email detail enrichment...\\n\`);

  // Step 2-3: Enrich Social Links and Mail data parameters
  const finalLeads = [];
  for (let i = 0; i < baseLeads.length; i++) {
    const lead = baseLeads[i];
    console.log(\`[\${i + 1}/\${baseLeads.length}] Enriching data for: "\${lead.name}"...\`);
    
    const enrichment = await scrapeSocialsAndEmail(lead.website);
    
    finalLeads.push({
      ...lead,
      facebook: enrichment.facebook,
      email: enrichment.email
    });

    // Polite delay rate safety
    await sleep(2000);
  }

  // Step 4: Output to target CSV File
  console.log(\`\\n[INFO] Saving leads to CSV file: \${OUTPUT_FILE}\`);
  const csvWriter = createCsvWriter({
    path: OUTPUT_FILE,
    header: [
      { id: 'name', title: 'Business Name' },
      { id: 'address', title: 'Full Address' },
      { id: 'phone', title: 'Phone Number' },
      { id: 'website', title: 'Website URL' },
      { id: 'facebook', title: 'Facebook Page' },
      { id: 'email', title: 'Public Email' },
    ]
  });

  await csvWriter.writeRecords(finalLeads);
  console.log(\`\\n=========================================================
🎉 SUCCESS: \${finalLeads.length} B2B leads generated successfully!
File saved at: \${OUTPUT_FILE}
=========================================================\`);
}

run();`,
  phpScript: `<?php
/**
 * B2B Lead Generation Scraper Tool (PHP)
 * 
 * Requirements:
 * - PHP >= 7.4
 * - Composer Dependencies: GuzzleHTTP for requests, symfony/dom-crawler
 * 
 * Install packages:
 * composer require guzzlehttp/guzzle symfony/dom-crawler
 * 
 * Run with:
 * php lead_generator.php
 */

require 'vendor/autoload.php';

use GuzzleHttp\\Client;
use Symfony\\Component\\DomCrawler\\Crawler;

// --- Configuration ---
define('GEOGRAPHIC_AREA', 'Dhanmondi, Dhaka');
define('BUSINESS_CATEGORY', 'Restaurants');
define('OUTPUT_FILE', 'leads_output.csv');

class B2BLeadGenerator {
    private $client;
    
    public function __construct() {
        // Initialize Guzzle HTTP client with headers
        $this->client = new Client([
            'headers' => [
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            ],
            'timeout'  => 8.0,
            'http_errors' => false // Disable throwing exceptions on 4xx/5xx responses
        ]);
    }

    /**
     * Option A: Grab business candidates via Google Places API (or custom parser)
     */
    public function getLeadsFromPlaces($area, $category) {
        echo "[INFO] Searching for B2B targets: '$category in $area'\\n";
        
        // This is a direct extraction of search results or simulation list of Maps
        // In local setups, you can connect Google Places API endpoint or scrape via APIs like Outscraper/SerpAPI
        // Let's model a mock extraction or simulated map scraper payload for demonstration
        $query = urlencode("$category $area");
        
        // If you have SerpAPI or direct scraper token:
        // $url = "https://serpapi.com/search?engine=google_maps&q={$query}&api_key=YOUR_API_KEY";
        
        // Let's simulate target local businesses found:
        return [
            [
                'name' => 'The Garlic Dipper Dhanmondi',
                'address' => 'House 45, Road 27, Dhanmondi, Dhaka',
                'phone' => '+88029112345',
                'website' => 'https://garlicdipper.example.com',
            ],
            [
                'name' => 'Cafe Rio Dhanmondi',
                'address' => 'Zigatola Crossing, Dhanmondi, Dhaka',
                'phone' => '+8801711223344',
                'website' => 'https://caferio.example.com',
            ],
            [
                'name' => 'Chillox Dhanmondi',
                'address' => 'Rangs Fortune Square, Dhanmondi 2A, Dhaka',
                'phone' => '+8801900001122',
                'website' => 'https://chillox.example.com',
            ]
        ];
    }

    /**
     * Crawls a business website for Facebook link and Email Address
     */
    public function enrichLeadDetails($website) {
        $details = ['facebook' => 'N/A', 'email' => 'N/A'];
        
        if (empty($website) || $website === 'N/A' || !filter_var($website, FILTER_VALIDATE_URL)) {
            return $details;
        }

        echo "[CRAWLER] Scanning website: $website\\n";
        
        try {
            // 1. Fetch Homepage
            $response = $this->client->get($website);
            $html = (string) $response->getBody();
            
            $crawler = new Crawler($html);
            
            // Extract Facebook Link
            $details['facebook'] = $this->findFacebookLink($crawler);
            
            // Extract Email
            $details['email'] = $this->findEmailInText($html);
            
            // 2. If details are missing, hunt for Contact page and scan deeper
            if ($details['email'] === 'N/A' || $details['facebook'] === 'N/A') {
                $contactUrl = $this->findContactPageUrl($crawler, $website);
                
                if ($contactUrl) {
                    echo "[CRAWLER] Contact page found: $contactUrl. Fetching data...\\n";
                    usleep(1000000); // Strict 1-second delay rate limit
                    
                    $contactResponse = $this->client->get($contactUrl);
                    $contactHtml = (string) $contactResponse->getBody();
                    $contactCrawler = new Crawler($contactHtml);
                    
                    if ($details['facebook'] === 'N/A') {
                        $details['facebook'] = $this->findFacebookLink($contactCrawler);
                    }
                    if ($details['email'] === 'N/A') {
                        $details['email'] = $this->findEmailInText($contactHtml);
                    }
                }
            }
        } catch (\\Exception $e) {
            echo "[CRAWLER WARNING] Connection failed to $website: " . $e->getMessage() . "\\n";
        }

        return $details;
    }

    private function findFacebookLink(Crawler $crawler) {
        $fbUrl = 'N/A';
        $crawler->filter('a')->each(function (Crawler $node) use (&$fbUrl) {
            $href = $node->attr('href');
            if ($href && preg_match('/https?:\\/\\/(www\\.)?facebook\\.com\\/[a-zA-Z0-9._%-]+/i', $href)) {
                $fbUrl = $href;
            }
        });
        return $fbUrl;
    }

    private function findEmailInText($text) {
        if (preg_match_all('/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/', $text, $matches)) {
            $validEmails = array_filter($matches[0], function($email) {
                // Ignore standard media formats false-positives
                return !preg_match('/\\.(png|jpg|jpeg|gif|svg|webp)$/i', $email);
            });
            
            if (!empty($validEmails)) {
                return reset($validEmails); // Return first matched email
            }
        }
        return 'N/A';
    }

    private function findContactPageUrl(Crawler $crawler, $baseUrl) {
        $contactUrl = null;
        $crawler->filter('a')->each(function (Crawler $node) use (&$contactUrl, $baseUrl) {
            $text = strtolower($node->text());
            $href = $node->attr('href');
            
            if ($href && (strpos($text, 'contact') !== false || strpos($text, 'about') !== false || strpos($text, 'reach') !== false)) {
                if (strpos($href, 'http') === 0) {
                    $contactUrl = $href;
                } else {
                    $base = rtrim($baseUrl, '/');
                    $href = ltrim($href, '/');
                    $contactUrl = "$base/$href";
                }
            }
        });
        return $contactUrl;
    }
}

// --- Main execution flow ---
$generator = new B2BLeadGenerator();

echo "=========================================================\\n";
echo "🚀 PHP B2B LEAD GENERATION AUTOMATION STARTED\\n";
echo "Target: " . BUSINESS_CATEGORY . " in " . GEOGRAPHIC_AREA . "\\n";
echo "=========================================================\\n\\n";

// Fetch initial candidates
$leads = $generator->getLeadsFromPlaces(GEOGRAPHIC_AREA, BUSINESS_CATEGORY);

// Enrich candidates
$enrichedLeads = [];
foreach ($leads as $index => $lead) {
    echo " [" . ($index + 1) . "/" . count($leads) . "] Enriching: " . $lead['name'] . "\\n";
    
    // Scrape socials and mail regex
    $enriched = $generator->enrichLeadDetails($lead['website']);
    
    $lead['facebook'] = $enriched['facebook'];
    $lead['email'] = $enriched['email'];
    
    $enrichedLeads[] = $lead;
    
    // Safe pause
    usleep(1500000); // 1.5s delay
}

// Write outputs to CSV
echo "\\n[INFO] Saving records output to CSV file...\\n";
$fp = fopen(OUTPUT_FILE, 'w');

// Insert columns header fields
fputcsv($fp, ['Business Name', 'Full Address', 'Phone Number', 'Website URL', 'Facebook Page', 'Public Email']);

foreach ($enrichedLeads as $row) {
    fputcsv($fp, [
        $row['name'],
        $row['address'],
        $row['phone'],
        $row['website'],
        $row['facebook'],
        $row['email']
    ]);
}

fclose($fp);

echo "=========================================================\\n";
echo "🎉 SUCCESS: Leads generated successfully!\\n";
echo "File created at: " . OUTPUT_FILE . "\\n";
echo "=========================================================\\n";`,
  placesApiGuide: `### Connecting Google Places API

If you want absolute data accuracy and compliance, you should replace direct scraping with the **Google Places API** (specifically the Places API New - Text Search or Nearby Search).

#### 1. Obtain a Google Maps Credentials Keys:
- Go to the [Google Cloud Console](https://console.cloud.google.com/).
- Create a project, navigate to **APIs & Services > Library**, enable the **Places API**.
- Go to **APIs & Services > Credentials** and generate an API key.

#### 2. Querying Code Pattern (Node.js):
Instead of raw scraping, hit Google's endpoint with the search query:

\`\`\`javascript
const axios = require('axios');

async function searchPlaces(category, area, apiKey) {
  const url = 'https://places.googleapis.com/v1/places:searchText';
  
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    // Specify output fields to save API cost credits
    'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri'
  };

  const body = {
    textQuery: \`\${category} in \${area}\`
  };

  try {
    const response = await axios.post(url, body, { headers });
    const places = response.data.places || [];
    
    return places.map(p => ({
      name: p.displayName?.text || 'N/A',
      address: p.formattedAddress || 'N/A',
      phone: p.nationalPhoneNumber || 'N/A',
      website: p.websiteUri || 'N/A',
      facebook: 'N/A',
      email: 'N/A'
    }));
  } catch (error) {
    console.error('Places API Error:', error.response?.data || error.message);
    return [];
  }
}
\`\`\`

#### 💸 Google's pricing model:
- Places Text Search costs **$0.032 per request** (under the advanced/basic tiers).
- Google provides **$200 in free credits monthly**, which equates to about **6,250 free searches per month**. For small-scale local tools, **this is effectively free!**`,
  proxiesGuide: `### Anti-Bot Detection & Rate Limit Policies

Scraping sites frequently gets IPs blacklisted or throttled with CAPTCHAs, particularly on major sources like Google Maps. Follow these crucial patterns to bypass blocks:

#### 1. Use Anti-Detect User Agents & Headers
Do not use default Guzzle or Axios headers. Standardize on Chrome/Firefox desktop headers and shuffle them.
\`\`\`javascript
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
];
\`\`\`

#### 2. Rotate Proxies (Residential Proxies are Best)
When scraping, use a proxy rotation service (e.g., Bright Data, Oxylabs, Webshare) to send each request through a different IP address.
- In Puppeteer, set proxy in launch: \`puppeteer.launch({ args: ['--proxy-server=http://proxy-host:port'] })\`.
- Handle rotating credentials with inline URL proxies: \`http://username:password@proxy-domain:port\`.

#### 3. Throttle Crawl Rates (Throttling)
Scraping 50 sites inside 1 second will flag your server instantly. Implement a random "jitter path" delay.
- Rest your runs for **1.5 to 4 seconds** between crawls.
- Randomize the interval: \`const sleepTime = 1500 + Math.random() * 2500;\`

#### 4. The Direct Workaround Option: Outscraper/Apify (Best for Maps)
Google Maps' HTML code changes almost monthly. Constructing custom selectors is a constant maintenance headache.
- Better alternative: Use dedicated scraping APIs like **Apify (Google Maps Scraper)** or **Outscraper**.
- They charge tiny fractions of a cent (e.g., **$3 for 1,000 businesses**), and handle all proxy rotations, IP shuffles, and layout changes under the hood.`
};
