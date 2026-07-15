import { describe, expect, it } from "vitest";
import { canTransitionBooking, canTransitionWorkOrder } from "./transitions";

describe("booking transitions", () => {
  it("allows the operational happy path", () => {
    expect(canTransitionBooking("new", "confirmed")).toBe(true);
    expect(canTransitionBooking("confirmed", "arrived")).toBe(true);
    expect(canTransitionBooking("arrived", "in_diagnosis")).toBe(true);
  });

  it("blocks reopening a completed booking", () => {
    expect(canTransitionBooking("completed", "in_service")).toBe(false);
  });
});

describe("work order transitions", () => {
  it("allows quality control before readiness", () => {
    expect(canTransitionWorkOrder("in_progress", "quality_check")).toBe(true);
    expect(canTransitionWorkOrder("quality_check", "ready")).toBe(true);
  });

  it("requires quality control before readiness", () => {
    expect(canTransitionWorkOrder("in_progress", "ready")).toBe(false);
  });

  it("blocks delivered orders from changing status", () => {
    expect(canTransitionWorkOrder("delivered", "in_progress")).toBe(false);
  });
});
