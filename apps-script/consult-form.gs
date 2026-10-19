/**
 * Micronode LLP: "Free consultation" form backend (Google Apps Script)
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
 *   5. BOM Cost-Down Estimator (bom-estimator.html): when a visitor asks for the report by email,
 *      emails them a PDF, alerts info@micronode.in and logs their email + totals in a "BOM Log" tab.
 *      The BOM lines themselves are never stored.
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

const BOM_SHEET_NAME = "BOM Log";
// Only report requests are logged, and never the BOM lines themselves (the page promises the BOM is not saved)
const BOM_HEADERS = ["Received (IST)", "Email", "Lines", "Yearly volume", "Currency",
  "Cost / board now", "Cost / board after", "Saving / year", "Swaps found", "Page"];

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

    // BOM Cost-Down Estimator: the visitor asked for the report by email
    if (data.type === "bomreport") return json(sendBomReport(data));

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
      subject: "New free consultation request: " + name + (company ? " (" + company + ")" : ""),
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

/**
 * BOM Cost-Down Estimator: emails the visitor their report as a PDF attachment.
 * The BOM lines are used only to build the PDF and are not stored. The "BOM Log" tab keeps
 * the email and the totals, and info@micronode.in gets a short lead alert (totals only).
 */
function sendBomReport(data) {
  if (clean(data.website)) return { ok: true };            // spam-trap field was filled: ignore quietly
  const email = clean(data.email).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { ok: false, error: "invalid email" };

  const t = {
    lines: Number(data.lines) || 0, volume: Number(data.volume) || 0, currency: clean(data.currency),
    now: clean(data.perBoardNow), after: clean(data.perBoardNew), board: clean(data.savingBoard),
    year: clean(data.savingYear), pct: Number(data.pct) || 0, swaps: Number(data.swaps) || 0
  };
  const rows = (Array.isArray(data.rows) ? data.rows : []).slice(0, 120);

  const pdf = Utilities.newBlob(bomReportHtml(t, rows), "text/html", "report.html")
    .getAs("application/pdf").setName("Micronode-BOM-cost-down-report.pdf");

  MailApp.sendEmail({
    to: email,
    replyTo: NOTIFY_EMAIL,
    name: "Micronode LLP",
    subject: "Your BOM cost-down report (" + t.year + " saving per year)",
    body:
      "Hello,\n\n" +
      "Your report from the Micronode BOM Cost-Down Estimator is attached as a PDF.\n\n" +
      "BOM cost per board today: " + t.now + "\n" +
      "With the suggested swaps: " + t.after + " (" + t.pct + "% lower)\n" +
      "Saving per year at " + t.volume + " boards: " + t.year + "\n\n" +
      "Estimates use typical distributor prices and are a starting point, not a quote. Every swap should be checked against your design before production.\n\n" +
      "Want the full saving, safely? Reply to this email and our engineers will review every line, check pinouts and " +
      "firmware impact, and send a redesign plan with real supplier quotes. First review is free; we reply within 24-48 hours.\n\n" +
      "Try the MG51 Dev Board: https://micronode.in/product-mg51.html\n" +
      "TM1637 LED Display & Button Module: https://micronode.in/product-tm1637.html\n\n" +
      "Micronode LLP, Pune\ninfo@micronode.in",
    attachments: [pdf]
  });

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    replyTo: email,
    subject: "BOM estimator lead: " + email,
    body:
      "Someone emailed themselves a BOM cost-down report.\n\n" +
      "Email: " + email + "\n" +
      "BOM lines: " + t.lines + ", volume " + t.volume + " boards/year\n" +
      "Cost per board: " + t.now + " -> " + t.after + " (" + t.pct + "% lower)\n" +
      "Saving per year: " + t.year + ", swaps found: " + t.swaps + "\n\n" +
      "The BOM itself is not stored. Reply to this email to follow up."
  });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(BOM_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(BOM_SHEET_NAME);
    sheet.appendRow(BOM_HEADERS);
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([new Date(), email, t.lines, t.volume, t.currency, t.now, t.after, t.year, t.swaps, clean(data.page)]);
  return { ok: true };
}

