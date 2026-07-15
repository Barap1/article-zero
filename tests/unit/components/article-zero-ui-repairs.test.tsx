import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { AppHeader } from "../../../src/components/article-zero/app-header";
import { formatDisplayLabel } from "../../../src/lib/display-label";

afterEach(cleanup);

it("returns home from the brand without resetting the workspace", () => {
  const onReturnHome = vi.fn();

  render(<AppHeader onReturnHome={onReturnHome} onReset={vi.fn()} onExport={vi.fn()} onOpenAudit={vi.fn()} isExporting={false} />);

  expect(screen.getByRole("button", { name: /article zero.*home/i })).toBeTruthy();
  expect(screen.queryByText("Active version")).toBeNull();
  expect(screen.queryByText("Groq configured")).toBeNull();
  expect(screen.queryByText("Synthetic data only")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /article zero.*home/i }));
  expect(onReturnHome).toHaveBeenCalledTimes(1);
});

it("keeps compact header actions accessible by name", () => {
  render(<AppHeader onReturnHome={vi.fn()} onReset={vi.fn()} onExport={vi.fn()} onOpenAudit={vi.fn()} isExporting={false} />);

  expect(screen.getByRole("button", { name: "Open audit timeline" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Export audit package" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Reset workspace" })).toBeTruthy();
});

it("formats policy values as readable interface labels", () => {
  expect(formatDisplayLabel("ALLOW_WITH_FIELD_FILTER")).toBe("Allowed with field filter");
  expect(formatDisplayLabel("disclose_patient_data")).toBe("Disclose patient data");
  expect(formatDisplayLabel("currentEmergencyMedications")).toBe("Emergency medications");
});
