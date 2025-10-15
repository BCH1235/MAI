// src/components/beat/SampleKit.js

import { getTone } from '../../lib/toneCompat';

// 우리가 public/samples/ 폴더에 넣은 9가지 드럼 악기 이름과 파일 경로를 정확하게 적어줍니다.
const DRUM_SAMPLES = {
  'kick': '/samples/kick.mp3',
  'snare': '/samples/snare.mp3',
  'hatClose': '/samples/hat-close.mp3', // presets.js와 이름 통일!
  'hatOpen': '/samples/hat-open.mp3',
  'tomLow': '/samples/tom-low.mp3',
  'tomMid': '/samples/tom-mid.mp3',
  'tomHigh': '/samples/tom-high.mp3',
  'crash': '/samples/crash.mp3',
  'ride': '/samples/ride.mp3',
};

// dB 값을 gain 값으로 변환하는 함수 (볼륨 조절용)
const dbToGain = (db) => Math.pow(10, db / 20);

export async function createKit({ volume = -6 } = {}) {
  const Tone = await getTone();

  // 모든 소리가 거쳐갈 마스터 볼륨 조절 장치
  const master = new Tone.Gain(dbToGain(volume)).toDestination();

  // Tone.Players는 여러 오디오 파일을 한 번에 관리하는 편리한 도구입니다.
  // 우리가 정의한 DRUM_SAMPLES를 통째로 넘겨주면 알아서 다 불러옵니다.
  const players = new Tone.Players(DRUM_SAMPLES, () => {
    console.log('✅ 9가지 드럼 샘플이 모두 준비되었습니다!');
  }).connect(master);

  // 이제 trigger 함수는 훨씬 간단해집니다.
  return {
    trigger(track, time) {
      // players 객체가 'kick', 'snare' 같은 이름을 가지고 있는지 확인하고,
      if (players.has(track)) {
        // 해당 이름의 플레이어를 찾아 재생시킵니다.
        players.player(track).start(time);
      } else {
        // 혹시 모를 오류를 방지하기 위해 콘솔에 경고를 남깁니다.
        console.warn(`'${track}'이라는 이름의 샘플을 찾을 수 없습니다.`);
      }
    },
    dispose() {
      // 뒷정리도 깔끔하게!
      try { 
        players.dispose?.(); 
        master.dispose?.();
      } catch {}
    },
  };
}

export default createKit;