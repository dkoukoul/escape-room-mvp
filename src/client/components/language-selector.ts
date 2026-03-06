// ============================================================
// Language Selector Component
// ============================================================

import { h, $ } from "../lib/dom.ts";
import { i18n } from "../lib/i18n.ts";

export function createLanguageSelector(): HTMLElement {
  const container = h("div", { 
    className: "language-selector",
    style: "position: fixed; top: 20px; right: 20px; z-index: 1000;"
  });

  const button = h("button", {
    className: "btn btn-outline",
    style: "padding: 0.5rem 1rem; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;",
    onClick: toggleDropdown,
  }, getLanguageLabel(i18n.getCurrentLanguage()));

  const dropdown = h("div", {
    id: "lang-dropdown",
    className: "dropdown-menu",
    style: `
      position: absolute;
      top: 100%;
      right: 0;
      background: var(--bg-black);
      border: 1px solid var(--neon-cyan);
      border-radius: 4px;
      padding: 0.5rem 0;
      margin-top: 0.5rem;
      min-width: 120px;
      display: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    `,
  },
    h("button", {
      className: "dropdown-item",
      style: "display: block; width: 100%; padding: 0.5rem 1rem; text-align: left; background: none; border: none; color: var(--neon-cyan); cursor: pointer;",
      onClick: () => changeLanguage("en"),
    }, "🇬🇧 English"),
    h("button", {
      className: "dropdown-item",
      style: "display: block; width: 100%; padding: 0.5rem 1rem; text-align: left; background: none; border: none; color: var(--neon-cyan); cursor: pointer; border-top: 1px solid rgba(0, 240, 255, 0.2);",
      onClick: () => changeLanguage("el"),
    }, "🇬🇷 Ελληνικά")
  );

  container.appendChild(button);
  container.appendChild(dropdown);

  // Listen for language changes
  window.addEventListener("languageChanged", () => {
    button.textContent = getLanguageLabel(i18n.getCurrentLanguage());
  });

  return container;
}

function toggleDropdown() {
  const dropdown = $("#lang-dropdown");
  if (dropdown) {
    const isVisible = dropdown.style.display === "block";
    dropdown.style.display = isVisible ? "none" : "block";
  }
}

async function changeLanguage(lang: "en" | "el") {
  try {
    await i18n.changeLanguage(lang);
    const dropdown = $("#lang-dropdown");
    if (dropdown) {
      dropdown.style.display = "none";
    }
    // Reload the page to apply translations
    location.reload();
  } catch (error) {
    console.error("Failed to change language:", error);
  }
}

function getLanguageLabel(lang: "en" | "el"): string {
  return lang === "en" ? "🇬🇧 EN" : "🇬🇷 EL";
}

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  const dropdown = $("#lang-dropdown");
  const selector = $(".language-selector");
  
  if (dropdown && selector && !selector.contains(e.target as Node)) {
    dropdown.style.display = "none";
  }
});