import "../styles/main.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

const page = document.documentElement.dataset.page || "home";

initSmoothScroll();
initHeader();
initMobileNav();
initAccordion();
initDifferent();
initPagers();
initScrollHints();
initCommunityCards();

if (page === "home") {
  initProductScroll();
  runPreloader().then(() => {
    initHeroText();
    initVideo();
    initHomeVideoExpand();
    initStats();
    initGalleryEyes();
    initReveal();
    ScrollTrigger.refresh();
  });
} else {
  initVideo();
  initStats();
  initGalleryEyes();
  initReveal();
  initScienceImpactScroll();
}

function initSmoothScroll() {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  const lenis = new Lenis({
    duration: 1.1,
    smoothWheel: true,
  });
  window.lenis = lenis;
  lenis.scrollTo(0, { immediate: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

function initHeader() {
  const header = document.querySelector(".header");
  if (!header) return;
  const darkSections = document.querySelectorAll("[data-theme='dark'], .about, .help, .footer");
  const onScroll = () => {
    let dark = false;
    const y = 28;
    darkSections.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top <= y && r.bottom >= y) dark = true;
    });
    header.dataset.theme = dark ? "dark" : "light";
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.lenis?.on("scroll", onScroll);
  onScroll();
}

function initMobileNav() {
  const burger = document.querySelector(".burger");
  const menu = document.querySelector(".mobile-nav");
  if (!burger || !menu) return;
  burger.addEventListener("click", () => menu.classList.toggle("is-open"));
  menu.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => menu.classList.remove("is-open"))
  );
}

async function runPreloader() {
  const pre = document.querySelector(".preloader");
  if (!pre) return;

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    pre.classList.add("is-done");
    pre.remove();
    document.documentElement.classList.remove("is-loading");
    window.scrollTo(0, 0);
    window.lenis?.scrollTo(0, { immediate: true });
    window.lenis?.start();
  };

  document.documentElement.classList.add("is-loading");
  window.lenis?.stop();

  const pctEl = pre.querySelector("[data-preloader-pct]");
  const bottle = pre.querySelector(".preloader-visual");

  const keys = [
    { p: 0, y: 128 },
    { p: 0.05, y: 112 },
    { p: 0.36, y: 48 },
    { p: 0.69, y: 0 },
    { p: 0.87, y: -82 },
    { p: 1, y: -132 },
  ];

  const yFromP = (p) => {
    if (p <= keys[0].p) return keys[0].y;
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1];
      const b = keys[i];
      if (p <= b.p) {
        const u = (p - a.p) / (b.p - a.p);
        return a.y + (b.y - a.y) * u;
      }
    }
    return keys[keys.length - 1].y;
  };

  const apply = (p) => {
    if (pctEl) pctEl.textContent = String(Math.round(p * 100));
    if (bottle) bottle.style.transform = `translate3d(0, ${yFromP(p)}%, 0)`;
  };
  apply(0);

  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const tween = (from, to, duration, ease) =>
    new Promise((resolve) => {
      let ended = false;
      const end = () => {
        if (ended) return;
        ended = true;
        apply(to);
        resolve();
      };
      const t0 = performance.now();
      const tick = (now) => {
        if (ended) return;
        const u = Math.min((now - t0) / duration, 1);
        apply(from + (to - from) * ease(u));
        if (u < 1) requestAnimationFrame(tick);
        else end();
      };
      requestAnimationFrame(tick);
      window.setTimeout(end, duration + 120);
    });

  const outQuad = (t) => 1 - (1 - t) * (1 - t);
  const inCubic = (t) => t * t * t;

  const safety = window.setTimeout(finish, 9000);

  try {
    await tween(0, 0.69, 1600, outQuad);
    await wait(2200);
    await tween(0.69, 1, 1100, inCubic);
    await wait(120);

    pre.style.pointerEvents = "none";
    pre.style.transition = "transform 0.9s cubic-bezier(0.77, 0, 0.18, 1)";
    pre.style.transform = "translate3d(0, -110%, 0)";
    await wait(920);
  } finally {
    window.clearTimeout(safety);
    finish();
  }
}

