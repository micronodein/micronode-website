/* ════════════════════════════════════════════
   MICRONODE LLP — Main Scripts
   ════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {
    // Measure before anything below changes the DOM, so reading the size does not force a layout
    const viewport = { w: window.innerWidth, h: window.innerHeight };
    initMotion();
    initPageWipe();
    initScrollProgress();
    initNodeNetwork(viewport);
    initScrollReveal();
    initHeader();
    initNavigation();
    initNavDots();
    initStatCounters();
    // initProjectSlider();   // Featured Projects section is commented out in index.html
    initConsultModal();
    initConsultForm();
    initNewsletterForm();
    initProductGallery();
    initPhotoRotators();
    initSwipeIndicators();
    initRotatingWord();
    initMailLinks();
    initCompanyMenu();
    initFaqGroups();
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
        requestAnimationFrame(update);   // first measure waits for the frame's own layout
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
function initNodeNetwork(viewport) {
    const canvas = document.getElementById("nodeCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let nodes = [], animId = null, w = 0, h = 0;
    const mouse = { x: -1000, y: -1000 };
    const CONNECT_DIST = 155, MOUSE_DIST = 180;
    const COLOR = "255,143,115";

    // Read both sizes first, then write: a read after a write would force a second layout
    function resize(size) {
        const nw = size ? size.w : window.innerWidth;
        const nh = size ? size.h : window.innerHeight;
        w = canvas.width  = nw;
        h = canvas.height = nh;
        buildNodes();
    }

    function buildNodes() {
        const n = Math.min(Math.floor(w * h / 24000), 60);
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

    resize(viewport);
    draw();
    window.addEventListener("mousemove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });
    let rt;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => resize(), 200); });
    document.addEventListener("visibilitychange", () => {
        document.hidden ? cancelAnimationFrame(animId) : draw();
    });
}

/* ── PCB-trace background (home #contact): copper traces with 45° bends,
      vias and SMD pads, coral signal pulses, coral glow near the mouse ── */
