/* ════════════════════════════════════════════
   MICRONODE LLP — Main Scripts
   ════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {
    initMotion();
    initPageWipe();
    initScrollProgress();
    initNodeNetwork();
    initScrollReveal();
    initHeader();
    initNavigation();
    initNavDots();
    initStatCounters();
    initProjectSlider();
    initConsultModal();
    initConsultForm();
    initNewsletterForm();
    initCardEffects();
    initMagneticButtons();
    initProductGallery();
<<<<<<< HEAD
    initPhotoRotators();
    initSwipeIndicators();
    initRotatingWord();
    initMailLinks();
    initCompanyMenu();
    initFaqGroups();
=======
>>>>>>> 88050eac84b2fcf646f05b9e557c02090696b76d
});

/* ── Swipe indicator for the 01 services row (phones): a line above the cards, one segment per card ── */
function initSwipeIndicators() {
    document.querySelectorAll(".wwd-grid").forEach(row => {
        const cards = [...row.children];
        if (cards.length < 2) return;

        const ind = document.createElement("div");
        ind.className = "swipe-ind";
        ind.setAttribute("aria-hidden", "true");
        ind.style.setProperty("--n", cards.length);
        const fill = document.createElement("span");
        fill.className = "swipe-fill";
        ind.appendChild(fill);
        row.insertAdjacentElement("beforebegin", ind);

        let ticking = false;
        const update = () => {
            ticking = false;
            const pitch = cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left;
            let idx = pitch > 0 ? Math.round(row.scrollLeft / pitch) : 0;
            if (row.scrollLeft + row.clientWidth >= row.scrollWidth - 4) idx = cards.length - 1;
            idx = Math.max(0, Math.min(cards.length - 1, idx));
            fill.style.width = ((idx + 1) / cards.length * 100) + "%";
        };
        row.addEventListener("scroll", () => {
            if (!ticking) { ticking = true; requestAnimationFrame(update); }
        }, { passive: true });
        window.addEventListener("resize", update);
        update();
    });
}

/* ── Scroll Progress Bar ── */
function initScrollProgress() {
    const bar = document.getElementById("scrollProgress");
    if (!bar) return;
    window.addEventListener("scroll", () => {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = total > 0 ? `${(window.scrollY / total) * 100}%` : "0%";
    }, { passive: true });
}

/* ── Auto-Rotating Photo Cards (e.g. Machine Vision industry card) ── */
function initPhotoRotators() {
    document.querySelectorAll(".ind-photo-rotate").forEach(wrap => {
        const imgs = wrap.querySelectorAll(".ind-img");
        if (imgs.length < 2) return;
        let i = 0;
        setInterval(() => {
            imgs[i].classList.remove("is-active");
            i = (i + 1) % imgs.length;
            imgs[i].classList.add("is-active");
        }, 3500);
    });
}

