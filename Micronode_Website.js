/* ════════════════════════════════════════════
   MICRONODE LLP — Main Scripts
   ════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {
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
});

/* ── Scroll Progress Bar ── */
function initScrollProgress() {
    const bar = document.getElementById("scrollProgress");
    if (!bar) return;
    window.addEventListener("scroll", () => {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = total > 0 ? `${(window.scrollY / total) * 100}%` : "0%";
    }, { passive: true });
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
    });

    links.forEach(l => l.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
    }));

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
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwiMz_rTnmb6nD_btLF4NzR-lvOYi_q56AJjtdJuF3qCMUe3STuvztDKJW5Zmr2b--k/exec";

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

        if (!name || !email || !msg) {
            showNote(note, "Please fill in all required fields.", "error");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showNote(note, "Please enter a valid email address.", "error");
            return;
        }

        const btn = form.querySelector("button[type='submit']");
        const origText = btn ? btn.textContent : "";
        if (btn) { btn.textContent = "Sending…"; btn.disabled = true; }

        fetch(APPS_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, company, message: msg })
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

/* ── Newsletter Form ── */
function initNewsletterForm() {
    const form = document.getElementById("newsletterForm");
    if (!form) return;
    form.addEventListener("submit", e => {
        e.preventDefault();
        const btn = form.querySelector("button");
        const input = form.querySelector("input");
        if (!input?.value.trim()) return;
        if (btn) {
            btn.innerHTML = "<svg viewBox='0 0 24 24'><path d='M5,12L10,17L19,7' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'/></svg>";
            setTimeout(() => {
                btn.innerHTML = "<svg viewBox='0 0 24 24'><path d='M2,12 L22,12 M14,4 L22,12 L14,20' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'/></svg>";
            }, 2500);
        }
        form.reset();
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
