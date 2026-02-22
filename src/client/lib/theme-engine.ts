// ============================================================
// Theme Engine — Dynamic CSS Loading
// ============================================================

const activeThemeLinks: HTMLLinkElement[] = [];

/**
 * Apply a theme by loading a set of CSS files.
 * @param cssPaths Array of paths relative to src/client/styles/ (e.g. ["themes/cyberpunk-greek.css"])
 */
export function applyTheme(cssPaths: string[]): void {
  // Remove existing thematic styles first
  removeTheme();

  for (const path of cssPaths) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    
    // Vite serves from /src/client/ in dev, so absolute from root works
    // In production, styles are usually flattened or hashed, 
    // but we'll assume a convention-based asset loading or literal paths.
    // For this MVP version, we'll prefix with /styles/
    link.href = `/src/client/styles/${path}`;
    link.dataset.theme = "level";
    
    document.head.appendChild(link);
    activeThemeLinks.push(link);
    
    console.log(`[ThemeEngine] Applied style: ${path}`);
  }
}

/**
 * Remove all dynamically loaded theme styles and return to base.
 */
export function removeTheme(): void {
  if (activeThemeLinks.length === 0) return;

  for (const link of activeThemeLinks) {
    link.remove();
  }
  
  const count = activeThemeLinks.length;
  activeThemeLinks.length = 0;
  console.log(`[ThemeEngine] Removed ${count} theme style(s)`);
}
