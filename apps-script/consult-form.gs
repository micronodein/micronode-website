/**
 * Micronode LLP: "Start a project" form backend (Google Apps Script)
 *
 * What it does
 *   1. Saves every request as a row in a Google Sheet (one column per field,
 *      including the new Phone, Preferred date and Preferred time).
 *   2. Emails the request to info@micronode.in.
 *   3. Saves newsletter sign-ups (the footer email box) into a private Google Sheet, one row per
 *      new address. Only people who can open that Sheet can read the list.
 *   4. Logs chatbot questions into a "Chat Log" tab in the same Sheet as the Requests tab, so you
 *      can see what visitors ask and how often — a repeated question updates its existing row's
 *      "Times asked" count and "Last asked" time instead of adding a duplicate row underneath.
 *      The Cloudflare Worker (cloudflare-worker/worker.js) posts here after each reply.
 *
 * Setup (about 5 minutes), see apps-script/README.md for the click-by-click version
 *   1. Create a Google Sheet, then Extensions > Apps Script.
 *   2. Paste this whole file over the default Code.gs and save.
 *   3. Deploy > New deployment > type "Web app":
 *        Execute as: Me      Who has access: Anyone
 *   4. Copy the Web app URL and put it in Micronode_Website.js as APPS_SCRIPT_URL.
 *      (If you REDEPLOY the same deployment as a new version, the URL stays the same.)
 */

const NOTIFY_EMAIL = "info@micronode.in";

// Newsletter list: the Google Sheet from its link  .../spreadsheets/d/<ID>/edit?gid=0
const NEWSLETTER_SHEET_ID = "12KpHfKjhR6C_umoIJ4SlWoQYry1gD3OSgfmT3QG0390";
const NEWSLETTER_TAB_GID = 0;   // the tab shown as gid=0 in the link
const NEWSLETTER_HEADERS = ["Subscribed (IST)", "Email", "Page"];
const SHEET_NAME = "Requests";
const HEADERS = ["Received (IST)", "Name", "Email", "Phone", "Company", "Preferred date", "Preferred time (IST)", "Project details"];

const CHATLOG_SHEET_NAME = "Chat Log";
const CHATLOG_HEADERS = ["First asked (IST)", "Question", "Latest answer", "Times asked", "Last asked (IST)", "Page"];

function doPost(e) {
  try {
    // The site sends JSON; with no-cors it arrives as the raw request body.
    const data = JSON.parse(e.postData.contents);

    // Footer newsletter box
    if (data.type === "newsletter") return json(saveNewsletter(data));

    // Chatbot question/answer log
    if (data.type === "chatlog") return json(saveChatLog(data));

    const name = clean(data.name);
    const email = clean(data.email);
    const phone = clean(data.phone);
    const company = clean(data.company);
    const slotDate = clean(data.slotDate);
    const slotTime = clean(data.slotTime);
    // The page also appends phone/slot to the message text; use the plain message when we
    // have the separate fields, so the sheet does not repeat them.
    let message = clean(data.message);
    if (phone || slotDate || slotTime) message = message.replace(/\n\n— (Phone:|Preferred slot:)[\s\S]*$/, "");

    if (!name || !email || !message) return json({ ok: false, error: "missing fields" });

    const sheet = getSheet();
    sheet.appendRow([new Date(), name, email, phone, company, slotDate, slotTime, message]);

    const slot = slotDate || slotTime ? slotDate + " " + slotTime + " IST" : "not chosen";
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      replyTo: email,
      subject: "New project enquiry: " + name + (company ? " (" + company + ")" : ""),
      body:
        "Name: " + name + "\n" +
        "Email: " + email + "\n" +
        "Phone: " + (phone || "not given") + "\n" +
        "Company: " + (company || "not given") + "\n" +
        "Preferred consultation slot: " + slot + "\n\n" +
        "Project details:\n" + message
    });

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// Opening the URL in a browser is a quick way to check the deployment is live.
function doGet() {
  return json({ ok: true, service: "Micronode consultation form" });
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function clean(v) {
  return String(v == null ? "" : v).trim().slice(0, 2000);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Saves one newsletter address (skips duplicates). */
function saveNewsletter(data) {
  const email = clean(data.email).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { ok: false, error: "invalid email" };
  if (clean(data.website)) return { ok: true };            // hidden spam-trap field was filled: ignore quietly

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.openById(NEWSLETTER_SHEET_ID);
    const sheet = ss.getSheets().filter(function (s) { return s.getSheetId() === NEWSLETTER_TAB_GID; })[0] || ss.getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(NEWSLETTER_HEADERS);
      sheet.setFrozenRows(1);
    }
    const last = sheet.getLastRow();
    if (last > 1) {
      const existing = sheet.getRange(2, 2, last - 1, 1).getValues();
      for (var i = 0; i < existing.length; i++) {
        if (String(existing[i][0]).toLowerCase() === email) return { ok: true, duplicate: true };
      }
    }
    sheet.appendRow([new Date(), email, clean(data.page)]);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/** Logs one chatbot question. A repeat of the same question updates its row instead of adding a new one. */
function saveChatLog(data) {
  const question = clean(data.question);
  if (!question) return { ok: false, error: "missing question" };
  const answer = clean(data.answer);
  const page = clean(data.page);
  const key = question.toLowerCase().replace(/\s+/g, " ").trim();

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(CHATLOG_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(CHATLOG_SHEET_NAME);
      sheet.appendRow(CHATLOG_HEADERS);
      sheet.setFrozenRows(1);
    }
    const last = sheet.getLastRow();
    if (last > 1) {
      const existingQuestions = sheet.getRange(2, 2, last - 1, 1).getValues();
      for (var i = 0; i < existingQuestions.length; i++) {
        const existingKey = String(existingQuestions[i][0]).toLowerCase().replace(/\s+/g, " ").trim();
        if (existingKey === key) {
          const row = i + 2;
          const timesCell = sheet.getRange(row, 4);
          const times = Number(timesCell.getValue()) || 1;
          timesCell.setValue(times + 1);
          if (answer) sheet.getRange(row, 3).setValue(answer);
          sheet.getRange(row, 5).setValue(new Date());
          return { ok: true, duplicate: true };
        }
      }
    }
    sheet.appendRow([new Date(), question, answer, 1, new Date(), page]);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}