function initProductScroll() {
  const video = document.querySelector(".product-scroll-video");
  const act = document.querySelector("[data-first-act]");
  const layer = document.querySelector(".product-layer");
  const fallback = document.querySelector(".product-fallback");
  if (!video || !act) return;

  video.muted = true;
  video.playsInline = true;
  video.pause();

  const scenes = [...act.querySelectorAll("[data-scene]")];
  const points = [...act.querySelectorAll("[data-point]")];
  const benefits = [...act.querySelectorAll("[data-benefit]")];
  const introLines = [...act.querySelectorAll(".intro-line-inner")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const activate = (list, index) => {
    list.forEach((el, n) => el.classList.toggle("is-active", n === index));
  };

  let duration = video.duration || 0;
  let targetTime = 0;
  let seeking = false;

  const applyTime = () => {
    if (!duration) return;
    const t = Math.min(Math.max(targetTime, 0), Math.max(duration - 0.04, 0));
    if (Math.abs(video.currentTime - t) < 0.02) return;
    seeking = true;
    video.currentTime = t;
  };

  video.addEventListener("seeked", () => {
    seeking = false;
    applyTime();
  });

  const ready = () => {
    duration = video.duration || 0;
    fallback?.classList.add("is-hidden");
    layer?.classList.add("has-video");
    applyTime();
  };
  if (video.readyState >= 1) ready();
  else video.addEventListener("loadedmetadata", ready, { once: true });
  video.load();

  const easeOutCubic = (t) => 1 - (1 - t) ** 3;
  const easeInCubic = (t) => t * t * t;

  const setIntroLines = (p) => {
    if (!introLines.length) return;
    if (reduceMotion) {
      introLines.forEach((line) => {
        line.style.transform = "none";
        line.style.opacity = "1";
      });
      return;
    }

    const local = Math.min(Math.max(p / 0.22, 0), 1);
    introLines.forEach((line, i) => {
      const rise0 = 0.05 + i * 0.14;
      const rise1 = rise0 + 0.22;
      const fall0 = 0.62 + i * 0.05;
      const fall1 = Math.min(fall0 + 0.24, 1);
      let y = 120;
      let opacity = 0;

      if (local >= rise1 && local <= fall0) {
        y = 0;
        opacity = 1;
      } else if (local > rise0 && local < rise1) {
        const u = easeOutCubic((local - rise0) / (rise1 - rise0));
        y = 120 * (1 - u);
        opacity = u;
      } else if (local > fall0 && local < fall1) {
        const u = easeInCubic((local - fall0) / (fall1 - fall0));
        y = 120 * u;
        opacity = 1 - u;
      }

      line.style.transform = `translate3d(0, ${y}%, 0)`;
      line.style.opacity = String(opacity);
    });
  };

  const setProgress = (p) => {
    targetTime = duration ? p * duration : 0;
    if (!seeking) applyTime();
    setIntroLines(p);

    let sceneIndex = 0;
    if (p < 0.22) sceneIndex = 0;
    else if (p < 0.48) sceneIndex = 1;
    else if (p < 0.78) sceneIndex = 2;
    else sceneIndex = 3;

    scenes.forEach((el, n) => el.classList.toggle("is-active", n === sceneIndex));

    if (sceneIndex === 1) {
      const local = (p - 0.22) / 0.26;
      activate(benefits, Math.min(benefits.length - 1, Math.floor(local * benefits.length)));
    } else if (sceneIndex < 1) {
      activate(benefits, 0);
    }
    if (sceneIndex === 2) {
      const local = (p - 0.48) / 0.3;
      activate(points, Math.min(points.length - 1, Math.floor(local * points.length)));
    }
  };

  ScrollTrigger.create({
    trigger: act,
    start: "top top",
    end: "+=480%",
    pin: true,
    pinSpacing: true,
    scrub: 0.55,
    anticipatePin: 1,
    onEnter: () => layer?.classList.remove("is-idle"),
    onEnterBack: () => layer?.classList.remove("is-idle"),
    onLeave: () => {
      layer?.classList.remove("is-idle");
      setProgress(1);
    },
    onLeaveBack: () => layer?.classList.add("is-idle"),
    onUpdate: (self) => {
      if (self.progress > 0) layer?.classList.remove("is-idle");
      setProgress(self.progress);
    },
  });

  const about = document.querySelector(".about");
  if (about && layer) {
    ScrollTrigger.create({
      trigger: about,
      start: "top 88%",
      onEnter: () => layer.classList.add("is-idle"),
      onLeaveBack: () => {
        layer.classList.remove("is-idle");
        setProgress(1);
      },
    });
  }

  setProgress(0);
}

function initScienceImpactScroll() {
  const section = document.querySelector(".sci-impact");
  const video = section?.querySelector(".sci-impact-video");
  if (!section || !video) return;

  video.muted = true;
  video.playsInline = true;
  video.pause();

  const items = [...section.querySelectorAll(".acc-item")];
  let duration = 0;
  let targetTime = 0;
  let seeking = false;

  const applyTime = () => {
    if (!duration) return;
    const t = Math.min(Math.max(targetTime, 0), Math.max(duration - 0.04, 0));
    if (Math.abs(video.currentTime - t) < 0.02) return;
    seeking = true;
    video.currentTime = t;
  };

  video.addEventListener("seeked", () => {
    seeking = false;
    applyTime();
  });

  const ready = () => {
    duration = video.duration || 0;
    applyTime();
  };
  if (video.readyState >= 1) ready();
  else video.addEventListener("loadedmetadata", ready, { once: true });
  video.load();

  const setProgress = (p) => {
    targetTime = duration ? p * duration : 0;
    if (!seeking) applyTime();
    if (!items.length) return;
    const index = Math.min(items.length - 1, Math.floor(p * items.length * 0.999));
    items.forEach((el, n) => el.classList.toggle("is-open", n === index));
  };

  ScrollTrigger.create({
    trigger: section,
    start: "top 72%",
    end: "bottom 28%",
    scrub: 0.55,
    invalidateOnRefresh: true,
    onUpdate: (self) => setProgress(self.progress),
    onLeave: () => setProgress(1),
    onLeaveBack: () => setProgress(0),
  });

  setProgress(0);
}

function initReveal() {
  document.querySelectorAll("[data-reveal]").forEach((el) => {
    gsap.from(el, {
      y: 36,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: el,
        start: "top 86%",
      },
    });
  });

  document.querySelectorAll("[data-reveal-words]").forEach((el) => {
    const words = el.querySelectorAll("[data-word]");
    gsap.from(words, {
      y: "0.4em",
      opacity: 0,
      filter: "blur(8px)",
      duration: 0.9,
      stagger: 0.05,
      ease: "power3.out",
      scrollTrigger: {
        trigger: el,
        start: "top 80%",
      },
    });
  });
}

