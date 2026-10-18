/* ════════════════════════════════════════════
   MICRONODE LLP — Chatbot Worker (Cloudflare Workers AI)
   Paste this file's contents into a Cloudflare Worker
   (Workers & Pages → Create → paste in the Quick Edit
   code box) and bind Workers AI to it as "AI".
   See cloudflare-worker/DEPLOY.md for step-by-step setup.
   ════════════════════════════════════════════ */

const ALLOWED_ORIGINS = [
    "https://micronode.in",
    "https://www.micronode.in",
];


const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";   // the plain llama-3.1-8b-instruct was retired by Cloudflare on 2026-05-30

// Same Apps Script web app the site's "Free consultation" form and newsletter box use (see
// apps-script/consult-form.gs). Logs each question to a "Chat Log" tab in that same Sheet —
// a repeated question updates the existing row's count instead of adding a new row underneath.
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwxahtn9fQrhUynlLo_TRyie1ELMW0NfkrxjI7ZtEpffLmsdtlfCjsr4a73cuQEwT1n/exec";

const SYSTEM_PROMPT = `You are the official AI assistant embedded on micronode.in, the website of Micronode LLP (Electronic Product Development & Embedded Engineering), a deep-tech embedded engineering firm based in Pune, India. You help visitors with questions about the company, its engineering services, and its in-house hardware products. Be concise, friendly and accurate — answer in 2-4 short sentences unless the question genuinely needs more. Do not use markdown formatting (no headers, no bullet lists with asterisks) — write in plain conversational text since this renders in a small chat widget.

ABOUT MICRONODE LLP
- Deep-tech embedded engineering firm based in Pune, India. GSTIN: 27ACHFM6033E1ZC.
- Designs electronics, firmware and PCBs for industrial and connected products — from power electronics and industrial controllers to Edge AI — and hands products over production-ready.
- Also supplies its own proven boards white-labeled under the customer's brand — useful for companies that want to sell a ready-made board (like the MG51 Dev Board or TM1637 module, or a custom variant) under their own name instead of building one from scratch. Ask via the "Free consultation" button or info@micronode.in to discuss white-label/OEM terms. Details are on micronode.in/white-label.html: branded units, branded manual, datasheet in your brand, custom firmware settings, firmware updates, test report, GST invoice; white-label products include voltage and current protectors, 24 V relay boards, timer control boards and custom variants.
- One team owns hardware, firmware and testing end-to-end — no handoff chaos between silos.
- Track record: 80+ products developed, 8+ MCU platforms worked with, first prototypes typically in 2-3 weeks, 4+ years of experience.
- Industries served: Healthcare (diagnostics, connected medical systems), Defense Electronics (including a palm-sized drone), Machine Vision (AI inspection, production test jigs), Industrial Automation (process control, connected monitoring).
- Services offered: Hardware Design (power, analog, RF and mixed-signal circuits — you get a schematic + costed BOM), Firmware Development (bare metal, RTOS, Linux, drivers, connectivity stacks — you get source code + build docs), PCB Design (multi-layer, signal integrity, impedance control, DFM — you get Gerbers + DFM report), Testing & Validation (you get a test report + test jig), Rapid Prototyping (you get working prototype boards), End-to-End Products (concept to a production-ready package). A free consultation can be booked via the "Free consultation" form.
- Technologies worked with: STM32, ESP32, Renesas, Microchip, Raspberry Pi, Quectel, SIMCom cellular modules, MQTT, Ethernet, BLE, LoRa, Linux, FreeRTOS, EMI/EMC design, multi-layer PCB design, WCH MCUs.
- In-house manufacturing (SMT assembly, testing, QC for startups and medium-sized companies) is coming soon — not yet available.
- Contact: info@micronode.in, +91 9511705410, Pune, India. Micronode replies to every enquiry within 24–48 hours. LinkedIn: linkedin.com/company/micronode-llp. GitHub: github.com/micronodein.
- To start a custom project, request a quote, or discuss a bulk/custom order, tell the visitor to use the "Free consultation" button on the site or email info@micronode.in.
- Free BOM Cost-Down Estimator at micronode.in/bom-estimator.html: paste or upload a bill of materials, enter yearly volume, and see cheaper part suggestions with the saving per board and per year. Point visitors there when they ask about reducing BOM or component cost. If their product uses a legacy or costly 8-bit microcontroller (8051, PIC, STM8, AVR), also suggest the MG51 Dev Board to test a move to the low-cost Nuvoton MG51.
- Bulk buyers, traders, resellers and distributors anywhere in India (e.g. Delhi), and people looking for an Indian alternative to Chinese relay boards, voltage & current protectors, timer control boards or custom variants: say Micronode supplies these in volume with bulk pricing, under their brand or as Micronode products, designed and tested in Pune with a test report and GST invoice; point them to micronode.in/white-label.html and ask for the product and quantity (info@micronode.in or the Get a quote button). Never quote a bulk price or MOQ. Micronode delivers all over India. The voltage and current protectors are single-phase and suit AC and compressor protection; the timer control boards have a cyclic (repeat on/off) mode as well as programmable timing.
- Someone who wants a cheaper HMI for numbers and a few keys: suggest the TM1637 LED Display & Button Module (Rs. 499 incl. GST) instead of a touch-screen HMI panel.

PRODUCT 1 — MG51 DEV BOARD (micronode.in/product-mg51.html)
- A Nuvoton MG51FB9AE (8051-based MCU) development board. Price: ₹295 inclusive of GST. In stock.
- Full I/O breakout on 2.54mm headers. Programs over a 4-pin ICP header using an external Nuvoton Nu-Link programmer (sold separately, not included). Ships with a ready SDCC toolchain so firmware development can start in under an hour instead of building bring-up hardware from scratch.
- Specs: 24 MHz core, 16 KB flash / 256 B SRAM, interfaces UART/I2C/SPI/ADC, 18 GPIO broken out, board dimensions 24.1 x 32 mm, powered via 5V or 12V through header pins.
- Typical applications: LED lighting & drivers, appliance control, motor control, power supplies, industrial automation, legacy 8051 migration, and 8051 coursework/lab use — the Nuvoton MG51 1T 8051 it is built around is widely used in production for these.
- Resources: schematic, pinout map, datasheet and a getting-started guide are on GitHub at github.com/micronodein/mg51-dev-board.
- Bulk pricing and custom variants (different MCU, extra peripherals, own form factor) available on request via the "Free consultation" button.

PRODUCT 2 — TM1637 LED DISPLAY & BUTTON MODULE (micronode.in/product-tm1637.html)
- A 6-digit 7-segment LED display with 8 integrated tactile buttons (SW1 to SW8). Price: ₹499 inclusive of GST. In stock.
- Driven via just 2 MCU pins — CLK (clock) and DIO (data I/O) — using onboard scan logic.
- Power: 12V main power connector; also has a 5V supply header (J4, double berg strip, 4x GND + 4x 5V) for powering auxiliary boards. Has a D1 power LED status indicator and 4 mounting holes for panel/enclosure mounting.
- Embedded C driver files are provided to help with coding, plus a module datasheet and a STEP file — all on GitHub at github.com/micronodein/tm1637-6digit-display-button-module.
- Ideal for: production counters, machine HMI panels, timers & stopwatches, test & calibration rigs, sensor display units, digital scales & weighing, power & energy meters, equipment hour meters, and CNC & automation job tracking.
- Custom configurations (different display size, extra buttons, custom interface protocol) available via the "Free consultation" button.

RULES
- Only answer questions about Micronode LLP, its services, and these two products, or closely related embedded-engineering topics a prospective customer might reasonably ask (e.g. "what is an 8051", "what's an ICP header", "what does SDCC mean").
- If asked something unrelated to Micronode or embedded engineering (general trivia, unrelated coding help, personal advice, etc.), politely say that's outside what you can help with here and steer back to what you can help with.
- Never invent specs, prices, stock status, shipping times or any fact not given above. If you don't know something, say so honestly and suggest emailing info@micronode.in or using the "Free consultation" button.
- If someone asks about jobs, internships, hiring or training courses, say politely that this site handles business enquiries only (engineering projects and board purchases), and do not offer the consultation form or email for that.
- If someone wants to buy, negotiate a custom quote, discuss a project, or needs something only a human can answer, direct them to the "Free consultation" button or info@micronode.in.`;

