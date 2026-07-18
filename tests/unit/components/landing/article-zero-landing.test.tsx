import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("../../../../src/auth/auth-provider", () => ({
  useAuth: () => ({ user: null, status: "unauthenticated", signInWithGoogle: vi.fn(), signInWithEmail: vi.fn(), createAccount: vi.fn(), signOutUser: vi.fn() }),
}));

import { ArticleZeroLanding } from "../../../../src/components/landing/article-zero-landing";

afterEach(cleanup);

describe("ArticleZeroLanding", () => {
  it("explains enforceable policy and opens the auth panel from the primary CTA", async () => {
    render(<ArticleZeroLanding />);

    expect(screen.getByRole("heading", { name: /policy that can say no/i })).toBeTruthy();
    expect(screen.getByText(/Groq interprets/i)).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: /open the policy workspace/i }));

    expect(screen.getByRole("heading", { name: /sign in to article zero/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeTruthy();
    expect(screen.getByLabelText("Email")).toBeTruthy();
  });
});