/* ── Mouse-Reactive Node Network Background ── */
function initNodeNetwork() {
    const canvas = document.getElementById("nodeCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let nodes = [], animId = null, w = 0, h = 0;
    const mouse = { x: -1000, y: -1000 };
    const CONNECT_DIST = 155, MOUSE_DIST = 180;
    const COLOR = "123,97,255";

    function resize() {
        w = canvas.width  = window.innerWidth;
        h = canvas.height = window.innerHeight;
        buildNodes();
    }

    function buildNodes() {
        const n = Math.min(Math.floor(w * h / 14000), 100);
        nodes = Array.from({ length: n }, () => ({
            x:  Math.random() * w,
            y:  Math.random() * h,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            r:  Math.random() * 1.6 + 1.1,
            op: Math.random() * 0.45 + 0.45
        }));
    }

    function draw() {
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < nodes.length; i++) {
            const a = nodes[i];
            const mdx = mouse.x - a.x, mdy = mouse.y - a.y;
            const md  = Math.hypot(mdx, mdy);
            if (md < MOUSE_DIST && md > 0) {
                const f = ((MOUSE_DIST - md) / MOUSE_DIST) * 0.015;
                a.vx += (mdx / md) * f;
                a.vy += (mdy / md) * f;
            }
            a.vx *= 0.999; a.vy *= 0.999;
            a.x  += a.vx;  a.y  += a.vy;
            if (a.x < 0 || a.x > w) a.vx *= -1;
            if (a.y < 0 || a.y > h) a.vy *= -1;

            ctx.beginPath();
            ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${COLOR},${a.op})`;
            ctx.fill();

            for (let j = i + 1; j < nodes.length; j++) {
                const b = nodes[j];
                const d = Math.hypot(a.x - b.x, a.y - b.y);
                if (d < CONNECT_DIST) {
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = `rgba(${COLOR},${(1 - d / CONNECT_DIST) * 0.14})`;
                    ctx.lineWidth = 0.7;
                    ctx.stroke();
                }
            }
        }
        animId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("mousemove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });
    let rt;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 200); });
    document.addEventListener("visibilitychange", () => {
        document.hidden ? cancelAnimationFrame(animId) : draw();
    });
}

/* ── Scroll Reveal with directional animations ── */
function initScrollReveal() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        document.querySelectorAll(".reveal, .section-header").forEach(el => {
            el.classList.add("visible");
            el.style.opacity = "1";
            el.style.transform = "none";
        });
        return;
    }

    // Auto-stagger for grid children
    document.querySelectorAll(".tlogo-card").forEach((card, i) => {
        card.style.transitionDelay = `${(i % 6) * 0.06}s`;
    });
    document.querySelectorAll(".ind-card").forEach((card, i) => {
        card.style.transitionDelay = `${(i % 4) * 0.08}s`;
    });
    document.querySelectorAll(".prod-card").forEach((card, i) => {
        card.dataset.dir = "scale";
        card.style.transitionDelay = `${i * 0.1}s`;
    });
    document.querySelectorAll(".why-card").forEach((card, i) => {
        card.style.transitionDelay = `${(i % 2) * 0.1}s`;
    });
    document.querySelectorAll(".proc-step").forEach((card, i) => {
        card.style.transitionDelay = `${i * 0.08}s`;
    });

    const obs = new IntersectionObserver(
        entries => entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add("visible");
                obs.unobserve(e.target);
            }
        }),
        { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    document.querySelectorAll(".reveal, .section-header").forEach(el => obs.observe(el));
}

/* ── Sticky Header ── */
function initHeader() {
    const header = document.getElementById("siteHeader");
    if (!header) return;
    let ticking = false;
    window.addEventListener("scroll", () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                header.classList.toggle("scrolled", window.scrollY > 40);
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

/* ── Mobile Nav ── */
function initNavigation() {
    const toggle = document.getElementById("navToggle");
    const nav    = document.getElementById("navLinks");
    if (!toggle || !nav) return;

    const links = nav.querySelectorAll("a");

    toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("open");
        toggle.classList.toggle("open", open);
        toggle.setAttribute("aria-expanded", open);
        document.body.style.overflow = open ? "hidden" : "";
        document.body.classList.toggle("nav-open", open);
    });

    links.forEach(l => l.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
        document.body.classList.remove("nav-open");
    }));

    // Tapping the dimmed page (outside the drawer) closes the menu
    document.addEventListener("click", e => {
        if (!document.body.classList.contains("nav-open")) return;
        if (e.target.closest("#navLinks, #navToggle")) return;
        toggle.click();
    });

    // Active link on scroll
    const sectObs = new IntersectionObserver(
        entries => entries.forEach(e => {
            if (e.isIntersecting) {
                const id = e.target.id;
                links.forEach(l => {
                    l.classList.toggle("active", l.getAttribute("href") === `#${id}`);
                });
            }
        }),
        { threshold: 0.3, rootMargin: "-72px 0px -40% 0px" }
    );
    document.querySelectorAll("section[id]").forEach(s => sectObs.observe(s));
}

