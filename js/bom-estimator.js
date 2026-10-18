/* ════════════════════════════════════════════
   MICRONODE LLP — BOM Cost-Down Estimator (bom-estimator.html)
   1. Reads a BOM (pasted from Excel, a CSV/Excel upload, or typed) into an editable table.
   2. Matches each line against PARTS, Micronode's own list of proven cost-down swaps.
   3. Lines with no built-in match go to the Cloudflare Worker (/bom), which asks the AI.
   4. Shows the saving per board and per year, the top 5 lines and every suggestion;
      each swap can be unticked or given your own price, and the totals update.
   5. The BOM is never saved. Only "Email me the report" sends it, to apps-script/consult-form.gs, which
      emails the visitor a PDF and logs just their email and the totals in the "BOM Log" tab.
   ════════════════════════════════════════════ */
(function () {
    "use strict";

    const BOM_API_URL = "https://micronode-chatbot.micronode-in.workers.dev/bom";
    // Same Apps Script web app as the consultation form; defined once in Micronode_Website.js
    const SHEET_URL = typeof APPS_SCRIPT_URL !== "undefined" ? APPS_SCRIPT_URL : "";
    const USD_RATE = 84;            // ₹ per US$, only used to show built-in/AI prices in dollars
    const MAX_LINES = 300;
    const XLSX_CDN = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";

    /* Built-in swaps. typ = typical price today, alt = suggested part, altPrice = its price.
       All prices are indicative ₹ per unit at about 1,000 pieces. product links a swap to a Micronode board. */
    const PARTS = [
        { re: /^(AT89[SC]5[125]|AT89S8253|P89V51|SST89E5)/i, typ: 75, alt: "Nuvoton MG51FB9AE", altPrice: 30, match: "Minor changes", risk: "Low",
          note: "Same 8051 core. Rename registers and pins; most C code carries over. Prototype it on the Micronode MG51 Dev Board.", product: "mg51" },
        { re: /^PIC16F8[78][67]/i, typ: 220, alt: "Nuvoton MG51FB9AE", altPrice: 30, match: "Redesign", risk: "Medium",
          note: "Stays 8-bit and 5 V. Peripheral code is rewritten for the 8051; check the pin count. Prototype it on the Micronode MG51 Dev Board.", product: "mg51" },
        { re: /^PIC1[0268]F/i, typ: 90, alt: "Nuvoton MG51FB9AE", altPrice: 30, match: "Redesign", risk: "Medium",
          note: "Stays 8-bit and 5 V. Peripheral code is rewritten for the 8051. Prototype it on the Micronode MG51 Dev Board.", product: "mg51" },
        { re: /^STM8S(00[35]|10[35])/i, typ: 40, alt: "Nuvoton MG51FB9AE", altPrice: 30, match: "Redesign", risk: "Low",
          note: "Stays 8-bit and 5 V with twice the flash of the STM8S003. Port the peripheral code. Prototype it on the Micronode MG51 Dev Board.", product: "mg51" },
        { re: /^ATMEGA(328|168|88|8|16|32)/i, typ: 170, alt: "Nuvoton MG51FB9AE", altPrice: 30, match: "Redesign", risk: "Medium",
          note: "Fits simple 5 V control jobs. Arduino libraries do not carry over; plan a firmware port. Prototype it on the Micronode MG51 Dev Board.", product: "mg51" },
        { re: /^STM32F103[CR]/i, typ: 180, alt: "WCH CH32F103C8T6", altPrice: 65, match: "Pin-compatible", risk: "Low",
          note: "Pin-compatible in LQFP48 and runs most STM32 code. Re-test clocks and USB." },
        { re: /^STM32F030/i, typ: 45, alt: "Puya PY32F030", altPrice: 14, match: "Minor changes", risk: "Medium",
          note: "Pin-compatible in common packages. Check flash size and peripherals; ST's STM32C031 is the same-brand option." },
        { re: /^(FT232R|FT231X|FT230X|CP210[24])/i, typ: 250, alt: "WCH CH340C", altPrice: 25, match: "Minor changes", risk: "Low",
          note: "USB-to-UART with a built-in clock, no crystal. New footprint and the CH340 driver." },
        { re: /^(W25Q|MX25L|AT25SF|S25FL)\d+/i, typ: 45, alt: "GigaDevice GD25Q series", altPrice: 20, match: "Pin-compatible", risk: "Low",
          note: "Pin- and command-compatible SPI flash of the same size." },
        { re: /^LM2596/i, typ: 120, alt: "XLSEMI XL1509", altPrice: 15, match: "Minor changes", risk: "Medium",
          note: "Same class of buck converter in SOP-8. New footprint; re-check inductor and ripple." },
        { re: /^(MAX7219|MAX7221|HT16K33)/i, typ: 150, alt: "TM1637 LED driver", altPrice: 8, match: "Redesign", risk: "Low",
          note: "2-wire LED driver with key scanning, or use the ready Micronode TM1637 module.", product: "tm1637" },
        { re: /^(DS3231|DS1307)/i, typ: 200, alt: "NXP PCF8563", altPrice: 15, match: "Redesign", risk: "Medium",
          note: "Cheaper RTC but less accurate than a DS3231. Driver code changes." }
    ];

    // AC-DC / DC-DC power modules (Hi-Link, G-Energy and similar): Micronode's own modules replace them with the same footprint.
    // No price is published yet, so the line shows "Ask for price" and no saving is counted.
    const POWER_RE = /^HLK[-\s]?|hi[\s-]?link|g[\s-]?energy|\b(ac[\s-]?dc|dc[\s-]?dc|buck|smps)\b.*\bmodule\b|\bpower module\b/i;
    const POWER_SWAP = { alt: "Micronode power module", match: "Pin-compatible", risk: "Low", product: "power",
        note: "Micronode's own module: replaces Hi-Link and G-Energy modules with the same footprint. Ask us for ratings and price." };

    // Communication and interface ICs are left alone: a swap risks compatibility on the bus or with drivers
    const COMMS_RE = /^(MAX(48[57]|3485|1348|232|3232)|SN75176|SN65HVD|ADM(48|2[0-9]{2}|3)|SP3?(485|232)|ST3232|THVD|ISO1|FT2[23]|FT23|CP210|CH340|CH9102|PL2303|MCP25|TJA1|TCAN|W5500|ENC28J|LAN87|KSZ8|DP83|SIM[0-9]|EC2|ESP32|ESP8266|NRF|CC1101|SX12|RFM9|HC-0)|rs-?485|rs-?232|\bcan\b|\busb\b|uart|ethernet|transceiver|\bphy\b|isolator|modem|bluetooth|wi-?fi|zigbee|lora|gsm|4g|lte/i;

    // Lines that need a display and buttons: suggest the Micronode TM1637 module (no price swap)
    const DISPLAY_RE = /7[\s-]?seg|seven[\s-]?segment|led display|digit display|tactile|push[\s-]?button|keypad|tm1637/i;
    // Passives, connectors and mechanical parts: already cheap, not sent to the AI
    const PASSIVE_RE = /resistor|capacitor|inductor|ferrite|connector|header|terminal|crystal|oscillator|fuse|\bled\b|diode|jumper|screw|spacer|pcb\b|heat ?sink|cable|wire|label|enclosure|^(\d+(\.\d+)?\s?(r|k|m|ohm|Ω|uf|µf|nf|pf|uh|µh|mh)\b)|^(rc|cl|grm|cc|rmcf|erj|crcw)\d/i;

    // Board prices are deliberately not shown in the tool (user's decision): the product page has them
    const PRODUCTS = {
        mg51: { name: "MG51 Dev Board", href: "product-mg51.html", img: "images/products/micronode-mg51-dev-board-io-breakout.webp",
                text: "Try the MG51 before you commit: full I/O breakout, ICP header and a ready SDCC toolchain.", cta: "Buy MG51 Dev Board" },
        tm1637: { name: "TM1637 LED Display & Button Module", href: "product-tm1637.html", img: "images/products/micronode-tm1637-display-module-front.webp",
                  text: "6-digit display and 8 buttons on 2 MCU pins, with driver code. Replaces a separate display, driver and keys.", cta: "Get the TM1637 module" }
    };

    const EXAMPLE = [
        ["AT89S52-24PU", "Main microcontroller", 1, 78],
        ["HLK-PM01", "230 V AC to 5 V power module", 1, 260],
        ["FT232RL", "USB to UART", 1, 310],
        ["MAX485ESA", "RS-485 transceiver", 1, 55],
        ["MAX7219CNG", "7-segment display driver", 1, 160],
        ["DS3231SN", "Real-time clock", 1, 210],
        ["AT24C02", "EEPROM", 1, 18],
        ["10k 0603", "Resistor", 14, 0.2],
        ["100nF 0603", "Capacitor", 12, 0.3],
        ["11.0592MHz", "Crystal", 1, 6]
    ];

    const $ = (id) => document.getElementById(id);
    const rowsEl = $("bomRows");
    if (!rowsEl) return;

    let results = [];      // one entry per BOM line after analysis
    let lastMeta = null;   // { volume, currency }

    /* ── Helpers ── */
    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
    }
    function num(v) {
        const n = parseFloat(String(v == null ? "" : v).replace(/rs\.?|inr|usd|[₹$,\s]/gi, ""));
        return isFinite(n) ? n : NaN;
    }
    function currency() { return $("bomCurrency").value; }
    function sym(cur) { return (cur || currency()) === "USD" ? "$" : "₹"; }
    function fromInr(inr, cur) { return (cur || currency()) === "USD" ? inr / USD_RATE : inr; }
    function money(v, cur) {
        const c = cur || currency();
        const abs = Math.abs(v);
        // Whole amounts and anything from 100 up: no decimals. Small amounts keep paise/cents.
        const whole = abs >= 100 || Math.abs(v - Math.round(v)) < 0.005;
        const digits = whole ? 0 : abs >= 1 ? 2 : 3;
        return sym(c) + v.toLocaleString(c === "USD" ? "en-US" : "en-IN", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: digits });
    }
    // Big yearly amounts read better short: ₹17.75 lakh, ₹1.2 crore, $45.3k
    function moneyShort(v, cur) {
        const c = cur || currency(), a = Math.abs(v);
        if (c === "INR" && a >= 1e7) return "₹" + (v / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 2 }) + " crore";
        if (c === "INR" && a >= 1e5) return "₹" + (v / 1e5).toLocaleString("en-IN", { maximumFractionDigits: 2 }) + " lakh";
        if (c === "USD" && a >= 1e6) return "$" + (v / 1e6).toLocaleString("en-US", { maximumFractionDigits: 2 }) + "M";
        if (c === "USD" && a >= 1e4) return "$" + (v / 1e3).toLocaleString("en-US", { maximumFractionDigits: 1 }) + "k";
        return money(v, c);
    }
    function track(event, extra) {
        try { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event }, extra || {})); } catch (e) { /* analytics is optional */ }
    }
    function setStatus(msg, kind) {
        const el = $("bomStatus");
        el.textContent = msg || "";
        el.className = "bom-status" + (kind ? " is-" + kind : "");
    }

    /* ── Step 1: the editable BOM table ── */
    function addRow(part, desc, qty, price) {
        const tr = document.createElement("tr");
        tr.innerHTML =
            '<td class="bom-idx"></td>' +
            '<td><input class="bom-cell" data-k="part" aria-label="Part number" placeholder="Part number" value="' + esc(part) + '"></td>' +
            '<td><input class="bom-cell" data-k="desc" aria-label="Description" placeholder="Description" value="' + esc(desc) + '"></td>' +
            '<td data-label="Qty / board"><input class="bom-cell bom-num" data-k="qty" aria-label="Quantity per board" placeholder="Qty" inputmode="decimal" value="' + esc(qty == null || qty === "" ? 1 : qty) + '"></td>' +
            '<td data-label="Unit price"><input class="bom-cell bom-num" data-k="price" aria-label="Unit price" inputmode="decimal" placeholder="Price" value="' + esc(price == null ? "" : price) + '"></td>' +
            '<td><button type="button" class="bom-del" aria-label="Remove this line">&times;</button></td>';
        rowsEl.appendChild(tr);
        renumber();
    }
    function renumber() {
        Array.from(rowsEl.rows).forEach((tr, i) => { tr.cells[0].textContent = i + 1; });
    }
    function readRows() {
        return Array.from(rowsEl.rows).map((tr) => {
            const get = (k) => tr.querySelector('[data-k="' + k + '"]').value.trim();
            return { part: get("part"), desc: get("desc"), qty: num(get("qty")), price: num(get("price")) };
        }).filter((r) => r.part || r.desc);
    }
    function fillRows(list) {
        rowsEl.innerHTML = "";
        list.slice(0, MAX_LINES).forEach((r) => addRow(r.part, r.desc, isNaN(r.qty) ? 1 : r.qty, isNaN(r.price) ? "" : r.price));
        if (!rowsEl.rows.length) addRow("", "", 1, "");
    }

    rowsEl.addEventListener("click", (e) => {
        if (!e.target.closest(".bom-del")) return;
        e.target.closest("tr").remove();
        if (!rowsEl.rows.length) addRow("", "", 1, "");
        renumber();
    });
    $("bomAddRow").addEventListener("click", () => { addRow("", "", 1, ""); rowsEl.lastElementChild.querySelector("input").focus(); });
    $("bomClear").addEventListener("click", () => { fillRows([]); $("bomPaste").value = ""; $("bomResults").hidden = true; setStatus(""); });
    $("bomExample").addEventListener("click", () => {
        $("bomCurrency").value = "INR";
        updateCurrencyLabels();
        fillRows(EXAMPLE.map((r) => ({ part: r[0], desc: r[1], qty: r[2], price: r[3] })));
        $("bomPasteNote").textContent = "Example loaded: a typical 8051 controller board. Press Find savings.";
        track("bom_example");
    });

    /* ── Reading pasted text, CSV and Excel ── */
    function splitLine(line, d) {
        const out = []; let cur = "", q = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (q) {
                if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
                else cur += ch;
            } else if (ch === '"') q = true;
            else if (ch === d) { out.push(cur); cur = ""; }
            else cur += ch;
        }
        out.push(cur);
        return out.map((s) => s.trim());
    }
    function parseTable(text) {
        const lines = String(text).replace(/\r/g, "").split("\n").filter((l) => l.trim());
        if (!lines.length) return [];
        const first = lines[0];
        const d = first.includes("\t") ? "\t" : (first.split(";").length > first.split(",").length ? ";" : ",");
        const rows = lines.map((l) => splitLine(l, d));

        // Header row? Look for column names
        const head = rows[0].map((h) => h.toLowerCase());
        const find = (re, skip) => head.findIndex((h, i) => re.test(h) && i !== skip);
        let price = find(/unit ?(price|cost)|price ?\/ ?unit|rate/);
        if (price < 0) price = find(/price|cost/);
        const qty = find(/qty|quantity|qnty|count|per board|nos/);
        let part = find(/mpn|mfr|manufacturer part|part ?(no|number|#|num)|^part$|component|value/);
        const desc = find(/desc|name|comment|function/, part);
        const hasHeader = [price, qty, part, desc].filter((i) => i >= 0).length >= 2;

        let body = rows, map;
        if (hasHeader) {
            body = rows.slice(1);
            if (part < 0) part = desc >= 0 ? desc : 0;
            map = { part, desc, qty, price };
        } else {
            // No header: first text column is the part, numeric columns are qty then price
            const sample = rows[0];
            const numeric = sample.map((c) => !isNaN(num(c)) && c !== "");
            const nums = numeric.map((n, i) => (n ? i : -1)).filter((i) => i >= 0);
            const texts = numeric.map((n, i) => (!n ? i : -1)).filter((i) => i >= 0);
            map = { part: texts[0] != null ? texts[0] : 0, desc: texts[1] != null ? texts[1] : -1,
                    qty: nums.length > 1 ? nums[0] : -1, price: nums.length > 1 ? nums[1] : (nums[0] != null ? nums[0] : -1) };
        }
        const cell = (r, i) => (i >= 0 && i < r.length ? r[i] : "");
        return body.map((r) => ({
            part: cell(r, map.part),
            desc: map.desc === map.part ? "" : cell(r, map.desc),
            qty: map.qty >= 0 ? num(cell(r, map.qty)) : 1,
            price: map.price >= 0 ? num(cell(r, map.price)) : NaN
        })).filter((r) => r.part || r.desc);
    }
    function loadParsed(list, source) {
        if (!list.length) { $("bomPasteNote").textContent = "Couldn't find any BOM lines in that " + source + ". Check it has a part number column."; return; }
        fillRows(list);
        const missing = list.filter((r) => isNaN(r.price)).length;
        $("bomPasteNote").textContent = "Read " + Math.min(list.length, MAX_LINES) + " lines from the " + source + "." +
            (list.length > MAX_LINES ? " Only the first " + MAX_LINES + " are used." : "") +
            (missing ? " " + missing + " have no price; we'll use typical prices where we know them." : "") +
            " Check the table, then press Find savings.";
        track("bom_import", { bom_source: source, bom_lines: list.length });
    }

    $("bomPaste").addEventListener("paste", () => setTimeout(() => loadParsed(parseTable($("bomPaste").value), "pasted text"), 0));
    $("bomPaste").addEventListener("change", () => { if ($("bomPaste").value.trim()) loadParsed(parseTable($("bomPaste").value), "pasted text"); });

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (window.XLSX) return resolve();
            const s = document.createElement("script");
            s.src = src; s.onload = resolve; s.onerror = reject;
            document.head.appendChild(s);
        });
    }
    $("bomFile").addEventListener("change", async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const note = $("bomPasteNote");
        try {
            if (/\.xlsx?$/i.test(file.name)) {
                note.textContent = "Reading " + file.name + "…";
                await loadScript(XLSX_CDN);
                const wb = window.XLSX.read(await file.arrayBuffer(), { type: "array" });
                const ws = wb.Sheets[wb.SheetNames[0]];
                loadParsed(parseTable(window.XLSX.utils.sheet_to_csv(ws, { FS: "\t", blankrows: false })), "file");
            } else {
                loadParsed(parseTable(await file.text()), "file");
            }
        } catch (err) {
            note.textContent = "Couldn't read that file. Save it as CSV, or copy the cells and paste them above.";
        }
        e.target.value = "";
    });

    function updateCurrencyLabels() {
        document.querySelectorAll(".bom-cur-sym").forEach((el) => { el.textContent = sym(); });
    }
    $("bomCurrency").addEventListener("change", () => {
        updateCurrencyLabels();
        if (!$("bomResults").hidden) setStatus("Currency changed. Check your prices are in " + sym() + ", then press Find savings again.", "warn");
    });

    /* ── Step 2: analysis ── */
    function localMatch(r) {
        const key = (r.part || "").replace(/\s+/g, "");
        const text = r.part + " " + r.desc;
        if (POWER_RE.test(r.part) || POWER_RE.test(text)) return Object.assign({ source: "micronode", altPriceInr: null, askPrice: true }, POWER_SWAP);
        // Built-in swaps first: the USB-UART swap (FT232/CP210x to CH340) is the one interface swap we make on purpose
        const hit = PARTS.find((p) => p.re.test(key));
        if (hit) return { source: "micronode", alt: hit.alt, altPriceInr: hit.altPrice, typInr: hit.typ, match: hit.match, risk: hit.risk, note: hit.note, product: hit.product || null };
        if (COMMS_RE.test(key) || COMMS_RE.test(r.desc)) return { source: "keep", alt: "", note: "Communication IC: keep it. Swapping these risks compatibility on the bus." };
        if (DISPLAY_RE.test(r.part + " " + r.desc)) return { source: "micronode", alt: "", product: "tm1637",
            note: "Needs a display or buttons? One TM1637 module can replace the display, driver and keys." };
        if (PASSIVE_RE.test(r.part) || PASSIVE_RE.test(r.desc)) return { source: "passive", alt: "", note: "Low-cost passive or mechanical part: keep it." };
        return null;
    }

    async function askAi(list) {
        if (!list.length) return { items: [] };
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 25000);
        try {
            const res = await fetch(BOM_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ parts: list }),
                signal: ctrl.signal
            });
            return await res.json();
        } catch (e) {
            return { items: [], error: "unreachable" };
        } finally {
            clearTimeout(timer);
        }
    }

    async function analyse() {
        const rows = readRows();
        if (!rows.length) { setStatus("Add at least one BOM line first.", "error"); return; }
        const volume = Math.max(1, Math.round(num($("bomVolume").value) || 0));
        if (!volume) { setStatus("Enter how many boards you build per year.", "error"); return; }
        const cur = currency();
        const btn = $("bomAnalyse");
        btn.disabled = true;
        btn.classList.add("is-loading");
        btn.textContent = "Checking…";
        setStatus("Checking " + rows.length + " lines…");

        // 1. Built-in swaps first
        results = rows.map((r, i) => {
            const m = localMatch(r);
            const qty = isNaN(r.qty) || r.qty <= 0 ? 1 : r.qty;
            let price = r.price, priceNote = "";
            if ((isNaN(price) || price <= 0) && m && m.typInr) { price = fromInr(m.typInr, cur); priceNote = "typical price"; }
            return {
                i, part: r.part, desc: r.desc, qty, price: isNaN(price) ? 0 : price, priceNote,
                source: m ? m.source : "none",
                alt: m ? m.alt : "",
                newPrice: m && m.alt && m.altPriceInr != null ? fromInr(m.altPriceInr, cur) : null,
                askPrice: !!(m && m.askPrice),
                match: m ? m.match || "" : "", risk: m ? m.risk || "" : "",
                note: m ? m.note : "", product: m ? m.product : null, use: true
            };
        });

        // 2. Ask the AI about the lines we have no swap for (most expensive first, up to 40)
        const unknown = results.filter((r) => r.source === "none")
            .sort((a, b) => b.price * b.qty - a.price * a.qty).slice(0, 40)
            .map((r) => ({ i: r.i, part: r.part, desc: r.desc, price_inr: Math.round((cur === "USD" ? r.price * USD_RATE : r.price) * 100) / 100 }));
        let aiNote = "";
        if (unknown.length) {
            setStatus("Asking our AI about " + unknown.length + " more " + (unknown.length === 1 ? "part" : "parts") + "… this takes up to 20 seconds.");
            const ai = await askAi(unknown);
            (ai.items || []).forEach((it) => {
                const r = results[it.i];
                if (!r || r.source !== "none") return;
                r.source = "ai";
                if (/micronode power module/i.test(it.alt || "")) {
                    Object.assign(r, POWER_SWAP, { source: "micronode", newPrice: null, askPrice: true });
                } else if (it.alt && it.alt_price_inr > 0) {
                    r.alt = it.alt; r.newPrice = fromInr(it.alt_price_inr, cur);
                    r.match = it.match; r.risk = it.risk; r.note = it.note;
                    if (/MG51/i.test(it.alt)) r.product = "mg51";
                    if (/TM1637/i.test(it.alt)) r.product = "tm1637";
                } else {
                    r.note = it.note || "No cheaper equivalent we're confident about.";
                }
            });
            if (ai.error) aiNote = " Our AI couldn't be reached, so only built-in swaps are shown.";
        }

        // A "swap" that isn't cheaper is shown but not counted
        results.forEach((r) => { if (r.alt && r.price > 0 && r.newPrice >= r.price) r.use = false; });

        lastMeta = { volume, currency: cur };
        render();
        btn.disabled = false;
        btn.classList.remove("is-loading");
        btn.textContent = "Find savings again";
        setStatus("Done." + aiNote, aiNote ? "warn" : "ok");
        $("bomResults").hidden = false;
        $("bomResults").scrollIntoView({ behavior: "smooth", block: "start" });

        // The BOM itself is not saved anywhere; only an anonymous count goes to analytics
        const t = totals();
        track("bom_analyse", { bom_lines: results.length, bom_swaps: t.swaps, bom_saving_year: Math.round(t.year) });
    }
    $("bomAnalyse").addEventListener("click", analyse);

    // Volume presets fill the box; typing a value clears the highlight
    const presets = document.querySelectorAll(".bom-presets [data-vol]");
    function markPreset() { presets.forEach((b) => b.classList.toggle("is-on", b.dataset.vol === String(Math.round(num($("bomVolume").value))))); }
    presets.forEach((b) => b.addEventListener("click", () => { $("bomVolume").value = b.dataset.vol; markPreset(); }));
    $("bomVolume").addEventListener("input", markPreset);

    /* ── Step 3: results ── */
    function lineSaving(r) {
        if (!r.alt || !r.use || r.newPrice == null || !(r.price > 0)) return 0;
        return Math.max(0, (r.price - r.newPrice) * r.qty);
    }
    function totals() {
        const v = lastMeta ? lastMeta.volume : 1;
        const now = results.reduce((s, r) => s + r.price * r.qty, 0);
        const save = results.reduce((s, r) => s + lineSaving(r), 0);
        return { now, after: now - save, board: save, year: save * v, pct: now > 0 ? (save / now) * 100 : 0,
                 swaps: results.filter((r) => lineSaving(r) > 0).length, noPrice: results.filter((r) => !(r.price > 0)).length };
    }

    function render() {
        const t = totals();
        const cur = lastMeta.currency;
        const max = Math.max(t.now, 0.0001);
        const pct = Math.round(t.pct);

        // Headline and meta line
        $("bomHeadline").textContent = pct > 0 ? "This board could cost " + pct + "% less." : "No clear part swaps in this BOM.";
        $("bomMeta").textContent = "Estimated prices · " + t.swaps + " of " + results.length + " lines can swap · at " +
            lastMeta.volume.toLocaleString("en-IN") + " boards a year" + (t.noPrice ? " · " + t.noPrice + " lines have no price" : "");

        // Four cards; the yearly saving is the one that matters, so it is filled
        const kpi = (label, value, cls) => '<div class="bom-kpi' + (cls ? " " + cls : "") + '"><span>' + label + '</span><strong>' + value + '</strong></div>';
        $("bomKpis").innerHTML =
            kpi("Today, per board", money(t.now, cur)) +
            kpi("After swaps, per board", money(t.after, cur), "is-after") +
            kpi("Saving per board", money(t.board, cur)) +
            kpi("Saving per year", moneyShort(t.year, cur), "is-year");

        // Whole board: two columns with the % under them
        $("bomChart").innerHTML =
            '<div class="bom-cols" role="img" aria-label="Your BOM today ' + money(t.now, cur) + ' per board; with the suggested swaps ' + money(t.after, cur) + '">' +
            '<div class="bom-col" style="--h:100%"><i></i><strong>' + money(t.now, cur) + '</strong><span>Today</span></div>' +
            '<div class="bom-col is-after" style="--h:' + Math.max(2, t.after / max * 100).toFixed(1) + '%"><i></i><strong>' + money(t.after, cur) + '</strong><span>After swaps</span></div>' +
            '</div>' +
            '<p class="bom-whole-pct"><strong>' + pct + '%</strong><span>lower BOM cost</span></p>';

        // Where to save first: each line's cost per board today vs after, on one shared scale
        const top = results.filter((r) => lineSaving(r) > 0).sort((a, b) => lineSaving(b) - lineSaving(a)).slice(0, 5);
        const scale = Math.max.apply(null, top.map((r) => r.price * r.qty).concat([0.0001]));
        const w = (v) => Math.max(1.5, v / scale * 100).toFixed(1) + "%";
        $("bomTop").innerHTML = top.length ? top.map((r, n) =>
            '<li><div class="bom-top-row"><span class="bom-top-name"><em>' + String(n + 1).padStart(2, "0") + '</em> <b>' + esc(r.part || r.desc) +
            '</b> &rarr; <span class="bom-top-alt">' + esc(r.alt) + '</span></span><strong class="bom-top-save">saves ' + money(lineSaving(r), cur) + '</strong></div>' +
            '<div class="bom-pair" role="img" aria-label="' + esc(r.part || r.desc) + ': ' + money(r.price * r.qty, cur) + ' today, ' + money(r.newPrice * r.qty, cur) + ' after the swap, per board">' +
            '<i class="is-now" style="width:' + w(r.price * r.qty) + '"></i><i class="is-after" style="width:' + w(r.newPrice * r.qty) + '"></i></div></li>').join("")
            : '<li class="bom-top-empty">No clear swaps found in this BOM. A full review by our engineers often finds savings in the design itself, not just the parts.</li>';
        $("bomTopScale").textContent = top.length ? "Bars show cost per board for that line, " + money(0, cur) + "–" + money(scale, cur) + "." : "";

        // Every line
        $("bomOut").innerHTML = results.map((r) => {
            const s = lineSaving(r);
            // "Micronode pick" only marks swaps onto Micronode's own two boards (MG51, TM1637)
            const badge = r.alt && (r.product === "mg51" || r.product === "tm1637") ? '<span class="bom-badge is-mn">Micronode pick</span>'
                : r.source === "ai" && r.alt ? '<span class="bom-badge is-ai">AI suggestion, verify</span>' : "";
            const altCell = r.alt
                ? '<strong>' + esc(r.alt) + '</strong>' + badge + '<span class="bom-note">' + esc(r.note) + '</span>'
                : '<span class="bom-note">' + esc(r.note || "No suggestion.") + '</span>';
            const newCell = r.askPrice && r.newPrice == null
                ? '<button type="button" class="bom-ask" data-ask="' + r.i + '">Ask for price</button>'
                : r.alt
                ? '<label class="sr-only" for="np' + r.i + '">New price for ' + esc(r.part) + '</label><input class="bom-cell bom-num bom-newprice" id="np' + r.i + '" data-i="' + r.i + '" inputmode="decimal" value="' + round(r.newPrice) + '">'
                : "&mdash;";
            const canToggle = r.alt && r.newPrice != null;
            return '<tr class="' + (s > 0 ? "has-save" : "") + '">' +
                '<td>' + (canToggle ? '<input type="checkbox" class="bom-use" data-i="' + r.i + '" aria-label="Use this swap"' + (r.use ? " checked" : "") + '>' : "") + '</td>' +
                '<td><strong>' + esc(r.part) + '</strong><span class="bom-note">' + esc(r.desc) + (r.qty !== 1 ? " &middot; " + r.qty + " per board" : "") + '</span></td>' +
                '<td class="bom-numcell">' + (r.price > 0 ? money(r.price, cur) + (r.priceNote ? '<span class="bom-note">' + r.priceNote + '</span>' : "") : '<span class="bom-note">no price</span>') + '</td>' +
                '<td data-label="Suggested">' + altCell + '</td>' +
                '<td class="bom-numcell" data-label="New price">' + newCell + '</td>' +
                '<td>' + (r.match ? '<span class="bom-fit fit-' + slug(r.match) + '">' + esc(r.match) + '</span>' : "") + '</td>' +
                '<td>' + (r.risk ? '<span class="bom-risk risk-' + slug(r.risk) + '">' + esc(r.risk) + '</span>' : "") + '</td>' +
                '<td class="bom-numcell bom-save" data-label="Saving / year">' + (s > 0 ? money(s * lastMeta.volume, cur) : "&mdash;") + '</td></tr>';
        }).join("");

        // Micronode boards that fit this BOM (MG51 is always offered to try). Power modules appear only in the table.
        $("bomProducts").innerHTML = boardsFor().map((k) => {
            const p = PRODUCTS[k];
            return '<div class="bom-product"><div class="bom-product-media"><img src="' + p.img + '" alt="" width="80" height="60" loading="lazy" decoding="async"></div>' +
                '<div class="bom-product-body"><p class="bom-product-k">Try it on a Micronode board</p><h3>' + esc(p.name) + '</h3><p>' + esc(p.text) + '</p></div>' +
                '<a class="btn btn-primary" href="' + p.href + '" data-product="' + k + '">' + esc(p.cta) + '</a></div>';
        }).join("");
    }
    function boardsFor() {
        const wanted = new Set(results.filter((r) => r.product).map((r) => r.product));
        wanted.add("mg51");
        return ["mg51", "tm1637"].filter((k) => wanted.has(k));
    }
    function slug(s) { return String(s).toLowerCase().replace(/[^a-z]+/g, "-"); }
    function round(v) { return v == null ? "" : Math.round(v * 100) / 100; }

    // Editing a swap updates the totals
    $("bomOut").addEventListener("change", (e) => {
        const i = Number(e.target.dataset.i);
        const r = results[i];
        if (!r) return;
        if (e.target.classList.contains("bom-use")) r.use = e.target.checked;
        if (e.target.classList.contains("bom-newprice")) { const v = num(e.target.value); if (!isNaN(v) && v >= 0) { r.newPrice = v; r.use = true; } }
        render();
    });
    $("bomProducts").addEventListener("click", (e) => {
        const a = e.target.closest("[data-product]");
        if (a) track("bom_product_click", { bom_product: a.dataset.product });
    });

    // "Ask for price" on a power-module line or card: open the consultation form with a quote request
    function askPowerQuote() {
        const parts = results.filter((r) => r.askPrice).map((r) => (r.part || r.desc) + " x" + r.qty).join(", ");
        $("bomReview").click();                       // opens the form (site handler) and prefills the BOM summary
        const msg = $("fmessage");
        if (msg) {
            msg.value = ("Quote please for Micronode power modules to replace: " + (parts || "Hi-Link / G-Energy modules") +
                ". About " + lastMeta.volume + " boards/year.").slice(0, 500);
            msg.dispatchEvent(new Event("input"));
        }
        track("bom_power_quote");
    }
    document.addEventListener("click", (e) => { if (e.target.closest("[data-ask]")) askPowerQuote(); });

    /* ── Report emailed as a PDF (built by apps-script/consult-form.gs). Only sent when the visitor asks;
          the Sheet keeps the email and the totals, never the BOM lines. ── */
    function reportRows() {
        const cur = lastMeta.currency;
        return results.slice(0, 120).map((r) => ({
            part: (r.part || r.desc).slice(0, 60), desc: (r.part ? r.desc : "").slice(0, 80), qty: r.qty,
            now: r.price > 0 ? money(r.price, cur) : "-",
            alt: r.alt && r.use ? r.alt : "",
            newPrice: r.alt && r.use ? (r.newPrice != null ? money(r.newPrice, cur) : "Ask for price") : "",
            fit: r.alt && r.use ? r.match : "", risk: r.alt && r.use ? r.risk : "",
            note: (r.note || "").slice(0, 160),
            saveYear: lineSaving(r) > 0 ? money(lineSaving(r) * lastMeta.volume, cur) : ""
        }));
    }
    function sendReport(email, website) {
        if (!SHEET_URL || !lastMeta) return Promise.reject(new Error("not ready"));
        const t = totals(), cur = lastMeta.currency;
        const payload = {
            type: "bomreport", email, website, page: location.pathname, lines: results.length, volume: lastMeta.volume, currency: cur,
            perBoardNow: money(t.now, cur), perBoardNew: money(t.after, cur), savingBoard: money(t.board, cur), savingYear: money(t.year, cur),
            pct: Math.round(t.pct), swaps: t.swaps, rows: reportRows()
        };
        return fetch(SHEET_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
    }

    /* ── Branded PDF: a print-only report (#bomReport) in the site's colours, printed by the browser ── */
    function buildPrintReport() {
        if (!lastMeta || !results.length) return;
        const t = totals(), cur = lastMeta.currency, v = lastMeta.volume;
        const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
        const max = Math.max(t.now, 0.0001);
        const top = results.filter((r) => lineSaving(r) > 0).sort((a, b) => lineSaving(b) - lineSaving(a)).slice(0, 5);
        const kpi =(big, small) => '<div class="rp-kpi"><strong>' + big + '</strong><span>' + esc(small) + '</span></div>';
        const rows = results.map((r) => {
            const s = lineSaving(r);
            const newP = r.alt && r.use ? (r.newPrice != null ? money(r.newPrice, cur) : "Ask for price") : "";
            return '<tr' + (s > 0 ? ' class="rp-save-row"' : "") + '><td><b>' + esc(r.part) + '</b><small>' + esc(r.desc) + (r.qty !== 1 ? " · " + r.qty + " per board" : "") + '</small></td>' +
                '<td class="rp-n">' + (r.price > 0 ? money(r.price, cur) : "–") + '</td>' +
                '<td>' + (r.alt && r.use ? '<b>' + esc(r.alt) + '</b>' : "") + '<small>' + esc(r.note) + '</small></td>' +
                '<td class="rp-n">' + newP + '</td>' +
                '<td>' + (r.alt && r.use && r.match ? '<span class="rp-tag rp-' + slug(r.match) + '">' + esc(r.match) + '</span>' : "") + '</td>' +
                '<td>' + (r.alt && r.use && r.risk ? '<span class="rp-tag rp-risk-' + slug(r.risk) + '">' + esc(r.risk) + '</span>' : "") + '</td>' +
                '<td class="rp-n rp-s">' + (s > 0 ? money(s * v, cur) : "–") + '</td></tr>';
        }).join("");
        $("bomReport").innerHTML =
            '<header class="rp-head"><div class="rp-brand"><img src="images/micronode-holo-emblem.svg" alt="">' +
            '<span class="rp-word"><span>MICRO</span><span class="rp-node">NODE</span> <span class="rp-llp">LLP</span></span></div>' +
            '<div class="rp-head-r"><b>BOM cost-down report</b><span>' + date + '</span></div></header>' +
            '<section class="rp-hero"><p class="rp-k">Your estimate</p><h1>Your BOM could cost <em>' + Math.round(t.pct) + '% less</em>.</h1>' +
            '<p>' + results.length + ' lines checked at ' + v.toLocaleString("en-IN") + ' boards a year.</p></section>' +
            '<div class="rp-kpis">' + kpi(money(t.now, cur), "BOM cost per board today") + kpi(money(t.after, cur), "with the suggested swaps") +
            kpi(money(t.board, cur), "saved per board") + kpi(money(t.year, cur), "saved per year") + '</div>' +
            '<div class="rp-cols"><div class="rp-col" style="--h:100%"><i></i><b>' + money(t.now, cur) + '</b><span>Today</span></div>' +
            '<div class="rp-col rp-col-new" style="--h:' + Math.max(2, t.after / max * 100).toFixed(1) + '%"><i></i><b>' + money(t.after, cur) + '</b><span>After swaps</span></div></div>' +
            (top.length ? '<h2>Where to save first</h2><ol class="rp-top">' + top.map((r) =>
                '<li><span>' + esc(r.part || r.desc) + ' &rarr; <b>' + esc(r.alt) + '</b><small>' + esc(r.note) + '</small></span><strong>' + money(lineSaving(r) * v, cur) + '<small>per year</small></strong></li>').join("") + '</ol>' : "") +
            '<h2>Every line</h2><table class="rp-table"><thead><tr><th>Your part</th><th>Now</th><th>Suggested part</th><th>New price</th><th>Fit</th><th>Risk</th><th>Saving / year</th></tr></thead><tbody>' + rows + '</tbody></table>' +
            '<h2>Try it on a Micronode board</h2><div class="rp-products">' + boardsFor().map((k) => {
                const p = PRODUCTS[k];
                return '<div class="rp-product"><b>' + esc(p.name) + '</b><span>' + esc(p.text) + '</span><em>micronode.in/' + p.href + '</em></div>';
            }).join("") + '</div>' +
            '<div class="rp-cta"><div><b>Want the full saving, safely?</b><span>Our engineers review every line, check pinouts and firmware impact, and send a redesign plan with real supplier quotes. First review free, reply in 24–48 hours.</span></div><em>micronode.in/bom-estimator.html</em></div>' +
            '<p class="rp-note">This report was made with AI and can contain mistakes. Estimates use typical distributor prices and are a starting point, not a quote. Every swap should be checked against your design before production.</p>' +
            '<footer class="rp-foot"><span>Micronode LLP · Pune, India</span><span>info@micronode.in · +91 9511705410 · micronode.in</span></footer>';
    }
    window.addEventListener("beforeprint", buildPrintReport);

    /* ── Actions: PDF, full review, email ── */
    $("bomPrint").addEventListener("click", () => { buildPrintReport(); track("bom_pdf"); window.print(); });

    // Runs alongside the site's own data-open-consult handler, which opens the form
    $("bomReview").addEventListener("click", () => {
        const msg = $("fmessage");
        if (!msg || !lastMeta) return;
        const t = totals(), cur = lastMeta.currency;
        const top = results.filter((r) => lineSaving(r) > 0).sort((a, b) => lineSaving(b) - lineSaving(a)).slice(0, 3)
            .map((r) => (r.part || r.desc) + " -> " + r.alt).join("; ");
        msg.value = ("Full BOM review, please. From the BOM estimator: " + results.length + " lines, " + lastMeta.volume + " boards/year, " +
            money(t.now, cur) + "/board now, about " + money(t.after, cur) + " with swaps." + (top ? " Top swaps: " + top + "." : "")).slice(0, 500);
        msg.dispatchEvent(new Event("input"));
        track("bom_review_click");
    });

    $("bomEmailForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const note = $("bomEmailNote");
        const email = $("bomEmail").value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { note.textContent = "Please enter a valid email address."; note.className = "bom-hint is-error"; return; }
        const btn = e.target.querySelector("button[type='submit']");
        btn.disabled = true;
        note.textContent = "Sending…"; note.className = "bom-hint";
        sendReport(email, $("bomWebsite").value)
            .then(() => { note.textContent = "Sent. The PDF reaches your inbox in a minute (check spam too)."; note.className = "bom-hint is-ok"; track("bom_email"); })
            .catch(() => { note.textContent = "Couldn't send it. Use Download PDF instead, or email info@micronode.in."; note.className = "bom-hint is-error"; btn.disabled = false; });
    });

    // Start with one empty line so the table is ready to type into
    fillRows([]);
})();
