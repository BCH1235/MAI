# Firebase Integration & Auth Plan

## 1. 목표와 범위
- 라이브러리 페이지에 사용자별 음악/비트 데이터를 Firestore에서 읽어와 표시한다.
- 음악 생성/비트 생성 워크플로가 완료될 때 결과 메타데이터와 오디오 파일을 Firebase에 저장한다.
- Firebase Authentication을 이용해 이메일/비밀번호 기반 회원가입과 로그인을 제공하고, 로그인 상태에 따라 UI와 접근 권한을 제어한다.
- 즐겨찾기, 삭제, 다운로드 같은 라이브러리 상호작용을 사용자 권한에 맞춰 동작시키고 감사 가능한 이벤트 로그를 남길 수 있는 구조를 마련한다.

## 2. 현재 상태 요약
- `Library.js`는 `musicList` 상태와 더미 데이터를 결합하여 화면만 렌더링한다. 실제 데이터 로딩, 즐겨찾기 토글, 삭제 등은 전부 토스트 메시지를 띄우는 수준이다.
- 생성 페이지(`MusicGeneration`, `MusicConversion`)는 성공 시 임시 객체를 상태에 넣지만 영속 저장소가 없어 새로고침 시 데이터가 사라진다.
- 사용자 인증 기능이 없고, `MusicContext`는 단일 사용자 가정으로 동작한다.

## 3. 사용자 시나리오 (핵심 플로우)
1. **회원가입**: 사용자가 이메일/비밀번호로 가입 → displayName 입력 → Firestore `users` 문서 생성.
2. **로그인**: 인증 성공 후 토큰 기반 세션 유지 → 전역 컨텍스트에 사용자 정보 저장 → 라이브러리/생성 기능 접근 가능.
3. **음악 생성**: MusicGen API 호출 완료 → 결과 오디오를 Firebase Storage 업로드 → Firestore `tracks` 컬렉션에 메타데이터 + Storage URL 저장 → 라이브러리에서 즉시 반영.
4. **비트 생성**: 드럼 패턴 WAV export → Storage 업로드 → Firestore `beats` 문서 생성 → 라이브러리에 표시.
5. **라이브러리 상호작용**: 검색·필터는 Firestore 쿼리 or 클라이언트 필터링. 즐겨찾기 토글 시 `favorites` 서브컬렉션(또는 배열)을 업데이트. 삭제 시 Storage 파일 삭제 후 문서 soft delete.
6. **비로그인 접근**: 라이브러리 진입 시 로그인 유도 모달/리다이렉트, 생성 페이지는 읽기만 허용하거나 로그인 요구.

## 4. 데이터 모델 제안 (Cloud Firestore)

### 4.1 컬렉션 구조
| 컬렉션 | 문서 ID | 주요 필드 | 비고 |
| --- | --- | --- | --- |
| `users` | Firebase UID | `email`, `displayName`, `photoURL`, `createdAt`, `role` | role: `user`, `admin` |
| `tracks` | auto ID | `ownerId`, `title`, `genres`, `moods`, `durationSec`, `createdAt`, `audioPath`, `source` (`musicgen`/`upload`), `status` (`ready`/`processing`), `thumbnailPath?` | 생성 음악 |
| `beats` | auto ID | `ownerId`, `title`, `bpm`, `bars`, `pattern` (16×N bool 배열 or flattened string), `createdAt`, `audioPath`, `sourcePresetMeta` | 패드 블렌더 결과 |
| `favorites` | `${ownerId}` doc with subcollection `items` or top-level collection keyed by user | `targetType` (`track`/`beat`), `targetId`, `createdAt` | 단순화 위해 `users/{uid}/favorites/{targetId}` 구조 권장 |
| `activityLogs` (선택) | auto ID | `ownerId`, `type`, `targetId`, `timestamp`, `payload` | 감사/디버깅용 |

### 4.2 Firebase Storage 경로
- `audio/tracks/{uid}/{trackId}.wav`
- `audio/beats/{uid}/{beatId}.wav`
- (`thumbnails/…` 등 후속 확장 가능)

### 4.3 클라이언트 상태 매핑
- `MusicContext` 내 `library.musicList` → Firestore `tracks` + `beats` 통합 결과.
- 즐겨찾기: 로그인 사용자의 favorites 문서를 `onSnapshot`으로 구독하여 UI 반영.

## 5. Firebase Authentication 설계
- **방식**: 1차 릴리스는 이메일/비밀번호. 추후 Google OAuth 추가 가능 (UI/UX 고려하여 확장 포인트 마련).
- **가입 플로우**
  1. `createUserWithEmailAndPassword`
  2. `updateProfile`로 displayName 설정
  3. Firestore `users/{uid}` 문서 생성 (`setDoc` with merge)
- **로그인 플로우**: `signInWithEmailAndPassword` → `onAuthStateChanged`로 전역 상태 동기화.
- **세션 유지**: Firebase SDK 기본 persistence (`local`). CSR 환경으로 충분.
- **보호 라우팅**: React Router `PrivateRoute` 패턴 또는 `RequireAuth` 컴포넌트 도입.