/* ── Side Navigation Dots ── */
function initNavDots() {
    const dots = document.querySelectorAll(".side-dot");
    if (!dots.length) return;
    const nav = document.getElementById("sideDots");

    const obs = new IntersectionObserver(
        entries => entries.forEach(e => {
            if (e.isIntersecting) {
                dots.forEach(d => {
                    d.classList.toggle("active", d.getAttribute("href") === `#${e.target.id}`);
                });
            }
        }),
        { threshold: 0.35, rootMargin: "-72px 0px -40% 0px" }
    );
    document.querySelectorAll("section[id]").forEach(s => obs.observe(s));

    // Dots sit over the light "Built Different" panel — darken them while it's behind.
    // The section runs past the light area (the cards overhang onto the purple), so
    // measure to the ::before panel's bottom rather than the section's.
    const lightPanel = document.getElementById("why-us");
    if (nav && lightPanel) {
        let queued = false;
        const sync = () => {
            const r = lightPanel.getBoundingClientRect();
            const overhang = parseFloat(getComputedStyle(lightPanel).getPropertyValue("--overhang-bottom")) || 70;
            const lightBottom = r.bottom - overhang;
            const mid = window.innerHeight / 2;
            nav.classList.toggle("on-light", r.top < mid && lightBottom > mid);
            queued = false;
        };
        window.addEventListener("scroll", () => {
            if (!queued) { queued = true; requestAnimationFrame(sync); }
        }, { passive: true });
        window.addEventListener("resize", sync);
        sync();
    }
}

/* ── Hero Stat Counters ── */
function initStatCounters() {
    const stats = document.querySelectorAll(".hstat-val[data-target]");
    if (!stats.length) return;
    const obs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el     = entry.target;
            const target = parseFloat(el.dataset.target);
            const prefix = el.dataset.prefix || "";
            const suffix = el.dataset.suffix || "";
            const dur    = 1400;
            const start  = performance.now();
            function tick(now) {
                const p = Math.min((now - start) / dur, 1);
                el.textContent = prefix + Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
                if (p < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
            obs.unobserve(el);
        });
    }, { threshold: 0.5 });
    stats.forEach(el => obs.observe(el));
}

/* ── Project Slider ── */
function initProjectSlider() {
    const track = document.getElementById("projTrack");
    const dots  = document.querySelectorAll(".pdot");
    if (!track || !dots.length) return;

    const cards = track.querySelectorAll(".proj-card");
    let current = 0;
    let autoTimer = null;

    function getCardW() {
        return track.parentElement.offsetWidth;
    }

    function goTo(idx) {
        current = (idx + cards.length) % cards.length;
        const cardW = getCardW();
        // Force each card to exactly match the wrapper width
        cards.forEach(c => { c.style.minWidth = cardW + "px"; c.style.maxWidth = cardW + "px"; });
        track.style.transform = `translateX(-${current * cardW}px)`;
        dots.forEach((d, i) => d.classList.toggle("active", i === current));
    }

    dots.forEach(dot => {
        dot.addEventListener("click", () => {
            goTo(parseInt(dot.dataset.idx));
            resetAuto();
        });
    });

    function startAuto() {
        autoTimer = setInterval(() => goTo(current + 1), 5000);
    }
    function resetAuto() {
        clearInterval(autoTimer);
        startAuto();
    }

    // Touch swipe
    let touchStartX = 0;
    track.addEventListener("touchstart", e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener("touchend",   e => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 50) { goTo(dx < 0 ? current + 1 : current - 1); resetAuto(); }
    });

    // Keyboard on focus
    track.setAttribute("tabindex", "0");
    track.addEventListener("keydown", e => {
        if (e.key === "ArrowRight") { goTo(current + 1); resetAuto(); }
        if (e.key === "ArrowLeft")  { goTo(current - 1); resetAuto(); }
    });

    window.addEventListener("resize", () => goTo(current));

    goTo(0);
    startAuto();
}