function initGalleryEyes() {
  document.querySelectorAll(".gallery").forEach((gallery) => {
    const frames = [...gallery.querySelectorAll(":scope > img")].map((img) => {
      const eye = document.createElement("div");
      eye.className = "gallery-eye";

      const top = document.createElement("span");
      top.className = "gallery-eye-lid is-top";
      top.setAttribute("aria-hidden", "true");

      const bot = document.createElement("span");
      bot.className = "gallery-eye-lid is-bot";

      const clone = img.cloneNode(true);
      clone.alt = "";
      top.appendChild(clone);
      bot.appendChild(img);
      eye.append(top, bot);
      gallery.appendChild(eye);
      return eye;
    });

    if (!frames.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      frames.forEach((eye) => {
        eye.querySelectorAll(".gallery-eye-lid").forEach((lid) => {
          lid.style.height = "50%";
        });
      });
      return;
    }

    frames.forEach((eye, i) => {
      gsap.fromTo(
        eye.querySelectorAll(".gallery-eye-lid"),
        { height: 0 },
        {
          height: "50%",
          ease: "none",
          scrollTrigger: {
            trigger: gallery,
            start: `top ${88 - i * 4}%`,
            end: `top ${52 - i * 3}%`,
            scrub: 0.65,
          },
        }
      );
    });
  });
}

