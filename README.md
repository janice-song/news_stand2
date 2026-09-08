# 아홉시 — 국내 AI 뉴스스탠드

HTML·CSS·JavaScript 기반 개인용 MVP입니다. 네이버 뉴스 검색 결과를 수집해 정적 JSON으로 발행하고, 브라우저에서 관심사에 따라 정렬합니다.

## 구현된 기능

- 국내 언론사 도메인 검증, AI 키워드 선별, URL 중복 제거
- 한국 시간 오전 9시 기준 직전 24시간의 pubDate 필터
- 3:4 카드와 축소한 2:3 썸네일, 기사 미리보기 최대 100자, 원문 새 탭 이동
- 관심 주제 복수 선택, 관심 없음, 복원, 최신순, 브라우저 저장
- 공개 og:image 확보를 시도하고 실패하면 이미지 미제공 표시
- 전체 수집 실패 시 이전 news.json 보존, 부분 실패 및 오래된 지면 안내
- GitHub Actions 매일 09:00 KST 수집 및 Vercel Deploy Hook 호출

## 로컬 실행

Node.js 22 이상, pnpm 11.19.0을 사용합니다.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm collect
pnpm build
pnpm start
```

미리보기: http://localhost:4173

수집이 실패해도 `pnpm build`와 `pnpm start`로 빈 상태 화면을 확인할 수 있습니다. 가짜 기사는 포함하지 않았습니다.

`.env.example`을 참고하여 `.env.local`에 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`을 설정합니다. 사용자 제공 값은 로컬에 이미 저장되어 있습니다. 환경변수를 직접 주입하면 로컬 파일보다 우선합니다. 비밀 값은 커밋하지 마세요.

## 현재 연결 상태

NAVER API HUB 주소와 인증 헤더로 전환한 후 실제 기사 60건 수집에 성공했습니다. 기존 401은 이전 개발자센터 API로 호출했을 때의 결과입니다. 인증은 NAVER Cloud Platform의 NAVER API HUB 애플리케이션 값을 사용합니다.

GitHub 원격 저장소와 Vercel 프로젝트는 아직 연결되지 않았습니다. 예약 설정 파일이 존재하는 것과 실제 운영 중인 것은 다릅니다.

## GitHub와 Vercel 설정

1. 이 프로젝트를 GitHub 저장소의 기본 브랜치에 올립니다. `.env.local`, `node_modules`, `dist`는 제외됩니다.
2. Vercel에서 해당 GitHub 저장소를 Import합니다. Framework Preset은 Other, Build Command는 `node scripts/build.mjs`, Output Directory는 `dist`입니다. 루트 디렉터리는 이 프로젝트 루트입니다.
3. Vercel 프로젝트의 Settings → Git → Deploy Hooks에서 기본 브랜치용 Hook을 생성합니다.
4. GitHub 저장소 Settings → Secrets and variables → Actions에 아래 Secrets를 등록합니다.
   - `NAVER_CLIENT_ID`
   - `NAVER_CLIENT_SECRET`
   - `VERCEL_DEPLOY_HOOK`: 앞 단계의 Hook URL
5. GitHub Actions 쓰기 권한과 브랜치 보호 정책이 봇의 기사 데이터 커밋을 허용하는지 확인합니다.
6. Actions → Refresh news → Run workflow로 수동 실행합니다. 데이터 커밋, Vercel 배포 성공, 화면 갱신까지 확인하면 운영 준비가 완료됩니다.

네이버 Client 값은 Vercel 환경변수에 넣을 필요가 없습니다. 인증은 GitHub 수집 작업에서만 사용합니다. Deploy Hook은 봇 커밋의 자동 배포 여부에 의존하지 않고 배포를 요청하기 위해 필수로 사용합니다.

예약 실행은 UTC 00:00(한국 09:00)에 시작하며 GitHub 대기열과 배포 시간 때문에 정각 공개를 보장하지 않습니다. 공개 저장소가 오랫동안 비활성 상태이면 GitHub 예약 워크플로가 중단될 수 있으므로 운영 상태를 확인해야 합니다.

## 수집 한계

- 네이버 description은 검색 발췌문이며 원문 본문의 첫 문장과 다를 수 있습니다.
- pubDate는 네이버 제공 시각일 수 있어 원문 최초 발행 시각과 다를 수 있습니다.
- 검색어별 최대 10페이지, 지면 최대 60개입니다. 조회 상한 도달은 경고로 기록합니다.
- 국내 매체 목록은 `scripts/news.mjs`의 publishers에서 관리합니다. 미등록 언론사는 제외됩니다.
- 썸네일 보강은 검증한 HTTPS 원문만 요청하며 리디렉션은 따라가지 않습니다. 사이트 접근 제한이나 메타데이터 누락 시 이미지가 없을 수 있습니다.
- 초기 지면에 실제 수집 기사 데이터가 포함되어 있습니다. 예약 운영에는 GitHub Secrets와 Vercel Deploy Hook 연결이 필요합니다.

## 검증

`pnpm test`는 오전 9시 경계, 24시간 포함/제외, 잘못된 날짜·도메인, 100자 처리, 중복, 부분·전체 수집 실패, 개인화 정렬, 비공개 IP 제외를 확인합니다.

[상세 계획](PRD.md) · [네이버 API 문서](https://api.ncloud-docs.com/docs/naver-api-hub-search-news)

## NAVER API HUB 연결

- GET `https://naverapihub.apigw.ntruss.com/search/v1/news`
- 헤더 `X-NCP-APIGW-API-KEY-ID`: `NAVER_CLIENT_ID` 환경변수
- 헤더 `X-NCP-APIGW-API-KEY`: `NAVER_CLIENT_SECRET` 환경변수
- 응답 형식은 `format=json`을 명시합니다.
- GitHub Secrets 이름은 기존과 동일합니다. 값은 API HUB에서 발급한 인증 정보를 사용합니다.
