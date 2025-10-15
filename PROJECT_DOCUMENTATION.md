# AI 기반 배경음악 생성 및 변환 시스템 - 프론트엔드 문서

## 📋 프로젝트 개요

본 프로젝트는 AI를 활용하여 사용자가 원하는 분위기와 장르의 배경음악을 생성하고, 기존 음악을 새로운 스타일로 변환하는 웹 애플리케이션의 프론트엔드 부분입니다.

## 🏗️ 프로젝트 구조

### 전체 디렉토리 구조
```
ai-music-frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/           # 재사용 가능한 컴포넌트
│   │   ├── common/          # 공통 UI 컴포넌트
│   │   │   ├── GenreSelector.js
│   │   │   └── MoodSelector.js
│   │   ├── layout/          # 레이아웃 컴포넌트
│   │   │   └── Navbar.js
│   │   └── music/           # 음악 관련 컴포넌트 (추후 확장)
│   ├── pages/               # 페이지 컴포넌트
│   │   ├── MusicGeneration.js
│   │   ├── MusicConversion.js
│   │   ├── ResultPage.js
│   │   └── Library.js
│   ├── context/             # 전역 상태 관리
│   │   └── MusicContext.js
│   ├── services/            # API 통신 서비스
│   │   └── musicApi.js
│   ├── utils/               # 유틸리티 함수
│   ├── hooks/               # 커스텀 훅 (추후 확장)
│   ├── App.js              # 메인 앱 컴포넌트
│   └── index.js            # 엔트리 포인트
├── UI_UX_DESIGN.md         # UI/UX 설계 문서
├── PROJECT_DOCUMENTATION.md # 이 문서
└── package.json
```

## 🎯 주요 기능

### 1. 음악 생성 (MusicGeneration.js)
- **장르 선택**: 최대 3개의 장르 선택 가능
- **분위기 키워드**: 최대 5개의 분위기 태그 선택
- **상세 설명**: 자유 텍스트로 원하는 음악 설명
- **음악 길이**: 30초~10분 사이 설정 가능
- **실시간 진행률**: AI 생성 과정 시각화

### 2. 음악 변환 (MusicConversion.js)
- **파일 업로드**: 드래그 앤 드롭 또는 클릭으로 파일 선택
- **미리 듣기**: 업로드된 원본 파일 재생 기능
- **변환 스타일**: 단일 장르 선택
- **변환 강도**: 1-5 스케일로 변환 정도 조절

### 3. 결과 페이지 (ResultPage.js)
- **음악 플레이어**: 생성/변환된 음악 재생
- **정보 표시**: 장르, 분위기, 생성 시간 등
- **액션 버튼**: 다운로드, 즐겨찾기, 라이브러리 추가
- **추가 행동**: 재생성, 공유 등

### 4. 라이브러리 (Library.js)
- **음악 목록**: 생성/변환된 모든 음악 관리
- **검색 및 필터**: 제목, 타입, 장르별 필터링
- **정렬**: 날짜, 제목, 길이, 즐겨찾기순 정렬
- **카드 UI**: 시각적으로 구조화된 음악 정보

## 🔧 기술 스택

### 프론트엔드 라이브러리
- **React 18**: 메인 UI 라이브러리
- **React Router DOM**: 클라이언트 사이드 라우팅
- **Material-UI (MUI)**: 디자인 시스템 및 컴포넌트
- **React Dropzone**: 파일 드래그 앤 드롭 기능

### 상태 관리
- **React Context + useReducer**: 전역 상태 관리
- **localStorage**: 클라이언트 사이드 데이터 저장 (추후 구현 예정)

### 스타일링
- **Material-UI Theme**: 일관된 디자인 시스템
- **CSS-in-JS**: Emotion 기반 스타일링
- **반응형 디자인**: 모바일/태블릿/데스크톱 대응

## 🎨 디자인 시스템

### 컬러 팔레트
- **Primary**: #6366F1 (인디고) - 메인 액션 버튼, 링크
- **Secondary**: #8B5CF6 (보라) - 보조 액션, 강조
- **Success**: #10B981 (초록) - 성공 메시지
- **Background**: #F8FAFC (연한 회색) - 페이지 배경

### 컴포넌트 원칙
- **재사용성**: 공통 UI 요소는 별도 컴포넌트화
- **접근성**: WCAG 2.1 가이드라인 준수
- **반응형**: 모든 화면 크기에서 최적화된 경험