function initAccordion() {
  document.querySelectorAll(".acc-item").forEach((item) => {
    const btn = item.querySelector(".acc-btn");
    btn?.addEventListener("click", () => {
      const open = item.classList.contains("is-open");
      document.querySelectorAll(".acc-item").forEach((i) => i.classList.remove("is-open"));
      if (!open) item.classList.add("is-open");
    });
  });
}

function initDifferent() {
  const root = document.querySelector(".different");
  if (!root) return;
  initPagerRoot(root, {
    slides: [...root.querySelectorAll(".diff-slide")],
    thumbs: [...root.querySelectorAll(".diff-thumbs img")],
    numbers: root.querySelector(".diff-index .numbers"),
    prev: root.querySelector(".prev"),
    next: root.querySelector(".next"),
  });
}

function splitHeroLines(el, { hardBreaksOnly = false } = {}) {
  if (!el) return [];
  if (!el.dataset.lineSource) el.dataset.lineSource = el.innerHTML;
  el.innerHTML = el.dataset.lineSource;

  const tokens = [];
  const addText = (text, italic) => {
    String(text)
      .split(/(\s+)/)
      .forEach((part) => {
        if (!part) return;
        const span = document.createElement("span");
        span.className = part.trim() ? "hero-word" : "hero-sp";
        if (italic) {
          const i = document.createElement("i");
          i.textContent = part;
          span.append(i);
        } else {
          span.textContent = part;
        }
        tokens.push(span);
      });
  };

  const walk = (root) => {
    [...root.childNodes].forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) addText(node.textContent, false);
      else if (node.nodeName === "BR") tokens.push(document.createElement("br"));
      else if (node.nodeName === "I") addText(node.textContent, true);
      else walk(node);
    });
  };

  walk(el);
  el.style.width = "100%";
  el.replaceChildren(...tokens);
  void el.offsetWidth;

  const lines = [];
  let bucket = [];
  let lastTop = null;
  const flush = () => {
    if (bucket.length) lines.push(bucket);
    bucket = [];
    lastTop = null;
  };

  tokens.forEach((tok) => {
    if (tok.tagName === "BR") {
      flush();
      tok.remove();
      return;
    }
    if (!tok.classList.contains("hero-word")) {
      if (bucket.length) bucket.push(tok);
      return;
    }
    if (!hardBreaksOnly) {
      const top = Math.round(tok.getBoundingClientRect().top);
      if (lastTop !== null && top > lastTop + 2) flush();
      lastTop = top;
    }
    bucket.push(tok);
  });
  flush();

  const wrapped = lines
    .map((parts) => {
      while (parts[0]?.classList.contains("hero-sp")) parts.shift();
      while (parts.at(-1)?.classList.contains("hero-sp")) parts.pop();
      if (!parts.length) return null;
      const line = document.createElement("span");
      line.className = "hero-line";
      const inner = document.createElement("span");
      inner.className = "hero-line-inner";
      parts.forEach((part) => inner.append(part));
      line.append(inner);
      return line;
    })
    .filter(Boolean);

  el.replaceChildren(...wrapped);
  return [...el.querySelectorAll(".hero-line-inner")];
}

