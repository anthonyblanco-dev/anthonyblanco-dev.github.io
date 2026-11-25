/* Anthony Blanco Dev · portafolio
   JavaScript puro, sin frameworks. Cada bloque se activa solo si su página lo necesita. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EN = window.AB_EN || {};
  const ESJ = window.AB_ES_JS || {};
  const html = document.documentElement;
  let lang = html.lang === "en" ? "en" : "es";
  const t = (k) => (lang === "en" ? EN[k] : ESJ[k]) ?? ESJ[k] ?? k;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  /* ---------------------------------------------------------
     Idioma ES / EN
     --------------------------------------------------------- */
  function applyLang(l, animate) {
    lang = l;
    html.lang = l; html.dataset.lang = l;
    $$("[data-i18n]").forEach((el) => {
      if (el.__es === undefined) el.__es = el.textContent;
      el.textContent = l === "en" ? (EN[el.dataset.i18n] ?? el.__es) : el.__es;
    });
    $$("[data-i18n-attr]").forEach((el) => {
      el.__esa = el.__esa || {};
      el.dataset.i18nAttr.split(";").forEach((pair) => {
        const [a, k] = pair.split(":");
        if (!(a in el.__esa)) el.__esa[a] = el.getAttribute(a);
        el.setAttribute(a, l === "en" ? (EN[k] ?? el.__esa[a]) : el.__esa[a]);
      });
    });
    $$("[data-doc]").forEach((a) => a.setAttribute("href", a.dataset.doc.replace("{L}", l === "en" ? "EN" : "ES")));
    const sw = $(".lang");
    if (sw) {
      sw.dataset.lang = l;
      $$("[data-set-lang]", sw).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.setLang === l)));
    }
    if (animate && !RM) {
      const m = $("main");
      m.classList.remove("lang-swap"); void m.offsetWidth; m.classList.add("lang-swap");
      setTimeout(() => m.classList.remove("lang-swap"), 200);
    }
    document.dispatchEvent(new CustomEvent("ab:lang"));
  }
  $$("[data-set-lang]").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.setLang === lang) return;
    store.set("ab-lang", b.dataset.setLang);
    applyLang(b.dataset.setLang, true);
  }));
  if (lang === "en") applyLang("en", false);

  /* ---------------------------------------------------------
     Riel de navegación: marcador que salta por pasos
     --------------------------------------------------------- */
  const rail = $(".rail");
  if (rail) {
    const marker = $(".marker", rail);
    const links = $$("a", rail);
    const current = links.find((a) => a.getAttribute("aria-current") === "page") || links[0];
    const place = (a) => {
      const li = a.parentElement;
      const horiz = matchMedia("(max-width: 899px)").matches;
      if (horiz) {
        marker.style.transform = `translateX(${li.offsetLeft}px)`;
        marker.style.width = li.offsetWidth + "px"; marker.style.height = "";
      } else {
        marker.style.transform = `translateY(${li.offsetTop}px)`;
        marker.style.height = li.offsetHeight + "px"; marker.style.width = "";
      }
      links.forEach((x) => x.classList.toggle("under", x === a));
    };
    marker.style.transition = "none"; place(current);
    requestAnimationFrame(() => requestAnimationFrame(() => { marker.style.transition = ""; }));
    links.forEach((a) => {
      a.addEventListener("pointerenter", () => place(a));
      a.addEventListener("focus", () => place(a));
      a.addEventListener("pointerleave", () => place(current));
      a.addEventListener("blur", () => place(current));
    });
    addEventListener("resize", () => { marker.style.transition = "none"; place(current); requestAnimationFrame(() => { marker.style.transition = ""; }); });
  }

  /* ---------------------------------------------------------
     Transición entre páginas: mosaico desde el punto del clic
     --------------------------------------------------------- */
  const mosaic = $("#mosaic");
  let busy = false;
  function buildMosaic() {
    const cols = Math.ceil(innerWidth / 64), rows = Math.ceil(innerHeight / 64);
    mosaic.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    mosaic.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    mosaic.textContent = "";
    const frag = document.createDocumentFragment();
    for (let i = 0; i < cols * rows; i++) frag.appendChild(document.createElement("i"));
    mosaic.appendChild(frag);
    mosaic.hidden = false;
    return { cols, rows, cells: Array.from(mosaic.children) };
  }
  function wave({ cols, rows, cells }, ox, oy, covering) {
    const anims = cells.map((c, i) => {
      const x = i % cols, y = Math.floor(i / cols);
      const d = Math.hypot(x + .5 - ox * cols, y + .5 - oy * rows);
      if (Math.round(d) % 8 === 0) c.classList.add("hot");
      const frames = covering ? [{ transform: "scale(0)" }, { transform: "scale(1)" }] : [{ transform: "scale(1)" }, { transform: "scale(0)" }];
      return c.animate(frames, { duration: 240, delay: d * 15, easing: "steps(3, end)", fill: "forwards" });
    });
    return Promise.all(anims.map((a) => a.finished));
  }
  function leave(href, ox, oy) {
    busy = true;
    try { sessionStorage.setItem("ab-mosaic", JSON.stringify({ x: ox, y: oy })); } catch (e) {}
    const m = buildMosaic();
    let done = false;
    const go = () => { if (!done) { done = true; location.href = href; } };
    wave(m, ox, oy, true).then(go);
    setTimeout(go, 1500);
  }
  function enter() {
    let o = null;
    try { o = JSON.parse(sessionStorage.getItem("ab-mosaic") || "null"); sessionStorage.removeItem("ab-mosaic"); } catch (e) {}
    if (!o || RM || !mosaic) { html.classList.remove("is-entering"); return; }
    const m = buildMosaic();
    m.cells.forEach((c) => { c.style.transform = "scale(1)"; });
    html.classList.remove("is-entering");
    wave(m, o.x, o.y, false).then(() => { mosaic.hidden = true; mosaic.textContent = ""; });
  }
  enter();
  addEventListener("load", () => html.classList.remove("is-entering"));
  addEventListener("pageshow", (e) => {
    if (e.persisted) { busy = false; html.classList.remove("is-entering"); if (mosaic) { mosaic.hidden = true; mosaic.textContent = ""; } }
  });
  document.addEventListener("click", (ev) => {
    if (RM || busy || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    const a = ev.target.closest("a[href]");
    if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
    let u; try { u = new URL(a.href); } catch (e) { return; }
    if (u.origin !== location.origin || !/(\.html?|\/)$/.test(u.pathname)) return;
    if (u.pathname === location.pathname && u.search === location.search) return;
    ev.preventDefault();
    let x = ev.clientX / innerWidth, y = ev.clientY / innerHeight;
    if (ev.detail === 0) { const r = a.getBoundingClientRect(); x = (r.left + r.width / 2) / innerWidth; y = (r.top + r.height / 2) / innerHeight; }
    leave(a.href, x, y);
  });

  /* ---------------------------------------------------------
     Celdas que saltan al presionar una tecla
     --------------------------------------------------------- */
  function burst(x, y) {
    if (RM) return;
    const n = 10;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("i");
      s.className = "burst-cell";
      const ang = (i / n) * Math.PI * 2 + Math.random() * .4;
      const dist = 34 + Math.random() * 46;
      const dx = Math.round((Math.cos(ang) * dist) / 8) * 8, dy = Math.round((Math.sin(ang) * dist) / 8) * 8;
      s.style.left = x - 4 + "px"; s.style.top = y - 4 + "px";
      if (i % 3 === 0) s.style.background = "#E2E8F0";
      document.body.appendChild(s);
      s.animate([{ transform: "translate(0,0)", opacity: 1 }, { transform: `translate(${dx}px, ${dy}px)`, opacity: 0 }],
        { duration: 520, easing: "steps(5, end)" }).finished.then(() => s.remove());
    }
  }
  document.addEventListener("click", (ev) => {
    const k = ev.target.closest(".key, .fab, .chip, .toggle button");
    if (!k) return;
    let x = ev.clientX, y = ev.clientY;
    if (ev.detail === 0) { const r = k.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
    burst(x, y);
  });

  /* ---------------------------------------------------------
     Scrolltop con anillo de progreso
     --------------------------------------------------------- */
  const top = $("#to-top");
  if (top) {
    const ring = $("rect", top);
    let tick = false;
    const upd = () => {
      tick = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? Math.min(1, scrollY / max) : 0;
      ring.style.strokeDashoffset = String(100 - p * 100);
      top.classList.toggle("show", scrollY > 420);
    };
    addEventListener("scroll", () => { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
    top.addEventListener("click", () => {
      scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" });
      $("#contenido").focus({ preventScroll: true });
    });
  }

  /* ---------------------------------------------------------
     Chat de WhatsApp
     --------------------------------------------------------- */
  const waBtn = $("#wa-open"), waPanel = $("#wa-panel");
  if (waBtn && waPanel) {
    const txt = $("#wa-text");
    const setOpen = (on) => {
      waPanel.classList.toggle("open", on);
      waBtn.setAttribute("aria-expanded", String(on));
      if (on) { if (!txt.value) txt.value = t("js.wa.default"); setTimeout(() => txt.focus(), 120); } else { waBtn.focus(); }
    };
    waBtn.addEventListener("click", () => setOpen(!waPanel.classList.contains("open")));
    $(".wa-close", waPanel).addEventListener("click", () => setOpen(false));
    addEventListener("keydown", (e) => { if (e.key === "Escape" && waPanel.classList.contains("open")) setOpen(false); });
    $("#wa-send").addEventListener("click", () => {
      const msg = (txt.value || t("js.wa.default")).trim();
      window.open("https://wa.me/50670056174?text=" + encodeURIComponent(msg), "_blank", "noopener");
    });
    document.addEventListener("ab:lang", () => { if (txt.value === ESJ["js.wa.default"] || txt.value === EN["js.wa.default"]) txt.value = t("js.wa.default"); });
  }

  /* ---------------------------------------------------------
     INICIO · la maqueta que se construye
     --------------------------------------------------------- */
  const builder = $("#builder");
  if (builder) {
    const range = $("#stage"), nameOut = $("#stage-name");
    const cells = $$(".stages__cells i"), goBtns = $$("[data-stage-go]");
    let timer = null, n = 0;
    const set = (i) => {
      n = i; builder.dataset.stage = String(i); range.value = String(i);
      cells.forEach((c, k) => c.classList.toggle("on", k <= i));
      nameOut.textContent = t("js.st" + i);
      range.setAttribute("aria-valuetext", t("js.st" + i));
      goBtns.forEach((b, k) => b.toggleAttribute("aria-current", k === i));
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    range.addEventListener("input", () => { stop(); set(+range.value); });
    goBtns.forEach((b) => b.addEventListener("click", () => { stop(); set(+b.dataset.stageGo); }));
    document.addEventListener("ab:lang", () => set(n));
    set(0);
    if (RM) set(4);
    else setTimeout(() => {
      timer = setInterval(() => { if (n >= 4) return stop(); set(n + 1); }, 900);
    }, 700);
  }

  /* ---------------------------------------------------------
     Mosaico que se enfoca (píxeles → imagen nítida)
     --------------------------------------------------------- */
  const LEVELS = [16, 10, 6, 3, 1];
  let modal = false;
  document.addEventListener("ab:modal", (e) => { modal = e.detail; if (!modal) $$(".tile").forEach((t) => t.dispatchEvent(new Event("ab:redraw"))); });
  function initTile(tile) {
    const img = $("img", tile), cv = $("canvas", tile);
    if (!img || !cv) return;
    const ctx = cv.getContext("2d"), off = document.createElement("canvas"), octx = off.getContext("2d");
    let idx = RM ? LEVELS.length - 1 : 0, goal = idx, timer = null, ok = false;
    const draw = () => {
      if (!ok || modal) return;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      const r = tile.getBoundingClientRect();
      const cw = Math.max(1, Math.round(r.width * dpr)), ch = Math.max(1, Math.round(r.height * dpr));
      if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
      const iw = img.naturalWidth, ih = img.naturalHeight, s = Math.max(cw / iw, ch / ih);
      const sw = cw / s, sh = ch / s, sx = (iw - sw) / 2, sy = (ih - sh) / 2;
      const px = LEVELS[idx] * dpr;
      if (LEVELS[idx] === 1) { ctx.imageSmoothingEnabled = true; ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch); return; }
      const w = Math.max(1, Math.ceil(cw / px)), h = Math.max(1, Math.ceil(ch / px));
      off.width = w; off.height = h; octx.imageSmoothingEnabled = true;
      octx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(off, 0, 0, w, h, 0, 0, w * px, h * px);
    };
    const run = () => {
      if (timer) return;
      timer = setInterval(() => {
        if (idx === goal) { clearInterval(timer); timer = null; return; }
        idx += idx < goal ? 1 : -1; draw();
      }, 58);
    };
    const to = (g) => { goal = RM ? LEVELS.length - 1 : g; if (RM) { idx = goal; draw(); } else run(); };
    const ready = () => { ok = true; cv.style.opacity = "1"; draw(); };
    cv.style.opacity = "0";
    if (img.complete && img.naturalWidth) ready(); else img.addEventListener("load", ready, { once: true });
    new ResizeObserver(draw).observe(tile);
    tile.addEventListener("ab:redraw", draw);
    const fine = matchMedia("(hover: hover)").matches;
    tile.addEventListener("pointerenter", () => { if (fine) to(LEVELS.length - 1); });
    tile.addEventListener("pointerleave", () => { if (fine) to(0); });
    tile.addEventListener("focus", () => to(LEVELS.length - 1));
    tile.addEventListener("blur", () => to(0));
    if (!fine || RM) {
      new IntersectionObserver((es) => es.forEach((e) => to(e.isIntersecting && e.intersectionRatio > .55 ? LEVELS.length - 1 : 0)), { threshold: [0, .55] }).observe(tile);
    }
  }
  $$(".tile").forEach(initTile);

  /* ---------------------------------------------------------
     PROYECTOS · filtros + detalle
     --------------------------------------------------------- */
  const gallery = $("#gallery");
  if (gallery) {
    const cellsAll = $$(".cell", gallery), status = $("#gal-status");
    $$("[data-filter]").forEach((b) => b.addEventListener("click", () => {
      const f = b.dataset.filter;
      $$("[data-filter]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      let shown = 0;
      cellsAll.forEach((c) => { const on = f === "all" || c.dataset.kind === f; c.hidden = !on; if (on) shown++; });
      gallery.classList.toggle("is-filtered", f !== "all");
      status.textContent = shown + " " + t("js.count");
    }));

    const dlg = $("#detail");
    let opener = null, openId = null, closing = false;
    const fill = (id) => {
      const src = $(`.src[data-for="${id}"]`);
      const g = (k) => $(`[data-d="${k}"]`, src);
      $("#d-title").textContent = g("title").textContent;
      $("#d-desc").textContent = g("desc").textContent;
      $("#d-kind").textContent = g("kind").textContent;
      const tech = $("#d-tech"); tech.textContent = "";
      g("tech").textContent.split("|").forEach((x) => { const li = document.createElement("li"); li.textContent = x; tech.appendChild(li); });
      const links = $("#d-links"); links.textContent = "";
      $$("a", g("links")).forEach((a) => { const c = a.cloneNode(true); links.appendChild(c); });
      const im = $("img", $(`.cell[data-id="${id}"]`));
      $("#d-img").src = im.getAttribute("src"); $("#d-img").alt = im.alt;
    };
    const rectClip = (el) => {
      const r = el.getBoundingClientRect();
      return `inset(${Math.max(0, r.top)}px ${Math.max(0, innerWidth - r.right)}px ${Math.max(0, innerHeight - r.bottom)}px ${Math.max(0, r.left)}px)`;
    };
    const grid = $(".detail__grid", dlg);
    const reveal = (frames, opts) => {
      try { return grid.animate(frames, opts).finished; } catch (e) { return Promise.resolve(); }
    };
    const openDetail = (id, el) => {
      closing = false;
      grid.getAnimations().forEach((a) => a.cancel());
      opener = el; openId = id; fill(id);
      document.dispatchEvent(new CustomEvent("ab:modal", { detail: true }));
      const from = rectClip(el);
      dlg.showModal(); dlg.scrollTop = 0; html.style.overflow = "hidden";
      $("#d-close").focus({ preventScroll: true });
      if (!RM) reveal([{ clipPath: from }, { clipPath: "inset(0px 0px 0px 0px)" }], { duration: 460, easing: "steps(8, end)" }).then(() => { grid.style.clipPath = ""; });
    };
    const closeDetail = () => {
      closing = true;
      const done = () => {
        if (!closing) return;
        closing = false;
        grid.getAnimations().forEach((a) => a.cancel()); grid.style.clipPath = ""; dlg.close(); html.style.overflow = ""; openId = null;
        document.dispatchEvent(new CustomEvent("ab:modal", { detail: false }));
        if (opener) opener.focus({ preventScroll: true });
      };
      if (RM || !opener || !opener.isConnected || opener.closest("[hidden]")) return done();
      const to = rectClip(opener);
      reveal([{ clipPath: "inset(0px 0px 0px 0px)" }, { clipPath: to }], { duration: 360, easing: "steps(6, end)", fill: "forwards" }).then(done);
      setTimeout(() => { if (closing) done(); }, 900);
    };
    $$(".tile", gallery).forEach((tl) => tl.addEventListener("click", () => openDetail(tl.dataset.pid, tl)));
    $("#d-close").addEventListener("click", closeDetail);
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); closeDetail(); });
    document.addEventListener("ab:lang", () => { if (openId) fill(openId); });
    const q = new URLSearchParams(location.search).get("p");
    if (q && $(`.tile[data-pid="${q}"]`)) setTimeout(() => openDetail(q, $(`.tile[data-pid="${q}"]`)), 350);
  }

  /* ---------------------------------------------------------
     SERVICIOS · franjas que se despliegan + hosting
     --------------------------------------------------------- */
  const strips = $$(".strip");
  strips.forEach((s) => $(".strip__btn", s).addEventListener("click", () => {
    strips.forEach((o) => { const on = o === s; o.classList.toggle("open", on); $(".strip__btn", o).setAttribute("aria-expanded", String(on)); });
  }));
  const hostOut = $("#host-price");
  if (hostOut) {
    let mode = "a";
    const show = (flick) => {
      hostOut.innerHTML = "";
      hostOut.append(document.createTextNode(t(`js.host.${mode}.amt`)));
      const sm = document.createElement("small"); sm.textContent = t(`js.host.${mode}.note`); hostOut.appendChild(sm);
      if (flick && !RM) { hostOut.classList.remove("flick"); void hostOut.offsetWidth; hostOut.classList.add("flick"); }
    };
    $$("[data-host]").forEach((b) => b.addEventListener("click", () => {
      mode = b.dataset.host;
      $$("[data-host]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      show(true);
    }));
    document.addEventListener("ab:lang", () => show(false));
    show(false);
  }

  /* ---------------------------------------------------------
     SOBRE MÍ · stack ↔ proyectos
     --------------------------------------------------------- */
  const whereL = $("#where-l");
  if (whereL) {
    const whereT = $("#where-t");
    let picked = null, hover = null;
    const render = () => {
      const b = hover || picked;
      whereL.textContent = "";
      if (!b) { whereT.textContent = t("js.pick"); return; }
      const ids = b.dataset.p.split(" ").filter(Boolean);
      if (!ids.length) { whereT.textContent = b.textContent + ": " + t("js.none"); return; }
      whereT.textContent = b.textContent + ". " + t("js.used");
      const names = JSON.parse(t("js.proj"));
      ids.forEach((id) => {
        const li = document.createElement("li"), a = document.createElement("a");
        a.className = "link"; a.href = "proyectos.html?p=" + id; a.textContent = names[id];
        li.appendChild(a); whereL.appendChild(li);
      });
    };
    $$(".tech").forEach((b) => {
      b.addEventListener("click", () => { picked = picked === b ? null : b; $$(".tech").forEach((x) => x.setAttribute("aria-pressed", String(x === picked))); render(); });
      b.addEventListener("pointerenter", () => { hover = b; render(); });
      b.addEventListener("pointerleave", () => { hover = null; render(); });
    });
    document.addEventListener("ab:lang", render);
    render();
  }

  /* ---------------------------------------------------------
     CONTACTO · formulario como frase
     --------------------------------------------------------- */
  const form = $("#contact-form");
  if (form) {
    const fields = $$(".f", form).filter((f) => f.tagName !== "TEXTAREA");
    const fit = (el) => {
      let s = el.value || el.placeholder || "";
      if (el.tagName === "SELECT") s = el.options[el.selectedIndex].textContent;
      el.style.width = Math.max(6, s.length * 0.92 + 2.2) + "ch";
    };
    fields.forEach((f) => { fit(f); f.addEventListener("input", () => fit(f)); f.addEventListener("change", () => fit(f)); });
    document.addEventListener("ab:lang", () => fields.forEach(fit));
    const errBox = $("#f-errors"), status = $("#f-status"), sendBtn = $("#f-send");
    const val = {
      name: (v) => v.trim().length >= 2 || "js.v.name",
      business: (v) => v.trim().length >= 2 || "js.v.biz",
      need: (v) => v !== "" || "js.v.need",
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || "js.v.email",
      message: (v) => v.trim().length >= 10 || "js.v.msg",
    };
    const idMap = { name: "f-name", business: "f-biz", need: "f-need", email: "f-email", message: "f-msg" };
    form.addEventListener("input", (e) => { if (e.target.getAttribute("aria-invalid")) e.target.removeAttribute("aria-invalid"); });
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      status.textContent = ""; status.dataset.type = "";
      const data = Object.fromEntries(new FormData(form).entries());
      const bad = [];
      Object.keys(val).forEach((k) => {
        const r = val[k](data[k] || "");
        const el = $("#" + idMap[k]);
        if (r !== true) { bad.push({ k, msg: r, el }); el.setAttribute("aria-invalid", "true"); } else el.removeAttribute("aria-invalid");
      });
      if (bad.length) {
        errBox.hidden = false; errBox.textContent = "";
        const p = document.createElement("p"); p.textContent = t("js.fix"); errBox.appendChild(p);
        const ul = document.createElement("ul");
        bad.forEach((b) => { const li = document.createElement("li"); const a = document.createElement("a"); a.href = "#" + b.el.id; a.className = "link"; a.textContent = t(b.msg); a.addEventListener("click", (e) => { e.preventDefault(); b.el.focus(); }); li.appendChild(a); ul.appendChild(li); });
        errBox.appendChild(ul);
        bad[0].el.focus();
        return;
      }
      errBox.hidden = true;
      if (data.website) { status.textContent = t("js.ok"); status.dataset.type = "ok"; form.reset(); return; } // honeypot
      const last = +store.get("ab-last-send") || 0;
      if (Date.now() - last < 20000) { status.textContent = t("js.err"); status.dataset.type = "err"; return; }
      const needTxt = $("#f-need").options[$("#f-need").selectedIndex].textContent;
      const cfg = (window.AB_CONFIG || {}).emailjs || {};
      sendBtn.disabled = true; status.textContent = t("js.sending");
      try {
        if (window.emailjs && cfg.publicKey && cfg.serviceId && cfg.templateId) {
          await window.emailjs.send(cfg.serviceId, cfg.templateId, {
            from_name: data.name, business: data.business, need: needTxt, reply_to: data.email, message: data.message, lang, to_email: "anthonyblancop0@gmail.com",
          }, { publicKey: cfg.publicKey });
          status.textContent = t("js.ok"); status.dataset.type = "ok";
          store.set("ab-last-send", String(Date.now())); form.reset(); fields.forEach(fit);
        } else {
          // Respaldo mientras no estén las claves de EmailJS: abre el correo con el mensaje armado.
          const body = `${data.name} / ${data.business}\n${needTxt}\n${data.email}\n\n${data.message}`;
          location.href = `mailto:anthonyblancop0@gmail.com?subject=${encodeURIComponent(t("js.mail.sub"))}&body=${encodeURIComponent(body)}`;
          status.textContent = t("js.mailto"); status.dataset.type = "ok";
        }
      } catch (err) {
        status.textContent = t("js.err"); status.dataset.type = "err";
      } finally { sendBtn.disabled = false; }
    });
  }
})();
