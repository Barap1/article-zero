class TestResizeObserver implements ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    void callback;
  }

  disconnect(): void {}

  observe(target: Element): void {
    void target;
  }

  unobserve(target: Element): void {
    void target;
  }
}

globalThis.ResizeObserver = TestResizeObserver;
