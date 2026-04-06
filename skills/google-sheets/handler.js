/**
 * Google Sheets API Skill Handler
 * 
 * Actions:
 * - create_spreadsheet: Create a new spreadsheet with title
 * - append_rows: Append data (array of arrays) to a sheet
 * - update_cell: Update a specific cell
 * - get_values: Read range from sheet
 * - share_spreadsheet: Share with email and set permissions
 * 
 * Supports service account or OAuth authentication.
 */

import { createRequire } from "module";

let googleapis = null;

function loadGoogleApis() {
  if (googleapis) return googleapis;
  try {
    const require = createRequire(process.cwd() + "/package.json");
    googleapis = require("googleapis");
    return googleapis;
  } catch (e) {
    throw new Error('googleapis not installed. Run: npm install googleapis');
  }
}

function getAuthClient(config) {
  const { google } = loadGoogleApis();
  
  // Service Account authentication
  const serviceAccountJson = config.service_account_json || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    let credentials;
    try {
      credentials = JSON.parse(serviceAccountJson);
    } catch (e) {
      throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON: must be valid JSON');
    }
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
    });
  }
  
  // OAuth 2.0 authentication
  const clientId = config.client_id || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = config.client_secret || process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = config.refresh_token || process.env.GOOGLE_REFRESH_TOKEN;
  const accessToken = config.access_token || process.env.GOOGLE_ACCESS_TOKEN;
  
  if (clientId && clientSecret) {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      config.redirect_uri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost'
    );
    
    if (refreshToken) {
      oauth2Client.setCredentials({ refresh_token: refreshToken });
    } else if (accessToken) {
      oauth2Client.setCredentials({ access_token: accessToken });
    } else {
      throw new Error('OAuth credentials incomplete. Provide refresh_token or access_token.');
    }
    
    return oauth2Client;
  }
  
  throw new Error(
    'Google authentication not configured. ' +
    'Set GOOGLE_SERVICE_ACCOUNT_JSON (service account) or ' +
    'GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REFRESH_TOKEN (OAuth).'
  );
}

function extractSpreadsheetId(urlOrId) {
  if (!urlOrId) return null;
  // Check if it's already just an ID (no slashes, spaces, or special chars)
  if (/^[a-zA-Z0-9_-]+$/.test(urlOrId) && urlOrId.length > 20) {
    return urlOrId;
  }
  // Extract from URL
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : urlOrId;
}

let _config = {};

