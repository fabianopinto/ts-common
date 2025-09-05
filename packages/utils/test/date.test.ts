/**
 * @fileoverview Unit tests for DateUtils in @fabianopinto/utils
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DateUtils } from "../src/date";

describe("DateUtils", () => {
  it("formatISO removes milliseconds", () => {
    const d = new Date("2020-01-01T12:34:56.789Z");
    expect(DateUtils.formatISO(d)).toBe("2020-01-01T12:34:56.000Z");
  });

  it("getCurrentTimestamp returns ISO string", () => {
    const s = DateUtils.getCurrentTimestamp();
    expect(typeof s).toBe("string");
    expect(() => new Date(s)).not.toThrow();
  });

  it("toUnix/fromUnix roundtrip", () => {
    const now = new Date();
    const ts = DateUtils.toUnix(now);
    const back = DateUtils.fromUnix(ts);
    expect(Math.abs(back.getTime() - ts * 1000)).toBeLessThan(1000);
  });

  it("isSameDay works across boundaries (UTC)", () => {
    const a = new Date("2020-01-01T23:59:59.999Z");
    const b = new Date("2020-01-01T00:00:00.000Z");
    const c = new Date("2020-01-02T00:00:00.000Z");
    expect(DateUtils.isSameDay(a, b)).toBe(true);
    expect(DateUtils.isSameDay(a, c)).toBe(false);
  });

  it("addDays returns a new Date", () => {
    const d = new Date("2020-01-01T00:00:00.000Z");
    const d2 = DateUtils.addDays(d, 2);
    expect(d2.getUTCDate()).toBe(3);
    expect(d2).not.toBe(d);
  });

  it("isExpired compares against reference time", () => {
    const ref = new Date("2020-01-01T00:00:00.000Z");
    expect(DateUtils.isExpired(new Date("2019-12-31T23:59:59.000Z"), ref)).toBe(true);
    expect(DateUtils.isExpired(new Date("2020-01-01T00:00:00.000Z"), ref)).toBe(false);
  });

  describe("parseDuration", () => {
    it("parses compound and fractional units", () => {
      expect(DateUtils.parseDuration("1.5h")).toBe(5400000);
      expect(DateUtils.parseDuration("1h 30m")).toBe(5400000);
      expect(DateUtils.parseDuration("2m45s")).toBe(165000);
      expect(DateUtils.parseDuration("-2s")).toBe(-2000);
    });

    it("parses bare millisecond numbers when no units match", () => {
      expect(DateUtils.parseDuration("1500")).toBe(1500);
      expect(DateUtils.parseDuration("0")).toBe(0);
    });

    it("throws TypeError for non-string inputs", () => {
      // @ts-expect-error testing runtime type error
      expect(() => DateUtils.parseDuration(123)).toThrow(TypeError);
    });

    it("throws SyntaxError for empty or unparseable strings", () => {
      expect(() => DateUtils.parseDuration("")).toThrow(SyntaxError);
      expect(() => DateUtils.parseDuration("abc")).toThrow(SyntaxError);
    });
  });

  describe("wait", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("waits for numeric ms", async () => {
      const p = DateUtils.wait(500);
      vi.advanceTimersByTime(500);
      await expect(p).resolves.toBeUndefined();
    });

    it("waits for string duration via parseDuration", async () => {
      const p = DateUtils.wait("1s");
      vi.advanceTimersByTime(1000);
      await expect(p).resolves.toBeUndefined();
    });

    it("throws on invalid input type (short-circuit)", () => {
      // @ts-expect-error testing runtime error branch
      expect(() => DateUtils.wait({})).toThrow(TypeError);
    });
  });
});
