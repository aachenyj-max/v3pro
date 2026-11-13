import { DEVICE_LANGUAGES, FACTORY_SETUP, type FactoryResetState, type LanguageSetupState } from "./v3-config";

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

export function FactoryScreen({ state, languageIndex, progress, resetProgress }: {
  state: LanguageSetupState | FactoryResetState;
  languageIndex: number;
  progress: number;
  resetProgress: number;
}) {
  const language = DEVICE_LANGUAGES[languageIndex];
  const success = state === "languageSuccess";
  return <svg className="factory-screen" viewBox="0 0 432 432" aria-hidden="true">
    {state !== "resetRestart" && <circle cx="216" cy="216" r="175.5" fill="none" stroke="#171717" strokeDasharray="3 4" />}
    {state === "languageSelect" && <>
      {languageSegments.map((path, index) => <path key={path} d={path} fill="none" stroke={index === languageIndex ? "#E2637E" : "#252525"} strokeWidth="6" strokeLinecap="round" />)}
      <text x="216" y="91" fontSize="17" fill="#999">{languageIndex + 1}/{FACTORY_SETUP.slots}</text>
      {languageRows.map(({ offset, y, opacity }) => {
        const row = DEVICE_LANGUAGES[languageIndex + offset];
        return row && <text key={row.id} x="216" y={y} opacity={opacity}
          fill={offset === 0 ? "#fff" : "#999"} fontSize={offset === 0 ? 26 : 17} fontWeight={offset === 0 ? 500 : 400}>{row.label}</text>;
      })}
      <image href={assets + "tap.svg"} x="201.81" y="374" width="28.38" height="36.98" />
    </>}
    {state === "languageConfirm" && <>
      <image href={assets + "globe-background.svg"} x="174" y="54" width="84" height="84" />
      <image href={assets + "globe.svg"} x="195" y="75" width="42" height="42" />
      <text x="216" y="221" fontSize="26" fontWeight="500">{language.label}</text>
      <image href={assets + "back.svg"} x="121" y="285" width="74" height="90" />
      <image href={assets + "continue.svg"} x="245" y="285" width="74" height="90" />
    </>}
    {state === "languageQr" && <>
      <image href={assets + "qr.svg"} x="156" y="116" width="120" height="120" />
      <text x="216" y="271" fontSize="22" fontWeight="500">扫码下载并连接 App</text>
      <text x="216" y="300" fontSize="22" fontWeight="500">加载安装语言包</text>
    </>}
    {state === "languageInstall" && <>
      <image href={assets + "install.svg"} x="174" y="126" width="84" height="84" />
      <text x="216" y="248" fontSize="26" fontWeight="500">语言设置中</text>
      <text x="216" y="290" fontSize="26" fontWeight="500">{progress}%</text>
      <text x="216" y="347" fontSize="19" fill="#999">{(progress / 100 * FACTORY_SETUP.packageSizeMb).toFixed(1)}MB / {FACTORY_SETUP.packageSizeMb}MB</text>
    </>}
    {(success || state === "languageFailure") && <>
      {success ? <>
        <circle cx="216" cy="185" r="42" fill="#003525" />
        <image href={assets + "success.svg"} x="188" y="157" width="56" height="56" />
      </> : <image href={assets + "failure.svg"} x="174" y="143" width="84" height="84" />}
      <text x="216" y="268" fontSize="33" fontWeight="500">
        {language.builtIn ? (success ? "Setting completed" : "Setting failed") : (success ? "设置成功" : "设置失败")}
      </text>
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