function initPcbTraces() {
    const sections = document.querySelectorAll("#contact.cta-section");
    if (!sections.length) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const TRACE = "rgba(142,155,224,0.25)", PAD = "rgba(142,155,224,0.45)", CORAL = "#FF8F73";
    const HOVER_R = 150;
    // 8 directions, 45° apart: turning by one step is always a 45° bend
    const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

    // Soft coral glow for the pulse heads, drawn once
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 48;
    const sg = sprite.getContext("2d");
    const grad = sg.createRadialGradient(24, 24, 0, 24, 24, 24);
    grad.addColorStop(0, "rgba(255,220,205,1)");
    grad.addColorStop(0.18, "rgba(255,143,115,0.9)");
    grad.addColorStop(1, "rgba(255,143,115,0)");
    sg.fillStyle = grad;
    sg.fillRect(0, 0, 48, 48);

    sections.forEach(section => {
        const canvas = document.createElement("canvas");
        canvas.className = "pcb-canvas";
        canvas.setAttribute("aria-hidden", "true");
        section.prepend(canvas);
        section.classList.add("pcb-bg");
        const ctx = canvas.getContext("2d");
        const base = document.createElement("canvas"), lit = document.createElement("canvas"), spot = document.createElement("canvas");
        let w = 0, h = 0, dpr = 1, traces = [], pulses = [], overlay = null;
        let animId = null, onScreen = false, last = 0, nextSpawn = 0, target = 4;
        const mouse = { x: 0, y: 0, tx: 0, ty: 0, a: 0, on: false };

        function build() {
            const r = section.getBoundingClientRect();
            const nw = Math.round(r.width), nh = Math.round(r.height);
            if (!nw || !nh || (nw === w && nh === h)) return false;
            w = nw; h = nh;
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            [canvas, base, lit].forEach(c => { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); });
            canvas.style.width = w + "px"; canvas.style.height = h + "px";
            const phone = w < 600;
            const pitch = phone ? 22 : 26;
            traces = route(Math.ceil(w / pitch) + 1, Math.ceil(h / pitch) + 1, pitch, phone ? 18 : Math.min(70, Math.round(w * h / 15000)));
            paint(base.getContext("2d"), TRACE, PAD);
            paint(lit.getContext("2d"), "rgba(255,143,115,0.85)", CORAL);
            // Dark radial wash on the left keeps the heading and buttons readable
            overlay = ctx.createRadialGradient(w * 0.2, h * 0.5, 0, w * 0.2, h * 0.5, Math.max(w * 0.6, h * 0.8));
            overlay.addColorStop(0, "rgba(19,17,73,0.92)");
            overlay.addColorStop(0.55, "rgba(19,17,73,0.6)");
            overlay.addColorStop(1, "rgba(19,17,73,0)");
            pulses = [];
            return true;
        }

        // Random walks on a grid: straight runs joined by 45° bends, never crossing or touching another trace
        function route(cols, rows, pitch, want) {
            const used = new Set(), out = [];
            const free = (x, y) => x >= 1 && y >= 1 && x < cols - 1 && y < rows - 1 && !used.has(x + "," + y);
            for (let tries = 0; out.length < want && tries < want * 30; tries++) {
                let x = 1 + Math.floor(Math.random() * (cols - 2)), y = 1 + Math.floor(Math.random() * (rows - 2));
                if (!free(x, y)) continue;
                let d = Math.random() < 0.8 ? 2 * Math.floor(Math.random() * 4) : 1 + 2 * Math.floor(Math.random() * 4);
                const mine = new Set([x + "," + y]), pts = [[x, y]];
                const segs = 2 + Math.floor(Math.random() * 4);
                let steps = 0;
                walk: for (let s = 0; s < segs; s++) {
                    const diag = d % 2 === 1;
                    const len = diag ? 1 + Math.floor(Math.random() * 3) : 2 + Math.floor(Math.random() * 7);
                    let moved = 0;
                    for (let i = 0; i < len; i++) {
                        const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
                        const mid = diag ? (x + nx) / 2 + "," + (y + ny) / 2 : null;   // two diagonals crossing share this point
                        if (!free(nx, ny) || mine.has(nx + "," + ny) || (mid && used.has(mid))) break walk;
                        if (mid) mine.add(mid);
                        mine.add(nx + "," + ny);
                        x = nx; y = ny; moved++; steps++;
                    }
                    if (moved) pts.push([x, y]);
                    d = (d + (Math.random() < 0.5 ? 1 : 7)) % 8;
                }
                const lp = pts[pts.length - 1];
                if (lp[0] !== x || lp[1] !== y) pts.push([x, y]);   // run cut short by an obstacle
                if (steps < 4) continue;
                // Keep one empty grid point around each trace so neighbours do not touch
                mine.forEach(k => {
                    const [kx, ky] = k.split(",").map(Number);
                    used.add(k);
                    if (Number.isInteger(kx)) for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) used.add((kx + i) + "," + (ky + j));
                });
                const p = pts.map(([px, py]) => [px * pitch, py * pitch]);
                const lens = [0];
                for (let i = 1; i < p.length; i++) lens.push(lens[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
                out.push({ p, lens, len: lens[lens.length - 1], ends: [Math.random() < 0.5 ? "via" : "pad", Math.random() < 0.5 ? "via" : "pad"] });
            }
            return out;
        }

        function paint(c, stroke, fill) {
            c.setTransform(dpr, 0, 0, dpr, 0, 0);
            c.clearRect(0, 0, w, h);
            c.lineWidth = 1.5; c.lineJoin = "miter"; c.lineCap = "butt"; c.strokeStyle = stroke;
            traces.forEach(t => {
                c.beginPath();
                t.p.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
                c.stroke();
            });
            traces.forEach(t => {
                [[t.p[0], t.p[1], t.ends[0]], [t.p[t.p.length - 1], t.p[t.p.length - 2], t.ends[1]]].forEach(([e, n, kind]) => {
                    if (kind === "via") {
                        c.beginPath(); c.arc(e[0], e[1], 3.4, 0, Math.PI * 2);
                        c.fillStyle = "#19175C"; c.fill();
                        c.strokeStyle = fill; c.stroke();
                    } else {
                        // SMD pad: small rounded rect lying along the trace's last run
                        c.save(); c.translate(e[0], e[1]); c.rotate(Math.atan2(e[1] - n[1], e[0] - n[0]));
                        c.beginPath();
                        if (c.roundRect) c.roundRect(-3, -3.5, 9, 7, 1.6); else c.rect(-3, -3.5, 9, 7);
                        c.fillStyle = fill; c.fill();
                        c.restore();
                    }
                    c.strokeStyle = stroke;
                });
            });
        }

        function pointAt(t, s) {
            let i = 1;
            while (i < t.lens.length - 1 && t.lens[i] < s) i++;
            const a = t.p[i - 1], b = t.p[i], k = (s - t.lens[i - 1]) / ((t.lens[i] - t.lens[i - 1]) || 1);
            return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
        }

        function spawn(now) {
            const pool = traces.filter(t => t.len > 80 && !pulses.some(p => p.t === t));
            if (!pool.length) return;
            const t = pool[Math.floor(Math.random() * pool.length)];
            pulses.push({ t, start: now, dur: 2000 + Math.random() * 2000, rev: Math.random() < 0.5 });
        }

        function draw(now) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(base, 0, 0);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            if (reduce) { ctx.fillStyle = overlay; ctx.fillRect(0, 0, w, h); return; }

            // Hover: the coral copy of the traces shows through a soft circle around the mouse
            mouse.x += (mouse.tx - mouse.x) * 0.18; mouse.y += (mouse.ty - mouse.y) * 0.18;
            mouse.a += ((mouse.on ? 1 : 0) - mouse.a) * 0.12;
            if (mouse.a > 0.01) {
                const S = Math.ceil(HOVER_R * 2 * dpr);
                if (spot.width !== S) spot.width = spot.height = S;
                const sc = spot.getContext("2d");
                sc.globalCompositeOperation = "copy";
                sc.drawImage(lit, (mouse.x - HOVER_R) * dpr, (mouse.y - HOVER_R) * dpr, S, S, 0, 0, S, S);
                sc.globalCompositeOperation = "destination-in";
                const g = sc.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
                g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
                sc.fillStyle = g; sc.fillRect(0, 0, S, S);
                ctx.globalAlpha = mouse.a;
                ctx.drawImage(spot, mouse.x - HOVER_R, mouse.y - HOVER_R, HOVER_R * 2, HOVER_R * 2);
                ctx.globalAlpha = 1;
            }

            // Signal pulses: 3-6 at a time, each 2-4 s end to end
            if (now >= nextSpawn && pulses.length < target) {
                spawn(now);
                nextSpawn = now + 250 + Math.random() * 700;
                if (Math.random() < 0.3) target = 3 + Math.floor(Math.random() * 4);
            }
            ctx.lineWidth = 1.5; ctx.lineCap = "round";
            pulses = pulses.filter(p => {
                const k = (now - p.start) / p.dur;
                if (k >= 1) return false;
                const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
                const s = (p.rev ? 1 - ease : ease) * p.t.len, tail = 46, dir = p.rev ? 1 : -1;
                const head = pointAt(p.t, s), end = pointAt(p.t, Math.max(0, Math.min(p.t.len, s + dir * tail)));
                const fade = Math.min(1, k * 8, (1 - k) * 8);
                const lg = ctx.createLinearGradient(end[0], end[1], head[0], head[1]);
                lg.addColorStop(0, "rgba(255,143,115,0)"); lg.addColorStop(1, `rgba(255,143,115,${0.9 * fade})`);
                ctx.strokeStyle = lg;
                ctx.beginPath(); ctx.moveTo(end[0], end[1]);
                for (let i = 0; i < 6; i++) { const q = pointAt(p.t, Math.max(0, Math.min(p.t.len, s + dir * tail * (1 - (i + 1) / 6)))); ctx.lineTo(q[0], q[1]); }
                ctx.stroke();
                ctx.globalAlpha = fade;
                ctx.drawImage(sprite, head[0] - 12, head[1] - 12, 24, 24);
                ctx.globalAlpha = 1;
                return true;
            });

            ctx.fillStyle = overlay;
            ctx.fillRect(0, 0, w, h);
        }

        function loop(now) {
            draw(now);
            animId = requestAnimationFrame(loop);
        }
        function start() {
            if (reduce || animId || !onScreen || document.hidden) return;
            animId = requestAnimationFrame(loop);
        }
        function stop() { cancelAnimationFrame(animId); animId = null; }

        build();
        draw(performance.now());

        new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; onScreen ? start() : stop(); }).observe(section);
        document.addEventListener("visibilitychange", () => { document.hidden ? stop() : start(); });
        // Window resizes and late layout changes (web fonts) both resize the section
        let rt;
        const rebuild = () => { clearTimeout(rt); rt = setTimeout(() => { if (build()) draw(performance.now()); }, 200); };
        if (window.ResizeObserver) new ResizeObserver(rebuild).observe(section);
        else window.addEventListener("resize", rebuild);
        if (!reduce) {
            section.addEventListener("pointermove", e => {
                if (e.pointerType !== "mouse") return;
                const r = canvas.getBoundingClientRect();
                mouse.tx = e.clientX - r.left; mouse.ty = e.clientY - r.top;
                if (!mouse.on && mouse.a < 0.01) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
                mouse.on = true;
            });
            section.addEventListener("pointerleave", () => { mouse.on = false; });
        }
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

    const all = [...document.querySelectorAll(".reveal, .section-header")];

    // Already on screen when the page opens: show at once (the page's own fade covers them)
    all.forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("reveal-instant", "visible");
    });
    requestAnimationFrame(() => requestAnimationFrame(() => {
        document.querySelectorAll(".reveal-instant").forEach(el => el.classList.remove("reveal-instant"));
    }));

    // Cards in a row: a small stagger (--motion-stagger) by position among their siblings, at most 5 steps
    all.forEach(el => {
        if (el.classList.contains("visible") || !el.parentElement) return;
        const sibs = [...el.parentElement.children].filter(x => x.classList.contains("reveal"));
        const i = Math.min(sibs.indexOf(el), 5);
        if (sibs.length > 1 && i > 0) el.style.transitionDelay = `calc(var(--motion-stagger) * ${i})`;
    });

    const obs = new IntersectionObserver(
        entries => entries.forEach(e => {
            if (!e.isIntersecting) return;
            const el = e.target;
            el.classList.add("visible");
            obs.unobserve(el);
            // once revealed, drop the stagger so hover reacts straight away
            setTimeout(() => { el.style.transitionDelay = ""; el.classList.remove("reveal-delay-1", "reveal-delay-2", "reveal-delay-3"); }, 800);
        }),
        { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    all.forEach(el => { if (!el.classList.contains("visible")) obs.observe(el); });
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
        requestAnimationFrame(sync);   // first measure waits for the frame's own layout
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
            if (el.dataset.inViewAtLoad) { obs.unobserve(el); return; }   // on screen at load: shows the final number, no count-up
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
    stats.forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight) el.dataset.inViewAtLoad = "1";
        obs.observe(el);
    });
}

