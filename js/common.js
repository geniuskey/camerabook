/* ==========================================================================
   CameraBook 공통 스크립트 — 전역 객체 CB
   - 레이아웃(상단바, 목차, 이전/다음, 테마) 자동 생성
   - 시뮬레이터 헬퍼: canvas, chart, range, seg, 색/난수/포맷
   - 사진 엔진 CB.Photo: 가상 장면을 조리개·셔터·ISO·초점·WB로 "촬영"한다
   이 파일은 <head>에서 defer 없이 로드된다. 페이지 스크립트는 </body> 직전에 둔다.
   ========================================================================== */
(function () {
  "use strict";

  const CHAPTERS = [
    { slug: "basics",       num: "01", title: "카메라는 어떻게 사진을 만드나", desc: "바늘구멍에서 미러리스까지. 렌즈·조리개·셔터·센서·처리 엔진이 하는 일.", tags: ["기초", "sim"] },
    { slug: "exposure",     num: "02", title: "노출과 노출 삼각형",          desc: "스톱(stop)과 EV, 같은 밝기를 만드는 수많은 조합. 써니 16 법칙.", tags: ["노출", "sim"] },
    { slug: "aperture",     num: "03", title: "조리개와 아웃포커스",          desc: "F값의 의미, 피사계 심도, 배경 흐림과 보케, 회절과 렌즈의 최적 조리개.", tags: ["노출", "sim"] },
    { slug: "shutter",      num: "04", title: "셔터 속도와 움직임",          desc: "순간 정지와 모션 블러, 패닝, 장노출, 손떨림 한계, 전자 셔터의 젤로 현상.", tags: ["노출", "sim"] },
    { slug: "iso",          num: "05", title: "ISO와 노이즈",               desc: "ISO는 감도가 아니라 증폭이다. 노이즈의 정체와 센서 크기, Auto ISO.", tags: ["노출", "sim"] },
    { slug: "modes",        num: "06", title: "촬영 모드와 측광",            desc: "P·A·S·M 모드, 측광 방식, 노출 보정과 AE 잠금. 카메라가 밝기를 고르는 법.", tags: ["조작", "sim"] },
    { slug: "histogram",    num: "07", title: "히스토그램과 다이내믹 레인지", desc: "히스토그램 읽기, 하이라이트 클리핑과 제브라, 브라케팅과 HDR.", tags: ["노출", "sim"] },
    { slug: "focus",        num: "08", title: "초점과 오토포커스",           desc: "AF-S/AF-C, AF 영역, 위상차와 콘트라스트 AF, 눈 인식, MF와 피킹, 과초점.", tags: ["조작", "sim"] },
    { slug: "focal",        num: "09", title: "초점거리와 화각",             desc: "광각과 망원, 크롭 팩터, 원근감과 압축 효과, 줌 vs 단렌즈, 왜곡.", tags: ["렌즈", "sim"] },
    { slug: "color",        num: "10", title: "화이트 밸런스와 색",          desc: "색온도와 켈빈, WB 프리셋, 혼합광, 픽처 스타일과 색 공간.", tags: ["색", "sim"] },
    { slug: "raw",          num: "11", title: "RAW와 JPEG",                desc: "카메라 안의 현상소. 비트 심도, 하이라이트 복구, 압축, 파일 크기.", tags: ["파일", "sim"] },
    { slug: "stabilization",num: "12", title: "손떨림 보정과 드라이브 모드",  desc: "OIS·IBIS의 '스톱' 의미, 연사와 버퍼, 셀프타이머, 인터벌 촬영.", tags: ["조작", "sim"] },
    { slug: "flash",        num: "13", title: "플래시와 빛",                desc: "역제곱 법칙, 가이드 넘버, 동조 속도와 HSS, 선막·후막 동조, 바운스.", tags: ["조명", "sim"] },
    { slug: "video",        num: "14", title: "동영상 촬영",                desc: "프레임 레이트, 180° 셔터 규칙, ND 필터, 비트레이트와 Log 촬영.", tags: ["영상", "sim"] },
    { slug: "smartphone",   num: "15", title: "스마트폰 카메라",            desc: "멀티 카메라 줌, 야간 모드 합성, 인물 모드, 스마트 HDR, 프로 모드.", tags: ["모바일", "sim"] },
    { slug: "playground",   num: "16", title: "촬영 연습장",                desc: "모든 다이얼을 직접 돌려 미션을 해결하는 가상 카메라.", tags: ["종합", "sim"] },
    { slug: "glossary",     num: "17", title: "용어집 & 종합 퀴즈",          desc: "카메라 용어를 검색하고, 실력을 점검하자.", tags: ["정리"] },
  ];

  const CB = (window.CB = {});
  CB.CHAPTERS = CHAPTERS;

  /* ------------------------------------------------------------ math utils */
  CB.clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  CB.lerp = (a, b, t) => a + (b - a) * t;
  CB.map = (x, a, b, c, d) => c + ((x - a) * (d - c)) / (b - a);
  CB.smooth = (a, b, x) => { const t = CB.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  CB.randn = function () {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  /** 시드 고정 난수 (장면 텍스처가 매번 같게) */
  CB.rng = function (seed = 1) {
    let s = seed >>> 0 || 1;
    const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    r.range = (a, b) => a + (b - a) * r();
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    return r;
  };
  /** 숫자 포맷: 유효 자리 */
  CB.fmt = function (x, digits = 3) {
    if (!isFinite(x)) return "—";
    if (x === 0) return "0";
    const a = Math.abs(x);
    if (a >= 1e6 || a < 1e-3) return x.toExponential(digits - 1).replace("e+", "e");
    return Number(x.toPrecision(digits)).toLocaleString("en-US", { maximumFractionDigits: 6 });
  };
  /** 부호 포함 (±) 포맷 */
  CB.signed = (x, d = 1) => (x > 0.0001 ? "+" : x < -0.0001 ? "−" : "±") + Math.abs(x).toFixed(d);

  /* ------------------------------------------------------------ camera values */
  // 1/3 스톱 간격의 표준 눈금(카메라 다이얼에 표시되는 값)
  CB.APERTURES = [1, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22];
  CB.SHUTTERS = [30, 25, 20, 15, 13, 10, 8, 6, 5, 4, 3.2, 2.5, 2, 1.6, 1.3, 1, 0.8, 0.6, 0.5, 0.4, 0.3]
    .concat([4, 5, 6, 8, 10, 13, 15, 20, 25, 30, 40, 50, 60, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000].map((d) => 1 / d));
  CB.ISOS = [50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000, 10000, 12800, 16000, 20000, 25600, 32000, 40000, 51200, 102400];
  /** 셔터 속도 표기: 1/250, 0.5", 2" */
  CB.fmtT = function (t) {
    if (t >= 0.3) return (Math.round(t * 10) / 10) + '"';
    const d = 1 / t;
    return "1/" + (d >= 10 ? Math.round(d) : Math.round(d * 10) / 10);
  };
  CB.fmtN = (N) => "f/" + (N < 10 ? Number(N.toFixed(1)) : Math.round(N));
  CB.fmtISO = (s) => "ISO " + Math.round(s);
  /** EV(ISO 100 기준 노출값): EV = log2(N²/t) − log2(ISO/100) */
  CB.ev = (N, t, iso = 100) => Math.log2((N * N) / t) - Math.log2(iso / 100);
  /** 목록에서 가장 가까운 값의 인덱스 */
  CB.nearest = function (list, v, log = true) {
    let bi = 0, bd = Infinity;
    list.forEach((x, i) => { const d = log ? Math.abs(Math.log(x) - Math.log(v)) : Math.abs(x - v); if (d < bd) { bd = d; bi = i; } });
    return bi;
  };

  /* ------------------------------------------------------------ theme */
  const themeCbs = [];
  CB.onTheme = (cb) => themeCbs.push(cb);
  CB.isDark = function () {
    const t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  };
  CB.color = function (name) {
    return getComputedStyle(document.documentElement).getPropertyValue("--" + name).trim();
  };
  CB.palette = function () {
    const c = CB.color;
    return {
      bg: c("canvas-bg"), text: c("text"), dim: c("text-dim"), faint: c("text-faint"),
      grid: c("grid"), axis: c("axis"), border: c("border"), surface: c("surface"), elev: c("bg-elev"),
      accent: c("accent"), accent2: c("accent-2"), ok: c("ok"), warn: c("warn"), bad: c("bad"),
      red: c("red"), green: c("green"), blue: c("blue"),
      series: [c("accent"), c("accent-2"), c("warn"), c("ok"), c("bad"), c("text-dim")],
    };
  };
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
    themeCbs.forEach((cb) => { try { cb(); } catch (e) { console.error(e); } });
  }
  try { const saved = localStorage.getItem("cb-theme"); if (saved) document.documentElement.setAttribute("data-theme", saved); } catch (e) {}
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
      if (!document.documentElement.getAttribute("data-theme")) applyTheme(null);
    });
  }

  /* ------------------------------------------------------------ canvas helper */
  /**
   * HiDPI 캔버스. 폭은 부모 폭을 따르고 높이는 aspect(높이/폭) 또는 height(px)로 결정.
   *   const cv = CB.canvas(el, (ctx,w,h)=>{...}, {aspect:0.5, maxHeight: 420});  aspect는 폭→비율 함수도 가능
   */
  CB.canvas = function (canvas, draw, opts = {}) {
    if (typeof canvas === "string") canvas = document.querySelector(canvas);
    const ctx = canvas.getContext("2d");
    const st = { ctx, w: 0, h: 0, canvas, dpr: 1 };
    function resize() {
      const parent = canvas.parentElement;
      const w = Math.max(200, Math.floor(opts.width || parent.clientWidth || 600));
      let h = opts.height || Math.round(w * (typeof opts.aspect === "function" ? opts.aspect(w) : opts.aspect || 0.5));
      if (opts.minHeight) h = Math.max(h, opts.minHeight);
      if (opts.maxHeight) h = Math.min(h, opts.maxHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      st.w = w; st.h = h; st.dpr = dpr;
      st.redraw();
    }
    st.redraw = function () {
      if (!st.w) return;
      ctx.save();
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      if (!opts.noClear) {
        ctx.clearRect(0, 0, st.w, st.h);
        ctx.fillStyle = CB.color("canvas-bg");
        ctx.fillRect(0, 0, st.w, st.h);
      }
      try { draw && draw(ctx, st.w, st.h); } finally { ctx.restore(); }
    };
    st.resize = resize;
    if (window.ResizeObserver) {
      let lastW = -1;
      new ResizeObserver(() => { const w = canvas.parentElement.clientWidth; if (w !== lastW) { lastW = w; resize(); } }).observe(canvas.parentElement);
    } else window.addEventListener("resize", resize);
    CB.onTheme(() => st.redraw());
    resize();
    return st;
  };

  /** 화면에 보일 때만 도는 애니메이션 루프. fn(dt초, t초) */
  CB.loop = function (el, fn) {
    let raf = 0, last = 0, t = 0, visible = true, running = true;
    function frame(ts) {
      raf = 0;
      if (!running || !visible) return;
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
      last = ts; t += dt;
      fn(dt, t);
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && running && visible) { last = 0; raf = requestAnimationFrame(frame); } }
    if (window.IntersectionObserver && el) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; kick(); }).observe(el);
    }
    kick();
    return {
      start() { running = true; kick(); },
      stop() { running = false; },
      get running() { return running; },
      toggle() { running ? (running = false) : ((running = true), kick()); return running; },
    };
  };

  /** 다음 프레임에 한 번만 실행 (슬라이더 입력 폭주 방지) */
  CB.throttle = function (fn) {
    let pending = false;
    return function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; fn(); });
    };
  };

  /* ------------------------------------------------------------ chart helper */
  /**
   * 간단한 선 그래프. box = {x,y,w,h}(생략 시 캔버스 전체에 여백 자동)
   * opts: { x:[min,max], y:[min,max], logX, logY, xLabel, yLabel, xTicks, yTicks,
   *         xFmt, yFmt, series:[{data:[[x,y],...], color, width, dash, fill}],
   *         vlines:[{x,color,label,dash}], hlines:[{y,color,label,dash}], points:[{x,y,color,r,label}],
   *         bands:[{x0,x1,color}] }
   */
  CB.chart = function (ctx, box, opts) {
    const P = CB.palette();
    const dpr = (ctx.getTransform && ctx.getTransform().a) || 1;
    const W = ctx.canvas.width / dpr, H = ctx.canvas.height / dpr;
    if (!box) box = { x: 58, y: 16, w: W - 58 - 18, h: H - 16 - 46 };
    const [x0, x1] = opts.x, [y0, y1] = opts.y;
    const lx = (v) => (opts.logX ? Math.log10(v) : v);
    const ly = (v) => (opts.logY ? Math.log10(v) : v);
    const X = (v) => box.x + ((lx(v) - lx(x0)) / (lx(x1) - lx(x0))) * box.w;
    const Y = (v) => box.y + box.h - ((ly(v) - ly(y0)) / (ly(y1) - ly(y0))) * box.h;
    const ticks = (a, b, log, n) => {
      if (log) { const out = []; for (let e = Math.ceil(Math.log10(a) - 1e-9); e <= Math.log10(b) + 1e-9; e++) out.push(Math.pow(10, e)); return out; }
      const span = b - a, raw = span / (n || 5), mag = Math.pow(10, Math.floor(Math.log10(raw)));
      const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= (n || 5) + 0.5) || raw;
      const out = []; for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-6; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
      return out;
    };
    const defFmt = (v) => (Math.abs(v) >= 1e5 || (Math.abs(v) < 1e-2 && v !== 0) ? v.toExponential(0).replace("e+", "e") : String(Number(v.toPrecision(4))));
    const xFmt = opts.xFmt || defFmt, yFmt = opts.yFmt || defFmt;
    ctx.save();
    ctx.font = "11px " + getComputedStyle(document.body).getPropertyValue("--mono");
    ctx.lineWidth = 1;
    (opts.bands || []).forEach((b) => { ctx.fillStyle = b.color; ctx.fillRect(X(b.x0), box.y, X(b.x1) - X(b.x0), box.h); });
    const xt = opts.xTicks || ticks(x0, x1, opts.logX, 6);
    const yt = opts.yTicks || ticks(y0, y1, opts.logY, 5);
    ctx.strokeStyle = P.grid; ctx.fillStyle = P.dim;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    xt.forEach((v) => { const px = X(v); if (px < box.x - 1 || px > box.x + box.w + 1) return; ctx.beginPath(); ctx.moveTo(px, box.y); ctx.lineTo(px, box.y + box.h); ctx.stroke(); ctx.fillText(xFmt(v), px, box.y + box.h + 6); });
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    yt.forEach((v) => { const py = Y(v); if (py < box.y - 1 || py > box.y + box.h + 1) return; ctx.beginPath(); ctx.moveTo(box.x, py); ctx.lineTo(box.x + box.w, py); ctx.stroke(); ctx.fillText(yFmt(v), box.x - 6, py); });
    ctx.strokeStyle = P.axis;
    ctx.beginPath(); ctx.moveTo(box.x, box.y); ctx.lineTo(box.x, box.y + box.h); ctx.lineTo(box.x + box.w, box.y + box.h); ctx.stroke();
    ctx.fillStyle = P.dim; ctx.font = "12px " + getComputedStyle(document.body).getPropertyValue("--font");
    if (opts.xLabel) { ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(opts.xLabel, box.x + box.w / 2, box.y + box.h + 40); }
    if (opts.yLabel) { ctx.save(); ctx.translate(14, box.y + box.h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(opts.yLabel, 0, 0); ctx.restore(); }
    ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y - 2, box.w + 2, box.h + 4); ctx.clip();
    (opts.series || []).forEach((s, i) => {
      if (!s.data || !s.data.length) return;
      ctx.strokeStyle = s.color || P.series[i % P.series.length];
      ctx.lineWidth = s.width || 2; ctx.setLineDash(s.dash || []);
      ctx.beginPath();
      let started = false;
      s.data.forEach(([x, y]) => { if (!isFinite(y) || (opts.logY && y <= 0) || (opts.logX && x <= 0)) { started = false; return; } const px = X(x), py = Y(y); started ? ctx.lineTo(px, py) : ctx.moveTo(px, py); started = true; });
      ctx.stroke();
      if (s.fill) {
        ctx.lineTo(X(s.data[s.data.length - 1][0]), Y(opts.logY ? y0 : Math.max(y0, 0)));
        ctx.lineTo(X(s.data[0][0]), Y(opts.logY ? y0 : Math.max(y0, 0)));
        ctx.closePath(); ctx.fillStyle = s.fill; ctx.fill();
      }
      ctx.setLineDash([]);
    });
    (opts.vlines || []).forEach((l) => { ctx.strokeStyle = l.color || P.faint; ctx.setLineDash(l.dash || [4, 4]); ctx.lineWidth = l.width || 1.2; ctx.beginPath(); ctx.moveTo(X(l.x), box.y); ctx.lineTo(X(l.x), box.y + box.h); ctx.stroke(); ctx.setLineDash([]); if (l.label) { ctx.fillStyle = l.color || P.dim; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(l.label, X(l.x) + 4, box.y + 4); } });
    (opts.hlines || []).forEach((l) => { ctx.strokeStyle = l.color || P.faint; ctx.setLineDash(l.dash || [4, 4]); ctx.lineWidth = l.width || 1.2; ctx.beginPath(); ctx.moveTo(box.x, Y(l.y)); ctx.lineTo(box.x + box.w, Y(l.y)); ctx.stroke(); ctx.setLineDash([]); if (l.label) { ctx.fillStyle = l.color || P.dim; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(l.label, box.x + box.w - 4, Y(l.y) - 3); } });
    (opts.points || []).forEach((p) => { ctx.fillStyle = p.color || P.accent; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), p.r || 4, 0, Math.PI * 2); ctx.fill(); if (p.label) { ctx.fillStyle = P.text; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText(p.label, X(p.x) + 6, Y(p.y) - 4); } });
    ctx.restore();
    ctx.restore();
    return { X, Y, box };
  };

  /* ------------------------------------------------------------ controls */
  /**
   * range 입력 바인딩. output은 id+"-out" 요소.
   *   const get = CB.range('ev', v => v+' EV', v => redraw());  get() → 현재 값(Number)
   */
  CB.range = function (id, fmt, onInput) {
    const el = typeof id === "string" ? document.getElementById(id) : id;
    const out = document.getElementById(el.id + "-out") || document.querySelector(`output[for="${el.id}"]`);
    const update = (fire) => {
      const v = Number(el.value);
      const pct = ((v - Number(el.min || 0)) / (Number(el.max || 100) - Number(el.min || 0))) * 100;
      el.style.setProperty("--fill", pct + "%");
      if (out) out.textContent = fmt ? fmt(v) : String(v);
      if (fire && onInput) onInput(v);
    };
    el.addEventListener("input", () => update(true));
    update(false);
    const get = () => Number(el.value);
    get.set = (v, fire = true) => { el.value = v; update(fire); };
    get.el = el;
    return get;
  };
  /**
   * 이산 값 목록 슬라이더(조리개·셔터·ISO 눈금). HTML은 <input type="range" id="..."> 만 두면 된다.
   *   const N = CB.steps('ap', CB.APERTURES, CB.fmtN, 5.6, v => redraw());  N() → 값
   */
  CB.steps = function (id, list, fmt, initial, onInput) {
    const el = typeof id === "string" ? document.getElementById(id) : id;
    el.min = 0; el.max = list.length - 1; el.step = 1;
    el.value = initial != null ? CB.nearest(list, initial) : 0;
    const r = CB.range(el, (i) => (fmt ? fmt(list[i]) : String(list[i])), (i) => onInput && onInput(list[i]));
    const get = () => list[r()];
    get.set = (v, fire = true) => r.set(CB.nearest(list, v), fire);
    get.index = r;
    get.el = el;
    return get;
  };
  /** 세그먼트 버튼: <div class="seg" id="mode"><button data-value="a" class="on">A</button>...</div> */
  CB.seg = function (id, onChange) {
    const el = typeof id === "string" ? document.getElementById(id) : id;
    const btns = [...el.querySelectorAll("button")];
    let cur = (btns.find((b) => b.classList.contains("on")) || btns[0]).dataset.value;
    const set = (v, fire = true) => {
      cur = v;
      btns.forEach((b) => { const on = b.dataset.value === v; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
      if (fire && onChange) onChange(v);
    };
    btns.forEach((b) => b.addEventListener("click", () => set(b.dataset.value)));
    set(cur, false);
    const get = () => cur;
    get.set = set;
    return get;
  };
  /** 체크박스 바인딩 */
  CB.check = function (id, onChange) {
    const el = document.getElementById(id);
    el.addEventListener("change", () => onChange && onChange(el.checked));
    const get = () => el.checked;
    get.set = (v) => { el.checked = v; onChange && onChange(v); };
    return get;
  };
  CB.stat = function (id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; };

  /* ------------------------------------------------------------ color science (simplified) */
  CB.srgbToLin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  CB.linToSrgb = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  /** 색온도(K) → 선형 RGB(초록=1로 정규화). 흑체 궤적의 근사식(Tanner Helland) */
  CB.kelvin = function (K) {
    const t = CB.clamp(K, 1000, 40000) / 100;
    let r, g, b;
    r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
    const lin = [r, g, b].map((v) => CB.srgbToLin(CB.clamp(v, 0, 255) / 255));
    return [lin[0] / lin[1], 1, lin[2] / lin[1]];
  };
  /** 색온도 K에 해당하는 표시용 CSS 색 */
  CB.kelvinCss = function (K) {
    const c = CB.kelvin(K); const m = Math.max(...c);
    return "rgb(" + c.map((v) => Math.round(255 * CB.linToSrgb(v / m))).join(",") + ")";
  };

  /* ------------------------------------------------------------ blur kernels (Float32, RGBA 4채널) */
  function boxBlurH(src, dst, w, h, r) {
    if (r <= 0) { dst.set(src); return; }
    const iarr = 1 / (r + r + 1);
    for (let y = 0; y < h; y++) {
      const row = y * w * 4;
      for (let c = 0; c < 4; c++) {
        let ti = row + c;
        const fv = src[row + c], lv = src[row + (w - 1) * 4 + c];
        let val = r * fv; // 창 [j−r, j+r]: 왼쪽 바깥은 첫 값으로 채운다
        for (let j = 0; j < r; j++) val += src[row + Math.min(j, w - 1) * 4 + c];
        for (let j = 0; j < w; j++) {
          const addIdx = j + r <= w - 1 ? row + (j + r) * 4 + c : -1;
          val += addIdx >= 0 ? src[addIdx] : lv;
          dst[ti] = val * iarr;
          const subJ = j - r;
          val -= subJ >= 0 ? src[row + subJ * 4 + c] : fv;
          ti += 4;
        }
      }
    }
  }
  function boxBlurV(src, dst, w, h, r) {
    if (r <= 0) { dst.set(src); return; }
    const iarr = 1 / (r + r + 1), stride = w * 4;
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 4; c++) {
        const col = x * 4 + c;
        const fv = src[col], lv = src[col + (h - 1) * stride];
        let val = r * fv;
        for (let j = 0; j < r; j++) val += src[col + Math.min(j, h - 1) * stride];
        for (let j = 0; j < h; j++) {
          val += j + r <= h - 1 ? src[col + (j + r) * stride] : lv;
          dst[col + j * stride] = val * iarr;
          val -= j - r >= 0 ? src[col + (j - r) * stride] : fv;
        }
      }
    }
  }
  /** 가우시안 근사(박스 3회). sigma(px) */
  CB.gaussBlur = function (buf, w, h, sigma, tmp) {
    if (sigma < 0.35) return buf;
    tmp = tmp || new Float32Array(buf.length);
    const n = 3, wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
    let wl = Math.floor(wIdeal); if (wl % 2 === 0) wl--;
    const m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
    for (let i = 0; i < n; i++) {
      const r = ((i < m ? wl : wl + 2) - 1) / 2;
      boxBlurH(buf, tmp, w, h, r); boxBlurV(tmp, buf, w, h, r);
    }
    return buf;
  };
  /**
   * 캔버스 이미지를 (선형 광량 기준으로) 흐리게 해서 새 캔버스로 돌려준다.
   *   CB.blurCanvas(src, sigma, {gain, lenX, lenY}) → canvas
   */
  CB.blurCanvas = function (src, sigma, o = {}) {
    const w = src.width, h = src.height;
    const d = src.getContext("2d").getImageData(0, 0, w, h);
    const lut = CB._lut || (CB._lut = Array.from({ length: 256 }, (_, i) => CB.srgbToLin(i / 255)));
    const buf = new Float32Array(w * h * 4);
    for (let i = 0; i < w * h * 4; i += 4) { const a = d.data[i + 3] / 255; buf[i] = lut[d.data[i]] * a; buf[i + 1] = lut[d.data[i + 1]] * a; buf[i + 2] = lut[d.data[i + 2]] * a; buf[i + 3] = a; }
    const tmp = new Float32Array(buf.length);
    if (sigma > 0.35) CB.gaussBlur(buf, w, h, Math.min(sigma, 80), tmp);
    if (o.lenX || o.lenY) CB.motionBlur(buf, w, h, o.lenX || 0, o.lenY || 0, tmp);
    const g = o.gain != null ? o.gain : 1;
    for (let i = 0; i < w * h * 4; i += 4) {
      const a = buf[i + 3], k = a > 1e-4 ? g / a : 0; // 프리멀티플라이 해제
      for (let c = 0; c < 3; c++) d.data[i + c] = 255 * CB.linToSrgb(CB.clamp(buf[i + c] * k, 0, 1));
      d.data[i + 3] = 255 * CB.clamp(a, 0, 1);
    }
    const out = document.createElement("canvas"); out.width = w; out.height = h;
    out.getContext("2d").putImageData(d, 0, 0);
    return out;
  };
  /** 오프스크린 캔버스를 만들고 draw(g,w,h)로 그린다 */
  CB.offscreen = function (w, h, draw) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    if (draw) draw(c.getContext("2d"), w, h);
    return c;
  };
  /** 방향성(가로/세로) 모션 블러: 길이 len(px) */
  CB.motionBlur = function (buf, w, h, lenX, lenY, tmp) {
    tmp = tmp || new Float32Array(buf.length);
    const rx = Math.round(Math.abs(lenX) / 2), ry = Math.round(Math.abs(lenY) / 2);
    if (rx > 0) { boxBlurH(buf, tmp, w, h, rx); buf.set(tmp); }
    if (ry > 0) { boxBlurV(buf, tmp, w, h, ry); buf.set(tmp); }
    return buf;
  };

  /* ------------------------------------------------------------ photo engine */
  /**
   * 가상 장면을 "촬영"하는 엔진. 장면은 깊이(m)를 가진 레이어들과 점광원으로 이루어진다.
   *   const P = CB.Photo({ w:480, h:300, sceneEV:12, build(S){ S.layer(depth, (ctx,w,h)=>{...}, {gain, motion:[vx,vy]}); S.lights(depth, [{x,y,c:[r,g,b],i}]) } });
   *   const img = P.render({ N, t, iso, focus, focal, sensorW, wbK, sceneK, shake:[px,py], fw, ... });  → ImageData
   *   P.draw(ctx, x, y, w, h)  마지막 렌더 결과를 그린다.
   * 노출: 장면 색은 "적정 노출(EV=sceneEV)일 때 보이는 모습"으로 그린다.
   */
  CB.Photo = function (spec) {
    const W = spec.w || 480, H = spec.h || 300, NPX = W * H;
    const layers = [];
    const S = {
      w: W, h: H,
      layer(depth, draw, o = {}) {
        const c = document.createElement("canvas"); c.width = W; c.height = H;
        const g = c.getContext("2d");
        draw(g, W, H);
        const d = g.getImageData(0, 0, W, H).data;
        const buf = new Float32Array(NPX * 4);
        const lut = CB._lut || (CB._lut = Array.from({ length: 256 }, (_, i) => CB.srgbToLin(i / 255)));
        let any = false;
        for (let i = 0; i < NPX; i++) {
          const a = d[i * 4 + 3] / 255;
          if (a > 0) any = true;
          buf[i * 4] = lut[d[i * 4]] * a; buf[i * 4 + 1] = lut[d[i * 4 + 1]] * a; buf[i * 4 + 2] = lut[d[i * 4 + 2]] * a; buf[i * 4 + 3] = a;
        }
        const L = { type: "layer", depth, buf, gain: o.gain || 1, motion: o.motion || null, name: o.name || "", any, emissive: !!o.emissive };
        layers.push(L);
        return L;
      },
      /** 점광원: 흐려지면 원형(조리개 모양) 보케가 된다. x,y는 px, c는 선형 RGB, i는 밝기 배수 */
      lights(depth, pts, o = {}) {
        const L = { type: "lights", depth, pts, motion: o.motion || null, name: o.name || "lights" };
        layers.push(L);
        return L;
      },
    };
    spec.build(S);
    layers.sort((a, b) => b.depth - a.depth); // 먼 것부터

    const comp = new Float32Array(NPX * 4);
    const work = new Float32Array(NPX * 4);
    const tmp = new Float32Array(NPX * 4);
    const out = new ImageData(W, H);
    const lin = new Float32Array(NPX * 3);
    let compKey = "";
    const noiseField = new Float32Array(NPX * 3);
    let noiseSeedKey = -1;

    function cocPx(depth, p) {
      // 얇은 렌즈: 착란원 지름 c = (f²/N)·|d−s| / (d·(s−f))   [mm], d=∞이면 f²/(N(s−f))
      const f = p.focal, s = p.focus * 1000, N = p.N;
      if (p.pinhole) return 0;
      const d = depth * 1000;
      const ratio = isFinite(d) ? Math.abs(d - s) / d : 1;
      const cmm = ((f * f) / N) * ratio / Math.max(1e-6, s - f);
      return (cmm / p.sensorW) * W;
    }
    function drawLights(L, p, target) {
      const coc = cocPx(L.depth, p);
      const r = Math.max(0.7, coc / 2);
      const blades = p.blades || 0;
      const mv = L.motion && p.t ? [L.motion[0] * p.t, L.motion[1] * p.t] : [0, 0];
      const steps = Math.max(1, Math.min(40, Math.round(Math.hypot(mv[0], mv[1]) / Math.max(1, r))));
      for (const pt of L.pts) {
        const area = Math.PI * r * r;
        const scale = (pt.i || 1) / Math.max(1, area) / steps;
        for (let k = 0; k < steps; k++) {
          const ox = steps > 1 ? (k / (steps - 1) - 0.5) * mv[0] : 0, oy = steps > 1 ? (k / (steps - 1) - 0.5) * mv[1] : 0;
          const cx = pt.x + ox, cy = pt.y + oy;
          const x0 = Math.max(0, Math.floor(cx - r - 1)), x1 = Math.min(W - 1, Math.ceil(cx + r + 1));
          const y0 = Math.max(0, Math.floor(cy - r - 1)), y1 = Math.min(H - 1, Math.ceil(cy + r + 1));
          for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
            const dx = x - cx, dy = y - cy;
            let rr = Math.hypot(dx, dy);
            if (blades >= 5) { // 다각형 조리개: 각도에 따라 반지름이 줄어든다
              const seg = (2 * Math.PI) / blades;
              const a = Math.atan2(dy, dx) + Math.PI / 2;
              const local = ((a % seg) + seg) % seg - seg / 2;
              rr = rr * Math.cos(local) / Math.cos(seg / 2);
            }
            let cov = CB.clamp(r + 0.5 - rr, 0, 1);
            if (r > 3 && p.bokehRim) cov *= 0.75 + 0.35 * CB.smooth(r * 0.55, r, rr);
            if (cov <= 0) continue;
            const i = (y * W + x) * 4, v = cov * scale;
            target[i] += pt.c[0] * v; target[i + 1] += pt.c[1] * v; target[i + 2] += pt.c[2] * v;
          }
        }
      }
    }
    function composite(p) {
      const key = [p.N, p.focus, p.focal, p.sensorW, p.t, p.blades, p.pinhole, (p.shake || [0, 0]).join(","), p.panning || 0, p.extraBlur || 0].join("|");
      if (key === compKey) return;
      compKey = key;
      comp.fill(0);
      for (const L of layers) {
        if (L.type === "lights") { drawLights(L, p, comp); continue; }
        if (!L.any) continue;
        work.set(L.buf);
        let coc = cocPx(L.depth, p);
        const sigma = coc / 4 + (p.extraBlur || 0);
        if (sigma > 0.35) CB.gaussBlur(work, W, H, Math.min(sigma, 60), tmp);
        if (L.motion && p.t) {
          const pan = p.panning ? L.motion[0] : 0; // 패닝: 피사체 속도로 카메라를 따라 돌림
          const mx = (L.motion[0] - pan) * p.t, my = L.motion[1] * p.t;
          if (Math.abs(mx) > 1 || Math.abs(my) > 1) CB.motionBlur(work, W, H, Math.min(Math.abs(mx), W), Math.min(Math.abs(my), H), tmp);
        } else if (p.panning && p.t) {
          const mx = p.panning * p.t; // 정지한 배경은 반대로 흐른다
          if (Math.abs(mx) > 1) CB.motionBlur(work, W, H, Math.min(Math.abs(mx), W), 0, tmp);
        }
        const g = L.gain;
        for (let i = 0; i < NPX * 4; i += 4) {
          const a = work[i + 3];
          if (a <= 0.0005) continue;
          const k = 1 - a;
          comp[i] = comp[i] * k + work[i] * g; comp[i + 1] = comp[i + 1] * k + work[i + 1] * g; comp[i + 2] = comp[i + 2] * k + work[i + 2] * g;
        }
      }
      const sh = p.shake || [0, 0];
      if (Math.abs(sh[0]) > 1 || Math.abs(sh[1]) > 1) CB.motionBlur(comp, W, H, sh[0], sh[1], tmp);
    }

    const api = {
      w: W, h: H, layers, sceneEV: spec.sceneEV != null ? spec.sceneEV : 12, sceneK: spec.sceneK || 5500,
      last: null, stats: null,
      /** 적정 노출 대비 차이(스톱). +면 밝게 */
      exposureStops(p) {
        const sceneEV = p.sceneEV != null ? p.sceneEV : api.sceneEV;
        return sceneEV - CB.ev(p.N, p.t, 100);
      },
      render(p0) {
        const p = Object.assign({ N: 5.6, t: 1 / 125, iso: 100, focus: 3, focal: 50, sensorW: 36, wbK: null, sceneK: null, noise: true, fw: 9000, readNoise: null, tone: "std", gain: 1, nr: 0 }, p0);
        composite(p);
        // 1) 센서가 모은 빛(ISO 100 기준 상대 노출) → 전자 수
        const light = Math.pow(2, api.exposureStops(p)) * (p.light || 1);
        const isoGain = p.iso / 100;
        const fw = p.fw;                            // ISO 100에서 풀스케일(값 1.0)에 해당하는 전자 수(포화)
        const rn = p.readNoise != null ? p.readNoise : 1.6 + 5 * Math.min(1, 100 / p.iso); // 높은 ISO일수록 (전자 기준) 읽기 노이즈 감소
        const sceneK = p.sceneK || api.sceneK;
        const ill = CB.kelvin(sceneK), ref = CB.kelvin(5500);
        const wb = CB.kelvin(p.wbK || sceneK);
        const cg = [ill[0] / ref[0] / (wb[0] / ref[0]), 1, ill[2] / ref[2] / (wb[2] / ref[2])];
        const cast = [ill[0] / ref[0], 1, ill[2] / ref[2]];
        const wbg = [ref[0] / wb[0], 1, ref[2] / wb[2]];
        void cg;
        const doNoise = p.noise && isFinite(fw);
        const seed = p.noiseSeed || 0;
        if (doNoise && seed !== noiseSeedKey) { for (let i = 0; i < noiseField.length; i++) noiseField[i] = CB.randn(); noiseSeedKey = seed; }
        let clipHi = 0, clipLo = 0, sum = 0;
        for (let i = 0, j = 0; i < NPX * 4; i += 4, j += 3) {
          for (let c = 0; c < 3; c++) {
            let e = comp[i + c] * cast[c] * light * fw;      // 전자(광자 신호)
            if (e > fw) e = fw;                               // 포화(풀웰)
            if (doNoise) {
              const sd = Math.sqrt(Math.max(e, 0) + rn * rn);
              const nz = noiseField[j + c] * 0.7 + noiseField[(j + 3 * 7 + c) % noiseField.length] * 0.3 * (c === 1 ? 0.6 : 1.4);
              e += sd * nz * (1 - p.nr);
            }
            lin[j + c] = (e / fw) * isoGain * wbg[c] * p.gain;
          }
        }
        if (p.nr > 0 && doNoise) { /* 노이즈 감소: 약한 블러로 디테일과 노이즈를 함께 뭉갠다 */
          const b = work; for (let i = 0, j = 0; i < NPX * 4; i += 4, j += 3) { b[i] = lin[j]; b[i + 1] = lin[j + 1]; b[i + 2] = lin[j + 2]; b[i + 3] = 1; }
          CB.gaussBlur(b, W, H, 0.6 + p.nr * 1.4, tmp);
          for (let i = 0, j = 0; i < NPX * 4; i += 4, j += 3) { lin[j] = b[i]; lin[j + 1] = b[i + 1]; lin[j + 2] = b[i + 2]; }
        }
        // 2) 톤 커브 + 감마 → 8비트
        const d = out.data;
        const tone = CB.toneCurves[p.tone] || CB.toneCurves.std;
        for (let i = 0, j = 0; i < NPX; i++, j += 3) {
          let r = lin[j], g = lin[j + 1], b = lin[j + 2];
          if (p.sat != null && p.sat !== 1) { const y = 0.2126 * r + 0.7152 * g + 0.0722 * b; r = y + (r - y) * p.sat; g = y + (g - y) * p.sat; b = y + (b - y) * p.sat; }
          const R = tone(r), G = tone(g), B = tone(b);
          if (R >= 0.999 || G >= 0.999 || B >= 0.999) clipHi++;
          if (R <= 0.004 && G <= 0.004 && B <= 0.004) clipLo++;
          sum += 0.2126 * R + 0.7152 * G + 0.0722 * B;
          d[i * 4] = R * 255 + 0.5; d[i * 4 + 1] = G * 255 + 0.5; d[i * 4 + 2] = B * 255 + 0.5; d[i * 4 + 3] = 255;
        }
        api.stats = { clipHi: clipHi / NPX, clipLo: clipLo / NPX, mean: sum / NPX, stops: api.exposureStops(p) };
        api.last = out; api.lin = lin;
        return out;
      },
      /** 마지막 결과를 ctx에 그린다(비율 유지·꽉 채움) */
      draw(ctx, x, y, w, h) {
        if (!api.last) return;
        const c = api._c || (api._c = document.createElement("canvas"));
        c.width = W; c.height = H;
        c.getContext("2d").putImageData(api.last, 0, 0);
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
        ctx.drawImage(c, x, y, w, h);
      },
      /** 장면 좌표(px)의 레이어 깊이(초점 맞추기 등) */
      depthAt(px, py) {
        const xi = CB.clamp(Math.round(px), 0, W - 1), yi = CB.clamp(Math.round(py), 0, H - 1), i = (yi * W + xi) * 4 + 3;
        for (let k = layers.length - 1; k >= 0; k--) { const L = layers[k]; if (L.type === "layer" && L.buf[i] > 0.5) return L.depth; }
        return Infinity;
      },
      invalidate() { compKey = ""; },
    };
    return api;
  };
  /** 톤 커브: 선형 → 표시값(0..1) */
  CB.toneCurves = {
    std: (v) => { v = v <= 0 ? 0 : CB.linToSrgb(Math.min(1, v)); return v; },
    vivid: (v) => { v = v <= 0 ? 0 : CB.linToSrgb(Math.min(1, v)); return CB.clamp(v + 0.12 * Math.sin((v - 0.5) * Math.PI) * (1 - Math.abs(v - 0.5)), 0, 1); },
    flat: (v) => { v = v <= 0 ? 0 : CB.linToSrgb(Math.min(1, v)); return 0.08 + v * 0.84; },
    log: (v) => CB.clamp(0.24 + 0.17 * Math.log2(Math.max(v, 1e-4) / 0.18) / 2.2 + 0.18, 0, 1), // 넓은 범위를 납작하게 담는 Log 곡선(개념용)
    linear: (v) => CB.clamp(v, 0, 1),
  };

  /** 히스토그램: ImageData → 256 빈(luma 또는 rgb) */
  CB.hist = function (img, mode = "luma") {
    const d = img.data, n = d.length / 4;
    const L = new Float32Array(256), R = new Float32Array(256), G = new Float32Array(256), B = new Float32Array(256);
    for (let i = 0; i < n; i++) {
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      L[Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)]++;
      if (mode === "rgb") { R[r]++; G[g]++; B[b]++; }
    }
    return { L, R, G, B, n };
  };
  /** 히스토그램 그리기 */
  CB.drawHist = function (ctx, x, y, w, h, H, opts = {}) {
    const P = CB.palette();
    ctx.save();
    ctx.fillStyle = opts.bg || "rgba(0,0,0,0.55)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 1;
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + (w * k) / 4, y); ctx.lineTo(x + (w * k) / 4, y + h); ctx.stroke(); }
    const bins = 64, agg = (A) => { const o = new Float32Array(bins); for (let i = 0; i < 256; i++) o[Math.floor(i / 4)] += A[i]; return o; };
    const sets = opts.rgb ? [[agg(H.R), "rgba(255,80,80,0.65)"], [agg(H.G), "rgba(80,230,110,0.6)"], [agg(H.B), "rgba(90,140,255,0.65)"]] : [[agg(H.L), opts.color || "rgba(255,255,255,0.85)"]];
    let mx = 0; sets.forEach(([A]) => { for (let i = 1; i < bins - 1; i++) mx = Math.max(mx, A[i]); });
    mx = Math.max(mx, 1);
    ctx.globalCompositeOperation = opts.rgb ? "lighter" : "source-over";
    sets.forEach(([A, col]) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y + h);
      for (let i = 0; i < bins; i++) { const v = Math.min(1, A[i] / mx); ctx.lineTo(x + (i / (bins - 1)) * w, y + h - v * (h - 4)); }
      ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
    });
    ctx.globalCompositeOperation = "source-over";
    // 양 끝 클리핑 경고
    const lo = H.L[0] / H.n, hi = (H.L[255] + H.L[254]) / H.n;
    if (lo > 0.01) { ctx.fillStyle = P.accent2 || "#3bc9db"; ctx.fillRect(x, y, 3, h); }
    if (hi > 0.01) { ctx.fillStyle = "#ff5f57"; ctx.fillRect(x + w - 3, y, 3, h); }
    ctx.restore();
  };

  /** 촬영 정보 바(카메라 LCD처럼) */
  CB.hud = function (ctx, x, y, w, items, opts = {}) {
    ctx.save();
    const h = opts.h || 24;
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(x, y, w, h);
    ctx.font = (opts.size || 12) + "px " + getComputedStyle(document.body).getPropertyValue("--mono");
    ctx.textBaseline = "middle"; ctx.fillStyle = "#fff";
    const gap = w / items.length;
    items.forEach((s, i) => { ctx.textAlign = "center"; ctx.fillStyle = typeof s === "object" ? s.color : "#fff"; ctx.fillText(typeof s === "object" ? s.text : s, x + gap * (i + 0.5), y + h / 2 + 1); });
    ctx.restore();
  };

  /* ------------------------------------------------------------ scene drawing kit */
  /** 장면 그리기 도구: 사람, 나무, 꽃, 자전거, 건물 등(모두 2D canvas 기본 도형) */
  const D = (CB.draw = {});
  D.sky = function (g, w, h, top, bottom, y1 = h) {
    const gr = g.createLinearGradient(0, 0, 0, y1); gr.addColorStop(0, top); gr.addColorStop(1, bottom);
    g.fillStyle = gr; g.fillRect(0, 0, w, y1);
  };
  D.mountains = function (g, w, base, amp, color, seed = 3) {
    const r = CB.rng(seed);
    g.fillStyle = color; g.beginPath(); g.moveTo(0, base + 40);
    let y = base - amp * 0.4;
    for (let x = 0; x <= w; x += w / 24) { y = CB.clamp(y + r.range(-amp * 0.35, amp * 0.35), base - amp, base - amp * 0.1); g.lineTo(x, y); }
    g.lineTo(w, base + 40); g.closePath(); g.fill();
  };
  D.tree = function (g, x, y, s, leaf = "#3f7d3a", trunk = "#5b4033", seed = 1) {
    const r = CB.rng(seed);
    g.fillStyle = trunk; g.fillRect(x - s * 0.06, y - s * 0.45, s * 0.12, s * 0.45);
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = r() * s * 0.32;
      const cx = x + Math.cos(a) * d, cy = y - s * 0.68 + Math.sin(a) * d * 0.9;
      g.fillStyle = shade(leaf, r.range(-0.18, 0.15));
      g.beginPath(); g.arc(cx, cy, s * r.range(0.1, 0.18), 0, Math.PI * 2); g.fill();
    }
  };
  D.building = function (g, x, y, w, h, wall, win, lit = 0.3, seed = 7) {
    const r = CB.rng(seed);
    g.fillStyle = wall; g.fillRect(x, y - h, w, h);
    const cw = Math.max(6, w / 7), ch = Math.max(8, h / 10);
    for (let yy = y - h + ch * 0.6; yy < y - ch; yy += ch) for (let xx = x + cw * 0.5; xx < x + w - cw * 0.6; xx += cw) {
      g.fillStyle = r() < lit ? win : shade(wall, -0.25);
      g.fillRect(xx, yy, cw * 0.55, ch * 0.55);
    }
  };
  /** 서 있는 사람(x: 중심, y: 발 위치, h: 키 px) */
  D.person = function (g, x, y, h, o = {}) {
    const skin = o.skin || "#e9b896", hair = o.hair || "#2b1d16", shirt = o.shirt || "#c8553d", pants = o.pants || "#2f3d5c";
    const u = h / 8; // 머리 1개 = 1/8
    g.save();
    // 다리
    g.fillStyle = pants;
    roundRect(g, x - u * 0.95, y - u * 4, u * 0.85, u * 4, u * 0.3); g.fill();
    roundRect(g, x + u * 0.1, y - u * 4, u * 0.85, u * 4, u * 0.3); g.fill();
    g.fillStyle = "#222"; roundRect(g, x - u * 1.05, y - u * 0.35, u, u * 0.35, u * 0.15); g.fill(); roundRect(g, x + u * 0.05, y - u * 0.35, u, u * 0.35, u * 0.15); g.fill();
    // 몸통 + 팔
    g.fillStyle = shirt;
    roundRect(g, x - u * 1.25, y - u * 6.8, u * 2.5, u * 3.1, u * 0.6); g.fill();
    roundRect(g, x - u * 1.75, y - u * 6.6, u * 0.62, u * 2.9, u * 0.3); g.fill();
    roundRect(g, x + u * 1.13, y - u * 6.6, u * 0.62, u * 2.9, u * 0.3); g.fill();
    if (o.stripes !== false) { // 셔츠 줄무늬: 선명도를 판단하는 디테일
      g.fillStyle = shade(shirt, 0.35);
      for (let k = 0; k < 7; k++) g.fillRect(x - u * 1.2, y - u * 6.4 + k * u * 0.4, u * 2.4, u * 0.12);
    }
    g.fillStyle = skin;
    g.beginPath(); g.arc(x - u * 1.44, y - u * 3.55, u * 0.3, 0, Math.PI * 2); g.arc(x + u * 1.44, y - u * 3.55, u * 0.3, 0, Math.PI * 2); g.fill();
    g.fillRect(x - u * 0.28, y - u * 7.15, u * 0.56, u * 0.5);
    // 머리
    g.beginPath(); g.ellipse(x, y - u * 7.55, u * 0.68, u * 0.8, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = hair;
    g.beginPath(); g.ellipse(x, y - u * 7.85, u * 0.74, u * 0.6, 0, Math.PI, Math.PI * 2); g.fill();
    if (o.longHair) { roundRect(g, x - u * 0.8, y - u * 7.9, u * 0.3, u * 1.5, u * 0.15); g.fill(); roundRect(g, x + u * 0.5, y - u * 7.9, u * 0.3, u * 1.5, u * 0.15); g.fill(); }
    // 눈(초점 확인용)
    g.fillStyle = "#1a1310";
    g.beginPath(); g.arc(x - u * 0.25, y - u * 7.5, u * 0.08, 0, Math.PI * 2); g.arc(x + u * 0.25, y - u * 7.5, u * 0.08, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(120,40,30,0.7)"; g.lineWidth = Math.max(1, u * 0.06);
    g.beginPath(); g.arc(x, y - u * 7.3, u * 0.2, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    g.restore();
  };
  D.flower = function (g, x, y, s, petal = "#f2c230", seed = 5) {
    const r = CB.rng(seed);
    g.strokeStyle = "#3d7a34"; g.lineWidth = s * 0.06;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + s * 0.1, y - s * 0.6, x, y - s * 1.2); g.stroke();
    g.fillStyle = "#4b8f3c"; g.beginPath(); g.ellipse(x + s * 0.18, y - s * 0.55, s * 0.2, s * 0.08, -0.5, 0, Math.PI * 2); g.fill();
    const cy = y - s * 1.25;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.fillStyle = shade(petal, r.range(-0.1, 0.1));
      g.beginPath(); g.ellipse(x + Math.cos(a) * s * 0.3, cy + Math.sin(a) * s * 0.3, s * 0.2, s * 0.08, a, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = "#5a3a1c"; g.beginPath(); g.arc(x, cy, s * 0.2, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#2e1e0f";
    for (let i = 0; i < 40; i++) { const a = i * 2.39996, d = Math.sqrt(i / 40) * s * 0.18; g.fillRect(x + Math.cos(a) * d, cy + Math.sin(a) * d, s * 0.025, s * 0.025); }
  };
  D.cyclist = function (g, x, y, s, o = {}) {
    const frame = o.frame || "#d6332b";
    g.save(); g.lineCap = "round";
    const wr = s * 0.26;
    g.strokeStyle = "#1d1d1d"; g.lineWidth = s * 0.04;
    [[x - s * 0.38, y - wr], [x + s * 0.38, y - wr]].forEach(([cx, cy]) => { g.beginPath(); g.arc(cx, cy, wr, 0, Math.PI * 2); g.stroke(); g.lineWidth = s * 0.012; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * wr, cy + Math.sin(a) * wr); g.stroke(); } g.lineWidth = s * 0.04; });
    g.strokeStyle = frame; g.lineWidth = s * 0.045;
    g.beginPath(); g.moveTo(x - s * 0.38, y - wr); g.lineTo(x - s * 0.05, y - wr); g.lineTo(x + s * 0.2, y - s * 0.62); g.lineTo(x - s * 0.18, y - s * 0.62); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(x + s * 0.38, y - wr); g.lineTo(x + s * 0.24, y - s * 0.72); g.stroke();
    // 사람
    g.strokeStyle = o.shirt || "#2563c9"; g.lineWidth = s * 0.11;
    g.beginPath(); g.moveTo(x - s * 0.15, y - s * 0.7); g.lineTo(x + s * 0.08, y - s * 1.08); g.stroke();
    g.lineWidth = s * 0.06; g.beginPath(); g.moveTo(x + s * 0.08, y - s * 1.02); g.lineTo(x + s * 0.24, y - s * 0.74); g.stroke();
    g.strokeStyle = "#2b2b38"; g.lineWidth = s * 0.08;
    g.beginPath(); g.moveTo(x - s * 0.15, y - s * 0.68); g.lineTo(x + s * 0.02, y - s * 0.42); g.lineTo(x - s * 0.05, y - wr); g.stroke();
    g.fillStyle = "#e9b896"; g.beginPath(); g.arc(x + s * 0.13, y - s * 1.2, s * 0.09, 0, Math.PI * 2); g.fill();
    g.fillStyle = o.helmet || "#f5f5f5"; g.beginPath(); g.arc(x + s * 0.13, y - s * 1.22, s * 0.1, Math.PI, Math.PI * 2); g.fill();
    g.restore();
  };
  D.car = function (g, x, y, s, body = "#2f6fe0") {
    g.save();
    g.fillStyle = body; roundRect(g, x - s * 0.5, y - s * 0.3, s, s * 0.2, s * 0.05); g.fill();
    g.beginPath(); g.moveTo(x - s * 0.3, y - s * 0.3); g.lineTo(x - s * 0.18, y - s * 0.45); g.lineTo(x + s * 0.18, y - s * 0.45); g.lineTo(x + s * 0.32, y - s * 0.3); g.closePath(); g.fill();
    g.fillStyle = "#bfe0f5"; g.beginPath(); g.moveTo(x - s * 0.26, y - s * 0.31); g.lineTo(x - s * 0.16, y - s * 0.42); g.lineTo(x - s * 0.01, y - s * 0.42); g.lineTo(x - s * 0.01, y - s * 0.31); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(x + s * 0.02, y - s * 0.31); g.lineTo(x + s * 0.02, y - s * 0.42); g.lineTo(x + s * 0.16, y - s * 0.42); g.lineTo(x + s * 0.27, y - s * 0.31); g.closePath(); g.fill();
    g.fillStyle = "#151515";
    g.beginPath(); g.arc(x - s * 0.3, y - s * 0.1, s * 0.1, 0, Math.PI * 2); g.arc(x + s * 0.3, y - s * 0.1, s * 0.1, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#bbb"; g.beginPath(); g.arc(x - s * 0.3, y - s * 0.1, s * 0.045, 0, Math.PI * 2); g.arc(x + s * 0.3, y - s * 0.1, s * 0.045, 0, Math.PI * 2); g.fill();
    g.restore();
  };
  D.text = function (g, s, x, y, size, color, align = "center", weight = 700) {
    g.save(); g.font = `${weight} ${size}px ${getComputedStyle(document.body).getPropertyValue("--font") || "sans-serif"}`;
    g.fillStyle = color; g.textAlign = align; g.textBaseline = "middle"; g.fillText(s, x, y); g.restore();
  };
  function roundRect(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  D.roundRect = roundRect;
  /** #rrggbb 밝기 조절: amt>0 밝게, <0 어둡게 */
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
    const f = (v) => Math.round(CB.clamp(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt), 0, 255));
    return "rgb(" + f(r) + "," + f(gg) + "," + f(b) + ")";
  }
  D.shade = shade;

  /* ------------------------------------------------------------ 표준 장면 */
  /**
   * 자주 쓰는 장면. CB.scenes.portrait(w,h) → CB.Photo
   *  - portrait : 해질녘 공원, 2.5 m 인물 + 배경 전구 + 나무 (심도·보케)
   *  - street   : 낮 거리, 자전거(움직임)와 보행자 (셔터 속도)
   */
  CB.scenes = {
    portrait(w = 480, h = 300, o = {}) {
      return CB.Photo({
        w, h, sceneEV: o.sceneEV != null ? o.sceneEV : 10, sceneK: o.sceneK || 5500,
        build(S) {
          S.layer(Infinity, (g) => {
            D.sky(g, w, h, "#6f9fd8", "#f3c79a", h * 0.62);
            D.mountains(g, w, h * 0.6, h * 0.16, "#8a93b4", 11);
            g.fillStyle = "#7b9b6a"; g.fillRect(0, h * 0.58, w, h);
          });
          S.layer(40, (g) => {
            const r = CB.rng(21);
            for (let i = 0; i < 11; i++) D.tree(g, (i + r.range(-0.3, 0.3)) * (w / 10), h * 0.66, h * r.range(0.32, 0.46), "#4f7d45", "#4a3a30", 30 + i);
          });
          S.layer(14, (g) => {
            g.fillStyle = "#86a06f"; g.fillRect(0, h * 0.64, w, h);
            const r = CB.rng(5);
            for (let i = 0; i < 6; i++) D.tree(g, r.range(0, w), h * 0.7, h * r.range(0.5, 0.62), "#3c6b37", "#4a3a30", 50 + i);
            // 줄 전구가 걸린 전선
            g.strokeStyle = "rgba(40,40,40,0.8)"; g.lineWidth = 1;
            g.beginPath(); for (let x = 0; x <= w; x += 4) { const y = h * 0.3 + Math.sin((x / w) * Math.PI * 2) * h * 0.05; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
          });
          const pts = [];
          for (let k = 0; k < 15; k++) { const x = (k + 0.5) * (w / 15); pts.push({ x, y: h * 0.3 + Math.sin((x / w) * Math.PI * 2) * h * 0.05 + 3, c: [1, 0.72, 0.35], i: 55 }); }
          S.lights(14, pts);
          S.layer(6, (g) => { // 벤치
            g.fillStyle = "#7a5233"; g.fillRect(w * 0.62, h * 0.66, w * 0.3, h * 0.025); g.fillRect(w * 0.62, h * 0.7, w * 0.3, h * 0.025);
            g.fillStyle = "#3b3b3b"; g.fillRect(w * 0.64, h * 0.7, w * 0.012, h * 0.08); g.fillRect(w * 0.89, h * 0.7, w * 0.012, h * 0.08);
            D.flower(g, w * 0.12, h * 0.8, h * 0.12, "#e2563b", 9);
          });
          if (o.mover) S.layer(7, (g) => D.cyclist(g, w * 0.78, h * 0.86, h * 0.3, { shirt: "#2563c9" }), { motion: [o.mover, 0], name: "mover" });
          S.layer(2.5, (g) => D.person(g, w * 0.42, h * 0.98, h * 0.82, { shirt: "#d9622b", longHair: true }), { name: "subject" });
          S.layer(1.2, (g) => { // 전경 풀
            const r = CB.rng(77); g.strokeStyle = "#2f5a2a"; g.lineCap = "round";
            for (let i = 0; i < 70; i++) { const x = r.range(0, w * 0.22), hh = r.range(h * 0.08, h * 0.25); g.lineWidth = r.range(1, 3); g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + r.range(-8, 8), h - hh * 0.5, x + r.range(-14, 14), h - hh); g.stroke(); }
          });
        },
      });
    },
    street(w = 480, h = 300, o = {}) {
      const speed = o.speed != null ? o.speed : w * 0.9; // px/s
      return CB.Photo({
        w, h, sceneEV: o.sceneEV != null ? o.sceneEV : 13,
        build(S) {
          S.layer(Infinity, (g) => D.sky(g, w, h, "#7fb2e6", "#d8e8f5", h * 0.5));
          S.layer(30, (g) => {
            const cols = ["#c9b79c", "#a8b5c4", "#d9c8b4", "#b6a08a", "#9fb0a2"];
            let x = 0, i = 0; while (x < w) { const bw = w * (0.12 + (i % 3) * 0.04); D.building(g, x, h * 0.62, bw, h * (0.32 + ((i * 37) % 5) * 0.05), cols[i % 5], "#f5e7b0", 0.15, 90 + i); x += bw + 2; i++; }
          });
          S.layer(12, (g) => {
            g.fillStyle = "#9a9a96"; g.fillRect(0, h * 0.62, w, h * 0.06);
            g.fillStyle = "#4a4c52"; g.fillRect(0, h * 0.68, w, h * 0.32);
            g.fillStyle = "#e8e8e8"; for (let x = 0; x < w; x += w / 8) g.fillRect(x, h * 0.83, w / 16, h * 0.012);
            D.person(g, w * 0.86, h * 0.68, h * 0.3, { shirt: "#3a8f5c", stripes: false });
            D.tree(g, w * 0.08, h * 0.64, h * 0.5, "#4a7f3f", "#4a3a30", 4);
          });
          S.layer(9, (g) => D.cyclist(g, w * 0.45, h * 0.9, h * 0.42), { motion: [speed, 0], name: "subject" });
        },
      });
    },
  };

  /* ------------------------------------------------------------ layout build */
  const LOGO = `<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="cbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs><rect x="2" y="2" width="28" height="28" rx="8" fill="url(#cbg)"/><g fill="none" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"><circle cx="16" cy="16" r="8.5"/><path d="M16 7.5 L19.5 14 M24.1 13.4 L17.5 18.3 M21.3 22.7 L14.3 20.6 M11.2 23.2 L12.7 15.4 M8.6 12.3 L16.4 12.7"/></g></svg>`;
  const ICON_MENU = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`;
  const ICON_MOON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`;
  const ICON_SUN = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;

  function build() {
    const body = document.body;
    const root = body.dataset.root != null ? body.dataset.root : body.dataset.chapter ? "../" : "";
    const curSlug = body.dataset.chapter || "";
    const href = (slug) => (slug ? `${root}chapters/${slug}.html` : `${root}index.html`);

    const bar = document.createElement("header");
    bar.className = "sb-topbar";
    bar.innerHTML = `
      <button class="sb-btn icon" id="sb-menu" aria-label="챕터 목록">${ICON_MENU}</button>
      <a class="sb-logo" href="${href("")}">${LOGO}<span>CameraBook <small>카메라 교과서</small></span></a>
      <span class="spacer"></span>
      <button class="sb-btn icon" id="sb-theme" aria-label="테마 전환"></button>
      <div class="sb-progress" id="sb-progress"></div>`;
    body.prepend(bar);

    const drawer = document.createElement("nav");
    drawer.className = "sb-drawer";
    drawer.innerHTML = `<h4>Chapters</h4><ul class="sb-chlist">
      <li><a href="${href("")}" class="${curSlug ? "" : "active"}"><span class="num">00</span><span>홈 · 로드맵</span></a></li>
      ${CHAPTERS.map((c) => `<li><a href="${href(c.slug)}" class="${c.slug === curSlug ? "active" : ""}"><span class="num">${c.num}</span><span>${c.title}</span></a></li>`).join("")}
    </ul>
    <h4 style="margin-top:22px">자매 사이트</h4><ul class="sb-chlist">
      <li><a href="https://sensorbook.euiyun.com/"><span class="num">↗</span><span>SensorBook · 이미지 센서 교과서</span></a></li>
      <li><a href="https://sensors.euiyun.com/"><span class="num">↗</span><span>Mobile Image Sensor DB</span></a></li>
    </ul>`;
    const backdrop = document.createElement("div");
    backdrop.className = "sb-drawer-backdrop";
    body.append(backdrop, drawer);
    const toggleDrawer = (o) => body.classList.toggle("drawer-open", o);
    bar.querySelector("#sb-menu").addEventListener("click", () => toggleDrawer(true));
    backdrop.addEventListener("click", () => toggleDrawer(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggleDrawer(false); });

    const tbtn = bar.querySelector("#sb-theme");
    const setIcon = () => (tbtn.innerHTML = CB.isDark() ? ICON_SUN : ICON_MOON);
    setIcon();
    tbtn.addEventListener("click", () => {
      const next = CB.isDark() ? "light" : "dark";
      try { localStorage.setItem("cb-theme", next); } catch (e) {}
      applyTheme(next); setIcon();
    });

    const prog = bar.querySelector("#sb-progress");
    const onScroll = () => { const h = document.documentElement.scrollHeight - innerHeight; prog.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%"; };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();

    const main = document.querySelector("main.chapter");
    if (main) {
      const layout = document.createElement("div");
      layout.className = "sb-layout";
      main.parentNode.insertBefore(layout, main);
      layout.appendChild(main);
      const toc = document.createElement("aside");
      toc.className = "sb-toc";
      const h2s = [...main.querySelectorAll("section > h2")];
      let n = 0;
      toc.innerHTML = "<h4>ON THIS PAGE</h4>" + h2s.map((h, i) => {
        const sec = h.parentElement;
        if (!sec.id) sec.id = "s" + (i + 1);
        const numbered = !sec.classList.contains("keypoints") && !sec.classList.contains("quiz-sec") && !sec.hasAttribute("data-nonum");
        if (numbered && !h.querySelector(".h-num")) { n++; h.insertAdjacentHTML("afterbegin", `<span class="h-num">${String(n).padStart(2, "0")}</span>`); }
        return `<a href="#${sec.id}">${h.textContent.replace(/^\d\d/, "").trim()}</a>`;
      }).join("");
      layout.appendChild(toc);
      const links = [...toc.querySelectorAll("a")];
      if (window.IntersectionObserver && h2s.length) {
        const io = new IntersectionObserver((es) => {
          es.forEach((e) => { if (e.isIntersecting) { links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id)); } });
        }, { rootMargin: "-20% 0px -70% 0px" });
        h2s.forEach((h) => io.observe(h.parentElement));
      }

      const idx = CHAPTERS.findIndex((c) => c.slug === curSlug);
      const prev = idx > 0 ? CHAPTERS[idx - 1] : null;
      const next = idx >= 0 && idx < CHAPTERS.length - 1 ? CHAPTERS[idx + 1] : null;
      const pager = document.createElement("nav");
      pager.className = "sb-pager";
      pager.innerHTML =
        (prev ? `<a class="prev" href="${href(prev.slug)}"><small>← 이전 · ${prev.num}</small>${prev.title}</a>` : `<a class="prev" href="${href("")}"><small>← 처음으로</small>홈 · 로드맵</a>`) +
        (next ? `<a class="next" href="${href(next.slug)}"><small>다음 · ${next.num} →</small>${next.title}</a>` : "");
      layout.after(pager);
    }
    const foot = document.createElement("footer");
    foot.className = "sb-foot";
    foot.innerHTML = `CameraBook — 직접 만져 보며 배우는 카메라 교과서 · 시뮬레이터의 사진은 교육용 근사 모델입니다.
      <br>자매 사이트: <a href="https://sensorbook.euiyun.com/">SensorBook</a> · <a href="https://sensors.euiyun.com/">Mobile Image Sensor DB</a>
      <br>© 2026 <a href="https://github.com/geniuskey">geniuskey</a> ·
      콘텐츠 <a href="https://creativecommons.org/licenses/by/4.0/deed.ko" rel="license">CC BY 4.0</a> ·
      코드 <a href="https://github.com/geniuskey/camerabook/blob/main/LICENSE-MIT">MIT</a> ·
      <a href="https://github.com/geniuskey/camerabook/blob/main/LICENSE.md">라이선스 안내</a>`;
    body.appendChild(foot);

    document.querySelectorAll(".quiz-q").forEach((q) => {
      const opts = [...q.querySelectorAll("button.opt")];
      opts.forEach((b) => b.addEventListener("click", () => {
        opts.forEach((o) => { o.disabled = true; if (o.hasAttribute("data-correct")) o.classList.add("right"); });
        if (!b.hasAttribute("data-correct")) b.classList.add("wrong");
        q.classList.add("done");
        q.dispatchEvent(new CustomEvent("answered", { bubbles: true, detail: { correct: b.hasAttribute("data-correct") } }));
      }));
    });

    const renderMath = () => {
      if (window.renderMathInElement) {
        renderMathInElement(document.body, {
          delimiters: [{ left: "$$", right: "$$", display: true }, { left: "\\(", right: "\\)", display: false }, { left: "\\[", right: "\\]", display: true }],
          throwOnError: false,
          ignoredClasses: ["no-math"],
        });
      }
    };
    if (window.renderMathInElement) renderMath();
    else window.addEventListener("load", renderMath);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
