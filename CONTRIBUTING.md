# CameraBook 챕터 작성 가이드

## 기여물의 라이선스

기여하는 코드는 MIT, 교재 콘텐츠는 CC BY 4.0으로 제공하는 데 동의해야 합니다. 적용 범위는 [라이선스 안내](LICENSE.md)를 참고하세요.

빌드 과정 없는 정적 사이트다. `index.html` + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`.
로컬 실행: `python3 -m http.server 8000` → http://localhost:8000 (file://로 열어도 동작하게 classic script만 사용한다. ES module 금지.)

## 원칙
- **한국어 합니다체**, 대상은 카메라를 막 쓰기 시작한 일반인~중급자. 공학 지식을 가정하지 않는다. 영어 원어는 `<span class="en">(Depth of Field)</span>`처럼 병기.
- 개념 → 일상 비유 → 그림(SVG) → 시뮬레이터 → 실전 요령(콜아웃) → 핵심 정리 → 퀴즈 순서.
- 수식은 꼭 필요할 때만, KaTeX로 짧게.
- 시뮬레이터는 "슬라이더를 움직이면 사진이 어떻게 달라지는가"를 보여 주는 것이 목표다. 가능하면 `CB.Photo`(가상 사진 엔진)로 실제 사진처럼 렌더한다.
- 외부 라이브러리는 KaTeX만. 이미지 파일 대신 인라인 SVG/canvas로 그린다.
- 색은 CSS 변수(`var(--accent)` 등)나 `CB.palette()`를 쓴다. 라이트/다크 둘 다 읽혀야 한다. 사진 장면 안의 색은 고정색 가능.
- 모바일(폭 360px)에서 가로 스크롤이 생기면 안 된다. SVG는 `viewBox`만 주고 width/height 속성 생략.

## head 템플릿
```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="../apple-touch-icon.png">
<title>조리개와 아웃포커스 · CameraBook</title>
<meta name="description" content="한 문장 설명">
<!-- 수식이 있는 페이지만 -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
<link rel="stylesheet" href="../css/style.css">
<script src="../js/common.js"></script>
</head>
<body data-chapter="aperture">
<main class="chapter">
  <header class="chapter-hero">
    <div class="eyebrow">Chapter 03</div>
    <h1>조리개와 아웃포커스</h1>
    <p class="lead">...</p>
    <ul class="objectives"><li>...</li></ul>
  </header>
  <section id="intro"><h2>제목</h2> ... </section>   <!-- h2 번호와 우측 목차는 자동 생성 -->
  <section class="keypoints" id="summary"><h2>핵심 정리</h2><ol><li>...</li></ol></section>
  <section class="quiz-sec" id="quiz"><h2>확인 퀴즈</h2><div class="quiz"> ... </div></section>
</main>
<script> /* 페이지 스크립트: 여기서 CB 사용 */ </script>
</body>
</html>
```
상단바, 챕터 서랍, 목차, 이전/다음, 푸터, 테마 토글, 퀴즈 동작, KaTeX 렌더는 `common.js`가 자동 처리한다.
새 챕터는 `common.js`의 `CHAPTERS`에 등록한 뒤 `python3 tools/seo.py`를 실행한다(canonical·OG·JSON-LD·sitemap 자동 생성).

## 컴포넌트
시뮬레이터 카드:
```html
<div class="sim" id="sim-dof">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목</h3></div>
  <div class="sim-body side">
    <div class="sim-view photo"><canvas id="cv-dof"></canvas></div>   <!-- 사진이면 .photo(검은 배경) -->
    <div class="sim-controls">
      <label class="ctrl"><span>조리개 <output id="ap-out"></output></span><input type="range" id="ap"></label>
      <div class="ctrl"><span>모드</span><div class="seg" id="mode"><button data-value="a" class="on">A</button><button data-value="b">B</button></div></div>
      <label class="check"><input type="checkbox" id="opt"> 옵션</label>
    </div>
  </div>
  <div class="sim-readout"><div class="stat"><span class="k">이름</span><span class="v" id="o-x">—</span></div></div>
  <div class="sim-note">해볼 것: ...</div>
</div>
```
콜아웃: `.callout`, `.tip`, `.warn`, `.deep`. 카드 묶음: `<div class="cards"><div><b>제목</b>내용</div></div>`. 표: `<div class="table-wrap"><table>…</table></div>`.

## JS 헬퍼 (`js/common.js`)
- `CB.canvas(el, (ctx,w,h)=>{}, {aspect | aspect(w), height, minHeight, maxHeight})` → `{redraw()}`. HiDPI, 리사이즈·테마 변경 시 자동 redraw.
- `CB.steps(id, 목록, fmt, 초기값, onInput)` 이산 눈금 슬라이더(`CB.APERTURES`, `CB.SHUTTERS`, `CB.ISOS` 1/3스톱 눈금). `CB.range`, `CB.seg`, `CB.check`, `CB.stat`.
- `CB.fmtT(t)` 셔터 표기, `CB.fmtN(N)`, `CB.ev(N,t,iso)`, `CB.throttle(fn)`, `CB.loop(el, (dt,t)=>{})`, `CB.chart(...)`.
- **가상 사진 엔진** `CB.Photo({w,h,sceneEV,build(S){ S.layer(깊이m, draw, {gain, motion:[vx,vy], name}); S.lights(깊이m, [{x,y,c:[r,g,b],i}]) }})`
  - `photo.render({N, t, iso, focus, focal, sensorW, blades, shake, panning, sceneK, wbK, wbTint, wbGains, fw, readNoise, light, gain, tone, sat, nr, noise, noiseSeed})` → ImageData.
  - 장면 색은 "적정 노출일 때의 모습"으로 그린다. 노출 차이·심도(착란원)·모션 블러·광자 노이즈·화이트 밸런스·톤 커브를 물리적으로 근사한다.
  - 표준 장면: `CB.scenes.portrait`, `CB.scenes.street`, `CB.scenes.backlit`. 그리기 도구: `CB.draw.person/tree/flower/cyclist/car/dog/building/...`.
- `CB.World()` 원근 투영 장면(초점거리·카메라 위치에 따른 화각과 원근).
- `CB.hist(img)`, `CB.drawHist(...)`, `CB.hud(ctx, x, y, w, [항목])` 카메라 LCD 스타일 정보 바.
- `CB.blurCanvas(src, sigma, {lenX, lenY})` 선형광 기준 블러, `CB.kelvin(K)` 색온도 → RGB.
