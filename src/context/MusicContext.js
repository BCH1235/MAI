import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { subscribeToUserLibrary } from '../services/libraryApi';

import { auth as firebaseAuth } from '../lib/firebase';

// 초기 상태 정의
const initialState = {
  // 음악 생성 관련 상태
  generation: {
    selectedGenres: [],
    selectedMoods: [],
    description: '',
    duration: 30, // 초 단위 (기본 2분)
    isGenerating: false,
    generationProgress: 0,
  },
  
  // 음악 변환 관련 상태
  conversion: {
    uploadedFile: null,
    targetGenre: '',
    conversionIntensity: 3, // 1-5 스케일
    isConverting: false,
    conversionProgress: 0,
  },
  
  // 결과 관련 상태
  result: {
    generatedMusic: null,
    convertedMusic: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  },
  
  // 인증 상태
  auth: {
    user: null,
    status: 'idle', // idle | loading | authenticated | unauthenticated | error
    error: null,
  },
  
  // 라이브러리 관련 상태
  library: {
    musicList: [],
    selectedMusic: null,
    sortBy: 'date', // 'date', 'genre', 'favorites'
    filterBy: 'all', // 'all', 'generated', 'converted'
    loading: false,
    error: null,
  },
  
  // UI 상태
  ui: {
    currentPage: 'generate',
    notifications: [],
    loading: false,
    error: null,
  }
};

// 액션 타입 정의
const actionTypes = {
  // 음악 생성 액션
  SET_SELECTED_GENRES: 'SET_SELECTED_GENRES',
  SET_SELECTED_MOODS: 'SET_SELECTED_MOODS',
  SET_DESCRIPTION: 'SET_DESCRIPTION',
  SET_DURATION: 'SET_DURATION',
  START_GENERATION: 'START_GENERATION',
  UPDATE_GENERATION_PROGRESS: 'UPDATE_GENERATION_PROGRESS',
  COMPLETE_GENERATION: 'COMPLETE_GENERATION',
  
  // 음악 변환 액션
  SET_UPLOADED_FILE: 'SET_UPLOADED_FILE',
  SET_TARGET_GENRE: 'SET_TARGET_GENRE',
  SET_CONVERSION_INTENSITY: 'SET_CONVERSION_INTENSITY',
  START_CONVERSION: 'START_CONVERSION',
  UPDATE_CONVERSION_PROGRESS: 'UPDATE_CONVERSION_PROGRESS',
  COMPLETE_CONVERSION: 'COMPLETE_CONVERSION',
  
  // 재생 관련 액션
  SET_PLAYING: 'SET_PLAYING',
  UPDATE_CURRENT_TIME: 'UPDATE_CURRENT_TIME',
  SET_RESULT_MUSIC: 'SET_RESULT_MUSIC',
  
  // 라이브러리 액션
  ADD_TO_LIBRARY: 'ADD_TO_LIBRARY',
  REMOVE_FROM_LIBRARY: 'REMOVE_FROM_LIBRARY',
  SET_LIBRARY_ITEMS: 'SET_LIBRARY_ITEMS',
  SET_LIBRARY_LOADING: 'SET_LIBRARY_LOADING',
  SET_LIBRARY_ERROR: 'SET_LIBRARY_ERROR',
  CLEAR_LIBRARY: 'CLEAR_LIBRARY',
  UPDATE_LIBRARY_SORT: 'UPDATE_LIBRARY_SORT',
  UPDATE_LIBRARY_FILTER: 'UPDATE_LIBRARY_FILTER',
  
  // UI 액션
  SET_CURRENT_PAGE: 'SET_CURRENT_PAGE',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',

  // 인증 액션
  AUTH_SET_STATUS: 'AUTH_SET_STATUS',
  AUTH_STATE_CHANGE: 'AUTH_STATE_CHANGE',
  AUTH_SET_ERROR: 'AUTH_SET_ERROR',
};

