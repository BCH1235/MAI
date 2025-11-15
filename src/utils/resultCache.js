import { SCORE_RESULT_STORAGE_KEY, SCORE_RESULT_STORAGE_TTL } from '../constants/storage';

const isBrowser = typeof window !== 'undefined';

export const loadScoreResultFromCache = () => {
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem(SCORE_RESULT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const payload = parsed?.data ? parsed : { data: parsed };

    if (payload.expiresAt && payload.expiresAt < Date.now()) {
      localStorage.removeItem(SCORE_RESULT_STORAGE_KEY);
      return null;
    }

    return payload.data;
  } catch (error) {
    console.error('로컬 음악 결과 로드 실패:', error);
    return null;
  }
};

export const clearScoreResultCache = () => {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(SCORE_RESULT_STORAGE_KEY);
  } catch (error) {
    console.error('로컬 음악 결과 삭제 실패:', error);
  }
};

export const persistScoreResultToCache = (resultData) => {
  if (!isBrowser) return;

  const hasResult =
    !!(resultData?.generatedMusic) ||
    !!(resultData?.convertedMusic);

  if (!hasResult) {
    clearScoreResultCache();
    return;
  }

  try {
    const now = Date.now();
    const payload = {
      data: {
        ...(resultData.generatedMusic ? { generatedMusic: resultData.generatedMusic } : {}),
        ...(resultData.convertedMusic ? { convertedMusic: resultData.convertedMusic } : {}),
      },
      savedAt: now,
      expiresAt: now + SCORE_RESULT_STORAGE_TTL,
    };
    localStorage.setItem(SCORE_RESULT_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('로컬 음악 결과 저장 실패:', error);
  }
};
