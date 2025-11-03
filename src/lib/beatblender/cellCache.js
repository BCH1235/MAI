const store = new Map(); // key: `${version}:${index}` -> pattern

export const cellCache = {
  get(version, index) {
    return store.get(`${version}:${index}`) || null;
  },
  set(version, index, pattern) {
    store.set(`${version}:${index}`, pattern);
  },
  clearByVersion(version) {
    // 선택적: 지금은 굳이 안 써도 됨
    for (const k of store.keys()) {
      if (k.startsWith(version + ":")) {
        store.delete(k);
      }
    }
  },
};
