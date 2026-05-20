import { Lead } from './types';

interface CreateSpreadsheetResponse {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

/**
 * Creates a new Google Spreadsheet and appends the lead records.
 * Returns the spreadsheet URL if successful.
 */
export async function exportLeadsToGoogleSheets(
  accessToken: string,
  category: string,
  area: string,
  leads: Lead[]
): Promise<string> {
  if (leads.length === 0) {
    throw new Error('No lead records found to export. Generate some leads first!');
  }

  // 1. Create Spreadsheet
  const createTitle = `B2B Leads - ${category} in ${area} (${new Date().toLocaleDateString()})`;
  const createResponse = await fetch('https://sheets.googleapis.com/v1/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: createTitle,
      },
    }),
  });

  if (!createResponse.ok) {
    const errText = await createResponse.text();
    console.error('Google Sheets Creation Error:', errText);
    throw new Error('Failed to create a new Google Sheet. Please make sure the app was approved with sheets permissions.');
  }

  const spreadsheetData: CreateSpreadsheetResponse = await createResponse.json();
  const { spreadsheetId, spreadsheetUrl } = spreadsheetData;

  // 2. Prepare payload values
  const headers = ['Business Name', 'Full Address', 'Phone Number', 'Website URL', 'Facebook Page', 'Public Email', 'Source Code Notes'];
  
  const leadRows = leads.map(lead => [
    lead.name || 'N/A',
    lead.address || 'N/A',
    lead.phone || 'N/A',
    lead.website || 'N/A',
    lead.facebook || 'N/A',
    lead.email || 'N/A',
    lead.notes || 'N/A'
  ]);

  const rawValues = [headers, ...leadRows];

  // 3. Append Values
  const appendUrl = `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`;
  const appendResponse = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: rawValues,
    }),
  });

  if (!appendResponse.ok) {
    const errText = await appendResponse.text();
    console.error('Google Sheets Append Values Error:', errText);
    throw new Error('Created the spreadsheet, but failed to append lead rows. Ensure sheets are not manually locked.');
  }

  return spreadsheetUrl;
}
