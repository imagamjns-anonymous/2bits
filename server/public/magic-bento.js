// ═══════════════════════════════════════════════════════
// Magic Bento — Vanilla JS (ported from React Bits)
// ═══════════════════════════════════════════════════════
(function () {
  "use strict";

  const GLOW_COLOR = "157, 78, 221";
  const PARTICLE_COUNT = 12;
  const SPOTLIGHT_RADIUS = 300;
  const MOBILE_BREAKPOINT = 768;

  const gridEl = document.getElementById("magicBentoGrid");
  if (!gridEl) return;

  const cards = gridEl.querySelectorAll(".magic-bento-card");
  const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT;

  // ─── Particle helpers ──────────────────────────────────
  function createParticle(x, y, color) {
    const el = document.createElement("div");
    el.className = "particle";
    el.style.cssText = `
      position:absolute; width:4px; height:4px; border-radius:50%;
      background:rgba(${color},1); box-shadow:0 0 6px rgba(${color},0.6);
      pointer-events:none; z-index:100; left:${x}px; top:${y}px;
    `;
    return el;
  }

  // ─── Per-card interactive setup ────────────────────────
  cards.forEach((card) => {
    const particlesActive = [];
    const timeouts = [];
    let isHovered = false;
    let magnetAnim = null;

    // Pre-generate particle templates
    function spawnParticles() {
      if (isMobile()) return;
      const rect = card.getBoundingClientRect();
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const tid = setTimeout(() => {
          if (!isHovered) return;
          const p = createParticle(
            Math.random() * rect.width,
            Math.random() * rect.height,
            GLOW_COLOR
          );
          card.appendChild(p);
          particlesActive.push(p);

          gsap.fromTo(p, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" });
          gsap.to(p, {
            x: (Math.random() - 0.5) * 100,
            y: (Math.random() - 0.5) * 100,
            rotation: Math.random() * 360,
            duration: 2 + Math.random() * 2,
            ease: "none",
            repeat: -1,
            yoyo: true,
          });
          gsap.to(p, { opacity: 0.3, duration: 1.5, ease: "power2.inOut", repeat: -1, yoyo: true });
        }, i * 100);
        timeouts.push(tid);
      }
    }

    function clearParticles() {
      timeouts.forEach(clearTimeout);
      timeouts.length = 0;
      if (magnetAnim) { magnetAnim.kill(); magnetAnim = null; }
      particlesActive.forEach((p) => {
        gsap.to(p, {
          scale: 0, opacity: 0, duration: 0.3, ease: "back.in(1.7)",
          onComplete: () => p.parentNode && p.parentNode.removeChild(p),
        });
      });
      particlesActive.length = 0;
    }

    // Mouse enter
    card.addEventListener("mouseenter", () => {
      if (isMobile()) return;
      isHovered = true;
      spawnParticles();
      gsap.to(card, { rotateX: 5, rotateY: 5, duration: 0.3, ease: "power2.out", transformPerspective: 1000 });
    });

    // Mouse leave
    card.addEventListener("mouseleave", () => {
      isHovered = false;
      clearParticles();
      gsap.to(card, { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 0.3, ease: "power2.out" });
    });

    // Mouse move (tilt + magnetism)
    card.addEventListener("mousemove", (e) => {
      if (isMobile()) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      // Tilt
      gsap.to(card, {
        rotateX: ((y - cy) / cy) * -10,
        rotateY: ((x - cx) / cx) * 10,
        duration: 0.1,
        ease: "power2.out",
        transformPerspective: 1000,
      });

      // Magnetism
      magnetAnim = gsap.to(card, {
        x: (x - cx) * 0.05,
        y: (y - cy) * 0.05,
        duration: 0.3,
        ease: "power2.out",
      });
    });

    // Click ripple
    card.addEventListener("click", (e) => {
      if (isMobile()) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const maxDist = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - rect.width, y),
        Math.hypot(x, y - rect.height),
        Math.hypot(x - rect.width, y - rect.height)
      );

      const ripple = document.createElement("div");
      ripple.style.cssText = `
        position:absolute; width:${maxDist * 2}px; height:${maxDist * 2}px;
        border-radius:50%;
        background:radial-gradient(circle, rgba(${GLOW_COLOR},0.4) 0%, rgba(${GLOW_COLOR},0.2) 30%, transparent 70%);
        left:${x - maxDist}px; top:${y - maxDist}px;
        pointer-events:none; z-index:1000;
      `;
      card.appendChild(ripple);
      gsap.fromTo(ripple, { scale: 0, opacity: 1 }, { scale: 1, opacity: 0, duration: 0.8, ease: "power2.out", onComplete: () => ripple.remove() });
    });
  });

  // ─── Global Spotlight + Border Glow ────────────────────
  const spotlight = document.createElement("div");
  spotlight.className = "global-spotlight";
  spotlight.style.cssText = `
    position:fixed; width:800px; height:800px; border-radius:50%;
    pointer-events:none;
    background:radial-gradient(circle,
      rgba(${GLOW_COLOR},0.15) 0%, rgba(${GLOW_COLOR},0.08) 15%,
      rgba(${GLOW_COLOR},0.04) 25%, rgba(${GLOW_COLOR},0.02) 40%,
      rgba(${GLOW_COLOR},0.01) 65%, transparent 70%);
    z-index:200; opacity:0; transform:translate(-50%,-50%);
    mix-blend-mode:screen;
  `;
  document.body.appendChild(spotlight);

  const proximity = SPOTLIGHT_RADIUS * 0.5;
  const fadeDistance = SPOTLIGHT_RADIUS * 0.75;

  document.addEventListener("mousemove", (e) => {
    if (isMobile() || !gridEl) return;

    const section = gridEl.closest("#bentoSection");
    const sRect = section ? section.getBoundingClientRect() : null;
    const inside = sRect &&
      e.clientX >= sRect.left && e.clientX <= sRect.right &&
      e.clientY >= sRect.top && e.clientY <= sRect.bottom;

    if (!inside) {
      gsap.to(spotlight, { opacity: 0, duration: 0.3, ease: "power2.out" });
      cards.forEach((c) => c.style.setProperty("--glow-intensity", "0"));
      return;
    }

    let minDist = Infinity;

    cards.forEach((card) => {
      const r = card.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dist = Math.max(0, Math.hypot(e.clientX - cx, e.clientY - cy) - Math.max(r.width, r.height) / 2);
      minDist = Math.min(minDist, dist);

      let glow = 0;
      if (dist <= proximity) glow = 1;
      else if (dist <= fadeDistance) glow = (fadeDistance - dist) / (fadeDistance - proximity);

      const relX = ((e.clientX - r.left) / r.width) * 100;
      const relY = ((e.clientY - r.top) / r.height) * 100;
      card.style.setProperty("--glow-x", relX + "%");
      card.style.setProperty("--glow-y", relY + "%");
      card.style.setProperty("--glow-intensity", glow.toString());
      card.style.setProperty("--glow-radius", SPOTLIGHT_RADIUS + "px");
    });

    gsap.to(spotlight, { left: e.clientX, top: e.clientY, duration: 0.1, ease: "power2.out" });
    const tOpacity = minDist <= proximity ? 0.8 :
      minDist <= fadeDistance ? ((fadeDistance - minDist) / (fadeDistance - proximity)) * 0.8 : 0;
    gsap.to(spotlight, { opacity: tOpacity, duration: tOpacity > 0 ? 0.2 : 0.5, ease: "power2.out" });
  });

  document.addEventListener("mouseleave", () => {
    cards.forEach((c) => c.style.setProperty("--glow-intensity", "0"));
    gsap.to(spotlight, { opacity: 0, duration: 0.3, ease: "power2.out" });
  });
})();
