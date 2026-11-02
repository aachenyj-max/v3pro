"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DialHint, DualLevelScreen, NightLightScreen, NightLightHoldScreen, IpArtwork } from "./v3-controls";
import { MENU_ITEMS, MODE_COLORS, MODES, PumpMode, ScreenState, V3_CONFIG } from "./v3-config";

const fixedImages: Partial<Record<ScreenState, string>> = {
  powerOnPrompt: "/assets/v3-pro/power/开机页.svg",
  boot: "/assets/screen/开屏页.png",
  finish: "/assets/v5/feedback/吸乳完成页.svg",
  modeSuccess: "/assets/v5/feedback/成功页.svg",
};
const stateLabels: Record<ScreenState, string> = {
  off: "关机", powerOnPrompt: "开机提示", boot: "启动", home: "主页", menu: "菜单", pumping: "吸奶中", paused: "暂停",
  level: "档位", bothLevel: "双侧档位", nightLight: "夜灯", theme: "皮肤选择", endingPump: "结束中", standby: "待机", finish: "反馈", modeSuccess: "切换成功", poweringOff: "关机中",
  sealChecking: "密封检测", sealPassed: "检测通过", leakCheck: "漏气排查",
};
const leakPages = [
  "/assets/v3-pro/leak/step-1.svg",
  "/assets/v3-pro/leak/step-2.svg",
  "/assets/v3-pro/leak/step-3.svg",
];
const leakPageLabels = ["Air Seal Needs\nAttention", "Check Cup", "Check Fit"];

function HeaderStatus({ connected, battery = 80 }: { connected: boolean; battery?: number }) {
  const batteryX = connected ? 204 : 220;
  return <g className="pro-header-status" aria-label={`电量 ${battery}%${connected ? "，蓝牙已连接" : "，蓝牙未连接"}`}>
    {!connected && <image href="/assets/v5/icon/BluetoothNotConnected.svg" x="188" y="72" width="20" height="20" opacity=".82" />}
    <g transform={`translate(${batteryX} 76)`}>
      <rect x="0" y="0" width="20" height="11" rx="2" fill="none" stroke="#fff" strokeWidth="1.6" opacity=".86" />
      <rect x="20.8" y="3" width="2.2" height="5" rx="1" fill="#fff" opacity=".86" />
      <rect x="2.5" y="2.5" width={15 * battery / 100} height="6" rx="1" fill="#fff" opacity=".86" />
    </g>
  </g>;
}

function LeakInspectionScreen({ step }: { step: number }) {
  if (step === 0) {
    return <div className="leak-workflow-video-screen" role="img" aria-label={leakPageLabels[step]}>
      <video src="/assets/v3-pro/leak/step-1-animation.mp4" autoPlay muted loop playsInline preload="auto" />
      <LeakPageChrome active={step} title={leakPageLabels[step]} />
    </div>;
  }
  if (step === 1) return <SeamlessLeakVideo src="/assets/v3-pro/leak/step-2-animation-v2.mp4" holdMs={2000} label={leakPageLabels[1]}>
    <LeakPageChrome active={step} title={leakPageLabels[step]} />
  </SeamlessLeakVideo>;
  if (step === 2) return <SeamlessLeakVideo src="/assets/v3-pro/leak/step-3-animation-v3.mp4" layoutSrc="/assets/v3-pro/leak/step-3-layout-v2.svg" holdMs={2000} label={leakPageLabels[2]} artwork>
    <LeakPageChrome active={step} title={leakPageLabels[step]} />
  </SeamlessLeakVideo>;
  const source = leakPages[Math.min(step, leakPages.length - 1)];
  return <svg className="leak-workflow-screen" viewBox="0 0 432 432" role="img" aria-label={leakPageLabels[step]}>
    <defs>
      <clipPath id={`leak-inner-screen-${step}`}><circle cx="216" cy="216" r="176" /></clipPath>
    </defs>
    <circle cx="216" cy="216" r="216" fill="#000" />
    <circle cx="216" cy="216" r="176" fill="#000" />
    <image href={source} x="0" y="0" width="432" height="432" clipPath={`url(#leak-inner-screen-${step})`} />
    <path d="M152 40H280V66H152Z" fill="#000" clipPath={`url(#leak-inner-screen-${step})`} />
    <LeakStepDots active={step} />
  </svg>;
}

function SeamlessLeakVideo({
  src,
  layoutSrc,
  holdMs,
  label,
  artwork = false,
  bright = false,
  children,
}: {
  src: string;
  layoutSrc?: string;
  holdMs: number;
  label: string;
  artwork?: boolean;
  bright?: boolean;
  children?: React.ReactNode;
}) {
  const videoRefs = [useRef<HTMLVideoElement | null>(null), useRef<HTMLVideoElement | null>(null)];
  const [activeVideo, setActiveVideo] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const crossfadeToBeginning = (index: number) => {
    if (index !== activeVideo) return;
    timers.current.push(setTimeout(() => {
      const nextIndex = index === 0 ? 1 : 0;
      const nextVideo = videoRefs[nextIndex].current;
      const oldVideo = videoRefs[index].current;
      if (!nextVideo || !oldVideo) return;
      nextVideo.currentTime = 0;
      void nextVideo.play();
      setActiveVideo(nextIndex);
      timers.current.push(setTimeout(() => {
        oldVideo.pause();
        oldVideo.currentTime = 0;
      }, 700));
    }, holdMs));
  };

  return <div className={`seamless-leak-video${artwork ? " is-artwork" : " is-full-page"}${bright ? " is-bright" : ""}`} role="img" aria-label={label}>
    {layoutSrc && <img className="seamless-leak-layout" src={layoutSrc} alt="" aria-hidden="true" />}
    {[0, 1].map((index) => <video
      key={index}
      ref={videoRefs[index]}
      className={index === activeVideo ? "is-active" : ""}
      src={src}
      autoPlay={index === 0}
      muted
      playsInline
      preload="auto"
      onEnded={() => crossfadeToBeginning(index)}
    />)}
    {children}
  </div>;
}

function LeakFinalAnimation() {
  return <SeamlessLeakVideo src="/assets/v3-pro/leak/step-4-animation-v3.mp4" layoutSrc="/assets/v3-pro/leak/step-4-layout-v3.svg" holdMs={650} label="Self-Check Complete" artwork bright>
    <LeakPageChrome active={3} title="Self-Check Complete" />
    <svg className="leak-final-copy-overlay" viewBox="0 0 432 432" aria-hidden="true">
      <defs>
        <linearGradient id="leak-final-copy-shine" gradientUnits="userSpaceOnUse" x1="108" y1="0" x2="168" y2="0">
          <stop stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".72" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
          <animate attributeName="x1" values="108;264" dur="3.6s" repeatCount="indefinite" />
          <animate attributeName="x2" values="168;324" dur="3.6s" repeatCount="indefinite" />
        </linearGradient>
      </defs>
      <rect x="130" y="345" width="172" height="31" fill="#000" />
      <g className="leak-final-animation-copy">
        <text x="216" y="367" textAnchor="middle" fill="#929292">Press to resume</text>
        <text className="leak-final-shine-text" x="216" y="367" textAnchor="middle" style={{ fill: "url(#leak-final-copy-shine)" }}>Press to resume</text>
      </g>
    </svg>
  </SeamlessLeakVideo>;
}

function LeakPageChrome({ active, title }: { active: number; title: string }) {
  const titleLines = title.split("\n");
  const isTwoLineTitle = titleLines.length > 1;
  return <svg className="leak-page-chrome" viewBox="0 0 432 432" aria-hidden="true">
    <rect x="80" y="34" width="272" height={isTwoLineTitle ? 118 : 92} fill="#000" />
    <LeakStepDots active={active} />
    <text className="leak-page-title" x="216" y={isTwoLineTitle ? 106 : 106} textAnchor="middle">
      {titleLines.map((line, index) => <tspan key={line} x="216" dy={index === 0 ? 0 : 31}>{line}</tspan>)}
    </text>
  </svg>;
}

