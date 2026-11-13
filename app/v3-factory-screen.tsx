import { useId } from "react";
import { DEVICE_LANGUAGES, DIAL_LANGUAGES, FACTORY_SETUP, LANGUAGE_DIAL_HINTS, type DeviceLanguageId, type FactoryResetState, type LanguageSetupState } from "./v3-config";

const assets = "/assets/v3-pro/factory/";
const languageRows = [
  { offset: -2, y: 138, opacity: 0.4 },
  { offset: -1, y: 174, opacity: 1 },
  { offset: 0, y: 216, opacity: 1 },
  { offset: 1, y: 258, opacity: 1 },
  { offset: 2, y: 294, opacity: 1 },
  { offset: 3, y: 330, opacity: 0.4 },
];

function segmentPath(index: number) {
  const angle = 201 + (index + 0.5) * 138 / FACTORY_SETUP.slots;
  const point = (degrees: number) => {
    const radians = degrees * Math.PI / 180;
    return [216 + 173 * Math.cos(radians), 216 + 173 * Math.sin(radians)].join(" ");
  };
  return `M ${point(angle - 3.5)} A 173 173 0 0 1 ${point(angle + 3.5)}`;
}

const languageSegments = Array.from({ length: FACTORY_SETUP.slots }, (_, index) => segmentPath(index));

const dialLanguageRows = [
  { offset: -2, y: 123, opacity: 0.4 },
  { offset: -1, y: 154, opacity: 1 },
  { offset: 0, y: 190, opacity: 1 },
  { offset: 1, y: 226, opacity: 1 },
  { offset: 2, y: 257, opacity: 1 },
  { offset: 3, y: 288, opacity: 0.4 },
  { offset: 4, y: 319, opacity: 0.4 },
];

function dialPoint(radius: number, degrees: number, centerY = 216) {
  const angle = degrees * Math.PI / 180;
  return `${216 + radius * Math.cos(angle)} ${centerY + radius * Math.sin(angle)}`;
}

// Keep a 152° opening for the longest localized hint.
const dialArcStart = 166;
const dialArcSpan = 208;
const dialProgressRadius = 170.5;
const dialProgressStroke = 11;
const segmentGap = 6;
const segmentSpan = (dialArcSpan - segmentGap * (DIAL_LANGUAGES.length - 1)) / DIAL_LANGUAGES.length;
const dialLanguageSegments = DIAL_LANGUAGES.map((_, index) => {
  const start = dialArcStart + index * (segmentSpan + segmentGap);
  const from = dialPoint(dialProgressRadius, start);
  const to = dialPoint(dialProgressRadius, start + segmentSpan);
  return `M ${from} A ${dialProgressRadius} ${dialProgressRadius} 0 0 1 ${to}`;
});

// The outlined Figma text has a 170.6 px baseline radius, centered 1 px below the dial center.
const hintRadius = 170.6;
const hintCenterY = 217;
const hintCurve = `M ${dialPoint(hintRadius, 166, hintCenterY)} A ${hintRadius} ${hintRadius} 0 0 0 ${dialPoint(hintRadius, 14, hintCenterY)}`;

function LanguageDialHint({ text, languageId }: { text: string; languageId: DeviceLanguageId }) {
  const id = useId();
  const pathId = `${id}-path`;
  const shineId = `${id}-shine`;
  return <g lang={languageId} className="factory-dial-hint" fontSize="19" fontWeight="500">
    <defs>
      <path id={pathId} d={hintCurve} />
      <linearGradient id={shineId} gradientUnits="userSpaceOnUse" x1="146" x2="286" y1="0" y2="0">
        <stop stopColor="#fff" stopOpacity="0" />
        <stop offset=".5" stopColor="#fff" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
        <animateTransform attributeName="gradientTransform" type="translate"
          values="-230 0;230 0;230 0" keyTimes="0;.7;1" dur="2s" repeatCount="indefinite" />
      </linearGradient>
    </defs>
    <text fill="#999"><textPath href={`#${pathId}`} startOffset="50%">{text}</textPath></text>
    <text className="factory-dial-hint-shine" fill={`url(#${shineId})`}>
      <textPath href={`#${pathId}`} startOffset="50%">{text}</textPath>
    </text>
  </g>;
}

