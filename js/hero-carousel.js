/* ════════════════════════════════════════════
   MICRONODE LLP — Home hero board carousel ("hidden circle")
   Six slots sit 60° apart on an invisible circle whose leftmost point is the
   centre of the stage. Each step turns the circle by 60°, so one board glides
   in from lower right, settles in the centre and glides out to upper right.
   Only the front slot is visible. The step only ever increases, so the motion
   never reverses. Boards repeat: [MG51 front, TM1637] x 3.
   ════════════════════════════════════════════ */
(function () {
    const stage = document.getElementById('mhStage');
    if (!stage) return;
    const slots = [...stage.querySelectorAll('.mh-slot')];
    const dots = [...document.querySelectorAll('#mhDots button')];
    const tagEl = document.getElementById('mhTag');
    const nameEl = document.getElementById('mhName');
    const BOARDS = [
        { tag: '8051 · Development board', name: 'MG51 Dev Board' },
        { tag: 'HMI · Display module', name: 'TM1637 Display & Keys' }
    ];
    const N = slots.length, STEP_DEG = 360 / N, INTERVAL = 3400;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let step = 0, timer = null, hovering = false, touching = false;

    function render() {
        const front = step % N;
        slots.forEach((s, k) => {
            s.style.setProperty('--a', (k * STEP_DEG - step * STEP_DEG) + 'deg');
            const isFront = k === front;
            const wasFront = s.classList.contains('is-front');
            s.classList.toggle('is-front', isFront);
            s.classList.toggle('is-leaving', wasFront && !isFront);
            s.setAttribute('aria-hidden', isFront ? 'false' : 'true');
        });
        const b = step % BOARDS.length;
        tagEl.textContent = BOARDS[b].tag;
        nameEl.textContent = BOARDS[b].name;
        dots.forEach((d, i) => d.setAttribute('aria-current', i === b ? 'true' : 'false'));
    }

    function next(by) { step += by || 1; render(); }
    function stop() { clearInterval(timer); timer = null; }
    function play() {
        stop();
        if (reduce || hovering || touching || document.hidden) return;
        timer = setInterval(next, INTERVAL);
    }

    // Dots always move forward to the chosen board, so the direction never flips
    dots.forEach((d, i) => d.addEventListener('click', () => {
        const diff = (i - (step % BOARDS.length) + BOARDS.length) % BOARDS.length;
        if (diff) next(diff);
        play();
    }));

    stage.addEventListener('mouseenter', () => { hovering = true; stop(); });
    stage.addEventListener('mouseleave', () => { hovering = false; play(); });
    stage.addEventListener('touchstart', () => { touching = true; stop(); }, { passive: true });
    stage.addEventListener('touchend', () => { touching = false; play(); }, { passive: true });
    document.addEventListener('visibilitychange', play);

    render();
    play();
})();