function initHeroText() {
  const hero = document.querySelector(".hero");
  if (!hero) return;

  const title = hero.querySelector("h1");
  const copy = hero.querySelector(".hero-copy .body-lg");
  const cta = hero.querySelector(".hero-copy .cta");
  let tl;

  const maskCta = () => {
    if (!cta) return null;
    const existing = cta.closest(".hero-line-inner");
    if (existing) return existing;
    const line = document.createElement("span");
    line.className = "hero-line";
    const inner = document.createElement("span");
    inner.className = "hero-line-inner";
    cta.replaceWith(line);
    inner.append(cta);
    line.append(inner);
    hero.querySelector(".hero-copy")?.append(line);
    return inner;
  };

  const build = () => {
    tl?.scrollTrigger?.kill();
    tl?.kill();

    const lines = [
      ...splitHeroLines(title, { hardBreaksOnly: true }),
      ...splitHeroLines(copy),
      maskCta(),
    ].filter(Boolean);
    if (!lines.length) return;

    gsap.set(lines, { yPercent: 118 });
    tl = gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: "top 82%",
        end: "bottom 24%",
        toggleActions: "play reverse play reverse",
        invalidateOnRefresh: true,
      },
    });
    tl.to(lines, {
      yPercent: 0,
      duration: 1,
      stagger: 0.1,
      ease: "expo.out",
    });
  };

  build();
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 160);
  });
}

function initCommunityCards() {
  document.querySelectorAll(".sci-community").forEach((section) => {
    const cards = [...section.querySelectorAll(".sci-person")];
    if (!cards.length) return;

    gsap.set(cards, { x: 160 });

    gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top 74%",
        end: "bottom 32%",
        toggleActions: "play reverse play reverse",
        invalidateOnRefresh: true,
      },
    }).to(cards, {
      x: 0,
      duration: 0.8,
      stagger: 0.16,
      ease: "power3.out",
    });
  });
}

function initPagers() {
  document.querySelectorAll("[data-pager]").forEach((root) => {
    const slides = [...root.querySelectorAll("[data-slide]")];
    const numbers = root.querySelector("[data-pager-numbers]");
    const total = root.querySelector("[data-pager-total]");
    if (numbers) {
      numbers.innerHTML = slides.map((_, n) => `<div>${n + 1}</div>`).join("");
    }
    if (total) total.textContent = String(slides.length);
    initPagerRoot(root, {
      slides,
      thumbs: [...root.querySelectorAll("[data-thumb]")],
      numbers,
      prev: root.querySelector("[data-prev]"),
      next: root.querySelector("[data-next]"),
    });
  });
}

function initPagerRoot(root, { slides, thumbs, numbers, prev, next }) {
  if (!slides.length) return;
  const track = root.querySelector("[data-pager-track]");
  const desc = root.querySelector("[data-ing-desc]");
  const isIng = slides[0]?.classList.contains("sci-ing");
  const ease = "expo.out";
  const dur = 0.95;
  let i = 0;
  let booted = false;

  const ingSizes = () =>
    window.matchMedia("(max-width: 1023px)").matches
      ? { active: 168, inactive: 84 }
      : { active: 220, inactive: 108 };

  const ingTargetX = () => {
    if (!track) return 0;
    const { active, inactive } = ingSizes();
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    let left = 0;
    for (let n = 0; n < i; n++) left += inactive + gap;
    const parent = track.parentElement;
    if (!parent) return 0;
    return parent.clientWidth / 2 - (left + active / 2);
  };

  const alignTrack = () => {
    if (!track) return;
    if (isIng) {
      gsap.to(track, { x: ingTargetX(), duration: booted ? dur : 0, ease, overwrite: true });
      return;
    }
    const items = [...track.children];
    const active = items[i];
    if (!active) return;
    const parent = track.parentElement;
    if (!parent) return;
    const mode = track.getAttribute("data-pager-track") || "start";
    const x =
      mode === "center"
        ? parent.clientWidth / 2 - (active.offsetLeft + active.offsetWidth / 2)
        : -active.offsetLeft;
    track.style.transform = `translateX(${x}px)`;
  };

  const render = () => {
    slides.forEach((s, n) => s.classList.toggle("is-active", n === i));
    thumbs.forEach((s, n) => s.classList.toggle("is-active", n === i));
    if (numbers) numbers.style.transform = `translateY(${-i * 1.2}em)`;
    prev?.toggleAttribute("disabled", i === 0);
    next?.toggleAttribute("disabled", i === slides.length - 1);

    const copy = slides[i].querySelector("p")?.textContent?.trim() || "";
    if (desc) {
      if (!booted) {
        desc.textContent = copy;
        desc.dataset.current = copy;
        gsap.set(desc, { opacity: 1, y: 0 });
      } else if (desc.dataset.current !== copy) {
        const nextCopy = copy;
        gsap.to(desc, {
          opacity: 0,
          y: 8,
          duration: 0.2,
          ease: "power2.out",
          overwrite: true,
          onComplete: () => {
            desc.textContent = nextCopy;
            desc.dataset.current = nextCopy;
            gsap.fromTo(
              desc,
              { opacity: 0, y: 8 },
              { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }
            );
          },
        });
      }
    }

    alignTrack();
    booted = true;
  };

  const go = (n) => {
    i = Math.max(0, Math.min(slides.length - 1, n));
    render();
  };
  prev?.addEventListener("click", (e) => {
    e.stopPropagation();
    go(i - 1);
  });
  next?.addEventListener("click", (e) => {
    e.stopPropagation();
    go(i + 1);
  });
  slides.forEach((s, n) => s.addEventListener("click", () => go(n)));
  thumbs.forEach((s, n) => s.addEventListener("click", () => go(n)));
  window.addEventListener("resize", () => {
    if (isIng) {
      gsap.set(track, { x: ingTargetX() });
      return;
    }
    alignTrack();
  });
  render();
}