// 리듀서 함수
function musicReducer(state, action) {
  switch (action.type) {
    // 음악 생성 관련
    case actionTypes.SET_SELECTED_GENRES:
      return {
        ...state,
        generation: {
          ...state.generation,
          selectedGenres: action.payload
        }
      };
    
    case actionTypes.SET_SELECTED_MOODS:
      return {
        ...state,
        generation: {
          ...state.generation,
          selectedMoods: action.payload
        }
      };
    
    case actionTypes.SET_DESCRIPTION:
      return {
        ...state,
        generation: {
          ...state.generation,
          description: action.payload
        }
      };
    
    case actionTypes.SET_DURATION:
      return {
        ...state,
        generation: {
          ...state.generation,
          duration: action.payload
        }
      };
    
    case actionTypes.START_GENERATION:
      return {
        ...state,
        generation: {
          ...state.generation,
          isGenerating: true,
          generationProgress: 0
        },
        ui: {
          ...state.ui,
          loading: true,
          error: null
        }
      };
    
    case actionTypes.UPDATE_GENERATION_PROGRESS:
      return {
        ...state,
        generation: {
          ...state.generation,
          generationProgress: action.payload
        }
      };
    
    case actionTypes.COMPLETE_GENERATION:
      return {
        ...state,
        generation: {
          ...state.generation,
          isGenerating: false,
          generationProgress: 100
        },
        result: {
          ...state.result,
          generatedMusic: action.payload
        },
        ui: {
          ...state.ui,
          loading: false,
          currentPage: 'result'
        }
      };
    
    // 음악 변환 관련
    case actionTypes.SET_UPLOADED_FILE:
      return {
        ...state,
        conversion: {
          ...state.conversion,
          uploadedFile: action.payload
        }
      };
    
    case actionTypes.SET_TARGET_GENRE:
      return {
        ...state,
        conversion: {
          ...state.conversion,
          targetGenre: action.payload
        }
      };
    
    case actionTypes.SET_CONVERSION_INTENSITY:
      return {
        ...state,
        conversion: {
          ...state.conversion,
          conversionIntensity: action.payload
        }
      };
    
    case actionTypes.START_CONVERSION:
      return {
        ...state,
        conversion: {
          ...state.conversion,
          isConverting: true,
          conversionProgress: 0
        },
        ui: {
          ...state.ui,
          loading: true,
          error: null
        }
      };
    
    case actionTypes.COMPLETE_CONVERSION:
      return {
        ...state,
        conversion: {
          ...state.conversion,
          isConverting: false,
          conversionProgress: 100
        },
        result: {
          ...state.result,
          convertedMusic: action.payload
        },
        ui: {
          ...state.ui,
          loading: false,
          currentPage: 'result'
        }
      };
    
    // 재생 관련
    case actionTypes.SET_PLAYING:
      return {
        ...state,
        result: {
          ...state.result,
          isPlaying: action.payload
        }
      };
    
    case actionTypes.UPDATE_CURRENT_TIME:
      return {
        ...state,
        result: {
          ...state.result,
          currentTime: action.payload
        }
      };
    
    // 라이브러리 관련
    case actionTypes.ADD_TO_LIBRARY:
      return {
        ...state,
        library: {
          ...state.library,
          musicList: [...state.library.musicList, action.payload]
        }
      };

    case actionTypes.SET_LIBRARY_ITEMS:
      return {
        ...state,
        library: {
          ...state.library,
          musicList: action.payload,
          loading: false,
          error: null,
        },
      };

    case actionTypes.SET_LIBRARY_LOADING:
      return {
        ...state,
        library: {
          ...state.library,
          loading: action.payload,
        },
      };

    case actionTypes.SET_LIBRARY_ERROR:
      return {
        ...state,
        library: {
          ...state.library,
          error: action.payload,
          loading: false,
        },
      };

    case actionTypes.CLEAR_LIBRARY:
      return {
        ...state,
        library: {
          ...state.library,
          musicList: [],
          loading: false,
          error: null,
        },
      };

    // UI 관련
    case actionTypes.SET_CURRENT_PAGE:
      return {
        ...state,
        ui: {
          ...state.ui,
          currentPage: action.payload
        }
      };
    
    case actionTypes.ADD_NOTIFICATION:
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: [...state.ui.notifications, action.payload]
        }
      };
    
    case actionTypes.REMOVE_NOTIFICATION:
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: state.ui.notifications.filter(
            notification => notification.id !== action.payload
          )
        }
      };
    
    case actionTypes.SET_ERROR:
      return {
        ...state,
        ui: {
          ...state.ui,
          error: action.payload,
          loading: false
        }
      };
    
    case actionTypes.CLEAR_ERROR:
      return {
        ...state,
        ui: {
          ...state.ui,
          error: null
        }
      };

    // 인증 관련
    case actionTypes.AUTH_SET_STATUS:
      return {
        ...state,
        auth: {
          ...state.auth,
          status: action.payload,
        },
      };

    case actionTypes.AUTH_STATE_CHANGE:
      return {
        ...state,
        auth: {
          ...state.auth,
          user: action.payload,
          status: action.payload ? 'authenticated' : 'unauthenticated',
          error: null,
        },
      };

    case actionTypes.AUTH_SET_ERROR:
      return {
        ...state,
        auth: {
          ...state.auth,
          error: action.payload,
        },
      };

    default:
      return state;
  }
}