/* ── Project Slider ── (switched off: the Featured Projects section is commented out in index.html;
   remove the comment markers here and on the initProjectSlider() call to bring it back)
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
*/

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
        document.body.classList.add("modal-open");   // chatbot-widget.css hides the chat while the form is up
        document.body.style.overflow = "hidden";
        setTimeout(() => modal.querySelector("input")?.focus(), 100);
    }
    function closeModal() {
        modal.classList.remove("open");
        document.body.classList.remove("modal-open");
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
            // no-cors hides the response, so a resolved fetch is our "sent" signal
            if (btn) btn.textContent = "Request Sent ✓";
            form.reset();
            window.location.href = "/thank-you.html";
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

function initProductGallery() {
    const gallery = document.querySelector(".pdp-gallery-main");
    if (!gallery) return;

    const mainImage = gallery.querySelector("img");
    if (!mainImage) return;

    const picture = gallery.querySelector("picture");
    const source = picture?.querySelector("source");
    const thumbButtons = document.querySelectorAll(".pdp-thumb, .pdp-thumb-label");

    const activeButton = document.querySelector('.pdp-thumb[data-image="images/products/micronode-mg51-development-board.webp"], .pdp-thumb-label[data-image="images/products/micronode-mg51-development-board.webp"]');
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

    /* Phones and low-power devices: the H1 words animate with transform + opacity only (no blur filter) */
    const lowPower = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4);
    if (lowPower) document.documentElement.classList.add("low-power");

    /* Page H1: words rise and fade in one after another (0.06s apart, 0.7s each); the gradient comes on when the last one lands */
    document.querySelectorAll("h1").forEach(h => {
        if (h.closest(".modal-box, .mn-chat-panel")) return;
        let n = 0;
        const split = node => {
            [...node.childNodes].forEach(c => {
                if (c.nodeType === 3) {
                    const frag = document.createDocumentFragment();
                    c.textContent.split(/(\s+)/).forEach(p => {
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
        h.classList.add("mh");
        setTimeout(() => h.classList.add("mh-done"), 120 + Math.max(n - 1, 0) * 60 + 700 + 50);
    });

    /* Images: the one hover zoom (103%) */
    document.querySelectorAll(".ind-photo, .product-card-media, .prodc-img-wrap, .pdp-gallery-main").forEach(el => el.classList.add("m-img"));

    /* Cards without their own reveal get the shared one */
    document.querySelectorAll(".wl-card, .wl-mean, .blog-card, .pdp-stat, .nf-grid > a").forEach(el => el.classList.add("reveal"));

    /* Section H2s: the same fade-up as their section (unless they already sit inside a revealing block) */
    document.querySelectorAll("h2").forEach(el => {
        if (el.closest(".reveal, .section-header, summary, .modal-box, .mn-chat-panel, .tech-header, .mh-hero")) return;
        el.classList.add("reveal");
    });
}

/* ── Page change: every link to another page of the site gets a soft blur
      (the old page blurs and fades out, the new one comes into focus) ── */
function initPageWipe() {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const PT_CLASSES = ["pt-arrive", "pt-blur-out", "pt-blur-arrive"];
    const OUT_MS = 200;   // = --motion-fast, the pt-blur-out fade in Micronode_Website.css
    try { sessionStorage.removeItem("mnWipe"); } catch (e) { /* ignore */ }

    // Old head-script value from the navy-sweep preview; nothing draws it any more
    root.classList.remove("pt-arrive");
    // Arriving after a blur: the CSS animation brings the page into focus by itself; tidy up afterwards
    if (root.classList.contains("pt-blur-arrive")) setTimeout(() => root.classList.remove("pt-blur-arrive"), 700);

    // Coming back with the browser's Back button must not leave the page blurred
    window.addEventListener("pageshow", e => { if (e.persisted) root.classList.remove(...PT_CLASSES); });

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
        root.classList.add("pt-blur-out");
        try { sessionStorage.setItem("mnWipe", "blur"); } catch (err) { /* ignore */ }
        setTimeout(() => { location.href = a.href; }, OUT_MS);
        setTimeout(() => root.classList.remove(...PT_CLASSES), 3000);   // safety: never leave the page blurred
    });
}