/**
 * The PDF report in Micronode's colours. Google's HTML-to-PDF converter only handles simple layouts,
 * so everything is tables with inline colours. The logo is the site's emblem PNG, embedded so it always shows.
 */
const BOM_LOGO_URL = "https://micronode.in/images/micronode-emblem-240.png";

function bomReportHtml(t, rows) {
  const e = function (v) { return clean(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
  const NAVY = "#19175C", BLUE = "#8E9BE0", POP = "#FF8F73", POP_TEXT = "#C55E44", INK = "#14141C", DIM = "#5B5B66", LAV = "#EEF0FB";

  let logo = "";
  try {
    const img = UrlFetchApp.fetch(BOM_LOGO_URL, { muteHttpExceptions: true });
    if (img.getResponseCode() === 200) logo = "<img src='data:image/png;base64," + Utilities.base64Encode(img.getBlob().getBytes()) + "' width='38' height='37' style='vertical-align:middle'>";
  } catch (err) { /* no logo: the wordmark still shows */ }

  const tag = function (text) {
    if (!text) return "";
    const s = String(text).toLowerCase();
    const c = s === "pin-compatible" || s === "low" ? ["#E3F6EC", "#0A7A4B"] : s === "redesign" || s === "high" ? ["#FFE9E2", "#B23A1E"] : [LAV, "#3B3F7A"];
    return "<span style='background:" + c[0] + ";color:" + c[1] + ";padding:2px 7px;font-size:9px'>" + e(text) + "</span>";
  };
  const kpi = function (big, small) {
    return "<td width='25%' style='background:" + LAV + ";border-top:3px solid " + POP + ";padding:10px 12px'>" +
      "<div style='font-size:16px;font-weight:bold;color:" + NAVY + "'>" + e(big) + "</div><div style='font-size:9px;color:" + DIM + "'>" + small + "</div></td>";
  };
  const body = rows.map(function (r, i) {
    const bg = i % 2 ? "#F7F7FC" : "#FFFFFF";
    const td = "style='padding:6px;border-bottom:1px solid #E6E6EE;vertical-align:top;background:" + bg + "'";
    const tdn = "style='padding:6px;border-bottom:1px solid #E6E6EE;vertical-align:top;text-align:right;white-space:nowrap;background:" + bg + "'";
    return "<tr><td " + td + "><b>" + e(r.part) + "</b><br><span style='color:" + DIM + ";font-size:9px'>" + e(r.desc) + (Number(r.qty) !== 1 ? " &middot; " + e(r.qty) + " per board" : "") + "</span></td>" +
      "<td " + tdn + ">" + e(r.now) + "</td>" +
      "<td " + td + ">" + (r.alt ? "<b>" + e(r.alt) + "</b><br>" : "") + "<span style='color:" + DIM + ";font-size:9px'>" + e(r.note) + "</span></td>" +
      "<td " + tdn + ">" + e(r.newPrice) + "</td><td " + td + ">" + tag(r.fit) + "</td><td " + td + ">" + tag(r.risk) + "</td>" +
      "<td " + tdn.replace("text-align:right", "text-align:right;color:" + POP_TEXT + ";font-weight:bold") + ">" + e(r.saveYear) + "</td></tr>";
  }).join("");
  const th = "style='background:" + NAVY + ";color:#FFFFFF;text-align:left;padding:7px 6px;font-size:9px'";

  const cardW = "50%";   // power modules are shown only in the table, not as a product card
  return "<!DOCTYPE html><html><head><meta charset='utf-8'><style>td,th{font-size:10px;font-family:Arial,Helvetica,sans-serif}</style></head>" +
    "<body style='font-family:Arial,Helvetica,sans-serif;color:" + INK + ";font-size:10.5px;margin:22px'>" +
    // header band
    "<table width='100%' cellspacing='0' cellpadding='0' style='background:" + NAVY + "'><tr>" +
    "<td style='padding:14px 18px;color:#FFFFFF'>" + logo + " <span style='font-size:16px;font-weight:bold;letter-spacing:2px;vertical-align:middle'>MICRO<span style='color:" + BLUE + "'>NODE</span> LLP</span></td>" +
    "<td style='padding:14px 18px;text-align:right;color:#FFFFFF'><b style='font-size:12px'>BOM cost-down report</b><br><span style='color:#C9CEF0;font-size:9.5px'>" +
    Utilities.formatDate(new Date(), "Asia/Kolkata", "d MMMM yyyy") + "</span></td></tr></table>" +
    // headline
    "<p style='margin:18px 0 2px;font-size:9px;letter-spacing:2px;color:#5F6DB0'>YOUR ESTIMATE</p>" +
    "<p style='margin:0 0 4px;font-size:22px;font-weight:bold;color:" + NAVY + "'>Your BOM could cost <span style='color:#E0694B'>" + t.pct + "% less</span>.</p>" +
    "<p style='margin:0 0 12px;color:" + DIM + "'>" + t.lines + " lines checked at " + t.volume + " boards a year.</p>" +
    // KPI cards
    "<table width='100%' cellspacing='6' cellpadding='0'><tr>" +
    kpi(t.now, "BOM cost per board today") + kpi(t.after, "with the suggested swaps") + kpi(t.board, "saved per board") + kpi(t.year, "saved per year") +
    "</tr></table>" +
    // every line
    "<p style='margin:16px 0 6px;font-size:14px;font-weight:bold;color:" + NAVY + "'>Every line</p>" +
    "<table width='100%' cellspacing='0' cellpadding='0'><tr><th " + th + ">Your part</th><th " + th + ">Now</th><th " + th + ">Suggested part</th><th " + th +
    ">New price</th><th " + th + ">Fit</th><th " + th + ">Risk</th><th " + th + ">Saving / year</th></tr>" + body + "</table>" +
    // products
    "<p style='margin:16px 0 6px;font-size:14px;font-weight:bold;color:" + NAVY + "'>Try it on a Micronode board</p>" +
    "<table width='100%' cellspacing='6' cellpadding='0'><tr>" +
    "<td width='" + cardW + "' style='background:#FFF6F3;border:1px solid #FFC6B8;padding:10px 12px'><b style='color:" + NAVY + "'>MG51 Dev Board</b><br>" +
    "<span style='font-size:9px;color:" + DIM + "'>Full I/O breakout, ICP header and a ready SDCC toolchain.</span><br><span style='font-size:9px;color:" + POP_TEXT + ";font-weight:bold'>micronode.in/product-mg51.html</span></td>" +
    "<td width='" + cardW + "' style='background:#FFF6F3;border:1px solid #FFC6B8;padding:10px 12px'><b style='color:" + NAVY + "'>TM1637 Display &amp; Button Module</b><br>" +
    "<span style='font-size:9px;color:" + DIM + "'>6 digits and 8 buttons on 2 MCU pins, with driver code.</span><br><span style='font-size:9px;color:" + POP_TEXT + ";font-weight:bold'>micronode.in/product-tm1637.html</span></td>" +
    "</tr></table>" +
    // CTA band
    "<table width='100%' cellspacing='0' cellpadding='0' style='background:" + BLUE + ";margin-top:12px'><tr><td style='padding:12px 16px;color:" + NAVY + "'>" +
    "<b style='font-size:12px'>Want the full saving, safely?</b><br><span style='font-size:9.5px;color:#23224F'>Our engineers review every line, check pinouts and firmware impact, " +
    "and send a redesign plan with real supplier quotes. First review free, reply in 24-48 hours. Just reply to this email.</span></td></tr></table>" +
    "<p style='margin:12px 0 0;font-size:8.5px;color:" + DIM + "'>This report was made with AI and can contain mistakes. Estimates use typical distributor prices and are a starting point, not a quote. " +
    "Every swap should be checked against your design before production.</p>" +
    "<table width='100%' cellspacing='0' cellpadding='0' style='margin-top:10px;border-top:2px solid " + NAVY + "'><tr>" +
    "<td style='padding-top:8px;font-size:9px;font-weight:bold;color:" + NAVY + "'>Micronode LLP &middot; Pune, India</td>" +
    "<td style='padding-top:8px;font-size:9px;font-weight:bold;color:" + NAVY + ";text-align:right'>info@micronode.in &middot; +91 9511705410 &middot; micronode.in</td></tr></table>" +
    "</body></html>";
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