export default {
  install: async (config) => {
    _config = config;
  },

  actions: {
    create_spreadsheet: async (params) => {
      const title = params.title || 'Untitled Spreadsheet';
      const sheets = params.sheets || [{ title: 'Sheet1' }];
      
      try {
        const { google } = loadGoogleApis();
        const auth = getAuthClient(_config);
        const sheetsApi = google.sheets({ version: 'v4', auth });
        
        const response = await sheetsApi.spreadsheets.create({
          requestBody: {
            properties: { title },
            sheets: sheets.map(s => ({
              properties: { title: s.title || 'Sheet1' }
            }))
          }
        });
        
        const result = {
          created: true,
          spreadsheetId: response.data.spreadsheetId,
          title: response.data.properties?.title,
          url: `https://docs.google.com/spreadsheets/d/${response.data.spreadsheetId}/edit`,
          sheets: response.data.sheets?.map(s => ({
            sheetId: s.properties?.sheetId,
            title: s.properties?.title
          })) || []
        };
        
        return { content: JSON.stringify(result) };
      } catch (error) {
        return { content: JSON.stringify({ created: false, error: error.message }) };
      }
    },

    append_rows: async (params) => {
      const spreadsheetId = extractSpreadsheetId(params.spreadsheet_id);
      const sheetName = params.sheet || 'Sheet1';
      const values = params.values || [];
      const range = params.range;
      
      if (!spreadsheetId) {
        return { content: JSON.stringify({ appended: false, error: 'spreadsheet_id is required' }) };
      }
      
      if (!Array.isArray(values) || values.length === 0) {
        return { content: JSON.stringify({ appended: false, error: 'values must be a non-empty array of arrays' }) };
      }
      
      try {
        const { google } = loadGoogleApis();
        const auth = getAuthClient(_config);
        const sheetsApi = google.sheets({ version: 'v4', auth });
        
        // If range is provided, use it; otherwise append to end of sheet
        const appendRange = range ? `${sheetName}!${range}` : sheetName;
        
        const response = await sheetsApi.spreadsheets.values.append({
          spreadsheetId,
          range: appendRange,
          valueInputOption: params.value_input_option || 'RAW',
          insertDataOption: params.insert_option || 'INSERT_ROWS',
          requestBody: { values }
        });
        
        const result = {
          appended: true,
          spreadsheetId,
          updatedRange: response.data.updates?.updatedRange,
          updatedRows: response.data.updates?.updatedRows,
          updatedColumns: response.data.updates?.updatedColumns,
          updatedCells: response.data.updates?.updatedCells
        };
        
        return { content: JSON.stringify(result) };
      } catch (error) {
        return { content: JSON.stringify({ appended: false, error: error.message }) };
      }
    },

    update_cell: async (params) => {
      const spreadsheetId = extractSpreadsheetId(params.spreadsheet_id);
      const sheetName = params.sheet || 'Sheet1';
      const cell = params.cell || params.range;
      const value = params.value;
      
      if (!spreadsheetId) {
        return { content: JSON.stringify({ updated: false, error: 'spreadsheet_id is required' }) };
      }
      
      if (!cell) {
        return { content: JSON.stringify({ updated: false, error: 'cell or range is required (e.g., "A1" or "B2:C5")' }) };
      }
      
      try {
        const { google } = loadGoogleApis();
        const auth = getAuthClient(_config);
        const sheetsApi = google.sheets({ version: 'v4', auth });
        
        const range = cell.includes('!') ? cell : `${sheetName}!${cell}`;
        
        const response = await sheetsApi.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: params.value_input_option || 'RAW',
          requestBody: { values: [[value]] }
        });
        
        const result = {
          updated: true,
          spreadsheetId,
          range: response.data.updatedRange,
          updatedCells: response.data.updatedCells,
          updatedRows: response.data.updatedRows,
          updatedColumns: response.data.updatedColumns
        };
        
        return { content: JSON.stringify(result) };
      } catch (error) {
        return { content: JSON.stringify({ updated: false, error: error.message }) };
      }
    },

    get_values: async (params) => {
      const spreadsheetId = extractSpreadsheetId(params.spreadsheet_id);
      const sheetName = params.sheet || 'Sheet1';
      const range = params.range;
      const majorDimension = params.major_dimension || 'ROWS';
      
      if (!spreadsheetId) {
        return { content: JSON.stringify({ error: 'spreadsheet_id is required' }) };
      }
      
      try {
        const { google } = loadGoogleApis();
        const auth = getAuthClient(_config);
        const sheetsApi = google.sheets({ version: 'v4', auth });
        
        // Build range string
        let rangeStr;
        if (range) {
          rangeStr = range.includes('!') ? range : `${sheetName}!${range}`;
        } else {
          rangeStr = sheetName;
        }
        
        const response = await sheetsApi.spreadsheets.values.get({
          spreadsheetId,
          range: rangeStr,
          majorDimension,
          valueRenderOption: params.value_render_option || 'FORMATTED_VALUE',
          dateTimeRenderOption: params.date_time_render_option || 'SERIAL_NUMBER'
        });
        
        const result = {
          spreadsheetId,
          range: response.data.range,
          majorDimension: response.data.majorDimension,
          values: response.data.values || [],
          rowCount: response.data.values?.length || 0,
          columnCount: response.data.values?.[0]?.length || 0
        };
        
        return { content: JSON.stringify(result) };
      } catch (error) {
        return { content: JSON.stringify({ error: error.message }) };
      }
    },

    share_spreadsheet: async (params) => {
      const spreadsheetId = extractSpreadsheetId(params.spreadsheet_id);
      const email = params.email;
      const role = params.role || 'reader';  // reader, writer, owner
      const type = params.type || 'user';    // user, group, domain, anyone
      
      if (!spreadsheetId) {
        return { content: JSON.stringify({ shared: false, error: 'spreadsheet_id is required' }) };
      }
      
      if (type === 'user' && !email) {
        return { content: JSON.stringify({ shared: false, error: 'email is required when type is user' }) };
      }
      
      // Validate role
      const validRoles = ['reader', 'commenter', 'writer', 'owner'];
      if (!validRoles.includes(role)) {
        return { content: JSON.stringify({ shared: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }) };
      }
      
      try {
        const { google } = loadGoogleApis();
        const auth = getAuthClient(_config);
        const driveApi = google.drive({ version: 'v3', auth });
        
        const permissionRequest = {
          role,
          type
        };
        
        if (type === 'user' || type === 'group') {
          permissionRequest.emailAddress = email;
        }
        
        if (type === 'domain') {
          permissionRequest.domain = params.domain;
        }
        
        const response = await driveApi.permissions.create({
          fileId: spreadsheetId,
          requestBody: permissionRequest,
          sendNotificationEmail: params.send_notification !== false,
          emailMessage: params.email_message
        });
        
        const result = {
          shared: true,
          spreadsheetId,
          permissionId: response.data.id,
          role: response.data.role,
          type: response.data.type,
          emailAddress: response.data.emailAddress,
          url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
        };
        
        return { content: JSON.stringify(result) };
      } catch (error) {
        return { content: JSON.stringify({ shared: false, error: error.message }) };
      }
    }
  }
};
