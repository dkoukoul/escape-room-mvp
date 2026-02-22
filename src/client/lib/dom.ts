// ============================================================
// DOM Helpers — Lightweight element creation
// ============================================================

type Attrs = Record<string, string | number | boolean | EventListener>;
type Child = HTMLElement | string | null | undefined;

/**
 * Create an HTML element with attributes and children
 */
export function h(
  tag: string,
  attrs?: Attrs | null,
  ...children: Child[]
): HTMLElement {
  const el = document.createElement(tag);

  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (key.startsWith("on") && typeof value === "function") {
        el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
      } else if (key === "className") {
        el.className = String(value);
      } else if (key === "htmlFor") {
        el.setAttribute("for", String(value));
      } else if (typeof value === "boolean") {
        if (value) el.setAttribute(key, "");
      } else {
        el.setAttribute(key, String(value));
      }
    }
  }

  for (const child of children) {
    if (child == null) continue;
    if (typeof child === "string") {
      el.appendChild(document.createTextNode(child));
    } else {
      el.appendChild(child);
    }
  }

  return el;
}

/** Query a single element */
export function $(selector: string, parent: ParentNode = document): HTMLElement | null {
  return parent.querySelector(selector);
}

/** Query all matching elements */
export function $$(selector: string, parent: ParentNode = document): HTMLElement[] {
  return Array.from(parent.querySelectorAll(selector));
}

/** Clear an element's children */
export function clear(el: HTMLElement): void {
  el.innerHTML = "";
}

/** Mount content into a container (replaces existing) */
export function mount(container: HTMLElement, ...children: Child[]): void {
  clear(container);
  for (const child of children) {
    if (child == null) continue;
    if (typeof child === "string") {
      container.appendChild(document.createTextNode(child));
    } else {
      container.appendChild(child);
    }
  }
}
