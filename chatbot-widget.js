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

    const STORAGE_KEY = "mnChatHistory";
    const MAX_STORED_MESSAGES = 30;

    const SUGGESTIONS = [
        "What does Micronode LLP do?",
        "Tell me about the MG51 Dev Board",
        "What's the TM1637 module used for?",
        "Can you supply under our brand?",
        "How do I start a project?",
    ];

    let history = loadHistory();
    let isSending = false;
    // Teaser bubble: pops up now and then above the launcher, rotating through these lines
    const TEASER_MESSAGES = [
        "Need a board designed, or a product under your brand? Ask us.",
        "Want a white-label product under your own name? Ask us.",
        "Got a product idea? Book a free consultation — just ask.",
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
            <button type="button" class="mn-chat-launcher" id="mnChatLauncher" aria-label="Open chat with Micronode assistant" aria-expanded="false">
                <svg class="mn-chat-icon-open" viewBox="11 14 42 38" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path class="mn-trace" d="M20 17H44A6 6 0 0 1 50 23V37A6 6 0 0 1 44 43H29L22 49V43H20A6 6 0 0 1 14 37V23A6 6 0 0 1 20 17Z"/>
                    <path class="mn-trace-pulse" pathLength="100" d="M20 17H44A6 6 0 0 1 50 23V37A6 6 0 0 1 44 43H29L22 49V43H20A6 6 0 0 1 14 37V23A6 6 0 0 1 20 17Z"/>
                    <circle class="mn-trace-dot" cx="25" cy="30" r="2.3"/><circle class="mn-trace-dot" cx="32" cy="30" r="2.3"/><circle class="mn-trace-dot" cx="39" cy="30" r="2.3"/>
                </svg>
                <svg class="mn-chat-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            <div class="mn-chat-teaser" id="mnChatTeaser" role="button" tabindex="0" aria-label="Open chat with Micronode assistant">
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
                    <p class="mn-chat-disclaimer">AI-generated answers about Micronode LLP.</p>
                </div>
            </div>
        `;
        document.body.appendChild(wrap);
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
        const left = SUGGESTIONS.filter((t) => !asked.has(t));
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
        setTimeout(() => {
            showTeaser();
            setInterval(showTeaser, TEASER_INTERVAL_MS);
        }, TEASER_FIRST_DELAY);
        // On a phone, scrolling means the visitor is reading: get out of the way
        if (IS_PHONE) window.addEventListener("scroll", hideTeaser, { passive: true });

        // Home page on a phone: keep the chat button out of the way of the hero buttons until the visitor scrolls
        if (IS_PHONE && document.getElementById("hero")) {
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