## 6. 보안 규칙 (초안)
- `users/{uid}`: 읽기/쓰기 본인만 허용. Admin role은 전체 조회 가능.
- `tracks/{id}` & `beats/{id}`:
  - 읽기: 인증된 사용자이면서 `resource.data.ownerId == request.auth.uid` 또는 `resource.data.visibility == 'public'` (추후 공개 기능 고려).
  - 쓰기: 신규 작성 시 `request.auth.uid`가 ownerId와 일치해야 함.
  - 업데이트: ownerId 불변, 특정 필드만 수정 허용.
- `users/{uid}/favorites/{itemId}`: 본인만 읽기/쓰기. 존재 여부 검증으로 즐겨찾기 표시.
- Storage 규칙: `/audio/{type}/{uid}/**` 경로는 uid 본인만 읽기/쓰기. 다운로드 공유 시 공개 URL 생성 기능 사용.

## 7. 프론트엔드 통합 포인트
- `src/lib/firebase.js`: Firebase 앱 초기화, `auth`, `db`, `storage` export.
- `src/context/MusicContext.js` 개편: auth 상태 저장, Firestore 리스너 구독, 라이브러리 캐시 구성.
- 서비스 레이어:
  - `services/libraryApi.js` (신규): Firestore CRUD 래핑 (목록 조회, 즐겨찾기 토글, 삭제 등).
  - 기존 `musicApi.js`는 생성 요청 후 Firebase 저장 로직을 연결.
- UI 업데이트: Navbar에 로그인/회원가입 버튼, 사용자 아바타, 로그아웃 메뉴 추가. Library 페이지에서 실제 데이터 기반 렌더링.

## 8. 단계별 실행 로드맵
1. **환경 구성**: Firebase 프로젝트 생성, `.env.example` 업데이트, 초기화 모듈 작성.
2. **Auth UI & 로직**: 가입/로그인 폼 + 컨텍스트 리스너 + 보호 라우트.
3. **데이터 쓰기 파이프라인**: 생성/변환 완료 시 Firestore & Storage 반영.
4. **라이브러리 읽기**: Firestore에서 사용자 소유 `tracks`/`beats` 구독, 리스트 렌더링. 검색/정렬은 클라이언트부터 시작.
5. **즐겨찾기 및 액션**: favorites 컬렉션, 삭제(soft delete), 다운로드(Storage URL) 처리.
6. **보안 규칙/테스트**: 로컬 에뮬레이터 또는 시뮬레이터로 규칙 검증, 에러 처리 UX 개선.
7. **추가 고도화** (선택): 공유 링크, 공개 라이브러리, 소셜 로그인, 오프라인 캐싱.

## 9. 리스크와 대응
- **오디오 파일 용량**: Storage 비용/업로드 시간 → 워크플로에 업로드 진행 표시, 용량 제한.
- **실시간 동기화 지연**: 대용량 쿼리 대비 페이지네이션 or 시간순 정렬 필드 준비.
- **보안 규칙 실수**: 배포 전 시뮬레이터 테스트, 최소권한 원칙 준수.
- **API 실패 처리**: Firebase 연동 실패 시 롤백 전략 (예: Storage 업로드 성공 / Firestore 실패 → 업로드 삭제).

## 10. 다음 액션
1. Firebase 프로젝트 생성 및 자격 정보 확보.
2. 리포지터리에 `.env.example`에 Firebase 키 필드 추가.
3. `src/lib/firebase.js` 초기화 코드와 기본 SDK 셋업.
4. Auth 전역 상태를 설계하기 위해 `MusicContext` 구조 분석 (다음 단계 작업).

## 부록 A. MusicContext 개편 방향
- **현재 구조 요약**: 단일 `useReducer`로 생성/변환/라이브러리/UI 상태를 관리하며 사용자 개념이 없다. 라이브러리는 로컬 배열이며 즐겨찾기, 삭제 등은 단순 알림만 표시한다.
- **필요 변경 사항**
  - `auth` 슬라이스 추가: `user`, `authStatus`(`idle`/`loading`/`authenticated`/`error`), `error` 필드 등.
  - Firebase `onAuthStateChanged`를 구독하는 `useEffect`를 Provider에 도입하고, 결과를 `dispatch`하여 상태를 갱신.
  - 라이브러리 액션을 Firestore 연동과 연결하기 위해 `actions`에 async 함수를 허용하거나 별도 서비스 훅을 정의.
  - 생성/변환 완료 액션에서 Firestore 저장으로의 파이프를 연결하기 쉬운 구조(예: action 대신 thunk)로 점진적 리팩토링 고려.
- **단기 접근**
  1. `auth` 상태를 추가하고 Firebase Auth 변화 감지 후 `state.auth.user` 업데이트.
  2. 로그인 필요 페이지 보호를 위해 Context에서 제공할 `requireAuth` 헬퍼 또는 React Router 가드 구현.
  3. 라이브러리 데이터는 Auth 준비 이후 `useEffect`에서 사용자 ID 기반 Firestore 구독으로 채운다.
