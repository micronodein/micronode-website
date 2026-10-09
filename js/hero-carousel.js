/* ════════════════════════════════════════════
   MICRONODE LLP — Hero Product Carousel
   Add a board: one entry in `data`, one <figure>
   in the #hcStage markup, same order.
   ════════════════════════════════════════════ */
(function () {
    const stage = document.getElementById('hcStage');
    if (!stage) return;
    const cards = [...stage.querySelectorAll('.hc-card')];
    const nameEl = document.querySelector('.hc-name'), descEl = document.querySelector('.hc-desc');
    const dotsWrap = document.getElementById('hcDots');
    const data = [
        { name: 'MG51 Dev Board', desc: 'Nuvoton MG51 with full I/O breakout and ICP header.' },
        { name: 'TM1637 Display & Button Module', desc: '6-digit display, 8 buttons, driven by two MCU pins.' }
    ];
    let i = 0, timer = null;
    data.forEach((d, n) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Show ' + d.name);
        b.onclick = () => { go(n); rest(); };
        dotsWrap.appendChild(b);
    });
    const dots = [...dotsWrap.children];
    function go(n) {
        i = (n + cards.length) % cards.length;
        cards.forEach((c, k) => { c.className = 'hc-card ' + (k === i ? 'is-active' : (k === (i + 1) % cards.length ? 'is-side' : 'is-side-left')); });
        nameEl.textContent = data[i].name; descEl.textContent = data[i].desc;
        dots.forEach((d, k) => d.setAttribute('aria-current', k === i));
    }
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function play() { if (!reduce) timer = setInterval(() => go(i + 1), 4000); }
    function rest() { clearInterval(timer); play(); }
    // Phones: the carousel only rotates by itself (no swipe, no tapping the dots)
    const phone = matchMedia('(max-width: 600px)').matches;
    if (phone) dotsWrap.style.pointerEvents = 'none';
    let x0 = null;
    if (!phone) stage.addEventListener('pointerdown', e => { x0 = e.clientX; clearInterval(timer); });
    if (!phone) stage.addEventListener('pointerup', e => {
        if (x0 === null) return;
        const dx = e.clientX - x0;
        if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
        x0 = null; play();
    });
    if (!phone) stage.addEventListener('pointerleave', () => { x0 = null; });
    document.addEventListener('visibilitychange', () => document.hidden ? clearInterval(timer) : play());
    go(0); play();
})();