/* ── Consultation Modal ── */
function initConsultModal() {
    const modal    = document.getElementById("consultModal");
    const closeBtn = document.getElementById("closeConsultModal");
    if (!modal) return;

    function openModal() {
        const dateInput = modal.querySelector("#fdate");
        if (dateInput && !dateInput.min) {
            const t = new Date(); t.setDate(t.getDate() + 1);
            dateInput.min = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
        }
        modal.classList.add("open");
        document.body.style.overflow = "hidden";
        setTimeout(() => modal.querySelector("input")?.focus(), 100);
    }
    function closeModal() {
        modal.classList.remove("open");
        document.body.style.overflow = "";
    }

    ["openConsultModal", "openConsultModalNav", "openConsultModalHero"].forEach(id => {
        document.getElementById(id)?.addEventListener("click", openModal);
    });
    document.querySelectorAll("[data-open-consult]").forEach(el => el.addEventListener("click", openModal));
    closeBtn?.addEventListener("click", closeModal);
    modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && modal.classList.contains("open")) closeModal(); });
}

/* ── Consultation Form ── */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwxahtn9fQrhUynlLo_TRyie1ELMW0NfkrxjI7ZtEpffLmsdtlfCjsr4a73cuQEwT1n/exec";

function initConsultForm() {
    const form      = document.getElementById("consultForm");
    const note      = document.getElementById("formNote");
    const charCount = document.getElementById("charCount");
    if (!form) return;

    const textarea = form.querySelector("#fmessage");
    if (textarea && charCount) {
        textarea.addEventListener("input", () => {
            const len = textarea.value.length;
            charCount.textContent = `${len} / 500`;
            charCount.style.color = len > 450 ? "var(--purple-light)" : "";
        });
    }

    form.addEventListener("submit", e => {
        e.preventDefault();
        const name    = (form.querySelector("#fname")?.value    || "").trim();
        const email   = (form.querySelector("#femail")?.value   || "").trim();
        const company = (form.querySelector("#fcompany")?.value || "").trim();
        const msg     = (textarea?.value || "").trim();
        const phone   = (form.querySelector("#fphone")?.value || "").trim();
        const slotDate = form.querySelector("#fdate")?.value || "";
        const slotTime = form.querySelector("#ftime")?.value || "";

        if (!name || !email || !msg) {
            showNote(note, "Please fill in all required fields.", "error");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showNote(note, "Please enter a valid email address.", "error");
            return;
        }

        if (phone && !/^[+()\d\s-]{7,20}$/.test(phone)) {
            showNote(note, "Please enter a valid phone number or leave it blank.", "error");
            return;
        }

        // The Apps Script may not read the new fields yet, so also fold them into the message
        const extras = [];
        if (phone) extras.push(`Phone: ${phone}`);
        if (slotDate || slotTime) extras.push(`Preferred slot: ${[slotDate, slotTime].filter(Boolean).join(" ")} IST`);
        const fullMessage = extras.length ? `${msg}\n\n— ${extras.join(" | ")}` : msg;

        const btn = form.querySelector("button[type='submit']");
        const origText = btn ? btn.textContent : "";
        if (btn) { btn.textContent = "Sending…"; btn.disabled = true; }

        fetch(APPS_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, company, phone, slotDate, slotTime, message: fullMessage })
        })
        .then(() => {
            showNote(note, "Thank you! We'll respond within 48 hours.", "success");
            form.reset();
            if (charCount) charCount.textContent = "0 / 500";
            if (btn) {
                btn.textContent = "Request Sent ✓";
                setTimeout(() => { btn.textContent = origText; btn.disabled = false; }, 3500);
            }
        })
        .catch(() => {
            showNote(note, "Something went wrong. Please email us directly.", "error");
            if (btn) { btn.textContent = origText; btn.disabled = false; }
        });
    });
}

/* ── Newsletter Form: saved to the private Google Sheet by the Apps Script ── */
function initNewsletterForm() {
    const form = document.getElementById("newsletterForm");
    if (!form) return;
    const input = form.querySelector("input[type='email']");
    const btn = form.querySelector("button[type='submit']");
    const arrow = btn ? btn.innerHTML : "";
    const note = document.createElement("p");
    note.className = "newsletter-note";
    note.setAttribute("role", "status");
    form.insertAdjacentElement("afterend", note);
    const say = (msg, kind) => { note.textContent = msg; note.className = "newsletter-note" + (kind ? " " + kind : ""); };

    form.addEventListener("submit", e => {
        e.preventDefault();
        const email = (input?.value || "").trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { say("Please enter a valid email address.", "error"); return; }
        if (btn) btn.disabled = true;
        say("Subscribing…");
        fetch(APPS_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "newsletter", email, page: location.pathname.split("/").pop() || "index.html", website: "" })
        })
        .then(() => {
            say("Thanks, you're subscribed.", "success");
            form.reset();
            if (btn) btn.innerHTML = "<svg viewBox='0 0 24 24'><path d='M5,12L10,17L19,7' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'/></svg>";
            setTimeout(() => { if (btn) { btn.innerHTML = arrow; btn.disabled = false; } }, 2500);
        })
        .catch(() => { say("Something went wrong. Please email info@micronode.in.", "error"); if (btn) btn.disabled = false; });
    });
}

