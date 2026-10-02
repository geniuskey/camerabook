# CameraBook — 인터랙티브 카메라 교과서

다이얼을 돌리면 사진이 달라진다. 조리개·셔터·ISO부터 초점, 화이트 밸런스, RAW, 플래시, 동영상, 스마트폰 카메라까지 — 가상 카메라를 직접 조작하며 카메라의 기능을 배우는 한국어 학습 사이트입니다.
17개 챕터, 60개의 시뮬레이터, 종합 퀴즈와 미션형 촬영 연습장으로 구성됩니다.

자매 사이트: [SensorBook — 이미지 센서 교과서](https://sensorbook.euiyun.com/) · [Mobile Image Sensor DB](https://sensors.euiyun.com/)

## 실행
빌드 과정이 없는 정적 사이트입니다.

```bash
python3 -m http.server 8000   # → http://localhost:8000
```
`index.html`을 브라우저로 바로 열어도 동작합니다. KaTeX와 웹 폰트는 CDN에서 불러오며, 없으면 시스템 글꼴로 표시됩니다.

## 구성
| 장 | 파일 | 주제 |
|---|---|---|
| 01 | chapters/basics.html | 바늘구멍 사진기 vs 렌즈, 카메라의 다섯 부품, DSLR·미러리스·폰의 빛 경로, 센서 크기, 화소 수 |
| 02 | chapters/exposure.html | 빛 양동이, 스톱과 EV, 노출 삼각형 가상 카메라, 등가 노출, 써니 16 |
| 03 | chapters/aperture.html | F값과 조리개 날개, 피사계 심도, 보케 모양, 회절과 최적 조리개, 등가 조리개 |
| 04 | chapters/shutter.html | 모션 블러와 패닝, 손떨림, 장노출 빛 궤적, 포컬 플레인 셔터, 롤링 셔터 |
| 05 | chapters/iso.html | ISO = 증폭, 광자 샷 노이즈, ISO 불변성, 센서 크기와 노이즈 감소, Auto ISO |
| 06 | chapters/modes.html | P·A·S·M 모드 다이얼, 18% 회색과 측광 모드, 노출 보정, AE 잠금 |
| 07 | chapters/histogram.html | 라이브 히스토그램과 제브라, 다이내믹 레인지 창문, 브라케팅과 HDR 합성 |
| 08 | chapters/focus.html | MF와 포커스 피킹, 콘트라스트 vs 위상차 AF, AF-S/AF-C, AF 영역 모드 |
| 09 | chapters/focal.html | 화각과 크롭, 돌리 줌(압축 효과의 원인), 셀카 얼굴 비율, 렌즈 왜곡 |
| 10 | chapters/color.html | 색온도, 화이트 밸런스 실험실(회색 카드), 혼합광, 픽처 스타일 |
| 11 | chapters/raw.html | 카메라 내부 현상, 비트 심도와 밴딩, 하이라이트 복구, JPEG 압축(8×8 DCT) |
| 12 | chapters/stabilization.html | OIS·IBIS, 보정 스톱과 성공률, 연사 버퍼, 프리 캡처, 타임랩스 계산 |
| 13 | chapters/flash.html | 광원 크기와 방향, 역제곱 법칙, 가이드 넘버, 동조 속도·HSS, 후막 동조, 필 플래시 |
| 14 | chapters/video.html | 프레임 레이트와 슬로 모션, 180° 셔터, ND 계산, 비트레이트, Log와 그레이딩 |
| 15 | chapters/smartphone.html | 멀티 카메라 줌, 야간 모드 다중 합성, 인물 모드 깊이 지도, 프로 모드 |
| 16 | chapters/playground.html | 미션형 가상 카메라(6개 미션) |
| 17 | chapters/glossary.html | 용어집(145개), 종합 퀴즈(24문항) |

공통 코드: `css/style.css`(디자인 토큰, 라이트/다크), `js/common.js`(내비게이션, 차트·캔버스 헬퍼, 가상 사진 엔진 `CB.Photo`, 원근 투영 렌더러 `CB.World`).
챕터 작성 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
챕터를 추가하거나 제목·설명을 바꾼 뒤에는 `python3 tools/seo.py`로 canonical/OG/JSON-LD 태그와 `sitemap.xml`을 다시 만듭니다.

시뮬레이터의 사진과 수치는 원리를 보여 주기 위한 교육용 근사 모델입니다.

## 배포
GitHub Pages(루트 디렉터리)에 그대로 올리면 됩니다. `CNAME`은 `camerabook.euiyun.com`으로 설정되어 있습니다.

## 라이선스

코드는 [MIT](LICENSE-MIT), 교재 콘텐츠는 [CC BY 4.0](LICENSE-CC-BY-4.0)으로 제공됩니다. 적용 범위와 재사용 조건은 [라이선스 안내](LICENSE.md)를 참고하세요.