function initScrollHints() {
  document.querySelectorAll("[data-scroll-to]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const el = document.querySelector(btn.dataset.scrollTo);
      if (!el) return;
      if (window.lenis) {
        window.lenis.scrollTo(el, { offset: -12 });
        return;
      }
      const y = el.getBoundingClientRect().top + window.scrollY - 12;
      window.scrollTo({ top: y, behavior: "smooth" });
    });
  });
}

function initVideo() {
  document.querySelectorAll("video[autoplay]").forEach((el) => {
    el.play().catch(() => {});
  });
  const video = document.querySelector(".video-wrap video");
  const btn = document.querySelector(".video-btn");
  const progress = document.querySelector(".video-btn [data-progress]");
  if (!video || !btn) return;

  const circ = 2 * Math.PI * 32.5;
  if (progress) progress.style.strokeDasharray = String(circ);

  const update = () => {
    if (progress && video.duration) {
      const p = video.currentTime / video.duration;
      progress.style.strokeDashoffset = String(circ * (1 - p));
    }
    btn.querySelector(".icon").textContent = video.paused ? "PLAY" : "PAUSE";
  };

  btn.addEventListener("click", () => {
    if (video.paused) video.play();
    else video.pause();
    update();
  });
  video.addEventListener("timeupdate", update);
  video.play().catch(() => {});
  update();
}

function initHomeVideoExpand() {
  const wrap = document.querySelector(".video-block .video-wrap");
  const block = document.querySelector(".video-block");
  if (!wrap || !block) return;

  const inset = () => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--page-gutter");
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 16;
  };

  const apply = (progress) => {
    const startW = Math.min(block.clientWidth - inset() * 2, 1480);
    const endW = block.clientWidth;
    const width = startW + (endW - startW) * progress;
    wrap.style.width = `${Math.max(width, 0)}px`;
    wrap.style.maxWidth = "none";
    wrap.style.marginLeft = "auto";
    wrap.style.marginRight = "auto";
    wrap.style.borderRadius = `${8 * (1 - progress)}px`;
  };

  apply(0);

  ScrollTrigger.create({
    trigger: block,
    start: "top 90%",
    end: "top 42%",
    scrub: 0.5,
    invalidateOnRefresh: true,
    onUpdate: (self) => apply(self.progress),
    onRefresh: (self) => apply(self.progress),
  });
}

function initStats() {
  document.querySelectorAll("[data-count]").forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const prefix = el.dataset.prefix || "";
    const decimals = el.dataset.decimals ? Number(el.dataset.decimals) : 0;
    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: () => {
        gsap.to(obj, {
          v: end,
          duration: 1.8,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = `${prefix}${obj.v.toFixed(decimals)}${suffix}`;
          },
        });
      },
    });
  });
}