function LeakStepDots({ active }: { active: number }) {
  const positions = [[183, 49], [205, 46], [227, 46], [249, 49]];
  return <g className="leak-step-dots" aria-label={`漏气排查第 ${active + 1} 步`}>
    {positions.map(([cx, cy], index) => <circle key={index} cx={cx} cy={cy} r="5.4" className={index === active ? "active" : ""} />)}
  </g>;
}
const modeTitles: Record<PumpMode, string> = {
  stimulation: "Stimulation",
  expression: "Expression",
  powerPumping: "Power Pumping",
  milkBoost: "Milk Boost",
  cozyFlow: "Cozy Flow",
  customized: "Customized",
};
const modeBackgrounds: Record<PumpMode, string> = {
  stimulation: "/assets/v5/background/背景底图-stimulation.jpg",
  expression: "/assets/v5/background/背景底图-expression.jpg",
  powerPumping: "/assets/v5/background/背景底图-program.jpg",
  milkBoost: "/assets/v5/background/背景底图-program.jpg",
  cozyFlow: "/assets/v5/background/背景底图-program.jpg",
  customized: "/assets/v5/background/背景底图-program.jpg",
};
const modeCurves: Record<PumpMode, string> = {
  stimulation: "/assets/v5/icon/曲线sti.svg",
  expression: "/assets/v5/icon/曲线exp.svg",
  powerPumping: "/assets/v5/icon/曲线program.svg",
  milkBoost: "/assets/v5/icon/曲线program.svg",
  cozyFlow: "/assets/v5/icon/曲线program.svg",
  customized: "/assets/v5/icon/曲线program.svg",
};
const modeAnimatedCurves: Record<PumpMode, string> = {
  stimulation: "/assets/v3-pro/curves/stimulation.webp",
  expression: "/assets/v3-pro/curves/expression.webp",
  powerPumping: "/assets/v3-pro/curves/program-dots.webp",
  milkBoost: "/assets/v3-pro/curves/program-dots.webp",
  cozyFlow: "/assets/v3-pro/curves/program-dots.webp",
  customized: "/assets/v3-pro/curves/program-dots.webp",
};
const modeHintColors: Record<PumpMode, string> = {
  stimulation: "#B98F9A",
  expression: "#B9CAE3",
  powerPumping: "#BDB1D6",
  milkBoost: "#BDB1D6",
  cozyFlow: "#BDB1D6",
  customized: "#BDB1D6",
};
const modeShineColors: Record<PumpMode, string> = {
  stimulation: "#FFF1F4",
  expression: "#EAF3FF",
  powerPumping: "#F4EEFF",
  milkBoost: "#F4EEFF",
  cozyFlow: "#F4EEFF",
  customized: "#F4EEFF",
};

function MenuScreen({ index, showHint }: { index: number; showHint: boolean }) {
  const item = MENU_ITEMS[index];
  const dotY = [82, 75, 71, 71, 75, 82];
  return <svg className="menu-screen-svg" viewBox="0 0 432 432" role="img" aria-label={item.label}>
    <defs>
      <clipPath id="menu-icon-clip"><rect x="120" y="105" width="192" height="124" /></clipPath>
      <path id="menu-hint-path" d="M98.62 333.38 A166 166 0 0 0 333.38 333.38" />
      <linearGradient id="menu-hint-shine-gradient" x1="-5%" y1="0" x2="45%" y2="0">
        <stop stopColor="white" stopOpacity="0" /><stop offset=".25" stopColor="white" stopOpacity=".18" /><stop offset=".5" stopColor="white" stopOpacity=".58" /><stop offset=".75" stopColor="white" stopOpacity=".18" /><stop offset="1" stopColor="white" stopOpacity="0" />
        <animate attributeName="x1" values="-5%;110%;110%;-5%;-5%" keyTimes="0;.68;.76;.84;1" dur="3.6s" repeatCount="indefinite" />
        <animate attributeName="x2" values="45%;160%;160%;45%;45%" keyTimes="0;.68;.76;.84;1" dur="3.6s" repeatCount="indefinite" />
      </linearGradient>
    </defs>
    <rect width="432" height="432" fill="#000" />
    <g clipPath="url(#menu-icon-clip)" transform="translate(216 167) scale(1.2) translate(-216 -167)">
      <image href={item.image} x="0" y="0" width="432" height="432" />
    </g>
    <g className="menu-dots">
      {MENU_ITEMS.map((entry, dotIndex) => <circle key={entry.label} cx={166 + dotIndex * 20} cy={dotY[dotIndex]} r="5" className={dotIndex === index ? "active" : ""} />)}
    </g>
    <text className="menu-screen-title" x="216" y="264" textAnchor="middle">{item.label}</text>
    {item.estimate && <text className="menu-screen-estimate" x="216" y="300" textAnchor="middle">{item.estimate}</text>}
    {showHint && <>
      <text className="menu-screen-hint"><textPath href="#menu-hint-path" startOffset="50%" textAnchor="middle">Press the knob to confirm</textPath></text>
      <text className="menu-hint-shine-text" fill="url(#menu-hint-shine-gradient)"><textPath href="#menu-hint-path" startOffset="50%" textAnchor="middle">Press the knob to confirm</textPath></text>
    </>}
  </svg>;
}

