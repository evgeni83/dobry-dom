/* ============================================================
   Гостевой дом «Добрый Дом» — Ейск
   main.js — header, menu, reveal, gallery lightbox, booking form
   ============================================================ */
(function () {
  "use strict";

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // GSAP + ScrollTrigger доступны и анимации разрешены?
  const hasGSAP =
    !reduceMotion &&
    typeof window.gsap !== "undefined" &&
    typeof window.ScrollTrigger !== "undefined";

  const WHATSAPP = "79676581692"; // номер для заявок
  const PHONE_ALT = "+79649297354";

  /* ---------- Год в подвале ---------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Header: состояние при скролле ---------- */
  const header = $(".site-header");
  let lastY = window.scrollY;

  function onScroll() {
    const y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 24);
    lastY = y;
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Мобильное меню ---------- */
  const toggle = $(".nav-toggle");
  const menu = $("#mobile-menu");

  function setMenu(open) {
    if (!menu || !toggle) return;
    menu.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    header.classList.toggle("is-solid", open);
    document.body.style.overflow = open ? "hidden" : "";
  }

  if (toggle) {
    toggle.addEventListener("click", () => setMenu(menu.hidden));
  }
  if (menu) {
    $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  }
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu && !menu.hidden) setMenu(false);
  });

  /* ---------- Reveal при прокрутке (fallback без GSAP) ---------- */
  const revealEls = $$("[data-reveal]");
  if (hasGSAP) {
    /* резервный IntersectionObserver не нужен — анимациями управляет GSAP (см. блок ниже) */
  } else if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            entry.target.style.setProperty("--d", (i * 70) + "ms");
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- Плавная «параллакс»-анимация фото в hero (fallback без GSAP) ---------- */
  const parallaxEls = $$("[data-parallax]");
  const canParallax = !reduceMotion && !hasGSAP && window.matchMedia("(min-width: 1081px)").matches;

  if (canParallax && parallaxEls.length) {
    let raf = null;
    const apply = () => {
      const y = window.scrollY;
      parallaxEls.forEach((el) => {
        const f = parseFloat(el.dataset.parallax) || 0;
        el.style.transform = `translate3d(0, ${(y * f).toFixed(2)}px, 0)`;
      });
      raf = null;
    };
    window.addEventListener(
      "scroll",
      () => { if (!raf) raf = requestAnimationFrame(apply); },
      { passive: true }
    );
  }

  /* ============================================================
     GSAP + ScrollTrigger — «apple-style» анимации при прокрутке
       1) Скролл-синхронные (scrub: вниз — вперёд, вверх — назад)
       2) Пиннинг визуального блока по центру экрана
       3) Мягкое появление текста: fade + сдвиг по Y
     ============================================================ */
  if (hasGSAP) {
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);
    document.documentElement.classList.add("has-gsap");

    // меньше «дёрганья» при показе/скрытии адресной строки на мобильных
    ScrollTrigger.config({ ignoreMobileResize: true });

    /* --- 3) Smooth reveals: fade + лёгкий сдвиг вверх --- */
    revealEls.forEach((el) => {
      const parent = el.parentElement;
      const sibs = parent
        ? Array.from(parent.children).filter((c) => c.hasAttribute("data-reveal"))
        : [];
      const idx = sibs.indexOf(el);

      gsap.fromTo(
        el,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.85,
          ease: "power2.out",
          delay: idx > 0 ? Math.min(idx, 5) * 0.08 : 0,
          scrollTrigger: { trigger: el, start: "top 86%", once: true },
        }
      );
    });

    /* --- 1) HERO: scrub-параллакс (двигается туда и обратно вместе со скроллом) --- */
    gsap
      .timeline({
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 },
      })
      .to(".hero__content", { yPercent: -14, autoAlpha: 0.08, ease: "none" }, 0)
      .to(".hero__gallery", { yPercent: -9, scale: 0.94, ease: "none" }, 0)
      .to(".hero__bg", { yPercent: 12, ease: "none" }, 0);

    /* --- 2) ABOUT: фото «прилипают» по центру, текст проезжает мимо --- */
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1081px)", () => {
      const media = $(".about__media");
      const body = $(".about__body");
      if (!media) return;

      // длительность пина ≈ высоте текста, но не больше ~0.6 экрана
      const distance = () =>
        "+=" + Math.round(Math.min(window.innerHeight * 0.6, (body ? body.offsetHeight : 480) * 0.9));

      ScrollTrigger.create({
        trigger: media,
        start: "center center",
        end: distance,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
      });

      gsap
        .timeline({
          scrollTrigger: { trigger: media, start: "center center", end: distance, scrub: 1 },
        })
        .to(".about__img--main", { scale: 1.06, yPercent: -3, ease: "none" }, 0)
        .to(".about__img--sub", { scale: 0.95, yPercent: 5, ease: "none" }, 0)
        .to(".about__badge", { yPercent: -14, ease: "none" }, 0);
    });

    /* --- Счётчики в блоке цифр: «набегают» при появлении --- */
    $$(".stat__num").forEach((num) => {
      const node = Array.from(num.childNodes).find(
        (n) => n.nodeType === 3 && /\d/.test(n.nodeValue)
      );
      if (!node) return;

      const raw = node.nodeValue;
      const m = raw.match(/(\d+)([.,](\d+))?/);
      if (!m) return;

      const target = parseFloat(m[1] + (m[3] ? "." + m[3] : ""));
      if (target >= 1900) return; // годы не «считаем»

      const dec = m[3] ? m[3].length : 0;
      const prefix = raw.slice(0, m.index);
      const suffix = raw.slice(m.index + m[0].length);
      const state = { v: 0 };

      gsap.to(state, {
        v: target,
        duration: 1.4,
        ease: "power2.out",
        scrollTrigger: { trigger: num, start: "top 88%", once: true },
        onUpdate() {
          node.nodeValue = prefix + state.v.toFixed(dec).replace(".", ",") + suffix;
        },
      });
    });

    // пересчёт позиций после загрузки картинок и веб-шрифтов
    window.addEventListener("load", () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
  }

  /* ---------- Галерея + лайтбокс ---------- */
  const items = $$(".gallery__item");
  const lightbox = $("#lightbox");
  const lbImg = $("#lightbox-img");
  const lbCaption = $("#lightbox-caption");
  let current = 0;
  let lastFocused = null;

  function show(index) {
    if (!items.length) return;
    current = (index + items.length) % items.length;
    const btn = items[current];
    lbImg.src = btn.dataset.img;
    lbImg.alt = btn.querySelector("img")?.alt || "";
    lbCaption.textContent = btn.dataset.caption || "";
  }

  function openLightbox(index) {
    if (!lightbox) return;
    lastFocused = document.activeElement;
    show(index);
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    $(".lightbox__close")?.focus();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    document.body.style.overflow = "";
    if (lastFocused) lastFocused.focus();
  }

  items.forEach((btn, i) => {
    const img = btn.querySelector("img");
    if (img) img.loading = "lazy";
    btn.addEventListener("click", () => openLightbox(i));
  });

  if (lightbox) {
    $(".lightbox__close")?.addEventListener("click", closeLightbox);
    $(".lightbox__nav--prev")?.addEventListener("click", () => show(current - 1));
    $(".lightbox__nav--next")?.addEventListener("click", () => show(current + 1));
    lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });

    window.addEventListener("keydown", (e) => {
      if (lightbox.hidden) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") show(current - 1);
      else if (e.key === "ArrowRight") show(current + 1);
      else if (e.key === "Tab") {
        // модальное окно: не выпускаем фокус на страницу под ним
        // (a[href], а не [href] — иначе под селектор попадают <use href> внутри SVG)
        const focusables = $$("button, a[href], [tabindex]:not([tabindex='-1'])", lightbox)
          .filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
        if (focusables.length < 2) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    // свайпы на мобильных
    let startX = null;
    lightbox.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener("touchend", (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 45) show(current + (dx < 0 ? 1 : -1));
      startX = null;
    }, { passive: true });
  }

  /* ---------- Форма бронирования → WhatsApp ---------- */
  const form = $("#booking-form");
  const note = $("#form-note");

  if (form) {
    const checkin = $("#checkin");
    const checkout = $("#checkout");
    const today = new Date().toISOString().split("T")[0];
    if (checkin) checkin.min = today;

    if (checkin && checkout) {
      checkin.addEventListener("change", () => {
        checkout.min = checkin.value || today;
        if (checkout.value && checkout.value < checkin.value) checkout.value = "";
      });
    }

    const setNote = (text, kind) => {
      if (!note) return;
      note.textContent = text;
      note.classList.remove("is-ok", "is-err");
      if (kind) note.classList.add(kind);
    };

    /* Поле с ошибкой помечаем не только текстом: aria-invalid + aria-describedby,
       плюс визуальный класс на обёртке .field */
    const markInvalid = (el, message) => {
      if (!el) return;
      el.setAttribute("aria-invalid", "true");
      if (note) el.setAttribute("aria-describedby", note.id);
      const wrap = el.closest(".field");
      if (wrap) wrap.classList.add("is-invalid");
      if (message) setNote(message, "is-err");
    };
    const clearInvalid = (el) => {
      if (!el) return;
      el.removeAttribute("aria-invalid");
      el.removeAttribute("aria-describedby");
      const wrap = el.closest(".field");
      if (wrap) wrap.classList.remove("is-invalid");
    };

    const validateName = () => {
      const el = $("#name");
      if (!el) return true;
      if (el.value.trim().length < 2) {
        markInvalid(el, "Пожалуйста, укажите имя.");
        return false;
      }
      clearInvalid(el);
      return true;
    };

    const validatePhone = () => {
      const el = $("#phone");
      if (!el) return true;
      if (el.value.replace(/\D/g, "").length < 10) {
        markInvalid(el, "Пожалуйста, укажите корректный телефон.");
        return false;
      }
      clearInvalid(el);
      return true;
    };

    /* Валидируем при уходе из поля, а не только при отправке:
       пустое поле не ругаем, пока пользователь его не заполнял */
    [["#name", validateName], ["#phone", validatePhone]].forEach(([sel, validate]) => {
      const el = $(sel);
      if (!el) return;
      el.addEventListener("blur", () => {
        if (el.value.trim() !== "") validate();
      });
      el.addEventListener("input", () => {
        if (el.getAttribute("aria-invalid") === "true") clearInvalid(el);
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      if (!validateName()) {
        $("#name").focus();
        return;
      }
      if (!validatePhone()) {
        $("#phone").focus();
        return;
      }
      if (checkin.value && checkout.value && checkout.value < checkin.value) {
        markInvalid(checkout, "Дата выезда не может быть раньше даты заезда.");
        return;
      }
      clearInvalid(checkout);

      const name = $("#name").value.trim();
      const phone = $("#phone").value.trim();
      const guests = $("#guests").value || "—";
      const comment = $("#comment").value.trim();

      const lines = [
        "Заявка на бронирование",
        "Гостевой дом «Добрый Дом», Ейск",
        "",
        "Имя: " + name,
        "Телефон: " + phone,
        "Заезд: " + (checkin.value || "—"),
        "Выезд: " + (checkout.value || "—"),
        "Гостей: " + guests,
      ];
      if (comment) lines.push("Комментарий: " + comment);

      const url = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(lines.join("\n"));

      setNote("Открываем WhatsApp — осталось отправить сообщение.", "is-ok");
      window.open(url, "_blank", "noopener");
    });
  }

  /* ---------- Scrollspy: активный пункт меню ---------- */
  const sections = $$("main section[id]");
  const navLinks = $$('.nav a[href^="#"]');
  if (sections.length && navLinks.length && "IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = "#" + entry.target.id;
          navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === id));
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => spy.observe(s));
  }
})();
