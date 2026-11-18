/* ════════════════════════════════════════════
   MICRONODE LLP — Chatbot Widget
   Talks to the Cloudflare Worker in /cloudflare-worker
   (free Workers AI backend). See cloudflare-worker/DEPLOY.md
   to deploy the backend, then set CHAT_API_URL below.
   ════════════════════════════════════════════ */

(function () {
    // Folder this script was loaded from, so images resolve from pages in sub-folders (e.g. /blog/) too
    const BASE = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/[^\/]*$/, "") : "";

    // TODO: replace with your deployed Worker URL, e.g.
    // "https://micronode-chatbot.yoursubdomain.workers.dev"
    const CHAT_API_URL = "https://micronode-chatbot.micronode-in.workers.dev";

    // WhatsApp button stacked above the chat launcher (country code without "+")
    const WHATSAPP_NUMBER = "919511705410";
    const WHATSAPP_MESSAGE = "Hi Micronode, I have a project: ";

    const STORAGE_KEY = "mnChatHistory";
    const MAX_STORED_MESSAGES = 30;

    const SUGGESTIONS = [
        "What do you build?",
        "How does a project run?",
        "What are your prices?",
        "What's the minimum quantity?",
        "Can you supply under our brand?",
        "Tell me about the MG51 Dev Board",
    ];
    // A fresh chat offers only the first few; the rest join the scrolling row once the conversation starts
    const FIRST_SUGGESTIONS = 3;

    let history = loadHistory();
    let isSending = false;
    // Teaser bubble: pops up now and then above the launcher, rotating through these lines
    const TEASER_MESSAGES = [
        "Need a board designed, or a product under your brand? Ask us.",
        "Want a white-label product under your own name? Ask us.",
        "Got a product idea? Get a free project review — just ask.",
        "Firmware, PCB or Edge AI help? Ask us.",
    ];
    // On phones the bubble is shorter, rarer and quicker to leave so it never sits on top of buttons
    const IS_PHONE = window.matchMedia("(max-width: 600px)").matches;
    const TEASER_MESSAGES_PHONE = [
        "Need a board designed? Ask us.",
        "White-label under your brand? Ask us.",
    ];
    const TEASER_FIRST_DELAY = IS_PHONE ? 8000 : 3000;     // first appearance after page load
    const TEASER_VISIBLE_MS  = IS_PHONE ? 5000 : 9000;     // how long each message stays
    const TEASER_INTERVAL_MS = IS_PHONE ? 60000 : 24000;   // gap between appearances (start to start)
    let teaserIndex = 0, teaserStopped = false, teaserHideTimer;
    let panelEl, bodyEl, formEl, inputEl, sendEl, launcherEl, suggestionsEl, teaserEl;

    function loadHistory() {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    function saveHistory() {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_STORED_MESSAGES)));
        } catch {
            /* sessionStorage unavailable — conversation just won't persist across pages */
        }
    }

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    function buildMarkup() {
        const wrap = document.createElement("div");
        wrap.innerHTML = `
            <a class="mn-wa" href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}" target="_blank" rel="noopener" aria-label="Urgent project? Chat with Micronode on WhatsApp (opens WhatsApp)">
                <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M16.04 3C8.86 3 3.03 8.82 3.03 15.99c0 2.29.6 4.53 1.74 6.5L3 29l6.68-1.75a12.97 12.97 0 0 0 6.36 1.62h.01c7.17 0 13-5.83 13-13S23.21 3 16.04 3zm0 23.68h-.01a10.8 10.8 0 0 1-5.5-1.51l-.4-.23-3.96 1.04 1.06-3.86-.26-.4a10.75 10.75 0 0 1-1.65-5.73c0-5.96 4.85-10.8 10.82-10.8 2.89 0 5.6 1.12 7.64 3.17a10.73 10.73 0 0 1 3.16 7.64c0 5.96-4.85 10.81-10.9 10.68zm5.93-8.09c-.32-.16-1.93-.95-2.23-1.06-.3-.11-.52-.16-.73.16-.22.33-.84 1.06-1.03 1.28-.19.22-.38.24-.71.08-.32-.16-1.37-.5-2.6-1.6-.96-.86-1.61-1.92-1.8-2.24-.19-.33-.02-.5.14-.66.15-.15.32-.38.49-.57.16-.19.21-.33.32-.54.11-.22.05-.41-.03-.57-.08-.16-.73-1.76-1-2.41-.26-.63-.53-.55-.73-.56h-.62c-.22 0-.57.08-.87.41-.3.33-1.14 1.11-1.14 2.71s1.17 3.14 1.33 3.36c.16.22 2.3 3.51 5.57 4.92.78.34 1.39.54 1.86.69.78.25 1.49.21 2.05.13.63-.09 1.93-.79 2.2-1.55.27-.76.27-1.42.19-1.55-.08-.14-.3-.22-.62-.38z"/></svg>
                <span class="mn-wa-label">Urgent project? WhatsApp us</span>
            </a>

            <button type="button" class="mn-chat-launcher" id="mnChatLauncher" aria-label="Open chat with Micronode assistant" aria-expanded="false">
                <svg class="mn-chat-icon-open" viewBox="11 14 42 38" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path class="mn-trace" d="M20 17H44A6 6 0 0 1 50 23V37A6 6 0 0 1 44 43H29L22 49V43H20A6 6 0 0 1 14 37V23A6 6 0 0 1 20 17Z"/>
                    <path class="mn-trace-pulse" pathLength="100" d="M20 17H44A6 6 0 0 1 50 23V37A6 6 0 0 1 44 43H29L22 49V43H20A6 6 0 0 1 14 37V23A6 6 0 0 1 20 17Z"/>
                    <circle class="mn-trace-dot" cx="25" cy="30" r="2.3"/><circle class="mn-trace-dot" cx="32" cy="30" r="2.3"/><circle class="mn-trace-dot" cx="39" cy="30" r="2.3"/>
                </svg>
                <svg class="mn-chat-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            <div class="mn-chat-teaser" id="mnChatTeaser" role="button" tabindex="0">
                <strong>Micronode</strong> · <span id="mnChatTeaserText"></span>
            </div>

            <div class="mn-chat-panel" id="mnChatPanel" role="dialog" aria-modal="false" aria-labelledby="mnChatTitle">
                <div class="mn-chat-head">
                    <div class="mn-chat-head-avatar">
                        <img src="${BASE}images/micronode-holo-emblem.svg" alt="Micronode LLP" />
                    </div>
                    <div class="mn-chat-head-text">
                        <h4 id="mnChatTitle">Micronode Assistant</h4>
                        <span><i></i>Ask about our products &amp; services</span>
                    </div>
                    <button type="button" class="mn-chat-close" id="mnChatClose" aria-label="Close chat">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>

                <div class="mn-chat-body" id="mnChatBody"></div>

                <div class="mn-chat-suggestions" id="mnChatSuggestions"></div>

                <div class="mn-chat-foot">
                    <form class="mn-chat-form" id="mnChatForm">
                        <textarea class="mn-chat-input" id="mnChatInput" name="chat_message" autocomplete="off" aria-label="Type your question" placeholder="Ask a question…" rows="1" maxlength="500"></textarea>
                        <button type="submit" class="mn-chat-send" id="mnChatSend" aria-label="Send message">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        </button>
                    </form>
                    <p class="mn-chat-disclaimer">AI answers. Please don't paste confidential files here.</p>
                </div>
            </div>
        `;
        document.body.appendChild(wrap);
        document.body.classList.add("mn-has-wa");   // lets the CSS lift the chat teaser above the WhatsApp icon
    }

    function renderMessage(role, text, kind) {
        const el = document.createElement("div");
        el.className = "mn-msg " + (kind || (role === "user" ? "mn-msg-user" : "mn-msg-bot"));
        const p = document.createElement("p");
        p.innerHTML = escapeHtml(text);
        el.appendChild(p);
        bodyEl.appendChild(el);
        bodyEl.scrollTop = bodyEl.scrollHeight;
        return el;
    }

    function renderTyping() {
        const el = document.createElement("div");
        el.className = "mn-msg-typing";
        el.id = "mnChatTypingIndicator";
        el.innerHTML = "<i></i><i></i><i></i>";
        bodyEl.appendChild(el);
        bodyEl.scrollTop = bodyEl.scrollHeight;
    }

    function removeTyping() {
        const el = document.getElementById("mnChatTypingIndicator");
        if (el) el.remove();
    }

    // Suggested questions stay available: questions already asked drop out, the rest move to one scrolling row
    function renderSuggestions() {
        const asked = new Set(history.filter((m) => m.role === "user").map((m) => m.content));
        const remaining = SUGGESTIONS.filter((t) => !asked.has(t));
        const left = history.length ? remaining : remaining.slice(0, FIRST_SUGGESTIONS);
        suggestionsEl.innerHTML = "";
        suggestionsEl.classList.toggle("is-compact", history.length > 0);
        suggestionsEl.style.display = left.length ? "" : "none";
        left.forEach((text) => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "mn-chip";
            chip.textContent = text;
            chip.addEventListener("click", () => sendMessage(text));
            suggestionsEl.appendChild(chip);
        });
    }

    function renderHistory() {
        bodyEl.innerHTML = "";
        if (history.length === 0) {
            renderMessage("assistant", "Hi! I'm the Micronode LLP assistant. Ask me anything about our MG51 Dev Board, TM1637 module, or embedded engineering services.");
        } else {
            history.forEach((m) => renderMessage(m.role, m.content));
        }
    }

    function hideTeaser() {
        clearTimeout(teaserHideTimer);
        teaserEl.classList.remove("is-visible");
    }

    function showTeaser() {
        if (teaserStopped || panelEl.classList.contains("is-open")) return;
        const messages = IS_PHONE ? TEASER_MESSAGES_PHONE : TEASER_MESSAGES;
        document.getElementById("mnChatTeaserText").textContent = messages[teaserIndex % messages.length];
        teaserIndex = (teaserIndex + 1) % messages.length;
        teaserEl.classList.add("is-visible");
        teaserHideTimer = setTimeout(hideTeaser, TEASER_VISIBLE_MS);
    }

    // Once the visitor opens the chat, the teaser is no longer needed this session
    function stopTeaser() {
        teaserStopped = true;
        hideTeaser();
    }

    function openPanel() {
        stopTeaser();
        panelEl.classList.add("is-open");
        launcherEl.classList.add("is-open");
        launcherEl.setAttribute("aria-expanded", "true");
        setTimeout(() => inputEl.focus(), 150);
    }

    function closePanel() {
        panelEl.classList.remove("is-open");
        launcherEl.classList.remove("is-open");
        launcherEl.setAttribute("aria-expanded", "false");
    }

    async function sendMessage(text) {
        const message = (text || "").trim();
        if (!message || isSending) return;

        renderMessage("user", message);
        history.push({ role: "user", content: message });
        saveHistory();
        renderSuggestions();

        inputEl.value = "";
        autoResize();
        isSending = true;
        sendEl.disabled = true;
        renderTyping();

        try {
            const res = await fetch(CHAT_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: history, page: location.pathname }),
            });
            const data = await res.json();
            removeTyping();

            if (!res.ok || !data.reply) {
                renderMessage("assistant", "Sorry, something went wrong on my end. Please try again, or email info@micronode.in.", "mn-msg-error");
            } else {
                renderMessage("assistant", data.reply);
                history.push({ role: "assistant", content: data.reply });
                saveHistory();
            }
        } catch (err) {
            removeTyping();
            renderMessage("assistant", "I couldn't reach the server — check your connection and try again, or email info@micronode.in.", "mn-msg-error");
        } finally {
            isSending = false;
            sendEl.disabled = false;
        }
    }

    function autoResize() {
        inputEl.style.height = "auto";
        inputEl.style.height = Math.min(inputEl.scrollHeight, 90) + "px";
    }

    function init() {
        if (!CHAT_API_URL || CHAT_API_URL.indexOf("YOUR-SUBDOMAIN") !== -1) {
            console.warn("Micronode chatbot: CHAT_API_URL is not configured yet — see cloudflare-worker/DEPLOY.md");
        }

        buildMarkup();

        launcherEl = document.getElementById("mnChatLauncher");
        panelEl = document.getElementById("mnChatPanel");
        bodyEl = document.getElementById("mnChatBody");
        formEl = document.getElementById("mnChatForm");
        inputEl = document.getElementById("mnChatInput");
        sendEl = document.getElementById("mnChatSend");
        suggestionsEl = document.getElementById("mnChatSuggestions");

        renderSuggestions();
        renderHistory();

        launcherEl.addEventListener("click", () => {
            panelEl.classList.contains("is-open") ? closePanel() : openPanel();
        });
        document.getElementById("mnChatClose").addEventListener("click", closePanel);

        teaserEl = document.getElementById("mnChatTeaser");
        teaserEl.addEventListener("click", (e) => { e.stopPropagation(); openPanel(); });
        teaserEl.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPanel(); } });
        // The teaser never covers the hero: it starts only once the visitor has scrolled past most of the first screen
        let teaserArmed = false;
        const armTeaser = () => {
            if (teaserArmed || window.scrollY < window.innerHeight * 0.6) return;
            teaserArmed = true;
            window.removeEventListener("scroll", armTeaser);
            setTimeout(() => {
                showTeaser();
                setInterval(showTeaser, TEASER_INTERVAL_MS);
            }, TEASER_FIRST_DELAY);
        };
        window.addEventListener("scroll", armTeaser, { passive: true });
        armTeaser();
        // On a phone, scrolling means the visitor is reading: get out of the way
        if (IS_PHONE) window.addEventListener("scroll", hideTeaser, { passive: true });

        // Home page: keep the chat button off the hero (buttons, stats strip) until the visitor scrolls
        if (document.getElementById("hero")) {
            const syncHeroTop = () => document.body.classList.toggle("mn-hero-top", window.scrollY < 60);
            window.addEventListener("scroll", syncHeroTop, { passive: true });
            syncHeroTop();
        }

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && panelEl.classList.contains("is-open")) closePanel();
        });
        document.addEventListener("click", (e) => {
            if (!panelEl.classList.contains("is-open")) return;
            // a clicked suggestion chip is replaced while the click is still travelling, so check the original path, not the (now detached) target
            const path = e.composedPath ? e.composedPath() : [];
            if (path.includes(panelEl) || path.includes(launcherEl) || (path.includes(teaserEl))) return;
            if (panelEl.contains(e.target) || launcherEl.contains(e.target)) return;
            closePanel();
        });

        formEl.addEventListener("submit", (e) => {
            e.preventDefault();
            sendMessage(inputEl.value);
        });
        inputEl.addEventListener("input", autoResize);
        inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(inputEl.value);
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