function PumpScreenSvg({
  state,
  mode,
  seconds,
  leftLevel,
  rightLevel,
  speedLevel,
  bluetoothConnected,
  leakFinal = false,
  lightOffFeedback = false,
  theme = "minimal",
}: {
  state: "home" | "pumping" | "paused" | "sealChecking" | "sealPassed";
  mode: PumpMode;
  seconds: number;
  leftLevel: number;
  rightLevel: number;
  speedLevel: number;
  bluetoothConnected: boolean;
  leakFinal?: boolean;
  lightOffFeedback?: boolean;
  theme?: "minimal" | "ip";
}) {
  const background = modeBackgrounds[mode];
  const isSealStatus = state === "sealChecking" || state === "sealPassed";
  const isPaused = state === "paused" || leakFinal;
  const isPumping = state === "pumping" || isSealStatus;
  const showStartingHint = state === "pumping" && seconds < 5;
  const hint = isPaused ? "Press to resume" : "Press to start pumping";
  const sealHint = state === "sealChecking" ? "Checking seal..." : state === "sealPassed" ? "Seal check passed" : "";
  const displayTitle = modeTitles[mode];

  return (
    <svg className={`pump-screen-svg pump-screen-svg-${state}${leakFinal ? " pump-screen-svg-leak-final" : ""}${lightOffFeedback ? " pump-screen-svg-light-off" : ""}`} viewBox="0 0 432 432" role="img" aria-label={`${modeTitles[mode]} ${state}`}>
      <defs>
        <clipPath id={`screen-circle-${state}`}><circle cx="216" cy="216" r="176" /></clipPath>
        <linearGradient id="hint-shine-gradient" x1="-5%" y1="0" x2="45%" y2="0">
          <stop stopColor={modeShineColors[mode]} stopOpacity="0" /><stop offset=".25" stopColor={modeShineColors[mode]} stopOpacity=".18" /><stop offset=".5" stopColor={modeShineColors[mode]} stopOpacity=".58" /><stop offset=".75" stopColor={modeShineColors[mode]} stopOpacity=".18" /><stop offset="1" stopColor={modeShineColors[mode]} stopOpacity="0" />
          <animate attributeName="x1" values="-5%;110%;110%;-5%;-5%" keyTimes="0;.68;.76;.84;1" dur="3.6s" repeatCount="indefinite" />
          <animate attributeName="x2" values="45%;160%;160%;45%;45%" keyTimes="0;.68;.76;.84;1" dur="3.6s" repeatCount="indefinite" />
        </linearGradient>
        <linearGradient id="final-shared-shine" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="165" y2="0">
          <stop stopColor={modeShineColors[mode]} stopOpacity="0" /><stop offset=".25" stopColor={modeShineColors[mode]} stopOpacity=".18" /><stop offset=".5" stopColor={modeShineColors[mode]} stopOpacity=".58" /><stop offset=".75" stopColor={modeShineColors[mode]} stopOpacity=".18" /><stop offset="1" stopColor={modeShineColors[mode]} stopOpacity="0" />
          <animate attributeName="x1" values="0;370" dur="3.6s" repeatCount="indefinite" />
          <animate attributeName="x2" values="165;535" dur="3.6s" repeatCount="indefinite" />
        </linearGradient>
      </defs>

      <rect width="432" height="432" fill="#000" />
      <image href={background} x="40" y="40" width="352" height="352" preserveAspectRatio="xMidYMid slice" clipPath={`url(#screen-circle-${state})`} />
      {theme === "ip" && !isSealStatus && <g clipPath={`url(#screen-circle-${state})`}><IpArtwork /></g>}
      <HeaderStatus connected={bluetoothConnected} />
      <text className="pump-svg-title" x="216" y="124" textAnchor="middle">{displayTitle}</text>
      {((isPaused && !leakFinal) || state === "home") && <text className="pump-svg-hint" x="216" y={theme === "ip" ? 366 : 261} textAnchor="middle" style={{ fill: modeHintColors[mode] }}>{hint}</text>}
      {((isPaused && !leakFinal) || state === "home") && <text className="pump-hint-shine-text" x="216" y={theme === "ip" ? 366 : 261} textAnchor="middle" style={{ fill: "url(#hint-shine-gradient)" }}>{hint}</text>}

      {isPumping && <>
        {!isSealStatus && <text className="pump-svg-time" x="216" y={lightOffFeedback ? "213" : "226"} textAnchor="middle">{formatTime(seconds)}</text>}
        {!isSealStatus && !showStartingHint && (lightOffFeedback ? <image className="pump-sequence-curve" href={mode === "stimulation" ? "/assets/v3-pro/figma-light-off/pump-curve.svg" : modeCurves[mode]} x="38.768" y="226" width="354.266" height="56" preserveAspectRatio="none" clipPath={`url(#screen-circle-${state})`} /> : <image className="pump-sequence-curve" href={modeAnimatedCurves[mode]} x="36" y="234" width="360" height="56" preserveAspectRatio="none" clipPath={`url(#screen-circle-${state})`} />)}
        {showStartingHint && <>
          <text className="pump-svg-hint" x="216" y="261" textAnchor="middle" style={{ fill: modeHintColors[mode] }}>Turn knob to adjust both sides&apos; level</text>
          <text className="pump-hint-shine-text" x="216" y="261" textAnchor="middle" style={{ fill: "url(#hint-shine-gradient)" }}>Turn knob to adjust both sides&apos; level</text>
        </>}
      </>}

      {isPaused && <>
        <image className="pause-curve-svg" href={modeCurves[mode]} x="40" y="184" width="352" height="54" preserveAspectRatio="none" clipPath={`url(#screen-circle-${state})`} opacity=".42" />
        <image href="/assets/v5/pump/暂停页暂停UI.svg" x="187" y="172" width="58" height="62" />
      </>}
      {state === "home" && theme !== "ip" && <>
        <text className="pump-svg-time" x="216" y="226" textAnchor="middle">{formatTime(seconds)}</text>
      </>}

      {state === "sealChecking" && <foreignObject x="171" y="151" width="90" height="90" aria-label="Checking seal loading">
        <div className="seal-loading-indicator"><span /></div>
      </foreignObject>}
      {state === "sealPassed" && <g className="seal-passed-icon" aria-label="Seal check passed">
        <circle className="seal-passed-icon-bg" cx="216" cy="196" r="33" />
        <path className="seal-passed-icon-check" d="M201.795 201.058C201.795 201.058 204.839 201.058 208.898 208.161C208.898 208.161 220.178 189.559 230.205 185.839" />
      </g>}

      {isSealStatus && <g className="seal-status-hint">
        <text x="216" y="261" textAnchor="middle" style={state === "sealPassed" ? { fill: modeShineColors[mode], opacity: .72 } : { fill: modeHintColors[mode] }}>{sealHint}</text>
        {state === "sealChecking" && <text className="pump-hint-shine-text" x="216" y="261" textAnchor="middle" style={{ fill: "url(#hint-shine-gradient)" }}>{sealHint}</text>}
      </g>}

      {leakFinal && <g className="leak-final-overlay">
        <LeakStepDots active={3} />
        <text x="216" y="260" textAnchor="middle" style={{ fill: modeHintColors[mode] }}>Press to resume</text>
        <text x="216" y="286" textAnchor="middle" style={{ fill: modeHintColors[mode] }}>Press and hold to end pumping</text>
        <text className="pump-hint-shine-text" x="216" y="260" textAnchor="middle" style={{ fill: "url(#final-shared-shine)" }}>Press to resume</text>
        <text className="pump-hint-shine-text" x="216" y="286" textAnchor="middle" style={{ fill: "url(#final-shared-shine)" }}>Press and hold to end pumping</text>
      </g>}

      <g className="pump-svg-values">
          <text x="154" y="327" textAnchor="middle">L{leftLevel}</text>
          <image href={lightOffFeedback ? "/assets/v3-pro/figma-light-off/speed-icon.svg" : "/assets/v5/icon/speed.svg"} x="194" y={lightOffFeedback ? "306" : "308"} width={lightOffFeedback ? "24" : "20"} height={lightOffFeedback ? "24" : "20"} />
          <text x="226" y="327" textAnchor="middle">{speedLevel}</text>
          <text x="278" y="327" textAnchor="middle">R{rightLevel}</text>
      </g>
    </svg>
  );
}

function StandbyScreen() {
  return <svg className="standby-text-shine" viewBox="0 0 432 432" role="img" aria-label="Press anywhere to wake up">
    <defs>
      <linearGradient id="standby-text-cleanup" x1="0" y1="116" x2="0" y2="154" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0F0507" /><stop offset="1" stopColor="#160609" />
      </linearGradient>
      <linearGradient id="standby-shine-gradient" x1="-5%" y1="0" x2="45%" y2="0">
        <stop stopColor="#FFF7FA" stopOpacity="0" /><stop offset=".25" stopColor="#FFF7FA" stopOpacity=".18" /><stop offset=".5" stopColor="#FFF7FA" stopOpacity=".58" /><stop offset=".75" stopColor="#FFF7FA" stopOpacity=".18" /><stop offset="1" stopColor="#FFF7FA" stopOpacity="0" />
        <animate attributeName="x1" values="-5%;110%;110%;-5%;-5%" keyTimes="0;.68;.76;.84;1" dur="3.6s" repeatCount="indefinite" />
        <animate attributeName="x2" values="45%;160%;160%;45%;45%" keyTimes="0;.68;.76;.84;1" dur="3.6s" repeatCount="indefinite" />
      </linearGradient>
    </defs>
    <image href="/assets/screen/待机页.png" x="0" y="0" width="432" height="432" />
    <rect x="80" y="116" width="272" height="39" fill="url(#standby-text-cleanup)" />
    <text className="standby-base-text" x="216" y="145" textAnchor="middle">Press anywhere to wake up</text>
    <text className="standby-shine-text" x="216" y="145" textAnchor="middle" fill="url(#standby-shine-gradient)">Press anywhere to wake up</text>
  </svg>;
}

const arcPath = "M303.941 288.7C325.618 264.092 339.738 233.754 344.609 201.324C349.48 168.894 344.895 135.747 331.403 105.857C317.912 75.9667 296.087 50.6014 268.544 32.8015C241.002 15.0016 208.91 5.52233 176.116 5.50004C143.322 5.47775 111.218 14.9134 83.6506 32.6758C56.0837 50.4383 34.2242 75.7739 20.6923 105.646C7.16035 135.518 2.53028 168.658 7.35702 201.095C12.1838 233.532 26.2625 263.888 47.9057 288.526";