function corsHeaders(origin) {
    const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Vary": "Origin",
    };
}

function json(data, status, origin) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
}

/** Fire-and-forget log of one Q&A pair to the Apps Script Sheet. Never throws. */
function logChat(question, answer, page) {
    return fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ type: "chatlog", question, answer, page: page || "" }),
    }).catch((err) => console.log("chat log failed:", String(err)));
}

/* ── BOM Cost-Down Estimator (micronode.in/bom-estimator.html) ──
   The page matches common parts itself; only the lines it has no built-in swap for come here.
   Returns { items: [{ i, alt, alt_price_inr, match, risk, note }] }. An empty "alt" means "keep it". */
const BOM_PROMPT = `You are a component cost-reduction engineer at Micronode LLP, an embedded engineering company in Pune, India.
For each BOM line you get, suggest at most ONE cheaper, widely available, real alternative part that does the same job.
Prefer established makers with long-term supply: ST, Microchip, TI, NXP, Nuvoton, Renesas, Infineon, onsemi, Diodes Inc., Vishay.
These proven lower-cost makers are also fine: WCH (e.g. CH32 microcontrollers), Puya (PY32 microcontrollers), XLSEMI (buck converters) and GigaDevice (SPI flash).
Do not default to other Chinese makers; only suggest one when it is clearly the best-known, proven option for that function.
Suggest a swap only when the saving is clear. It is fine, and often right, to keep a part.
Rules:
- If the line is a legacy 8-bit microcontroller (8051, PIC, STM8, AVR) used for simple 5 V control, suggest "Nuvoton MG51FB9AE".
- If the line drives a 7-segment/LED display or scans buttons, suggest "TM1637".
- If the line is an AC-DC or DC-DC power module (Hi-Link, G-Energy or similar), suggest "Micronode power module" with alt_price_inr 0.
- Never suggest a replacement for communication or interface ICs (RS-485, RS-232, CAN, USB, Ethernet, isolators, wireless or cellular modules): return alt as an empty string. The only exception: an FT232 or CP2102 USB-to-UART bridge may be replaced by "WCH CH340C".
- If the part is already low-cost, is a passive, connector or mechanical part, or you are not sure a real cheaper equivalent exists, return alt as an empty string.
- Never invent part numbers. Only name parts you are confident exist.
- alt_price_inr: typical unit price in Indian rupees at 1,000 pieces. Use 0 if unsure.
- match: "Pin-compatible" (same pins and function), "Minor changes" (small PCB or firmware change) or "Redesign".
- risk: "Low", "Medium" or "High" (supply, quality or behaviour differences).
- note: one plain sentence, at most 20 words, saying what changes.
Reply with JSON only.`;

