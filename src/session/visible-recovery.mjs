// Lifecycle orchestration only. The normal readers still validate current access.
export function createVisibleRecovery({visible,clear,refresh,read,isReady}) {
  let pending=null;
  return function recover() {
    if (!visible()) { clear(); return Promise.resolve(); }
    if (pending) return pending;
    pending=(async()=>{
      await refresh();
      if (visible() && isReady()) await read();
    })().finally(()=>{pending=null;});
    return pending;
  };
}