function ArcProgress({ percent, color }: { percent: number; color: string }) {
  const safePercent = Math.max(0, Math.min(100, percent));
  return <svg className="arc-progress-svg" viewBox="0 0 432 432" aria-hidden="true">
    <g transform="translate(40 40)">
      <path d={arcPath} fill="none" stroke="#252525" strokeWidth="11" strokeLinecap="round" />
      <path d={arcPath} fill="none" stroke={color} strokeWidth="11" strokeLinecap="round" pathLength="100"
        strokeDasharray={`${safePercent} ${100 - safePercent}`} transform="translate(352 0) scale(-1 1)" />
    </g>
  </svg>;
}

const speedSegments = [
  "M15.8844 117.406C23.843 95.658 36.1488 75.7592 52.051 58.9236",
  "M123.264 13.8606C103.433 20.3106 84.9541 30.3437 68.7438 43.4619",
  "M209.063 8.7364C188.605 4.69261 167.579 4.436 147.029 7.97932",
  "M232.525 15.1424C252.199 22.0558 270.438 32.5197 286.336 46.0146",
  "M303.508 62.8099C317.352 78.405 328.217 96.4074 335.565 115.923",
];

function SpeedProgress({ level, color }: { level: number; color: string }) {
  return <svg className="speed-progress-svg" viewBox="0 0 432 432" aria-hidden="true">
    <g transform="translate(40 40)">
      {speedSegments.map((path, index) => <path key={path} d={path} fill="none" stroke={index === level - 1 ? color : "#252525"} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />)}
    </g>
  </svg>;
}

function MiniTimer({ seconds, status, success = false, dual = false }: { seconds: number; status: "idle" | "running" | "paused"; success?: boolean; dual?: boolean }) {
  const isRunning = status === "running";
  if (dual) return <svg className="mini-timer mini-timer-dual" viewBox="0 0 432 432" role="img" aria-label={`${isRunning ? "吸奶中" : "已暂停"} ${formatTime(seconds)}`}>
    <image href="/assets/v5/timer/Union.svg" x="110" y="329" width="212" height="63" />
    <foreignObject x="110" y="329" width="212" height="54">
      <div className="dual-timer-content">
        <img src={isRunning ? "/assets/v5/timer/State=Pause.svg" : "/assets/v5/timer/State=Play.svg"} width="18" height="19" alt="" />
        <span>{formatTime(seconds)}</span>
      </div>
    </foreignObject>
  </svg>;
  return <svg className={`mini-timer${success ? " mini-timer-success" : ""}`} viewBox="0 0 432 432" role="img" aria-label={`${isRunning ? "吸奶中" : "已暂停"} ${formatTime(seconds)}`}>
    {success && <rect className="mini-timer-cleanup" x="100" y="315" width="232" height="97" />}
    <image href="/assets/v5/timer/Union.svg" x="107" y="329" width="218" height="64.6" />
    <image href={isRunning ? "/assets/v5/timer/State=Pause.svg" : "/assets/v5/timer/State=Play.svg"} x="169.5" y="346.7" width="18" height="19" />
    <text className="mini-timer-text" x="202" y="366">{formatTime(seconds)}</text>
  </svg>;
}

function SuccessTimerArea({ seconds, status }: { seconds: number; status: "idle" | "running" | "paused" }) {
  if (status !== "idle") return <MiniTimer seconds={seconds} status={status} success />;
  return <svg className="mini-timer" viewBox="0 0 432 432" aria-hidden="true">
    <rect className="mini-timer-cleanup" x="100" y="315" width="232" height="97" />
  </svg>;
}

