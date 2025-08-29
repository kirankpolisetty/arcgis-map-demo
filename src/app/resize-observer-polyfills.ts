// src/resize-observer-polyfill.ts
if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
    (window as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  