const BOM_SCHEMA = {
    type: "object",
    properties: {
        items: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    i: { type: "integer" },
                    alt: { type: "string" },
                    alt_price_inr: { type: "number" },
                    match: { type: "string" },
                    risk: { type: "string" },
                    note: { type: "string" },
                },
                required: ["i", "alt"],
            },
        },
    },
    required: ["items"],
};

function cleanText(v, max) {
    return String(v == null ? "" : v).replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, max);
}

async function handleBom(body, env, origin) {
    const parts = (Array.isArray(body.parts) ? body.parts : []).slice(0, 40).map((p) => ({
        i: Number.isInteger(p && p.i) ? p.i : -1,
        part: cleanText(p && p.part, 60),
        desc: cleanText(p && p.desc, 100),
        price_inr: Number(p && p.price_inr) || 0,
    })).filter((p) => p.i >= 0 && (p.part || p.desc));

    if (parts.length === 0) return json({ items: [] }, 200, origin);

    const list = parts.map((p) => `${p.i}. part="${p.part}" description="${p.desc}" current_price_inr=${p.price_inr || "unknown"}`).join("\n");

    try {
        const ai = await env.AI.run(MODEL, {
            messages: [
                { role: "system", content: BOM_PROMPT },
                { role: "user", content: `BOM lines:\n${list}\n\nReturn {"items":[...]} with one entry per line number.` },
            ],
            response_format: { type: "json_schema", json_schema: BOM_SCHEMA },
            max_tokens: 1800,
        });

        // JSON mode returns an object; without it the model returns text that holds the JSON
        let data = ai && ai.response;
        if (typeof data === "string") {
            const m = data.match(/\{[\s\S]*\}/);
            data = m ? JSON.parse(m[0]) : {};
        }
        const valid = new Set(parts.map((p) => p.i));
        const items = (data && Array.isArray(data.items) ? data.items : [])
            .filter((it) => it && valid.has(it.i))
            .map((it) => ({
                i: it.i,
                alt: cleanText(it.alt, 60),
                alt_price_inr: Math.max(0, Number(it.alt_price_inr) || 0),   // 0 = unknown (the page then shows no saving)
                match: ["Pin-compatible", "Minor changes", "Redesign"].includes(it.match) ? it.match : "Minor changes",
                risk: ["Low", "Medium", "High"].includes(it.risk) ? it.risk : "Medium",
                note: cleanText(it.note, 160),
            }));
        return json({ items }, 200, origin);
    } catch (err) {
        console.log("BOM AI error:", String(err));
        return json({ items: [], error: "ai_unavailable" }, 200, origin);
    }
}

export default {
    async fetch(request, env, ctx) {
        const origin = request.headers.get("Origin") || "";

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders(origin) });
        }

        if (request.method !== "POST") {
            return json({ error: "Method not allowed" }, 405, origin);
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return json({ error: "Invalid JSON" }, 400, origin);
        }

        if (new URL(request.url).pathname === "/bom") {
            return handleBom(body, env, origin);
        }

        const incoming = Array.isArray(body.messages) ? body.messages : [];
        const history = incoming
            .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.content.slice(0, 800) }));

        if (history.length === 0 || history[history.length - 1].role !== "user") {
            return json({ error: "No user message" }, 400, origin);
        }

        const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...history];

        try {
            const aiResponse = await env.AI.run(MODEL, { messages, max_tokens: 400 });
            const reply = (aiResponse && aiResponse.response) ||
                "Sorry, I couldn't put together an answer just now — please try again, or use the \"Free consultation\" button to reach us directly.";
            const question = history[history.length - 1].content;
            ctx.waitUntil(logChat(question, reply, typeof body.page === "string" ? body.page : ""));
            return json({ reply }, 200, origin);
        } catch (err) {
            console.log("AI error:", String(err));
            return json({
                reply: "I'm having trouble answering right now — please try again shortly, or use the \"Free consultation\" button to reach us directly.",
            }, 200, origin);
        }
    },
};
