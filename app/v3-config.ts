export const V3_CONFIG = {
  nightKeyAsset: "/assets/v3-pro/controls/night-light-key.svg",
  longPressMs: 2000,
  powerOnProgressDelayMs: 250,
  powerOnPromptTimeoutMs: 5000,
  longPressActivationMs: 450,
  finishHoldMs: 2000,
  powerOffHoldMs: 2000,
  bootDurationMs: 2000,
  feedbackDurationMs: 900,
  standbyAfterMs: 3 * 60 * 1000,
  powerOffAfterMs: 10 * 60 * 1000,
  minLevel: 0,
  maxLevel: 15,
  stimulationMaxLevel: 5,
  stimulationDefaultLevel: 3,
  defaultLevel: 9,
  defaultSpeed: 2,
  maxSpeed: 5,
  defaultMode: "stimulation" as PumpMode,
};

export type PumpMode = "stimulation" | "expression" | "powerPumping" | "milkBoost" | "cozyFlow" | "customized";
export type LanguageSetupState = "languageSelect" | "languageConfirm" | "languageSuccess" | "languageFailure";
export type FactoryResetState = "resetConfirm" | "resetting" | "resetRestart";

export const FACTORY_SETUP = {
  slots: 14,
  defaultLanguage: "en" as const,
  resetHoldMs: 3000,
  resetConfirmTimeoutMs: 5000,
  resetDurationMs: 1500,
  restartDelayMs: 600,
  resultDurationMs: 2000,
};

export const DEVICE_LANGUAGES = [
  { id: "fr", label: "Français" },
  { id: "en", label: "English" },
  { id: "zh-CN", label: "简体中文" },
  { id: "es", label: "Español" },
  { id: "de", label: "Deutsch" },
  { id: "ru", label: "Русский" },
  { id: "ja", label: "日本語" },
  { id: "it", label: "Italiano" },
  { id: "ko", label: "한국어" },
  { id: "zh-TW", label: "繁體中文" },
] as const;

export type DeviceLanguageId = (typeof DEVICE_LANGUAGES)[number]["id"];

export const LANGUAGE_DIAL_HINTS: Partial<Record<DeviceLanguageId, { select: string; confirm: string }>> = {
  fr: { select: "Tournez pour choisir, appuyez pour valider", confirm: "Tournez pour revenir, appuyez pour valider" },
  en: { select: "Turn to switch, press to confirm", confirm: "Turn to Return, Press to Confirm" },
  "zh-CN": { select: "旋转切换，按下确认", confirm: "旋转返回，按下确认" },
  es: { select: "Gira para elegir, pulsa para confirmar", confirm: "Gira para volver, pulsa para confirmar" },
  de: { select: "Drehen zum Wählen, drücken zum Bestätigen", confirm: "Drehen für Zurück, drücken zum Bestätigen" },
  ja: { select: "回して切り替え、押して確定", confirm: "回して戻る、押して確定" },
  ko: { select: "돌려서 선택, 눌러서 확인", confirm: "돌려서 돌아가기, 눌러서 확인" },
};

export const DIAL_LANGUAGES = DEVICE_LANGUAGES.filter(language => LANGUAGE_DIAL_HINTS[language.id]);

export type ScreenState = "bothLevel" | "sidePauseConfirm" | "suctionProgress" | "nightLight" | "theme" | "off" | "powerOnPrompt" | "boot" | "home" | "menu" | "pumping" | "paused" | "level" | "endingPump" | "finish" | "modeSuccess" | "poweringOff" | "standby" | "sealChecking" | "sealPassed" | "leakCheck";

export const SUCTION_KPA = {
  stimulation: [0, 6, 12, 18, 23, 26],
  expression: [0, 5, 10, 15, 18, 21, 24, 26, 28, 30, 32, 34, 36, 38, 39, 40],
} as const;

export function maxLevelForMode(mode: PumpMode): number {
  return mode === "stimulation" ? V3_CONFIG.stimulationMaxLevel : V3_CONFIG.maxLevel;
}

export function suctionKpa(mode: PumpMode, level: number): number {
  const table = mode === "stimulation" ? SUCTION_KPA.stimulation : SUCTION_KPA.expression;
  return table[Math.max(0, Math.min(table.length - 1, level))];
}

export function levelForSuctionKpa(mode: PumpMode, kpa: number): number {
  const table = mode === "stimulation" ? SUCTION_KPA.stimulation : SUCTION_KPA.expression;
  if (kpa <= table[0]) return 0;
  for (let level = 1; level < table.length; level++) {
    if (kpa <= table[level]) {
      return level - 1 + (kpa - table[level - 1]) / (table[level] - table[level - 1]);
    }
  }
  return table.length - 1;
}

export const MODE_COLORS: Record<PumpMode, string> = {
  stimulation: "#E2637E",
  expression: "#64A4F2",
  powerPumping: "#9C78E8",
  milkBoost: "#9C78E8",
  cozyFlow: "#9C78E8",
  customized: "#9C78E8",
};

export const MODES: Array<{ id: PumpMode; label: string; key: string }> = [
  { id: "stimulation", label: "Stimulate", key: "Q" },
  { id: "expression", label: "Expression", key: "W" },
];

export const MENU_ITEMS = [
  { label: "Stimulation", estimate: "≈ 45min", mode: "stimulation" as PumpMode, image: "/assets/screen/菜单子项-1-stimuation.png" },
  { label: "Expression", estimate: "≈ 45min", mode: "expression" as PumpMode, image: "/assets/screen/菜单子项-2-expression.png" },
  { label: "Power Pumping", estimate: "≈ 45min", mode: "powerPumping" as PumpMode, image: "/assets/screen/菜单子项-3-program1-power pumping.png" },
  { label: "Milk Boost", estimate: "≈ 20min", mode: "milkBoost" as PumpMode, image: "/assets/screen/菜单子项-3-program1-power pumping.png" },
  { label: "Cozy Flow", estimate: "≈ 21.5min", mode: "cozyFlow" as PumpMode, image: "/assets/screen/菜单子项-3-program1-power pumping.png" },
  { label: "Customized", estimate: "", mode: "customized" as PumpMode, image: "/assets/screen/菜单子项-3-program1-power pumping.png" },
];
