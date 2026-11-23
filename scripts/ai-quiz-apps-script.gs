// Google Apps Script web app that stores /ai-quiz responses in a Google Sheet.
// Setup: docs/ai-quiz-setup.md. Paste this whole file into the script editor.

const SHEET_NAME = 'Responses';

// Column order in the sheet. New keys sent by the quiz are ignored until added here.
const COLUMNS = [
  'submittedAt', 'track', 'score', 'privacyGap',
  'frequency', 'tools', 'wrongAnswer', 'prompt', 'files', 'connected',
  'weeklyTask', 'neverPaste',
  'format', 'schedule', 'price', 'context',
  'start', 'payer', 'followUp',
  'name', 'contact', 'userAgent',
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Honeypot: bots fill the hidden "website" field. Pretend success, store nothing.
    if (data.website) return json({ ok: true });

    const sheet = getSheet();
    const row = COLUMNS.map((key) => {
      const v = data[key];
      if (Array.isArray(v)) return v.join(', ');
      if (v === undefined || v === null) return '';
      // Stop a value like "=HYPERLINK(...)" being run as a formula.
      const s = String(v).slice(0, 1000);
      return /^[=+\-@]/.test(s) ? "'" + s : s;
    });

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      sheet.appendRow(row);
    } finally {
      lock.releaseLock();
    }
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// Lets you open the /exec URL in a browser to check the deployment is live.
function doGet() {
  return json({ ok: true, service: 'ai-quiz' });
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
