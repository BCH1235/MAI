import React, { createContext, useContext, useReducer, useMemo } from "react";
import { clonePattern, PRESETS } from "../components/beat/presets";

const BeatPadContext = createContext(null);

const initialState = {
  // --- 재생 및 시퀀서 관련 ---
  isPlaying: false,
  bpm: 120,
  currentStep: 0,
  bars: 2,
  pattern: clonePattern(PRESETS["Rock 1"]),

  // --- 블렌딩 패드(그리드) 관련 ---
  grid: { cols: 11, rows: 11 },
  puckPosition: { x: 0.5, y: 0.5 },
  selectedCellIndex: 60,

  // --- AI 모델 및 데이터 관련 ---
  cornerPresets: {
    A: "Rock 1",
    B: "Pop Punk",
    C: "Reggaeton",
    D: "Samba Full Time",
  },
  cornerPatterns: {
    A: PRESETS["Rock 1"],
    B: PRESETS["Pop Punk"],
    C: PRESETS["Reggaeton"],
    D: PRESETS["Samba Full Time"],
  },
  cornerEncodings: null,
  gridCellPatterns: [],
  isInterpolating: false,

  // --- UI 모드 관련 ---
  mode: "INTERPOLATE", // 'INTERPOLATE' | 'EDIT'
  selectedCorner: null, // 'A' | 'B' | 'C' | 'D' | null
  drawMode: "DRAG", // 'DRAG' | 'PATH'
  path: [],

  // --- 캐시 관리 ---
  cellCacheVersion: 0,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_IS_PLAYING":
      return { ...state, isPlaying: action.payload };

    case "SET_BPM":
      return { ...state, bpm: action.payload };

    case "SET_CURRENT_STEP":
      return { ...state, currentStep: action.payload };

    case "SET_PATTERN":
      return { ...state, pattern: action.payload };

    case "SET_PUCK_POSITION":
      return {
        ...state,
        puckPosition: action.payload.position,
        selectedCellIndex: action.payload.index,
      };

    case "SET_DRAW_MODE":
      return {
        ...state,
        drawMode: action.payload,
        path: action.payload === "PATH" ? [] : state.path,
      };

    case "RESET_PATH":
      return { ...state, path: [] };

    case "APPEND_PATH_POINT":
      return { ...state, path: [...state.path, action.payload] };

    case "SET_CORNER_PRESET": {
      const { corner, presetName } = action.payload;
      const presetPattern = PRESETS[presetName] || PRESETS["Rock 1"];
      return {
        ...state,
        cornerPresets: { ...state.cornerPresets, [corner]: presetName },
        cornerPatterns: {
          ...state.cornerPatterns,
          [corner]: clonePattern(presetPattern),
        },
        cornerEncodings: null,
        cellCacheVersion: state.cellCacheVersion + 1,
      };
    }

    case "SET_CORNER_ENCODINGS":
      return { ...state, cornerEncodings: action.payload };

    case "SET_MODE":
      return { ...state, mode: action.payload };

    case "SELECT_CORNER":
      return { ...state, selectedCorner: action.payload };

    case "UPDATE_EDITING_PATTERN": {
      if (!state.selectedCorner) return state;
      const { track, step } = action.payload;
      const newCornerPatterns = { ...state.cornerPatterns };
      const newPattern = clonePattern(newCornerPatterns[state.selectedCorner]);
      newPattern[track][step] = !newPattern[track][step];
      newCornerPatterns[state.selectedCorner] = newPattern;
      return { ...state, cornerPatterns: newCornerPatterns };
    }

    case "START_INTERPOLATION":
      return { ...state, isInterpolating: true };

    case "FINISH_INTERPOLATION":
      return {
        ...state,
        isInterpolating: false,
        cornerEncodings: action.payload.encodings,
        gridCellPatterns: action.payload.patterns,
        mode: "INTERPOLATE",
        selectedCorner: null,
      };

    // (이후 단계에서 더 많은 액션을 추가할 예정입니다)

    default:
      return state;
  }
}

export function BeatPadProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <BeatPadContext.Provider value={value}>{children}</BeatPadContext.Provider>;
}

export const useBeatPad = () => useContext(BeatPadContext);
