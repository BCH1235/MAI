// src/hooks/useBeatMakerEngine.js

import { useEffect, useRef, useMemo } from "react";
import { useBeatPad } from "../state/beatPadStore";
import * as Tone from "tone";
import { createKit } from "../components/beat/SampleKit";
import { clonePattern, TRACKS, PATTERN_STEPS } from "../components/beat/presets";
import { loadDrumsVAE, encodeCorners, decodeAtPosition } from "../lib/drumsVAE";
import { samplePathByDistance } from "./usePathMode";
import { useCellGrid } from "./useCellGrid";
import { audioBufferToWav } from "../utils/audioExport";
import { useMusicContext } from "../context/MusicContext";

const blendWeights = (x, y) => ({
  A: (1 - x) * (1 - y),
  B: x * (1 - y),
  C: (1 - x) * y,
  D: x * y,
});

function simpleBlend(corners, x, y, threshold = 0.5) {
  if (!corners) return null;
  const w = blendWeights(x, y);
  const result = {};
  TRACKS.forEach((track) => {
    result[track] = Array.from({ length: PATTERN_STEPS }, (_, idx) => {
      const val =
        (corners.A?.[track]?.[idx] ? 1 : 0) * w.A +
        (corners.B?.[track]?.[idx] ? 1 : 0) * w.B +
        (corners.C?.[track]?.[idx] ? 1 : 0) * w.C +
        (corners.D?.[track]?.[idx] ? 1 : 0) * w.D;
      return val >= threshold;
    });
  });
  return result;
}

const TRACK_TO_PLAYER_KEY_MAP = {
  kick: "kick",
  snare: "snare",
  hatClose: "hatC",
  hatOpen: "hatO",
  tomLow: "tomL",
  tomMid: "tomM",
  tomHigh: "tomH",
  crash: "crash",
  ride: "ride",
};