// Context 생성
const MusicContext = createContext();

// Context Provider 컴포넌트
export function MusicContextProvider({ children }) {
  const [state, dispatch] = useReducer(musicReducer, initialState);
  const pushNotification = useCallback((notification) => {
    const notificationWithId = {
      ...notification,
      id: Date.now() + Math.random(),
    };
    dispatch({ type: actionTypes.ADD_NOTIFICATION, payload: notificationWithId });
  }, [dispatch]);
  
  // 액션 크리에이터들을 useCallback으로 메모이제이션
  const actions = {
    // 음악 생성 관련 액션들
    setSelectedGenres: useCallback((genres) => {
      dispatch({ type: actionTypes.SET_SELECTED_GENRES, payload: genres });
    }, []),
    
    setSelectedMoods: useCallback((moods) => {
      dispatch({ type: actionTypes.SET_SELECTED_MOODS, payload: moods });
    }, []),
    
    setDescription: useCallback((description) => {
      dispatch({ type: actionTypes.SET_DESCRIPTION, payload: description });
    }, []),
    
    setDuration: useCallback((duration) => {
      dispatch({ type: actionTypes.SET_DURATION, payload: duration });
    }, []),
    
    startGeneration: useCallback(() => {
      dispatch({ type: actionTypes.START_GENERATION });
    }, []),
    
    updateGenerationProgress: useCallback((progress) => {
      dispatch({ type: actionTypes.UPDATE_GENERATION_PROGRESS, payload: progress });
    }, []),
    
    completeGeneration: useCallback((musicData) => {
      dispatch({ type: actionTypes.COMPLETE_GENERATION, payload: musicData });
    }, []),
    
    // 음악 변환 관련 액션들
    setUploadedFile: useCallback((file) => {
      dispatch({ type: actionTypes.SET_UPLOADED_FILE, payload: file });
    }, []),
    
    setTargetGenre: useCallback((genre) => {
      dispatch({ type: actionTypes.SET_TARGET_GENRE, payload: genre });
    }, []),
    
    setConversionIntensity: useCallback((intensity) => {
      dispatch({ type: actionTypes.SET_CONVERSION_INTENSITY, payload: intensity });
    }, []),
    
    startConversion: useCallback(() => {
      dispatch({ type: actionTypes.START_CONVERSION });
    }, []),
    
    completeConversion: useCallback((musicData) => {
      dispatch({ type: actionTypes.COMPLETE_CONVERSION, payload: musicData });
    }, []),
    
    // 재생 관련 액션들
    setPlaying: useCallback((isPlaying) => {
      dispatch({ type: actionTypes.SET_PLAYING, payload: isPlaying });
    }, []),
    
    updateCurrentTime: useCallback((time) => {
      dispatch({ type: actionTypes.UPDATE_CURRENT_TIME, payload: time });
    }, []),
    
    // 라이브러리 관련 액션들
    addToLibrary: useCallback((musicData) => {
      dispatch({ type: actionTypes.ADD_TO_LIBRARY, payload: musicData });
    }, []),

    setLibraryItems: useCallback((items) => {
      dispatch({ type: actionTypes.SET_LIBRARY_ITEMS, payload: items });
    }, [dispatch]),

    setLibraryLoading: useCallback((flag) => {
      dispatch({ type: actionTypes.SET_LIBRARY_LOADING, payload: flag });
    }, [dispatch]),

    setLibraryError: useCallback((error) => {
      dispatch({ type: actionTypes.SET_LIBRARY_ERROR, payload: error });
    }, [dispatch]),

    // 인증 관련 액션들
    setAuthStatus: useCallback((status) => {
      dispatch({ type: actionTypes.AUTH_SET_STATUS, payload: status });
    }, []),

    setAuthError: useCallback((error) => {
      dispatch({ type: actionTypes.AUTH_SET_ERROR, payload: error });
    }, []),

    signUpWithEmail: useCallback(async ({ email, password, displayName }) => {
      dispatch({ type: actionTypes.AUTH_SET_STATUS, payload: 'loading' });
      try {
        const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        if (displayName) {
          await updateProfile(cred.user, { displayName });
        }
        pushNotification({ type: 'success', message: '회원가입이 완료되었어요!' });
        return cred.user;
      } catch (error) {
        const message = error?.message || '회원가입에 실패했어요.';
        dispatch({ type: actionTypes.AUTH_SET_ERROR, payload: message });
        dispatch({ type: actionTypes.AUTH_SET_STATUS, payload: 'unauthenticated' });
        pushNotification({ type: 'error', message });
        throw error;
      }
    }, [pushNotification]),

    signInWithEmail: useCallback(async ({ email, password }) => {
      dispatch({ type: actionTypes.AUTH_SET_STATUS, payload: 'loading' });
      try {
        const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
        pushNotification({ type: 'success', message: '환영합니다! 로그인에 성공했어요.' });
        return cred.user;
      } catch (error) {
        const message = error?.message || '로그인에 실패했어요.';
        dispatch({ type: actionTypes.AUTH_SET_ERROR, payload: message });
        dispatch({ type: actionTypes.AUTH_SET_STATUS, payload: 'unauthenticated' });
        pushNotification({ type: 'error', message });
        throw error;
      }
    }, [pushNotification]),

    signOut: useCallback(async () => {
      dispatch({ type: actionTypes.AUTH_SET_STATUS, payload: 'loading' });
      try {
        await firebaseSignOut(firebaseAuth);
        pushNotification({ type: 'info', message: '로그아웃되었어요.' });
      } catch (error) {
        const message = error?.message || '로그아웃 중 문제가 발생했어요.';
        dispatch({ type: actionTypes.AUTH_SET_ERROR, payload: message });
        dispatch({ type: actionTypes.AUTH_SET_STATUS, payload: 'error' });
        pushNotification({ type: 'error', message });
        throw error;
      }
    }, [pushNotification]),

    // UI 관련 액션들
    setCurrentPage: useCallback((page) => {
      dispatch({ type: actionTypes.SET_CURRENT_PAGE, payload: page });
    }, []),
    
    addNotification: useCallback((notification) => {
      pushNotification(notification);
    }, [pushNotification]),
    
    removeNotification: useCallback((id) => {
      dispatch({ type: actionTypes.REMOVE_NOTIFICATION, payload: id });
    }, []),
    
    setError: useCallback((error) => {
      dispatch({ type: actionTypes.SET_ERROR, payload: error });
    }, []),
    
    clearError: useCallback(() => {
      dispatch({ type: actionTypes.CLEAR_ERROR });
    }, []),
  };
  
  const value = {
    state,
    actions,
    dispatch
  };

  useEffect(() => {
    // 초기 로딩 상태를 표시하고 Firebase Auth 상태 변화를 구독
    dispatch({ type: actionTypes.AUTH_SET_STATUS, payload: 'loading' });
    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      (firebaseUser) => {
        if (firebaseUser) {
          const { uid, displayName, email, photoURL } = firebaseUser;
          dispatch({
            type: actionTypes.AUTH_STATE_CHANGE,
            payload: { uid, displayName, email, photoURL },
          });
        } else {
          dispatch({ type: actionTypes.AUTH_STATE_CHANGE, payload: null });
        }
      },
      (error) => {
        dispatch({
          type: actionTypes.AUTH_SET_ERROR,
          payload: error?.message || 'Authentication error',
        });
        dispatch({ type: actionTypes.AUTH_SET_STATUS, payload: 'error' });
      }
    );

    return () => unsubscribe();
  }, [dispatch]);

  useEffect(() => {
    let unsubscribeLibrary = null;
    const userId = state.auth.user?.uid;

    if (userId) {
      dispatch({ type: actionTypes.SET_LIBRARY_LOADING, payload: true });
      unsubscribeLibrary = subscribeToUserLibrary(userId, {
        onUpdate: (items) => {
          dispatch({ type: actionTypes.SET_LIBRARY_ITEMS, payload: items });
        },
        onError: (error) => {
          dispatch({
            type: actionTypes.SET_LIBRARY_ERROR,
            payload: error?.message || '라이브러리를 불러오지 못했어요.',
          });
          pushNotification({ type: 'error', message: '라이브러리 데이터를 불러오지 못했어요.' });
        },
      });
    } else {
      dispatch({ type: actionTypes.CLEAR_LIBRARY });
    }

    return () => {
      unsubscribeLibrary?.();
    };
  }, [state.auth.user?.uid, pushNotification, dispatch]);

  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
}

// 커스텀 훅
export function useMusicContext() {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusicContext must be used within a MusicContextProvider');
  }
  return context;
}

export { actionTypes }; 
