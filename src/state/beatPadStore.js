import React, { createContext, useContext, useReducer, useMemo } from "react";

const BeatPadContext = createContext(null);

const initial = {
  grid: { cols: 11, rows: 11 },
  mode: "CELL",
  selectedCell: null,
  path: [],
  pathLerp: 0,
  interpolating: false,
  lerpT: 0,
  fromPattern: null,
  toPattern: null,
  cornerEncodings: null,
  cellCacheVersion: 0,
};

function reducer(state, action) {
  switch (action.type) {
    case "RESET_PATH":
      return { ...state, path: [] };
    case "APPEND_PATH_POINT":
      return { ...state, path: [...(state.path || []), action.point] };
    case "SET_GRID":
      return { ...state, grid: action.grid };
    case "SET_MODE":
      return { ...state, mode: action.mode };
    case "SELECT_CELL":
      return { ...state, selectedCell: action.cell };
    case "SET_CORNERS":
      return {
        ...state,
        cornerEncodings: action.encodings,
        cellCacheVersion: state.cellCacheVersion + 1,
      };
    case "SET_PATH":
      return { ...state, path: action.path };
    case "SET_PATH_LERP":
      return { ...state, pathLerp: action.value };
    case "START_INTERPOLATE":
      return { ...state, interpolating: true, lerpT: 0, fromPattern: action.from, toPattern: action.to };
    case "SET_LERP_T":
      return { ...state, lerpT: action.t };
    case "END_INTERPOLATE":
      return { ...state, interpolating: false, lerpT: 1 };
    default:
      return state;
  }
}

export function BeatPadProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <BeatPadContext.Provider value={value}>{children}</BeatPadContext.Provider>;
}

export const useBeatPad = () => useContext(BeatPadContext);