function showNote(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className   = `form-note ${type}`;
}

/* ── 3D Tilt + Radial Glow on Cards ── */
function initCardEffects() {
    const tiltTargets = ".tlogo-card, .ind-card, .prod-card, .why-card, .proc-step";
    document.querySelectorAll(tiltTargets).forEach(card => {
        card.addEventListener("mousemove", e => {
            const r  = card.getBoundingClientRect();
            const cx = r.left + r.width  / 2;
            const cy = r.top  + r.height / 2;
            const rx = ((e.clientY - cy) / (r.height / 2)) * -6;
            const ry = ((e.clientX - cx) / (r.width  / 2)) * 6;
            const x  = ((e.clientX - r.left) / r.width)  * 100;
            const y  = ((e.clientY - r.top)  / r.height) * 100;
            card.style.transform  = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-3px)`;
            card.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(123,97,255,0.09) 0%, transparent 65%), var(--card-hover)`;
        });
        card.addEventListener("mouseleave", () => {
            card.style.transform  = "";
            card.style.background = "";
        });
    });

    // Project cards — radial glow only (overflow:hidden clip prevents tilt)
    document.querySelectorAll(".proj-card").forEach(card => {
        card.addEventListener("mousemove", e => {
            const r = card.getBoundingClientRect();
            const x = ((e.clientX - r.left) / r.width)  * 100;
            const y = ((e.clientY - r.top)  / r.height) * 100;
            card.querySelector(".proj-info").style.background =
                `radial-gradient(circle at ${x}% ${y}%, rgba(123,97,255,0.07) 0%, transparent 60%)`;
        });
        card.addEventListener("mouseleave", () => {
            const info = card.querySelector(".proj-info");
            if (info) info.style.background = "";
        });
    });
}

/* ── Magnetic Buttons ── */
function initMagneticButtons() {
    document.querySelectorAll(".btn-primary, .btn-nav").forEach(btn => {
        btn.addEventListener("mousemove", e => {
            const r  = btn.getBoundingClientRect();
            const dx = (e.clientX - r.left - r.width  / 2) * 0.22;
            const dy = (e.clientY - r.top  - r.height / 2) * 0.22;
            btn.style.transform = `translate(${dx}px, ${dy}px)`;
        });
        btn.addEventListener("mouseleave", () => {
            btn.style.transform = "";
        });
    });
}

function initProductGallery() {
    const gallery = document.querySelector(".pdp-gallery-main");
    if (!gallery) return;

    const mainImage = gallery.querySelector("img");
    if (!mainImage) return;

    const picture = gallery.querySelector("picture");
    const source = picture?.querySelector("source");
    const thumbButtons = document.querySelectorAll(".pdp-thumb, .pdp-thumb-label");

    const activeButton = document.querySelector('.pdp-thumb[data-image="images/updt_product_page_files/mg51-square-1200.jpg"], .pdp-thumb-label[data-image="images/updt_product_page_files/mg51-square-1200.jpg"]');
    if (activeButton) {
        mainImage.src = activeButton.dataset.image;
        mainImage.alt = activeButton.dataset.alt || mainImage.alt;
        thumbButtons.forEach(item => {
            item.classList.toggle('is-active', item === activeButton);
        });
    }

    thumbButtons.forEach(button => {
        button.addEventListener("click", () => {
            const imageSrc = button.dataset.image;
            if (!imageSrc) return;

            if (source) {
                source.setAttribute("srcset", imageSrc);
                source.setAttribute("data-current", imageSrc);
            }
            mainImage.src = imageSrc;
            mainImage.alt = button.dataset.alt || mainImage.alt;

            thumbButtons.forEach(item => {
                item.classList.toggle("is-active", item === button);
            });
        });
    });
}
<<<<<<< HEAD


