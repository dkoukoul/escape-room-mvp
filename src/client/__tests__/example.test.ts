import { describe, it, expect } from "vitest";

/**
 * Example test file showing how to write client-side tests
 * 
 * These tests run in a happy-dom environment which simulates a browser
 * without the overhead of a real browser.
 */

describe("Example Client Tests", () => {
  it("should have access to document", () => {
    expect(document).toBeDefined();
    expect(document.body).toBeDefined();
  });

  it("should be able to manipulate DOM", () => {
    const div = document.createElement("div");
    div.id = "test-div";
    div.textContent = "Hello, World!";
    document.body.appendChild(div);

    const found = document.getElementById("test-div");
    expect(found).not.toBeNull();
    expect(found?.textContent).toBe("Hello, World!");
  });

  it("should have access to window", () => {
    expect(window).toBeDefined();
    expect(typeof window.location).toBe("object");
  });

  it("should clean up between tests", () => {
    // Previous test's div should not exist
    const found = document.getElementById("test-div");
    expect(found).toBeNull();
  });
});

describe("Testing with Mocks", () => {
  it("should be able to mock functions", async () => {
    const { vi } = await import("vitest");
    
    const mockFn = vi.fn();
    mockFn("arg1", "arg2");
    
    expect(mockFn).toHaveBeenCalledWith("arg1", "arg2");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("should be able to mock return values", async () => {
    const { vi } = await import("vitest");
    
    const mockFn = vi.fn().mockReturnValue("mocked value");
    const result = mockFn();
    
    expect(result).toBe("mocked value");
  });
});
