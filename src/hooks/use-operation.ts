"use client";

import { useCallback, useRef, useState } from "react";

export type OperationState<T> =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "success"; readonly data: T }
  | { readonly status: "error"; readonly error: Error };

export function useOperation<TInput, TOutput>(operation: (input: TInput) => Promise<TOutput>) {
  const [state, setState] = useState<OperationState<TOutput>>({ status: "idle" });
  const running = useRef(false);

  const submit = useCallback(async (input: TInput): Promise<TOutput | null> => {
    if (running.current) return null;
    running.current = true;
    setState({ status: "loading" });
    try {
      const data = await operation(input);
      setState({ status: "success", data });
      return data;
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error("The operation could not be completed.");
      setState({ status: "error", error: normalized });
      return null;
    } finally {
      running.current = false;
    }
  }, [operation]);

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, submit, reset, isLoading: state.status === "loading" };
}