/* ── Rotating word in a headline (e.g. "a ready HMI" / "digital counter" / "timer" …) ── */
function initRotatingWord() {
    document.querySelectorAll(".rot-word[data-words]").forEach(el => {
        let words;
        try { words = JSON.parse(el.dataset.words); } catch { return; }
        if (!Array.isArray(words) || words.length < 2) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;   // stays on the first word
        let i = 0;
        setInterval(() => {
            if (document.hidden) return;
            el.classList.add("is-out");
            setTimeout(() => {
                i = (i + 1) % words.length;
                el.textContent = words[i];
                el.classList.remove("is-out");
                el.classList.add("is-in");
                void el.offsetWidth;                       // restart the transition from the lowered position
                el.classList.remove("is-in");
            }, 300);
        }, 2600);
    });
}

/* ── Email buttons: open the visitor's mail app; if none opens (e.g. only webmail), open Gmail compose instead ── */
function initMailLinks() {
    document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
        a.addEventListener("click", () => {
            let left = false;
            const onBlur = () => { left = true; };
            window.addEventListener("blur", onBlur, { once: true });
            setTimeout(() => {
                window.removeEventListener("blur", onBlur);
                if (left || document.hidden) return;                       // a mail app took over
                let url;
                try { url = new URL(a.getAttribute("href")); } catch { return; }
                const q = url.searchParams;
                const g = "https://mail.google.com/mail/?view=cm&fs=1" +
                    "&to=" + encodeURIComponent(decodeURIComponent(url.pathname)) +
                    "&su=" + encodeURIComponent(q.get("subject") || "") +
                    "&body=" + encodeURIComponent(q.get("body") || "");
                window.open(g, "_blank", "noopener");
            }, 900);
        });
    });
}