## 📊 상태 관리 구조

### MusicContext 상태 구조
```javascript
{
  generation: {
    selectedGenres: [],      // 선택된 장르
    selectedMoods: [],       // 선택된 분위기
    description: '',         // 상세 설명
    duration: 120,          // 음악 길이 (초)
    isGenerating: false,    // 생성 중 여부
    generationProgress: 0   // 생성 진행률
  },
  conversion: {
    uploadedFile: null,     // 업로드된 파일
    targetGenre: '',        // 변환할 장르
    conversionIntensity: 3, // 변환 강도
    isConverting: false,    // 변환 중 여부
    conversionProgress: 0   // 변환 진행률
  },
  result: {
    generatedMusic: null,   // 생성된 음악 데이터
    convertedMusic: null,   // 변환된 음악 데이터
    isPlaying: false,       // 재생 상태
    currentTime: 0,         // 현재 재생 시간
    duration: 0             // 전체 길이
  },
  library: {
    musicList: [],          // 라이브러리 음악 목록
    sortBy: 'date',         // 정렬 기준
    filterBy: 'all'         // 필터 기준
  },
  ui: {
    currentPage: 'generate', // 현재 페이지
    notifications: [],       // 알림 목록
    loading: false,          // 로딩 상태
    error: null             // 에러 상태
  }
}
```

## 🔌 API 연동 구조

### 서비스 레이어 (musicApi.js)
- **생성 API**: 음악 생성 요청 및 진행률 모니터링
- **변환 API**: 파일 업로드 및 변환 진행률 추적
- **라이브러리 API**: 음악 목록 조회, 추가, 삭제
- **다운로드 API**: 음악 파일 다운로드

### API 연동 패턴
```javascript
// 예시: 음악 생성 API 호출
const handleGenerateMusic = async () => {
  try {
    actions.startGeneration();
    
    const result = await generateMusic(
      generationParams,
      (progress) => actions.updateGenerationProgress(progress)
    );
    
    actions.completeGeneration(result);
    navigate('/result');
    
  } catch (error) {
    actions.setError(error.message);
  }
};
```

## 🧩 주요 컴포넌트 설명

### 1. GenreSelector 컴포넌트
- **목적**: 장르 선택 UI 제공
- **기능**: 다중/단일 선택, 최대 선택 개수 제한
- **재사용성**: 생성 및 변환 페이지에서 공통 사용
- **Props**:
  - `selectedGenres`: 선택된 장르 배열
  - `onGenreChange`: 선택 변경 핸들러
  - `multiSelect`: 다중 선택 허용 여부
  - `maxSelection`: 최대 선택 개수

### 2. MoodSelector 컴포넌트
- **목적**: 분위기 키워드 선택 UI 제공
- **기능**: 이모지와 함께 표시, 진행률 시각화
- **특징**: 해시태그 스타일 디자인
- **Props**:
  - `selectedMoods`: 선택된 분위기 배열
  - `onMoodChange`: 선택 변경 핸들러
  - `maxSelection`: 최대 선택 개수

### 3. Navbar 컴포넌트
- **목적**: 전역 네비게이션 제공
- **기능**: 페이지 간 이동, 현재 페이지 표시
- **반응형**: 모바일에서는 아이콘만 표시
- **라우팅**: React Router와 연동

## 🔧 개발 시 고려사항

### 유지보수성
- **명확한 컴포넌트 구조**: 각 컴포넌트는 단일 책임 원칙 준수
- **타입 안정성**: PropTypes 또는 TypeScript 도입 고려 (추후)
- **코드 문서화**: JSDoc 스타일 주석 적극 활용
- **일관된 네이밍**: 직관적이고 설명적인 변수/함수명 사용

### 낮은 결합도 (Low Coupling)
- **Context 기반 상태 관리**: props drilling 방지
- **서비스 레이어 분리**: API 로직을 컴포넌트에서 분리
- **이벤트 기반 통신**: 컴포넌트 간 직접 참조 최소화
- **인터페이스 정의**: 명확한 props 인터페이스 정의

### 높은 응집도 (High Cohesion)
- **기능별 디렉토리 구조**: 관련 기능을 한 곳에 모음
- **도메인 중심 설계**: 음악 생성/변환/라이브러리 도메인 분리
- **컴포넌트 책임 분리**: UI, 비즈니스 로직, 데이터 관리 분리