function formatTime(total: number) {
  const minutes = Math.floor(total / 60).toString().padStart(2, "0");
  const seconds = (total % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function DeviceDemo() {
  const [solution, setSolution] = useState<1 | 2>(1);
  const [state, setState] = useState<ScreenState>("off");
  const [previousState, setPreviousState] = useState<ScreenState>("home");
  const [mode, setMode] = useState<PumpMode>(V3_CONFIG.defaultMode);
  const [leftLevel, setLeftLevel] = useState(V3_CONFIG.defaultLevel);
  const [rightLevel, setRightLevel] = useState(V3_CONFIG.defaultLevel);
  const [speedLevel, setSpeedLevel] = useState(V3_CONFIG.defaultSpeed);
  const [activeControl, setActiveControl] = useState<"left" | "right" | "speed">("left");
  const [menuIndex, setMenuIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [pumpStatus, setPumpStatus] = useState<"idle" | "running" | "paused">("idle");
  const [leakStep, setLeakStep] = useState(0);
  const [bluetoothConnected, setBluetoothConnected] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [showDebug, setShowDebug] = useState(true);
  const [toast, setToast] = useState("长按圆屏 2 秒开机");
  const [holdProgress, setHoldProgress] = useState(0);
  const [powerOnPromptActivity, setPowerOnPromptActivity] = useState(0);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [transitionKind, setTransitionKind] = useState<"finish" | "poweroff" | null>(null);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionReturnState = useRef<ScreenState>("home");
  const modeSwitchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const levelReturnState = useRef<ScreenState>("home");
  const levelConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStart = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const standbyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickLock = useRef(false);
  const [theme, setTheme] = useState<"minimal" | "ip">("minimal");
  const themeChosen = useRef(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("v3pro.theme.v1");
      if (saved === "minimal" || saved === "ip") { setTheme(saved); themeChosen.current = true; }
      const savedLevel = Number(localStorage.getItem("v3pro.night-level.v1"));
      if (savedLevel >= 1 && savedLevel <= 3) setNightLevel(savedLevel);
    } catch { /* Storage may be unavailable in private browsing. */ }
  }, []);
  const [nightOn, setNightOn] = useState(false);
  const [nightLevel, setNightLevel] = useState(2);
  const [ambientLight, setAmbientLight] = useState(35);
  useEffect(() => {
    try { localStorage.setItem("v3pro.night-level.v1", String(nightLevel)); } catch { /* Keep session state when storage is unavailable. */ }
  }, [nightLevel]);
  const [nightAuto, setNightAuto] = useState(true);
  const [lightFeedbackSequence, setLightFeedbackSequence] = useState(0);
  const [lightFeedback, setLightFeedback] = useState<"on" | "off" | null>(null);
  const [nightClosing, setNightClosing] = useState(false);
  const [nightHoldProgress, setNightHoldProgress] = useState(0);
  const [nightDimmed, setNightDimmed] = useState(false);
  const [levelLimit, setLevelLimit] = useState(false);
  const levelEntry = useRef({ left: leftLevel, right: rightLevel });
  const nightReturn = useRef<ScreenState>("off");
  const nightTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const nightHeld = useRef(false);
  const nightFirstOn = useRef(true);
  const screenRef = useRef<HTMLDivElement>(null);
  const wheelAccumulator = useRef(0);
  const wheelGestureLocked = useRef(false);
  const wheelGestureEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPowered = !(state === "nightLight" && nightReturn.current === "off") && state !== "off" && state !== "powerOnPrompt" && state !== "poweringOff";
  const isRunning = pumpStatus === "running";
  const deviceControlsLocked = !isPowered || state === "boot" || state === "theme" || state === "leakCheck";
  const modeColor = MODE_COLORS[mode];
  const lampIntensity = nightAuto ? .88 - ambientLight / 100 * .56 : [0, .32, .62, 1][nightLevel];

  const resetIdle = useCallback(() => {
    if (!isPowered || state === "boot" || state === "standby" || state === "endingPump") return;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setPreviousState(state);
      setState("standby");
      setToast("已进入待机，点按或操作按键唤醒");
    }, V3_CONFIG.standbyAfterMs);
  }, [isPowered, state]);

  useEffect(() => {
    resetIdle();
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, [resetIdle]);
  useEffect(() => {
    if (state !== "standby") {
      if (standbyTimer.current) clearTimeout(standbyTimer.current);
      return;
    }
    standbyTimer.current = setTimeout(() => { setState("off"); setPumpStatus("idle"); setNightOn(false); }, V3_CONFIG.powerOffAfterMs);
    return () => { if (standbyTimer.current) clearTimeout(standbyTimer.current); };
  }, [state]);
  useEffect(() => {
    if (state !== "powerOnPrompt") return;
    const timer = setTimeout(() => {
      setState("off");
      setHoldProgress(0);
      setToast("长按圆屏 2 秒开机");
    }, V3_CONFIG.powerOnPromptTimeoutMs);
    return () => clearTimeout(timer);
  }, [powerOnPromptActivity, state]);
  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    if (state === "sealChecking") {
      const timer = setTimeout(() => { setState("sealPassed"); setToast("Seal check passed"); }, 5000);
      return () => clearTimeout(timer);
    }
    if (state === "sealPassed") {
      const timer = setTimeout(() => {
        setState("pumping");
        setToast("密封检测通过，开始正常吸奶");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  useEffect(() => {
    if (state !== "menu" || pumpStatus !== "running") return;
    const timer = setTimeout(() => {
      setState("pumping");
      setToast("设备子页无操作，已返回吸奶中");
    }, 3000);
    return () => clearTimeout(timer);
  }, [menuIndex, pumpStatus, state]);

  const wake = useCallback((target?: ScreenState) => {
    if (state !== "standby") return false;
    setState(target ?? (previousState === "standby" ? "home" : previousState));
    setToast("屏幕已唤醒");
    return true;
  }, [previousState, state]);

  const showTemporary = useCallback((nextMode: PumpMode) => {
    if (!isPowered || ["boot", "endingPump", "poweringOff", "leakCheck", "theme"].includes(state)) return;
    if (state === "standby") { wake(); return; }
    setMode(nextMode);
    if (pumpStatus === "idle") {
      setSeconds(0);
      setState("home");
      setToast(`${modeTitles[nextMode]} · 已选择，点按圆盘开始吸奶`);
      return;
    }
    setPumpStatus("running");
    setState("pumping");
    setToast(`${modeTitles[nextMode]} · 已启动吸奶`);
  }, [isPowered, pumpStatus, state, wake]);

  const togglePump = useCallback(() => {
    if (!isPowered || state === "boot" || state === "theme" || state === "endingPump" || state === "leakCheck") return;
    if (state === "standby") { wake("home"); return; }
    if (pumpStatus === "running") {
      setPumpStatus("paused"); setState("paused"); setToast("吸奶已暂停");
    } else if (pumpStatus === "paused") {
      setPumpStatus("running"); setState("pumping"); setToast("继续吸奶");
    } else {
      setSeconds(0); setPumpStatus("running"); setState("pumping"); setToast("已开始吸奶");
    }
  }, [isPowered, pumpStatus, seconds, state, wake]);

  const handlePauseButton = useCallback(() => {
    if (state === "leakCheck") {
      if (leakStep < 3) {
        const nextStep = leakStep + 1;
        setLeakStep(nextStep);
        setToast(`严重漏气 ${nextStep + 1}`);
        return;
      }
      setPumpStatus("running");
      setState("pumping");
      setToast("漏气排查完成，继续吸奶");
      return;
    }
    togglePump();
  }, [leakStep, state, togglePump]);

  const triggerSevereLeak = useCallback(() => {
    if (pumpStatus !== "running") { setToast("严重漏气检测仅可在吸奶中触发"); return; }
    setPumpStatus("paused"); setLeakStep(0); setState("leakCheck");
    setToast("检测到严重漏气，吸奶已暂停");
  }, [pumpStatus]);

  const openLevel = useCallback((side: "left" | "right" | "speed") => {
    if (!isPowered || state === "boot" || state === "theme" || state === "endingPump" || state === "leakCheck") return;
    if (levelConfirmTimer.current) clearTimeout(levelConfirmTimer.current);
    levelConfirmTimer.current = null;
    if (state !== "level" && state !== "bothLevel") {
      levelReturnState.current = state === "menu" && pumpStatus === "running"
        ? "pumping"
        : state === "standby"
        ? (pumpStatus === "running" ? "pumping" : pumpStatus === "paused" ? "paused" : "home")
        : state;
    }
    if (state === "standby") { wake(); return; }
    if (state === "level" && activeControl === side) {
      setState(levelReturnState.current); return;
    }
    levelEntry.current = { left: leftLevel, right: rightLevel };
    setLevelLimit(false);
    setActiveControl(side); setState("level");
    setToast(side === "speed" ? "韵律速度调节" : `${side === "left" ? "左侧" : "右侧"}档位调节`);
  }, [activeControl, leftLevel, rightLevel, isPowered, pumpStatus, state, wake]);

  const confirmLevel = useCallback((automatic = false) => {
    if (levelConfirmTimer.current) clearTimeout(levelConfirmTimer.current);
    levelConfirmTimer.current = null;
    setState(levelReturnState.current);
    const label = activeControl === "left" ? "左侧档位" : activeControl === "right" ? "右侧档位" : "韵律速度";
    setToast(`${state === "bothLevel" ? "双侧档位" : label}已${automatic ? "自动" : ""}确认`);
  }, [activeControl, state]);

  useEffect(() => {
    if (state !== "level" && state !== "bothLevel") return;
    if (levelConfirmTimer.current) clearTimeout(levelConfirmTimer.current);
    levelConfirmTimer.current = setTimeout(() => confirmLevel(true), 5000);
    return () => {
      if (levelConfirmTimer.current) clearTimeout(levelConfirmTimer.current);
      levelConfirmTimer.current = null;
    };
  }, [activeControl, confirmLevel, state]);

  useEffect(() => () => {
    if (levelConfirmTimer.current) clearTimeout(levelConfirmTimer.current);
  }, []);
  useEffect(() => {
    if (state !== "level" && state !== "bothLevel" && levelConfirmTimer.current) {
      clearTimeout(levelConfirmTimer.current);
      levelConfirmTimer.current = null;
    }
  }, [state]);
  useEffect(() => () => {
    if (modeSwitchTimer.current) clearTimeout(modeSwitchTimer.current);
  }, []);
  useEffect(() => {
    const screen = screenRef.current;
    const preventScreenScroll = (event: WheelEvent) => event.preventDefault();
    screen?.addEventListener("wheel", preventScreenScroll, { passive: false });
    return () => {
      screen?.removeEventListener("wheel", preventScreenScroll);
      if (wheelGestureEndTimer.current) clearTimeout(wheelGestureEndTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!lightFeedback) return;
    const timer = setTimeout(() => setLightFeedback(null), 3000);
    return () => clearTimeout(timer);
  }, [lightFeedback, lightFeedbackSequence]);

  useEffect(() => {
    if (state !== "nightLight" || nightClosing || nightDimmed) return;
    const timer = setTimeout(() => {
      if (nightReturn.current === "off") setNightDimmed(true);
      else setState(nightReturn.current);
    }, 5000);
    return () => clearTimeout(timer);
  }, [state, nightLevel, nightAuto, nightClosing, nightDimmed]);

  useEffect(() => () => {
    if (nightTimer.current) clearInterval(nightTimer.current);
    if (holdTimer.current) clearInterval(holdTimer.current);
    if (transitionTimer.current) clearInterval(transitionTimer.current);
  }, []);

  const toggleNight = useCallback(() => {
    if (nightHeld.current || ["boot", "poweringOff", "endingPump", "theme"].includes(state)) return;
    if (!nightOn) {
      setNightOn(true);
      setNightAuto(nightFirstOn.current || nightLevel === 1);
      nightFirstOn.current = false;
    }
    if (pumpStatus === "running") { setState("pumping"); setLightFeedback("on"); setLightFeedbackSequence(value => value + 1); return; }
    if (state !== "nightLight") nightReturn.current = state === "standby" ? "home" : state === "powerOnPrompt" ? "off" : state;
    setNightDimmed(false);
    setState("nightLight");
    setToast("夜灯：滚轮调整亮度，长按夜灯键关闭");
  }, [nightLevel, nightOn, pumpStatus, state]);

  const stopNightHold = useCallback(() => {
    if (nightTimer.current) clearInterval(nightTimer.current);
    nightTimer.current = null;
    setNightClosing(false); setNightHoldProgress(0);
    setTimeout(() => { nightHeld.current = false; }, 250);
  }, []);

  const beginNightHold = useCallback(() => {
    if (!nightOn || ["boot", "poweringOff", "endingPump", "theme"].includes(state)) return;
    const start = Date.now();
    nightHeld.current = false;
    setNightDimmed(false);
    nightTimer.current = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed > 350) {
        nightHeld.current = true;
        if (pumpStatus !== "running") { setNightClosing(true); setNightHoldProgress(Math.min(100, elapsed / 2000 * 100)); }
      }
      if (elapsed >= 2000) {
        if (nightTimer.current) clearInterval(nightTimer.current);
        nightTimer.current = null;
        setNightOn(false); setNightClosing(false); setNightHoldProgress(0); setNightDimmed(false);
        setToast("夜灯已关闭，已记住上次亮度");
        if (pumpStatus === "running") { setState("pumping"); setLightFeedback("off"); setLightFeedbackSequence(value => value + 1); }
        else if (state !== "nightLight") { nightReturn.current = state === "standby" ? "home" : state; setNightDimmed(false); setState("nightLight"); }
      }
    }, 40);
  }, [nightOn, pumpStatus, state]);

  const startPowerOn = useCallback(() => {
    if (state !== "off" && state !== "powerOnPrompt" && !(state === "nightLight" && nightReturn.current === "off")) return;
    nightFirstOn.current = true;
    setNightOn(false);
    setState("boot"); setToast("设备启动中…");
    setTimeout(() => { setState(themeChosen.current ? "home" : "theme"); setToast(themeChosen.current ? "Stimulation 默认主页" : "滚轮选择皮肤，点按圆盘确认"); }, V3_CONFIG.bootDurationMs);
  }, [state]);

  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    if (state === "standby") { wake("home"); return; }
    const gestureDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : -event.deltaX;
    if (wheelGestureLocked.current) return;
    if (wheelGestureEndTimer.current) clearTimeout(wheelGestureEndTimer.current);
    wheelGestureEndTimer.current = setTimeout(() => {
      wheelGestureLocked.current = false;
      wheelAccumulator.current = 0;
    }, 120);
    wheelAccumulator.current += gestureDelta;
    if (Math.abs(wheelAccumulator.current) < (state === "level" ? 18 : 22)) return;
    const direction = wheelAccumulator.current > 0 ? 1 : -1;
    wheelAccumulator.current = 0;
    wheelGestureLocked.current = true;
    if (state === "leakCheck") {
      setLeakStep((value) => Math.max(0, Math.min(3, value + direction)));
      setToast("使用滚轮或触控板切换漏气排查页面");
      return;
    }
    if (state === "theme") { setTheme(value => value === "minimal" ? "ip" : "minimal"); return; }
    if (state === "nightLight") {
      if (!nightOn) return;
      setNightDimmed(false);
      const next = Math.min(3, Math.max(1, (nightAuto ? 1 : nightLevel) + direction));
      setNightAuto(next === 1);
      setNightLevel(next);
      return;
    }
    if (state === "paused" || state === "home" || state === "pumping") {
      levelEntry.current = { left: leftLevel, right: rightLevel };
      levelReturnState.current = state;
      setLevelLimit(false); setState("bothLevel");
      setToast("双侧吸力：滚轮向下增加、向上减少；点按圆盘确认");
      return;
    }
    if (state === "level" || state === "bothLevel") {
      const limit = (value: number, initial: number) => Math.min(V3_CONFIG.maxLevel, initial + 3, Math.max(V3_CONFIG.minLevel, value + direction));
      const left = limit(leftLevel, levelEntry.current.left);
      const right = limit(rightLevel, levelEntry.current.right);
      const hit = direction > 0 && ((state === "bothLevel" || activeControl === "left") && leftLevel >= levelEntry.current.left + 3 || (state === "bothLevel" || activeControl === "right") && rightLevel >= levelEntry.current.right + 3);
      setLevelLimit(hit);
      if (state === "bothLevel" || activeControl === "left") setLeftLevel(left);
      if (state === "bothLevel" || activeControl === "right") setRightLevel(right);
      if (state === "level" && activeControl === "speed") setSpeedLevel(value => Math.min(V3_CONFIG.maxSpeed, Math.max(1, value + direction)));
      if (levelConfirmTimer.current) clearTimeout(levelConfirmTimer.current);
      levelConfirmTimer.current = setTimeout(() => confirmLevel(true), 5000);
    }
  }, [activeControl, confirmLevel, leftLevel, rightLevel, nightAuto, nightLevel, nightOn, state, wake]);

  const handleScreenClick = useCallback(() => {
    if (clickLock.current) return;
    if (state === "off") { setState("powerOnPrompt"); setPowerOnPromptActivity((value) => value + 1); setToast("长按圆屏 2 秒即可开机"); return; }
    if (state === "powerOnPrompt") { setPowerOnPromptActivity((value) => value + 1); setToast("长按圆屏 2 秒即可开机"); return; }
    if (state === "boot") return;
    if (state === "theme") {
      themeChosen.current = true;
      try { localStorage.setItem("v3pro.theme.v1", theme); } catch { /* Session selection still applies. */ }
      setState("home"); setToast(`已选择 ${theme === "minimal" ? "Minimal" : "IP"} 皮肤`); return;
    }
    if (state === "standby") { wake(); return; }
    if (state === "level" || state === "bothLevel") { confirmLevel(false); return; }
    if (state === "nightLight") {
      if (nightReturn.current === "off") setNightDimmed(true);
      else setState(nightReturn.current);
      return;
    }
    if (state === "leakCheck") { handlePauseButton(); return; }
    if (state === "sealChecking" || state === "sealPassed") { togglePump(); return; }
    if (state === "menu") {
      const selectedMode = MENU_ITEMS[menuIndex].mode;
      if (selectedMode === mode) {
        setState(pumpStatus === "running" ? "pumping" : pumpStatus === "paused" ? "paused" : "home");
      } else {
        showTemporary(selectedMode);
      }
      return;
    }
    if (state === "finish" || state === "modeSuccess" || state === "endingPump" || state === "poweringOff") return;
    togglePump();
  }, [confirmLevel, handlePauseButton, menuIndex, mode, pumpStatus, showTemporary, state, theme, togglePump, wake]);

  const clearTransition = useCallback(() => {
    if (transitionTimer.current) clearInterval(transitionTimer.current);
    transitionTimer.current = null;
    setTransitionProgress(0);
    setTransitionKind(null);
  }, []);

  const beginTransitionHold = useCallback((kind: "finish" | "poweroff") => {
    clearTransition();
    setTransitionKind(kind);
    setTransitionProgress(0);
    const startedAt = Date.now();
    const duration = (kind === "finish" ? V3_CONFIG.finishHoldMs : V3_CONFIG.powerOffHoldMs) - V3_CONFIG.longPressActivationMs;
    transitionReturnState.current = state;
    setState(kind === "finish" ? "endingPump" : "poweringOff");
    setToast(kind === "finish" ? "正在结束吸奶…" : "正在关机…");
    transitionTimer.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setTransitionProgress(Math.min(100, elapsed / duration * 100));
      if (elapsed >= duration) {
        clearTransition();
        setPumpStatus("idle"); setState("off"); setNightOn(false);
        setSeconds(0); setLightFeedback(null);
        setToast("吸奶已结束，设备已关机");
      }
    }, 40);
  }, [clearTransition, state]);

  const stopHold = useCallback(() => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = null; setHoldProgress(0);
    if (state === "powerOnPrompt") setPowerOnPromptActivity((value) => value + 1);
    if (transitionKind) {
      const rollback = transitionReturnState.current;
      clickLock.current = true;
      setTimeout(() => { clickLock.current = false; }, 250);
      clearTransition();
      setState(rollback);
      setToast(transitionKind === "finish" ? "已取消结束吸奶，返回原页面" : "已取消关机");
    } else if (clickLock.current) {
      setTimeout(() => { clickLock.current = false; }, 250);
    }
  }, [clearTransition, state, transitionKind]);

  const beginHold = useCallback(() => {
    if (!(["off", "powerOnPrompt", "home", "paused", "pumping", "menu", "level", "bothLevel", "nightLight", "sealChecking", "sealPassed", "leakCheck"] as ScreenState[]).includes(state)) return;
    clickLock.current = false;
    if (state !== "off" && state !== "powerOnPrompt" && !(state === "nightLight" && nightReturn.current === "off")) {
      holdStart.current = Date.now();
      holdTimer.current = setInterval(() => {
        if (Date.now() - holdStart.current < V3_CONFIG.longPressActivationMs) return;
        if (holdTimer.current) clearInterval(holdTimer.current);
        holdTimer.current = null;
        clickLock.current = true;
        beginTransitionHold(pumpStatus === "idle" ? "poweroff" : "finish");
      }, 40);
      return;
    }
    if (state === "powerOnPrompt") setPowerOnPromptActivity((value) => value + 1);
    holdStart.current = Date.now();
    holdTimer.current = setInterval(() => {
      const elapsed = Date.now() - holdStart.current;
      const visibleElapsed = Math.max(0, elapsed - V3_CONFIG.powerOnProgressDelayMs);
      const visibleDuration = V3_CONFIG.longPressMs - V3_CONFIG.powerOnProgressDelayMs;
      setHoldProgress(Math.min(100, visibleElapsed / visibleDuration * 100));
      if (elapsed >= V3_CONFIG.longPressMs) {
        clickLock.current = true;
        if (holdTimer.current) clearInterval(holdTimer.current);
        holdTimer.current = null; setHoldProgress(0);
        startPowerOn();
      }
    }, 40);
  }, [beginTransitionHold, leakStep, pumpStatus, startPowerOn, state, stopHold]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const key = event.key.toLowerCase();
      if (event.target instanceof HTMLElement && event.target.closest("input,select,textarea")) return;
      if (key === "q") showTemporary("stimulation");
      if (key === "w") showTemporary("expression");
      if (key === "e") openLevel("speed");
      if (key === "a") openLevel("left");
      if (key === "s") handleScreenClick();
      if (key === "d") openLevel("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openLevel, showTemporary, handleScreenClick]);

  const screenImage = useMemo(() => {
    if (state === "home" || state === "pumping" || state === "paused" || state === "level" || state === "endingPump" || state === "poweringOff" || state === "sealChecking" || state === "sealPassed" || state === "leakCheck") return undefined;
    if (state === "menu") return undefined;
    return fixedImages[state];
  }, [menuIndex, mode, state]);

  const currentLevel = activeControl === "left" ? leftLevel : activeControl === "right" ? rightLevel : speedLevel;

  const reset = () => {
    if (levelConfirmTimer.current) clearTimeout(levelConfirmTimer.current);
    levelConfirmTimer.current = null;
    if (modeSwitchTimer.current) clearTimeout(modeSwitchTimer.current);
    modeSwitchTimer.current = null;
    stopHold(); clearTransition(); setState("off"); setMode(V3_CONFIG.defaultMode); setLeftLevel(V3_CONFIG.defaultLevel);
    setRightLevel(V3_CONFIG.defaultLevel); setSpeedLevel(V3_CONFIG.defaultSpeed); setSeconds(0); setPumpStatus("idle"); setMenuIndex(0); setToast("长按圆屏 2 秒开机");
    setLeakStep(0); setBluetoothConnected(false); setNightOn(false); setLightFeedback(null); setLevelLimit(false); stopNightHold();
  };

  const jumpToDemoState = (target: "home" | "pumping" | "paused" | "sealChecking" | "leakCheck" | "standby" | "off") => {
    if (target === "home") { setPumpStatus("idle"); setSeconds(0); }
    if (target === "pumping" || target === "sealChecking") setPumpStatus("running");
    if (target === "paused" || target === "leakCheck") setPumpStatus("paused");
    if (target === "sealChecking") setSeconds(0);
    if (target === "leakCheck") setLeakStep(0);
    if (target === "standby") setPreviousState(pumpStatus === "running" ? "pumping" : pumpStatus === "paused" ? "paused" : "home");
    if (target === "off") { setPumpStatus("idle"); setSeconds(0); }
    setState(target);
    setToast(stateLabels[target]);
  };

  const jumpToLeakStep = (step: number) => {
    if (pumpStatus === "idle") setSeconds(0);
    setPumpStatus("paused");
    setLeakStep(Math.max(0, Math.min(3, step)));
    setState("leakCheck");
    setToast(`吸奶计时会话已建立 · 严重漏气 ${step + 1}`);
  };

  return (
    <main className="demo-shell" onPointerMove={resetIdle}>
      <header className="topbar">
        <div className="brand-block"><span className="eyebrow">MOMCOZY · V3 PRO</span><h1>整机交互 Demo</h1></div>
        <div className="solution-switch" aria-label="交互方案">
          <button className={solution === 1 ? "active" : ""} onClick={() => setSolution(1)}>方案一</button>
          <button className={solution === 2 ? "active" : ""} onClick={() => { setSolution(2); setToast("已切换至方案二"); }}>方案二</button>
        </div>
      </header>

      <section className="workspace">
        <div className="device-wrap">
          <div className={`night-light-halo${nightOn ? " is-on" : ""}`} style={{ "--lamp-intensity": lampIntensity } as React.CSSProperties} aria-hidden="true" />
          <img className={`night-light-rim${nightOn ? " is-on" : ""}`} style={{ "--lamp-intensity": lampIntensity } as React.CSSProperties} src="/assets/device/整机UI-不包含按键.png" alt="" aria-hidden="true" draggable={false} />
          <img className="device-image" src="/assets/device/整机UI-不包含按键.png" alt="V3 吸奶器主机" draggable={false} />
          <div className={`night-light-source${nightOn ? " is-on" : ""}`} style={{ "--lamp-intensity": lampIntensity } as React.CSSProperties} aria-hidden="true" />
          <div ref={screenRef} onWheel={handleWheel} className={`round-screen state-${state}${state === "leakCheck" ? " leak-circle-control" : ""}`} style={{ "--mode-color": modeColor } as React.CSSProperties} onClick={handleScreenClick}
            onPointerDown={beginHold}
            onPointerUp={stopHold} onPointerCancel={stopHold} onPointerLeave={stopHold} onContextMenu={(e) => e.preventDefault()}
            role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleScreenClick(); } }} aria-label="圆盘：点按开始暂停或确认，长按两秒关机，滚轮调节">
            {screenImage && <img src={screenImage} alt="" draggable={false} />}
            {state === "standby" && <StandbyScreen />}
            {state === "menu" && <MenuScreen index={menuIndex} showHint={pumpStatus === "idle"} />}
            {state === "modeSuccess" && <SuccessTimerArea seconds={seconds} status={pumpStatus} />}
            {state === "leakCheck" && leakStep < 3 && <LeakInspectionScreen key={`leak-step-${leakStep}`} step={leakStep} />}
            {state === "leakCheck" && leakStep === 3 && <LeakFinalAnimation key={`leak-final-${mode}`} />}
            {(state === "home" || state === "pumping" || state === "paused" || state === "sealChecking" || state === "sealPassed") && <PumpScreenSvg key={`pump-${state}-${mode}`} state={state} mode={mode} seconds={seconds} leftLevel={leftLevel} rightLevel={rightLevel} speedLevel={speedLevel} bluetoothConnected={bluetoothConnected} lightOffFeedback={lightFeedback === "off"} theme={theme} />}
            {state === "theme" && <div className="theme-picker">
              <h2>Theme Settings</h2><p>Turn the knob to select a theme</p>
              <div className="theme-options">{(["minimal", "ip"] as const).map(value => <div key={value} className={theme === value ? "selected" : ""}>
                <div className="theme-preview"><PumpScreenSvg state="home" mode="stimulation" seconds={0} leftLevel={leftLevel} rightLevel={rightLevel} speedLevel={speedLevel} bluetoothConnected={bluetoothConnected} theme={value} /></div>
                <span>{theme === value ? "●" : "○"} {value === "minimal" ? "Minimal" : "IP"}</span>
              </div>)}</div><DialHint text="Press to confirm" shine />
            </div>}
            {state === "bothLevel" && <>
              <DualLevelScreen left={leftLevel} right={rightLevel} color={modeColor} limited={levelLimit} />
              {pumpStatus === "idle" ? <DialHint shine /> : <MiniTimer seconds={seconds} status={pumpStatus} dual />}
            </>}
            {state === "nightLight" && <NightLightScreen on={nightOn} auto={nightAuto} level={nightLevel} dimmed={nightDimmed} color={modeColor} />}
            {lightFeedback && (state === "pumping" || state === "paused") && <div className={`light-feedback light-${lightFeedback}`} role="status"><svg viewBox="0 0 432 432" aria-label={`Light ${lightFeedback}`}>
              {lightFeedback === "off" ? <>
                <image href="/assets/v3-pro/figma-light-off/dim-pumping-screen.svg" x="40" y="40" width="352" height="352" />
                <image href="/assets/v3-pro/figma-light-off/light-off-icon.svg" x="196" y="175" width="40" height="40" />
              </> : <image href="/assets/v3-pro/controls/light-on-icon.svg" x="196" y="188" width="40" height="40" />}
              <text x="216" y={lightFeedback === "off" ? "250" : "264"} textAnchor="middle">Light {lightFeedback}</text>
            </svg></div>}
            {nightClosing && pumpStatus !== "running" && <NightLightHoldScreen progress={nightHoldProgress} />}
            {state === "level" && <div className="dynamic-level">
              {activeControl === "speed"
                ? <SpeedProgress level={speedLevel} color={modeColor} />
                : <ArcProgress percent={currentLevel / V3_CONFIG.maxLevel * 100} color={modeColor} />}
              <strong>{currentLevel}</strong>
              {levelLimit && <em className="level-limit">For safety,<br />Up to 3 levels at a time.</em>}
              <span>{activeControl === "left" ? "Left Level" : activeControl === "right" ? "Right Level" : "Speed"}</span>
              {pumpStatus === "idle" ? <DialHint shine /> : <MiniTimer seconds={seconds} status={pumpStatus} />}
            </div>}
            {state === "menu" && pumpStatus !== "idle" && <MiniTimer seconds={seconds} status={pumpStatus} />}
            {(state === "endingPump" || state === "poweringOff") && <div className="transition-screen">
              <ArcProgress percent={transitionProgress} color="#EF4C4E" />
              <img className="feedback-symbol" src={state === "endingPump" ? "/assets/v5/icon/Type=stop.svg" : "/assets/v5/icon/Type=power-off.svg"} alt="" />
              <p>{state === "endingPump" ? <>Press and hold to<br />end pumping<br />and power off.</> : <>Press and hold to<br />power off.</>}</p>
              <span>{Math.max(1, Math.ceil((100 - transitionProgress) / 100 * 2))}s</span>
            </div>}
            {(state === "powerOnPrompt" || state === "nightLight") && holdProgress > 0 && <ArcProgress percent={holdProgress} color="#F3F4FF" />}
          </div>

          <div className={`device-controls${state === "leakCheck" ? ` is-leak-check solution-${solution}` : ""}`} aria-label="设备实体按键">
            {MODES.map((item) => <button key={item.id} onClick={() => showTemporary(item.id)} disabled={deviceControlsLocked} aria-label={item.label}><img className="button-art" src={`/assets/v5/device-buttons/${item.id === "stimulation" ? "Stimulate" : "Expression"}.svg`} alt={item.label} /></button>)}
            <button onClick={() => openLevel("speed")} disabled={deviceControlsLocked} aria-label="Speed"><img className="button-art" src="/assets/v5/device-buttons/Speed.svg" alt="Speed" /></button>
            <button onClick={() => openLevel("left")} disabled={deviceControlsLocked} aria-label="Left"><img className="button-art" src="/assets/v5/device-buttons/Left.svg" alt="Left" /></button>
            <button className="night-control-button" data-asset-slot="night-light-key" onClick={toggleNight}
              onPointerDown={beginNightHold} onPointerUp={stopNightHold} onPointerCancel={stopNightHold} onPointerLeave={stopNightHold}
              disabled={["boot", "poweringOff", "endingPump", "theme"].includes(state)} aria-label="夜灯：短按开启，长按两秒关闭">
              {V3_CONFIG.nightKeyAsset ? <img className="button-art" src={V3_CONFIG.nightKeyAsset} alt="夜灯" /> : <span className={`night-key-placeholder${nightOn ? " is-on" : ""}`}><span>夜灯</span><small>Light</small></span>}
            </button>
            <button onClick={() => openLevel("right")} disabled={deviceControlsLocked} aria-label="Right"><img className="button-art" src="/assets/v5/device-buttons/Right.svg" alt="Right" /></button>
          </div>
        </div>
        <div className="status-toast"><span className={isPowered ? "dot on" : "dot"} />{toast}</div>
      </section>

      <aside className="guide-panel">
        <button className="panel-toggle" onClick={() => setShowGuide(!showGuide)}>{showGuide ? "收起操作指南" : "展开操作指南"}</button>
        {showGuide && <div className="guide-content"><h2>Demo 操作指南</h2><div className="guide-grid"><div><b>鼠标 / 触控板</b><p>点按：确认 / 开始暂停</p><p>长按 2 秒：开机</p><p>长按 2 秒：结束并关机</p><p>圆盘上滚轮：双侧吸力 / 亮度</p></div><div><b>键盘</b><p>Q / W：模式 · E：速度</p><p>A / D：左右档位</p><p>S / 圆盘点按：开始 / 暂停</p></div></div></div>}
      </aside>

      <aside className="debug-panel">
        <button className="debug-toggle" onClick={() => setShowDebug(!showDebug)}>{showDebug ? "收起演示状态" : "演示状态"}</button>
        {showDebug && <div className="debug-content">
          <div className="app-simulator"><b>App 事件模拟</b><div className="simulator-row">{MENU_ITEMS.filter(item => item.mode !== "stimulation" && item.mode !== "expression").map(item => <button disabled={deviceControlsLocked} key={item.mode} onClick={() => { setBluetoothConnected(true); showTemporary(item.mode); }}>{item.label}</button>)}</div>
            {nightOn && nightAuto && <div className="ambient-control"><label htmlFor="ambient-light">外部光线模拟 <span>{ambientLight < 34 ? "昏暗" : ambientLight < 67 ? "适中" : "明亮"}</span></label><input id="ambient-light" type="range" min="0" max="100" value={ambientLight} onChange={event => setAmbientLight(Number(event.target.value))} aria-label="外部光线亮度" /><div className="ambient-scale"><span>暗</span><span>亮</span></div></div>}
          </div>
          <button disabled={pumpStatus !== "idle" || deviceControlsLocked} onClick={() => setState("theme")}>皮肤选择</button>
          <button onClick={reset}>重置演示</button>
          <button onClick={() => jumpToDemoState("sealChecking")}>启动自检</button>
          {[0, 1, 2, 3].map((step) => <button key={`leak-debug-${step}`} onClick={() => jumpToLeakStep(step)}>严重漏气{step + 1}</button>)}
          <button onClick={() => jumpToDemoState("home")}>主页</button>
          <button onClick={() => { setBluetoothConnected((value) => !value); setToast(bluetoothConnected ? "蓝牙已断开" : "蓝牙已连接"); }}>{bluetoothConnected ? "断开蓝牙" : "连接蓝牙"}</button>
        </div>}
      </aside>
    </main>
  );
}