/* ── "Company" dropdown: opens on click (and on hover on desktop); closes on outside click or Escape ── */
function initCompanyMenu() {
    const dd = document.querySelector(".nav-dropdown");
    if (!dd) return;
    const btn = dd.querySelector(".nav-drop-toggle");
    const set = open => { dd.classList.toggle("open", open); btn.setAttribute("aria-expanded", open); };
    btn.addEventListener("click", e => { e.stopPropagation(); set(!dd.classList.contains("open")); });
    document.addEventListener("click", e => { if (!dd.contains(e.target)) set(false); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") set(false); });
    dd.querySelectorAll(".nav-drop-menu a").forEach(a => a.addEventListener("click", () => set(false)));
}

/* ── FAQ page: each group opens and closes on click; a link like faq.html#mg51 opens that group ── */
function initFaqGroups() {
    const groups = [...document.querySelectorAll("details.faq-group")];
    if (!groups.length) return;
    const openFromHash = () => {
        const g = groups.find(x => "#" + x.id === location.hash);
        if (g) { g.open = true; setTimeout(() => g.scrollIntoView({ behavior: "smooth", block: "start" }), 60); }
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
}

/* ═══════════════════════════════════════════
   MOTION: movement only; content, layout and colours stay as they are.
   Everything here is skipped when the visitor has "reduce motion" turned on.
   ═══════════════════════════════════════════ */
function initMotion() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.documentElement.classList.add("motion");

    /* Headline: words rise and focus in one after another */
    document.querySelectorAll("h1").forEach(h => {
        if (h.closest(".modal-box, .mn-chat-panel")) return;
        let n = 0;
        const split = node => {
            [...node.childNodes].forEach(c => {
                if (c.nodeType === 3) {
                    const parts = c.textContent.split(/(\s+)/);
                    const frag = document.createDocumentFragment();
                    parts.forEach(p => {
                        if (!p) return;
                        if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
                        const s = document.createElement("span");
                        s.className = "mw"; s.style.setProperty("--i", n++); s.textContent = p;
                        frag.appendChild(s);
                    });
                    c.replaceWith(frag);
                } else if (c.nodeType === 1 && !c.classList.contains("rot-word") && c.tagName !== "BR") {
                    split(c);
                }
            });
        };
        split(h);
        const total = n;
        h.classList.add("mh");
        // when the last word has landed, drop the animation so gradient text paints normally
        setTimeout(() => h.classList.add("mh-done"), 700 + Math.min(total, 14) * 60 + 200);
    });

    /* Small labels: letters start spread wide and slide together */
    const labelSel = ".eyebrow, .rule-label, .sec-number-label, .wl-label, .pdp-eyebrow, .pdp-col-label, .post-meta, .blog-card-meta, .whyd-eyebrow-text";
    const labels = [...document.querySelectorAll(labelSel)].filter(el => !el.closest(".mn-chat-panel, .modal-box"));
    labels.forEach(el => el.classList.add("m-lbl"));

    /* Section headings: reveal left to right */
    const heads = [...document.querySelectorAll("h2")].filter(el => !el.closest("summary, .modal-box, .mn-chat-panel, .tech-header"));
    heads.forEach(el => el.classList.add("m-head"));

    /* Images: start slightly zoomed in and settle; zoom a little on hover */
    const imgBoxes = [...document.querySelectorAll(".ind-photo, .product-card-media, .prodc-img-wrap, .pdp-gallery-main")];
    imgBoxes.forEach(el => el.classList.add("m-img"));

    /* Cards without their own reveal get one, staggered by position in the row */
    const cardSel = ".wl-card, .wl-mean, .blog-card, .pdp-stat, .nf-grid > a";
    document.querySelectorAll(cardSel).forEach(el => {
        if (!el.classList.contains("reveal")) {
            el.classList.add("reveal");
            const sibs = [...el.parentElement.children].filter(x => x.matches(cardSel));
            el.style.transitionDelay = (Math.min(sibs.indexOf(el), 5) * 0.09) + "s";
        }
    });

    // Headings start clipped to a 1% sliver, so they still count as "seen" the moment any part scrolls into view
    const mk = threshold => new IntersectionObserver((entries, o) => entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add("m-in");
        o.unobserve(e.target);
    }), { threshold, rootMargin: "0px 60px -8% 60px" });
    const ioSoft = mk(0.15), ioAny = mk(0);
    [...labels, ...imgBoxes].forEach(el => ioSoft.observe(el));
    heads.forEach(el => ioAny.observe(el));
}

/* ── Page change: a purple wipe slides across the screen, like a video transition ── */
function initPageWipe() {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try { sessionStorage.removeItem("mnWipe"); } catch (e) { /* ignore */ }

    // Arriving: the cover is already across the screen (set in the page head); slide it away
    if (root.classList.contains("pt-arrive")) {
        requestAnimationFrame(() => requestAnimationFrame(() => {
            root.classList.remove("pt-arrive");
            root.classList.add("pt-leave");
            setTimeout(() => root.classList.remove("pt-leave"), 340);
        }));
    }
    // Coming back with the browser's Back button must not leave the cover on screen
    window.addEventListener("pageshow", e => { if (e.persisted) root.classList.remove("pt-cover", "pt-arrive", "pt-leave"); });

    if (reduce) return;
    document.addEventListener("click", e => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = e.target.closest("a[href]");
        if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
        const href = a.getAttribute("href");
        if (!href || href.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(href)) return;
        let url;
        try { url = new URL(a.href, location.href); } catch (err) { return; }
        if (url.origin !== location.origin && location.protocol !== "file:") return;
        if (location.protocol === "file:" && url.protocol !== "file:") return;
        if (url.pathname === location.pathname && url.search === location.search) return;   // same page: plain scroll
        e.preventDefault();
        root.classList.add("pt-cover");
        try { sessionStorage.setItem("mnWipe", "1"); } catch (err) { /* ignore */ }
        setTimeout(() => { location.href = a.href; }, 190);
        setTimeout(() => root.classList.remove("pt-cover"), 3000);   // safety: never leave the cover up
    });
}
=======
>>>>>>> 88050eac84b2fcf646f05b9e557c02090696b76d
