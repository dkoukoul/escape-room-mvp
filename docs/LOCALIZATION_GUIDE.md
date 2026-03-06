# Localization Guide

## Overview

This project now supports localization for English (en) and Greek (el). The localization system is designed to be easily extensible for additional languages.

## Client-Side Implementation

### Directory Structure

```
src/client/
├── lib/
│   └── i18n.ts              # Main i18n service
├── locales/
│   ├── en.ts               # English translations
│   └── el.ts               # Greek translations
├── components/
│   └── language-selector.ts # Language switcher UI
└── screens/
    ├── lobby.ts            # Updated with translations
    ├── briefing.ts         # Updated with translations
    ├── level-intro.ts      # Updated with translations
    ├── puzzle.ts           # Updated with translations
    └── results.ts          # Updated with translations
```

### How It Works

1. **Initialization**: The i18n service is initialized in `main.ts` on application boot
2. **Language Detection**: Automatically detects language from:
   - URL parameter (`?lang=en` or `?lang=el`)
   - LocalStorage (`odyssey_language`)
   - Browser language
   - Defaults to English
3. **Translation Loading**: Dynamically imports the appropriate translation file
4. **UI Updates**: Uses the `t()` function to get translated strings

### Adding New Languages

1. Create a new translation file in `src/client/locales/` (e.g., `fr.ts`)
2. Export a default object with the same structure as `en.ts`
3. Add the language code to the `Language` type in `i18n.ts`
4. Update the language selector component to include the new language

### Using Translations in Code

```typescript
import { t } from "../lib/i18n.ts";

// Simple translation
const title = t("lobby.title");

// Translation with parameters
const message = t("lobby.status.connected_players", { 
  count: players.length, 
  plural: players.length !== 1 ? "S" : "" 
});

// Nested keys
const buttonText = t("common.buttons.start");
```

## Level Configuration Localization Proposal

Currently, the level configuration files (like `level_01.yaml`) contain hardcoded Greek text. Here's a proposed structure to support localization:

### Current Structure (Problematic)
```yaml
title: "Η Ανασυγκρότηση της Ακρόπολης"
story: >
  Το έτος είναι 2084. Η μνήμη της Ελλάδας δεν υπάρχει πια σε βιβλία...
```

### Proposed Structure (Localized)
```yaml
id: "akropolis_defrag"
localized:
  en:
    title: "The Reconstruction of the Acropolis"
    story: >
      The year is 2084. The memory of Greece no longer exists in books...
  el:
    title: "Η Ανασυγκρότηση της Ακρόπολης"
    story: >
      Το έτος είναι 2084. Η μνήμη της Ελλάδας δεν υπάρχει πια σε βιβλία...

puzzles:
  - id: "neon_propylaea"
    localized:
      en:
        title: "The Neon Propylaea"
        briefing: >
          The gate to the Acropolis has been corrupted...
      el:
        title: "Τα Νέον Προπύλαια"
        briefing: >
          Η πύλη για την Ακρόπολη έχει μολυνθεί...
    # ... rest of puzzle configuration
```

### Alternative Approach: External Localization Files

Another approach is to keep the YAML clean and put translations in separate files:

```
config/
├── level_01.yaml           # Base configuration (English)
├── locales/
│   ├── level_01.en.yaml   # English translations
│   └── level_01.el.yaml   # Greek translations
```

### Implementation Steps for Level Localization

1. **Server-side**: Modify the config loader to merge base config with language-specific translations
2. **Client-side**: Send the appropriate language version to clients based on their locale
3. **Fallback**: If a translation doesn't exist, fall back to the base (English) version

### Example Implementation

In `config-loader.ts`:
```typescript
function loadLevelConfig(levelId: string, language: string = "en") {
  const baseConfig = loadYaml(`config/${levelId}.yaml`);
  
  // Try to load localized version
  try {
    const localizedConfig = loadYaml(`config/locales/${levelId}.${language}.yaml`);
    return mergeConfigs(baseConfig, localizedConfig);
  } catch (error) {
    // Fallback to base config
    return baseConfig;
  }
}
```

This approach maintains backward compatibility while enabling full localization support for all game content.