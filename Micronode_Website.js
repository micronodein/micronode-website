/* ════════════════════════════════════════════
   MICRONODE — Main Scripts
   ════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {
    initScrollProgress();
    initNodeNetwork();
    initHeroAnimation();
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
            r:  Math.random() * 1.4 + 0.9,
            op: Math.random() * 0.4 + 0.25
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

/* ── Hero Canvas Animation ── */
function initHeroAnimation() {
    const canvas = document.getElementById("heroCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const S  = 520;
    canvas.width = canvas.height = S;
    const cx = S / 2, cy = S / 2;
    const rL = S * 0.305;
    const rR = S * 0.43;

    const CB = [0, 212, 255];
    const CC = [110, 235, 255];
    const CW = [234, 248, 255];

    let t0 = null, animId = null;
    let coreGlow = 0;

    // 70 background stars with twinkle
    const stars = Array.from({ length: 70 }, () => ({
        x: Math.random() * S, y: Math.random() * S,
        r: Math.random() * 1.1 + 0.25,
        ph: Math.random() * Math.PI * 2,
        sp: Math.random() * 0.6 + 0.4
    }));

    // 8 circuit trace nodes that expand outward in phase 6
    const nodes = Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const d = rR * (1.22 + (i % 2) * 0.17);
        return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, a, ph: Math.random() * Math.PI * 2, stag: i / 8 };
    });

    // 3 particle streams — top, bottom-left, bottom-right (matching logo arrows)
    const ANGLES = [Math.PI * 1.5, Math.PI * 5 / 6, Math.PI / 6];

    function mkPt(angle, prog) {
        const j = (Math.random() - 0.5) * 0.17;
        const d = rR * (1.45 + Math.random() * 0.45);
        return { angle: angle + j, d0: d, prog: prog !== undefined ? prog : Math.random(), spd: 0.0035 + Math.random() * 0.003, sz: Math.random() * 2.2 + 1.2, ma: Math.random() * 0.2 + 0.8 };
    }

    const streams = ANGLES.map(a => ({ a, pts: Array.from({ length: 14 }, () => mkPt(a)) }));

    function sat(v)       { return Math.max(0, Math.min(1, v)); }
    function ph(t, s, d)  { return sat((t - s) / d); }
    function eO(t)        { return 1 - (1 - t) * (1 - t); }
    function eIO(t)       { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
    function col(c, a)    { return `rgba(${c[0]},${c[1]},${c[2]},${sat(a).toFixed(3)})`; }

    function draw(ts) {
        if (!t0) t0 = ts;
        const t = (ts - t0) * 0.001;

        coreGlow  *= 0.965;
        ctx.clearRect(0, 0, S, S);

        // ── PHASE PROGRESS (0 → 1 each) ──────────────────
        const Pstar  = ph(t, 0.0, 1.8);  // stars appear
        const Pstrm  = ph(t, 1.2, 3.0);  // particle streams emerge
        const Pcore  = ph(t, 3.0, 1.50); // core ignites
        const Pexp   = ph(t, 4.0, 2.20); // circuit network expands

        // ── 2. STARS ─────────────────────────────────────
        stars.forEach(s => {
            s.ph += 0.015 * s.sp;
            const a = (Math.sin(s.ph) * 0.35 + 0.65) * Pstar * 0.52;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = col(CW, a); ctx.fill();
        });

        // Faint network lines between close stars
        if (Pstar > 0.4) {
            ctx.lineWidth = 0.35;
            for (let i = 0; i < stars.length; i++) {
                for (let j = i + 1; j < stars.length; j++) {
                    const d = Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y);
                    if (d < 78) {
                        ctx.beginPath();
                        ctx.moveTo(stars[i].x, stars[i].y);
                        ctx.lineTo(stars[j].x, stars[j].y);
                        ctx.strokeStyle = col(CB, (1 - d / 78) * 0.055 * Pstar);
                        ctx.stroke();
                    }
                }
            }
        }

        // ── 3. PARTICLE STREAMS (phase 2) ─────────────────
        if (Pstrm > 0) {
            streams.forEach(st => {
                st.pts.forEach(p => {
                    p.prog += p.spd;
                    if (p.prog >= 1) {
                        if (Pcore > 0.25) coreGlow = Math.min(coreGlow + 0.5, 1);
                        Object.assign(p, mkPt(st.a, 0));
                        return;
                    }
                    const dist = p.d0 * (1 - p.prog);
                    if (dist < rL * 0.42) return;
                    const px = cx + Math.cos(p.angle) * dist;
                    const py = cy + Math.sin(p.angle) * dist;

                    let a = p.ma * Pstrm;
                    if (p.prog < 0.12)     a *= p.prog / 0.12;
                    if (dist < rL * 1.18)  a *= sat((dist - rL * 0.42) / (rL * 0.76));
                    if (a < 0.02) return;

                    // Large glow halo
                    const gr = p.sz * 5;
                    const gg = ctx.createRadialGradient(px, py, 0, px, py, gr);
                    gg.addColorStop(0,   col(CW, a));
                    gg.addColorStop(0.3, col(CB, a * 0.75));
                    gg.addColorStop(1,   col(CB, 0));
                    ctx.fillStyle = gg;
                    ctx.beginPath(); ctx.arc(px, py, gr, 0, Math.PI * 2); ctx.fill();

                    // Bright core dot
                    ctx.beginPath(); ctx.arc(px, py, p.sz, 0, Math.PI * 2);
                    ctx.fillStyle = col(CW, a); ctx.fill();
                });
            });
        }

        // ── 6. CIRCUIT NETWORK EXPANDS (phase 6) ──────────
        if (Pexp > 0) {
            nodes.forEach(nd => {
                const local = sat((Pexp - nd.stag * 0.35) / 0.65);
                const pulse = Math.sin(t * 1.3 + nd.ph) * 0.5 + 0.5;
                const ix = cx + Math.cos(nd.a) * rL * 1.13;
                const iy = cy + Math.sin(nd.a) * rL * 1.13;
                const tx = cx + (nd.x - cx) * local;
                const ty = cy + (nd.y - cy) * local;

                ctx.beginPath(); ctx.moveTo(ix, iy);
                if (Math.abs(nd.x - cx) > Math.abs(nd.y - cy)) {
                    ctx.lineTo(tx, iy); ctx.lineTo(tx, ty);
                } else {
                    ctx.lineTo(ix, ty); ctx.lineTo(tx, ty);
                }
                ctx.strokeStyle = col(CB, 0.06 + pulse * 0.15);
                ctx.lineWidth = 0.8; ctx.stroke();

                if (local > 0.85) {
                    ctx.beginPath(); ctx.arc(tx, ty, 2.5, 0, Math.PI * 2);
                    ctx.fillStyle = col(CC, 0.25 + pulse * 0.6); ctx.fill();
                }
            });
        }

        // ── 8. ENERGY CORE GLOW ───────────────────────────
        const basePulse = Math.sin(t * 1.7 + 0.5) * 0.10 + 0.16;
        const totalCore = basePulse + eO(Pcore) * 0.58 + coreGlow * 0.40;

        if (totalCore > 0.02) {
            const cr = rL * 0.28;
            // Burst flash at ignition moment
            if (Pcore > 0 && Pcore < 0.5) {
                const fl = eO(Pcore * 2) * 0.9;
                const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 5);
                fg.addColorStop(0,    col(CW, fl));
                fg.addColorStop(0.15, col(CW, fl * 0.85));
                fg.addColorStop(0.45, col(CB, fl * 0.45));
                fg.addColorStop(1,    col(CB, 0));
                ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(cx, cy, cr * 5, 0, Math.PI * 2); ctx.fill();
            }
            const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 2.3);
            cg.addColorStop(0,    col(CW, totalCore));
            cg.addColorStop(0.3,  col(CB, totalCore * 0.70));
            cg.addColorStop(0.75, col(CB, totalCore * 0.14));
            cg.addColorStop(1,    col(CB, 0));
            ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, cr * 2.3, 0, Math.PI * 2); ctx.fill();
        }

        animId = requestAnimationFrame(draw);
    }

    function start() {
        t0 = null;
        if (animId) cancelAnimationFrame(animId);
        animId = requestAnimationFrame(draw);
    }

    setTimeout(() => { if (!animId) start(); }, 0);

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) cancelAnimationFrame(animId);
        else start();
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
            const suffix = el.dataset.suffix || "";
            const dur    = 1400;
            const start  = performance.now();
            function tick(now) {
                const p = Math.min((now - start) / dur, 1);
                el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
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
    closeBtn?.addEventListener("click", closeModal);
    modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && modal.classList.contains("open")) closeModal(); });
}

/* ── Consultation Form ── */
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
        const name  = (form.querySelector("#fname")?.value  || "").trim();
        const email = (form.querySelector("#femail")?.value || "").trim();
        const msg   = (textarea?.value || "").trim();
        if (!name || !email || !msg) {
            showNote(note, "Please fill in all required fields.", "error");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showNote(note, "Please enter a valid email address.", "error");
            return;
        }
        showNote(note, "Thank you! We'll respond within 48 hours.", "success");
        form.reset();
        if (charCount) charCount.textContent = "0 / 500";
        const btn = form.querySelector("button[type='submit']");
        if (btn) {
            const orig = btn.textContent;
            btn.textContent = "Request Sent ✓";
            btn.disabled = true;
            setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 3500);
        }
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