export function FactoryScreen({ state, languageId, useLanguageDial, resetProgress }: {
  state: LanguageSetupState | FactoryResetState;
  languageId: DeviceLanguageId;
  useLanguageDial: boolean;
  resetProgress: number;
}) {
  const language = DEVICE_LANGUAGES.find(item => item.id === languageId)!;
  const options = useLanguageDial ? DIAL_LANGUAGES : DEVICE_LANGUAGES;
  const languageIndex = options.findIndex(item => item.id === languageId);
  const hint = LANGUAGE_DIAL_HINTS[languageId];
  return <svg className="factory-screen" viewBox="0 0 432 432" aria-hidden="true">
    {state !== "resetRestart" && <circle cx="216" cy="216" r="175.5" fill="none" stroke="#171717" strokeDasharray="3 4" />}
    {state === "languageSelect" && <>
      {(useLanguageDial ? dialLanguageSegments : languageSegments).map((path, index) => <path key={path} d={path} fill="none" stroke={index === languageIndex ? "#E2637E" : "#252525"} strokeWidth={useLanguageDial ? dialProgressStroke : 6} strokeLinecap="round" />)}
      <text x="216" y="91" fontSize="17" fill="#999">{languageIndex + 1}/{useLanguageDial ? options.length : FACTORY_SETUP.slots}</text>
      {(useLanguageDial ? dialLanguageRows : languageRows).map(({ offset, y, opacity }) => {
        const row = options[languageIndex + offset];
        return row && <text key={row.id} lang={row.id} x="216" y={y} opacity={opacity}
          fill={offset === 0 ? "#fff" : "#999"} fontSize={offset === 0 ? 26 : 17} fontWeight={offset === 0 ? 500 : 400}>{row.label}</text>;
      })}
      {useLanguageDial && hint ? <LanguageDialHint text={hint.select} languageId={languageId} /> :
        <image href={assets + "tap.svg"} x="201.81" y="374" width="28.38" height="36.98" />}
    </>}
    {state === "languageConfirm" && <>
      <image href={assets + "globe-background.svg"} x="174" y="54" width="84" height="84" />
      <image href={assets + "globe.svg"} x="195" y="75" width="42" height="42" />
      <text lang={languageId} x="216" y={useLanguageDial ? 190 : 221} fontSize="26" fontWeight="500">{language.label}</text>
      {useLanguageDial && hint ? <LanguageDialHint text={hint.confirm} languageId={languageId} /> : <>
        <image href={assets + "back.svg"} x="121" y="285" width="74" height="90" />
        <image href={assets + "continue.svg"} x="245" y="285" width="74" height="90" />
      </>}
    </>}
    {state === "languageSuccess" && <>
      <circle cx="216" cy="185" r="42" fill="#003525" />
      <image href={assets + "success.svg"} x="188" y="157" width="56" height="56" />
      <text x="216" y="268" fontSize="33" fontWeight="500">
        {languageId === "en" ? "Setting completed" : "设置成功"}
      </text>
    </>}
    {state === "languageFailure" && <>
      <image href={assets + "failure.svg"} x="174" y="143" width="84" height="84" />
      <text x="216" y="268" fontSize="33" fontWeight="500">Setting failed</text>
    </>}
    {state === "resetConfirm" && <>
      <ellipse cx="216" cy="168" rx="42.5" ry="42" fill="#2f303a" />
      <image href={assets + "reset.svg"} x="188" y="140" width="56" height="56" />
      <text x="216" y="248" fontSize="26" fontWeight="500">Reset settings</text>
      <text x="216" y="290" fontSize="26" fill="#999">Press &amp; hold knob</text>
      {resetProgress > 0 && <text x="216" y="379" fontSize="19" fill="#999">
        {Math.max(1, Math.ceil((100 - resetProgress) * FACTORY_SETUP.resetHoldMs / 100000))} s
      </text>}
    </>}
    {state === "resetting" && <>
      <image className="factory-reset-spinner" href={assets + "resetting.svg"} x="186" y="157" width="60" height="60" />
      <text x="216" y="257" fontSize="29" fontWeight="500">Reset settings...</text>
    </>}
  </svg>;
}