### 확장성
- **모듈화된 구조**: 새로운 기능 추가 시 기존 코드 영향 최소화
- **설정 기반 개발**: 하드코딩된 값들을 설정으로 분리
- **플러그인 아키텍처**: 새로운 장르/분위기 쉽게 추가 가능
- **테마 시스템**: 다양한 디자인 테마 지원 가능

### 재사용성
- **공통 컴포넌트**: 버튼, 입력 필드, 카드 등 재사용 가능
- **훅 패턴**: 비즈니스 로직을 커스텀 훅으로 분리
- **유틸리티 함수**: 시간 포맷팅, 데이터 변환 등 공통 함수
- **스타일 토큰**: 일관된 디자인을 위한 토큰 시스템

## 🚀 추후 확장 계획

### 단기 개발 계획
1. **알림 시스템**: Toast 메시지 컴포넌트 구현
2. **로딩 상태**: 더 세밀한 로딩 상태 관리
3. **에러 처리**: 전역 에러 바운더리 구현
4. **접근성 개선**: 키보드 네비게이션, 스크린 리더 지원

### 중기 개발 계획
1. **고급 설정**: 템포, 악기, 음악 구조 설정
2. **미리보기 기능**: 생성 전 샘플 청취
3. **협업 기능**: 음악 공유 및 댓글
4. **분석 기능**: 사용자 선호도 분석

### 장기 개발 계획
1. **AI 모델 선택**: 다양한 AI 모델 중 선택 가능
2. **실시간 협업**: 여러 사용자가 함께 음악 제작
3. **모바일 앱**: React Native로 모바일 버전 개발
4. **플러그인 시스템**: 서드파티 기능 추가 지원

## 🧪 테스트 전략

### 단위 테스트
- **컴포넌트 테스트**: React Testing Library 사용
- **유틸리티 함수**: Jest 기반 단위 테스트
- **상태 관리**: Context 및 Reducer 테스트

### 통합 테스트
- **페이지 플로우**: 사용자 시나리오 기반 테스트
- **API 연동**: Mock Service Worker로 API 모킹
- **라우팅**: React Router 테스트

### E2E 테스트
- **전체 플로우**: Cypress 또는 Playwright 사용
- **크로스 브라우저**: 주요 브라우저 호환성 테스트
- **성능 테스트**: Core Web Vitals 측정

## 📦 배포 전략

### 개발 환경
- **개발 서버**: `npm start`로 로컬 개발
- **Hot Reload**: 실시간 코드 변경 반영
- **개발 도구**: React DevTools, Redux DevTools

### 스테이징 환경
- **빌드 테스트**: `npm run build`로 프로덕션 빌드 테스트
- **성능 최적화**: Bundle Analyzer로 번들 크기 최적화
- **브라우저 테스트**: 다양한 브라우저/기기에서 테스트

### 프로덕션 환경
- **정적 호스팅**: Vercel, Netlify 등 활용
- **CDN**: 전 세계 빠른 로딩 속도 보장
- **모니터링**: 에러 추적 및 성능 모니터링

## 🔒 보안 고려사항

### 클라이언트 보안
- **XSS 방지**: React의 기본 XSS 보호 활용
- **데이터 검증**: 사용자 입력 데이터 검증
- **민감 정보**: API 키 등 환경 변수로 관리

### API 보안
- **HTTPS**: 모든 API 통신 암호화
- **토큰 관리**: JWT 등 인증 토큰 안전 저장
- **CORS**: 적절한 CORS 정책 설정

## 📈 성능 최적화

### 렌더링 최적화
- **React.memo**: 불필요한 리렌더링 방지
- **useCallback/useMemo**: 함수 및 값 메모이제이션
- **코드 분할**: React.lazy로 컴포넌트 지연 로딩

### 네트워크 최적화
- **이미지 최적화**: WebP 포맷, 레이지 로딩
- **번들 최적화**: Tree Shaking, 코드 압축
- **캐싱**: 적절한 HTTP 캐싱 헤더 설정

## 🤝 기여 가이드라인

### 코딩 컨벤션
- **ESLint**: 코드 품질 검사
- **Prettier**: 코드 포맷팅 일관성
- **Git Convention**: Conventional Commits 사용

### Pull Request 과정
1. 기능 브랜치 생성
2. 코드 작성 및 테스트
3. PR 생성 및 코드 리뷰
4. 머지 전 CI/CD 통과 확인

---

이 문서는 프로젝트의 지속적인 발전과 함께 업데이트됩니다. 