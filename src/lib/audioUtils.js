// Utility to convert an AudioBuffer to a WAV ArrayBuffer (16-bit PCM by default)
export function audioBufferToWav(buffer, { float32 = false } = {}) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = float32 ? 3 : 1;
  const bitDepth = float32 ? 32 : 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Write interleaved PCM samples
  let offset = 44;
  const channelData = [];
  for (let channel = 0; channel < numChannels; channel += 1) {
    channelData.push(buffer.getChannelData(channel));
  }

  const length = buffer.length;
  if (float32) {
    for (let i = 0; i < length; i += 1) {
      for (let channel = 0; channel < numChannels; channel += 1) {
        view.setFloat32(offset, channelData[channel][i], true);
        offset += 4;
      }
    }
  } else {
    for (let i = 0; i < length; i += 1) {
      for (let channel = 0; channel < numChannels; channel += 1) {
        const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
  }

  return arrayBuffer;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i += 1) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
