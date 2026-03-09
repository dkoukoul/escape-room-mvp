import { describe, it, expect, beforeEach, vi } from "vitest";
import { h, $, $$, clear, mount } from "./dom.ts";

describe("DOM Helpers", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  describe("h() - element creation", () => {
    it("should create a simple element", () => {
      const div = h("div");
      expect(div.tagName).toBe("DIV");
    });

    it("should create an element with attributes", () => {
      const div = h("div", { id: "test", className: "my-class" });
      expect(div.id).toBe("test");
      expect(div.className).toBe("my-class");
    });

    it("should create an element with string children", () => {
      const p = h("p", null, "Hello World");
      expect(p.textContent).toBe("Hello World");
    });

    it("should create an element with element children", () => {
      const span = h("span", null, "inner");
      const div = h("div", null, span);
      expect(div.firstChild).toBe(span);
    });

    it("should create an element with multiple children", () => {
      const div = h("div", null, "text1", h("span", null, "text2"), "text3");
      expect(div.childNodes.length).toBe(3);
      expect(div.textContent).toBe("text1text2text3");
    });

    it("should handle boolean attributes", () => {
      const input = h("input", { disabled: true, readonly: false });
      expect(input.hasAttribute("disabled")).toBe(true);
      expect(input.hasAttribute("readonly")).toBe(false);
    });

    it("should handle event listeners", () => {
      const clickHandler = vi.fn();
      const button = h("button", { onclick: clickHandler }, "Click me");
      
      button.click();
      expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    it("should handle htmlFor attribute", () => {
      const label = h("label", { htmlFor: "input-id" });
      expect(label.getAttribute("for")).toBe("input-id");
    });

    it("should skip null and undefined children", () => {
      const div = h("div", null, "a", null, undefined, "b");
      expect(div.childNodes.length).toBe(2);
      expect(div.textContent).toBe("ab");
    });

    it("should handle numeric attributes", () => {
      const input = h("input", { maxLength: 10, tabIndex: 5 });
      expect(input.getAttribute("maxLength")).toBe("10");
      expect(input.getAttribute("tabIndex")).toBe("5");
    });
  });

  describe("$() - query single element", () => {
    it("should return null for non-existent element", () => {
      const result = $("#nonexistent");
      expect(result).toBeNull();
    });

    it("should find element by id", () => {
      document.body.innerHTML = '<div id="test"></div>';
      const result = $("#test");
      expect(result).not.toBeNull();
      expect(result?.id).toBe("test");
    });

    it("should find element by class", () => {
      document.body.innerHTML = '<div class="my-class"></div>';
      const result = $(".my-class");
      expect(result).not.toBeNull();
    });

    it("should find element within parent", () => {
      document.body.innerHTML = `
        <div id="parent">
          <span class="child"></span>
        </div>
      `;
      const parent = $("#parent");
      const child = $(".child", parent!);
      expect(child).not.toBeNull();
    });
  });

  describe("$$() - query all elements", () => {
    it("should return empty array for non-existent elements", () => {
      const result = $$(".nonexistent");
      expect(result).toEqual([]);
    });

    it("should find all elements by class", () => {
      document.body.innerHTML = `
        <div class="item"></div>
        <div class="item"></div>
        <div class="item"></div>
      `;
      const result = $$(".item");
      expect(result.length).toBe(3);
    });

    it("should find elements within parent", () => {
      document.body.innerHTML = `
        <div id="parent">
          <span class="child"></span>
          <span class="child"></span>
        </div>
        <span class="child"></span>
      `;
      const parent = $("#parent");
      const children = $$(".child", parent!);
      expect(children.length).toBe(2);
    });

    it("should return array of HTMLElements", () => {
      document.body.innerHTML = '<div class="test"></div>';
      const result = $$(".test");
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toBeInstanceOf(HTMLElement);
    });
  });

  describe("clear() - clear element children", () => {
    it("should remove all children", () => {
      const div = h("div", null, "child1", h("span", null, "child2"));
      expect(div.childNodes.length).toBe(2);
      
      clear(div);
      expect(div.childNodes.length).toBe(0);
    });

    it("should work on empty element", () => {
      const div = h("div");
      clear(div);
      expect(div.childNodes.length).toBe(0);
    });
  });

  describe("mount() - replace element content", () => {
    it("should replace existing content", () => {
      const container = h("div", null, "old content");
      mount(container, "new content");
      expect(container.textContent).toBe("new content");
    });

    it("should mount multiple children", () => {
      const container = h("div");
      mount(container, "text", h("span", null, "element"));
      expect(container.childNodes.length).toBe(2);
    });

    it("should skip null children", () => {
      const container = h("div");
      mount(container, "a", null, "b");
      expect(container.childNodes.length).toBe(2);
    });

    it("should clear container before mounting", () => {
      const container = h("div", null, h("p", null, "old"));
      mount(container, h("span", null, "new"));
      expect(container.querySelector("p")).toBeNull();
      expect(container.querySelector("span")).not.toBeNull();
    });
  });
});