export function useBeatMakerEngine() {
  const { state, dispatch } = useBeatPad();
  const { actions: globalActions } = useMusicContext();
  const { toCell, centerOf } = useCellGrid(state.grid.cols, state.grid.rows);
  const kitRef = useRef(null);
  const partRef = useRef(null);
  const stateRef = useRef(state);
  const pathPatternsRef = useRef([]);
  const pathPositionsRef = useRef([]);
  const pathVersionRef = useRef(0);
  const lastManualPatternRef = useRef(state.pattern);
  const wasPathPlayingRef = useRef(false);
  const blendRequestRef = useRef(0);
  const lastVaeCall = useRef(0);
  const VAE_DEBOUNCE_DELAY = 100;

  // --- VAE 모델 로딩 ---
  useEffect(() => {
    loadDrumsVAE().then(() => console.log("MusicVAE model loaded.")).catch((err) => {
      console.error("Failed to load MusicVAE model", err);
    });
  }, []);

  // 1. 컴포넌트가 처음 마운트될 때 Tone.js와 드럼 샘플을 초기화합니다.
  useEffect(() => {
    const initAudio = async () => {
      await Tone.start();
      kitRef.current = await createKit();
      Tone.Transport.bpm.value = state.bpm;
    };
    initAudio();

    // 컴포넌트가 언마운트될 때 오디오 리소스를 정리합니다.
    return () => {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      kitRef.current?.players?.dispose();
      kitRef.current?.gain?.dispose();
    };
  }, []); // 빈 배열: 최초 1회만 실행

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const nowPathPlaying = state.drawMode === "PATH" && state.isPlaying;
    if (nowPathPlaying && !wasPathPlayingRef.current) {
      lastManualPatternRef.current = state.pattern;
    }
    if (!nowPathPlaying && wasPathPlayingRef.current) {
      if (lastManualPatternRef.current) {
        dispatch({ type: "SET_PATTERN", payload: lastManualPatternRef.current });
      }
    }
    wasPathPlayingRef.current = nowPathPlaying;
  }, [state.drawMode, state.isPlaying, state.pattern, dispatch]);

  useEffect(() => {
    if (state.drawMode !== "PATH") {
      lastManualPatternRef.current = state.pattern;
    }
  }, [state.pattern, state.drawMode]);

  // --- 코너 패턴이 변경되면 자동으로 인코딩 수행 ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!state.cornerPatterns) {
        dispatch({ type: "SET_CORNER_ENCODINGS", payload: null });
        return;
      }
      const valid = Object.values(state.cornerPatterns).every(Boolean);
      if (!valid) return;
      try {
        const encodings = await encodeCorners(state.cornerPatterns);
        if (!cancelled) {
          dispatch({ type: "SET_CORNER_ENCODINGS", payload: encodings });
        }
      } catch (e) {
        console.error("Failed to encode corner patterns:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.cornerPatterns, dispatch]);

  // 2. 중앙 상태의 bpm 값이 변경될 때마다 Tone.Transport에 반영합니다.
  useEffect(() => {
    if (Tone.Transport) {
      Tone.Transport.bpm.value = state.bpm;
    }
  }, [state.bpm]);

  const fillPartWithPattern = () => {
    const part = partRef.current;
    if (!part) return;

    const currentState = stateRef.current;
    part.clear();
    const totalSteps = PATTERN_STEPS * currentState.bars;

    for (let step = 0; step < totalSteps; step++) {
      const time = `0:${Math.floor(step / 4)}:${step % 4}`;
      part.add(time, { step: step % PATTERN_STEPS, index: step, totalSteps });
    }
  };

  // 3. 재생 로직을 Tone.Part 기반으로 구현합니다.
  useEffect(() => {
    if (state.isPlaying) {
      if (!partRef.current) {
        const part = new Tone.Part(async (time, note) => {
          const currentState = stateRef.current;
          let patternToPlay = currentState.pattern;
          const totalSteps = note.totalSteps || PATTERN_STEPS * currentState.bars;
          const stepIndex = note.index % totalSteps;

          if (currentState.drawMode === "PATH" && currentState.path.length > 1) {
            const sampledPattern = pathPatternsRef.current[stepIndex];
            const sampledPosition = pathPositionsRef.current[stepIndex];
            if (sampledPattern) {
              patternToPlay = sampledPattern;
            }
            if (sampledPosition) {
              Tone.Draw.schedule(() => {
                dispatch({ type: "SET_PUCK_POSITION", payload: { position: sampledPosition, index: stepIndex } });
              }, time);
            }
          }

          Object.entries(patternToPlay || {}).forEach(([trackName, steps]) => {
            if (steps?.[note.step]) {
              const playerKey = TRACK_TO_PLAYER_KEY_MAP[trackName];
              if (playerKey) {
                kitRef.current?.players.player(playerKey).start(time);
              }
            }
          });

          Tone.Draw.schedule(() => {
            dispatch({ type: "SET_CURRENT_STEP", payload: note.step });
            if (currentState.drawMode === "PATH" && patternToPlay) {
              dispatch({ type: "SET_PATTERN", payload: patternToPlay });
            }
          }, time);
        }, []).start(0);

        part.loop = true;
        partRef.current = part;
      }

      partRef.current.loopEnd = `${state.bars}m`;
      fillPartWithPattern();
      if (Tone.Transport.state !== "started") {
        Tone.Transport.start("+0.1");
      }
    } else {
      Tone.Transport.stop();
    }

    return () => {
      Tone.Transport.stop();
    };
  }, [state.isPlaying, state.bars, dispatch]);

  useEffect(() => {
    if (state.isPlaying) {
      fillPartWithPattern();
    }
  }, [state.bars, state.isPlaying]);

  useEffect(() => {
    if (!(state.path.length > 1 && state.cornerEncodings)) {
      pathPatternsRef.current = [];
      pathPositionsRef.current = [];
      return;
    }

    const version = ++pathVersionRef.current;
    const totalSteps = PATTERN_STEPS * state.bars;
    const positions = Array(totalSteps)
      .fill(null)
      .map((_, step) => {
        const progress = totalSteps ? step / totalSteps : 0;
        return samplePathByDistance(state.path, progress);
      });
    pathPositionsRef.current = positions;

    (async () => {
      try {
        const decodePromises = positions.map((pos) =>
          decodeAtPosition(state.cornerEncodings, pos.x, pos.y).catch((error) => {
            console.error("Failed to decode path step", error);
            return null;
          })
        );
        const patterns = await Promise.all(decodePromises);
        if (pathVersionRef.current === version) {
          pathPatternsRef.current = patterns;
        }
      } catch (error) {
        console.error("Path decoding batch failed", error);
      }
    })();
  }, [state.path, state.cornerEncodings, state.bars]);

  // 4. UI 컴포넌트에서 사용할 액션 함수들을 정의합니다.
  const actions = useMemo(
    () => ({
      setIsPlaying: (playing) => dispatch({ type: "SET_IS_PLAYING", payload: playing }),
      setBpm: (newBpm) => dispatch({ type: "SET_BPM", payload: newBpm }),
      setPattern: (newPattern) => dispatch({ type: "SET_PATTERN", payload: newPattern }),
      clearPattern: () => dispatch({ type: "SET_PATTERN", payload: clonePattern() }),
      handleBlend: async (x, y) => {
        const cell = toCell(x, y);
        dispatch({ type: "SET_PUCK_POSITION", payload: { position: { x, y }, index: cell.index } });

        if (!state.cornerEncodings) {
          const fallback = simpleBlend(state.cornerPatterns, x, y);
          if (fallback) {
            dispatch({ type: "SET_PATTERN", payload: fallback });
          } else {
            console.warn("Corner encodings not ready yet.");
          }
          return;
        }
        const requestId = ++blendRequestRef.current;
        try {
          const newPattern = await decodeAtPosition(state.cornerEncodings, x, y);
          if (blendRequestRef.current === requestId) {
            dispatch({ type: "SET_PATTERN", payload: newPattern });
          }
        } catch (e) {
          console.error("Failed to decode at position:", e);
        }
      },
      setCornerPreset: (corner, presetName) =>
        dispatch({ type: "SET_CORNER_PRESET", payload: { corner, presetName } }),
      setDrawMode: (mode) => dispatch({ type: "SET_DRAW_MODE", payload: mode }),
      setMode: (mode) => dispatch({ type: "SET_MODE", payload: mode }),
      selectCorner: (corner) => dispatch({ type: "SELECT_CORNER", payload: corner }),
      updateEditingPattern: (track, step) =>
        dispatch({ type: "UPDATE_EDITING_PATTERN", payload: { track, step } }),
      handleDoneEditing: async () => {
        dispatch({ type: "START_INTERPOLATION" });
        try {
          const encodings = await encodeCorners(state.cornerPatterns);
          const totalCells = state.grid.cols * state.grid.rows;
          const patterns = await Promise.all(
            Array.from({ length: totalCells }).map((_, idx) => {
              const row = Math.floor(idx / state.grid.cols);
              const col = idx % state.grid.cols;
              const coords = centerOf({ col, row });
              return decodeAtPosition(encodings, coords.x, coords.y);
            })
          );
          dispatch({ type: "FINISH_INTERPOLATION", payload: { encodings, patterns } });
        } catch (error) {
          console.error("Failed to interpolate:", error);
          dispatch({ type: "SET_MODE", payload: "INTERPOLATE" });
        }
      },
      handleExport: async () => {
        if (!kitRef.current) return;
        globalActions?.addNotification?.({ type: "info", message: "WAV 파일 렌더링 중..." });

        try {
          const totalDuration = Tone.Time(`${state.bars}m`).toSeconds();
          const audioBuffer = await Tone.Offline(async ({ transport }) => {
            transport.bpm.value = state.bpm;
            const offlineKit = await createKit({ skipToneStart: true });
            const stepDuration = Tone.Time("16n").toSeconds();
            const totalSteps = PATTERN_STEPS * state.bars;

            for (let step = 0; step < totalSteps; step++) {
              const eventTime = step * stepDuration;
              Object.entries(state.pattern).forEach(([trackName, steps]) => {
                if (steps[step % PATTERN_STEPS]) {
                  const playerKey = TRACK_TO_PLAYER_KEY_MAP[trackName];
                  if (playerKey) {
                    offlineKit.players.player(playerKey).start(eventTime);
                  }
                }
              });
            }

            transport.scheduleOnce(() => {
              offlineKit.players.dispose();
              offlineKit.gain?.dispose?.();
            }, totalDuration);
            transport.start(0);
          }, totalDuration);

          const blob = audioBufferToWav(audioBuffer);
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = `beat-${Date.now()}.wav`;
          anchor.click();
          URL.revokeObjectURL(url);
          globalActions?.addNotification?.({ type: "success", message: "WAV 파일이 다운로드되었습니다." });
        } catch (error) {
          console.error("Export failed:", error);
          globalActions?.addNotification?.({ type: "error", message: "파일 내보내기에 실패했습니다." });
        }
      },
    }),
    [
      centerOf,
      dispatch,
      globalActions,
      state.bars,
      state.cornerEncodings,
      state.cornerPatterns,
      state.grid,
      state.pattern,
      toCell,
    ]
  );

  // 5. 훅의 최종 반환값
  return {
    state,
    actions,
  };
}
