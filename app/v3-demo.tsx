"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ConfirmHintArtwork, DialHint, DualLevelScreen, SidePauseConfirmation, NightLightScreen, NightLightHoldScreen, NightLightOffScreen, IpArtwork, SuctionStatusText } from "./v3-controls";
import { MENU_ITEMS, MODE_COLORS, MODES, PumpMode, ScreenState, V3_CONFIG, levelForSuctionKpa, maxLevelForMode, suctionKpa } from "./v3-config";

type SuctionSide = "left" | "right";
type SuctionFeedback = {
  phase: "pending" | "adjusting" | "complete";
  kpa: number;
};
type SuctionFeedbackBySide = Record<SuctionSide, SuctionFeedback | null>;
const suctionSides: SuctionSide[] = ["left", "right"];

const SUCTION_SETTLE_DELAY_MS = 1000;

const fixedImages: Partial<Record<ScreenState, string>> = {
  powerOnPrompt: "/assets/v3-pro/power/开机页.svg",
  boot: "/assets/screen/开屏页.png",
  finish: "/assets/v5/feedback/吸乳完成页.svg",
  modeSuccess: "/assets/v5/feedback/成功页.svg",
};
const stateLabels: Record<ScreenState, string> = {
  off: "关机", powerOnPrompt: "开机提示", boot: "启动", home: "主页", menu: "菜单", pumping: "吸奶中", paused: "暂停",
  level: "档位", bothLevel: "双侧档位", sidePauseConfirm: "单侧暂停确认", suctionProgress: "吸力调整进度", nightLight: "夜灯", theme: "皮肤选择", endingPump: "结束中", standby: "待机", finish: "反馈", modeSuccess: "切换成功", poweringOff: "关机中",
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

function IpHomeHeaderStatus({ connected }: { connected: boolean }) {
  const base = "/assets/v3-pro/home-figma/";
  return <g className="pro-header-status" aria-label={connected ? "蓝牙已连接，电池充电中" : "蓝牙未连接，电池充电中"}>
    {!connected && <image href={`${base}bluetooth-off.svg`} x="180" y="53" width="24" height="24" />}
    <image href={`${base}battery-frame.svg`} x="220" y="53" width="30" height="20" />
    <rect x="224" y="57" width="8" height="12" rx="2" fill="#3DAD77" />
    <image href={`${base}charging.svg`} x="228" y="56" width="11" height="14" />
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
    {showHint && <ConfirmHintArtwork />}
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
  theme = "minimal",
  suctionFeedback,
}: {
  state: "home" | "pumping" | "paused" | "sealChecking" | "sealPassed";
  mode: PumpMode;
  seconds: number;
  leftLevel: number;
  rightLevel: number;
  speedLevel: number;
  bluetoothConnected: boolean;
  leakFinal?: boolean;
  theme?: "minimal" | "ip";
  suctionFeedback?: SuctionFeedback | null;
}) {
  const background = modeBackgrounds[mode];
  const isSealStatus = state === "sealChecking" || state === "sealPassed";
  const isPaused = state === "paused" || leakFinal;
  const isPumping = state === "pumping" || isSealStatus;
  const isIpHome = state === "home" && theme === "ip";
  const hintId = useId();
  const ipHomeHintMaskId = `${hintId}-ip-home-hint-mask`;
  const ipHomeHintShineId = `${hintId}-ip-home-hint-shine`;
  const hint = isPaused ? "Press to resume" : "Press to start pumping";
  const sealHint = state === "sealChecking" ? "Checking seal..." : state === "sealPassed" ? "Seal check passed" : "";
  const displayTitle = modeTitles[mode];

  return (
    <svg className={`pump-screen-svg pump-screen-svg-${state}${leakFinal ? " pump-screen-svg-leak-final" : ""}`} viewBox="0 0 432 432" role="img" aria-label={`${modeTitles[mode]} ${state}`}>
      <defs>
        {isIpHome && <>
          <mask id={ipHomeHintMaskId} maskUnits="userSpaceOnUse" x="128.855" y="330.26" width="194.383" height="17.452" style={{ maskType: "alpha" }}>
            <image href="/assets/v3-pro/home-figma/press-to-start.svg" x="128.855" y="330.26" width="194.383" height="17.452" />
          </mask>
          <linearGradient id={ipHomeHintShineId} gradientUnits="userSpaceOnUse" x1="32" y1="0" x2="128" y2="0">
            <stop stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity="1" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
            <animateTransform attributeName="gradientTransform" type="translate" values="0 0;291 0;291 0" keyTimes="0;.75;1" dur="3.6s" repeatCount="indefinite" />
          </linearGradient>
        </>}
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
      {isIpHome ? <IpHomeHeaderStatus connected={bluetoothConnected} /> : <HeaderStatus connected={bluetoothConnected} />}
      <text className={`pump-svg-title${isIpHome ? " pump-svg-title-ip-home" : ""}`} x="216" y={isIpHome ? "111" : "124"} textAnchor="middle">{displayTitle}</text>
      {((isPaused && !leakFinal) || state === "home") && !isIpHome && !suctionFeedback && <text className="pump-svg-hint" x="216" y="261" textAnchor="middle" style={{ fill: modeHintColors[mode] }}>{hint}</text>}
      {((isPaused && !leakFinal) || state === "home") && !isIpHome && !suctionFeedback && <text className="pump-hint-shine-text" x="216" y="261" textAnchor="middle" style={{ fill: "url(#hint-shine-gradient)" }}>{hint}</text>}

      {isPumping && <>
        {!isSealStatus && <text className="pump-svg-time" x="216" y="226" textAnchor="middle">{formatTime(seconds)}</text>}
        {!isSealStatus && !suctionFeedback && <image className="pump-sequence-curve" href={modeAnimatedCurves[mode]} x="36" y="234" width="360" height="56" preserveAspectRatio="none" clipPath={`url(#screen-circle-${state})`} />}
      </>}

      {(state === "home" || isPumping) && !isSealStatus && suctionFeedback && <SuctionStatusText text={suctionFeedback.phase === "adjusting" ? "Adjusting suction..." : "Adjustment complete"} y={261} fontSize={19} color={mode === "expression" ? modeHintColors.expression : undefined} />}

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

      {isIpHome ? <g className="pump-svg-values pump-svg-values-ip-home">
        <text x="164" y="310" textAnchor="end">L{leftLevel}</text>
        <image href="/assets/v3-pro/home-figma/speed.svg" x="192" y="283" width="24" height="24" />
        <text x="223" y="310" textAnchor="start">{speedLevel}</text>
        <text x="268" y="310" textAnchor="start">R{rightLevel}</text>
      </g> : <g className="pump-svg-values">
          <text x="154" y="327" textAnchor="middle">L{leftLevel}</text>
          <image href="/assets/v5/icon/speed.svg" x="194" y="308" width="20" height="20" />
          <text x="226" y="327" textAnchor="middle">{speedLevel}</text>
          <text x="278" y="327" textAnchor="middle">R{rightLevel}</text>
      </g>}
      {isIpHome && <g aria-label={hint}>
        <rect x="128.855" y="330.26" width="194.383" height="17.452" fill="#AD7C89" mask={`url(#${ipHomeHintMaskId})`} />
        <rect className="ip-home-hint-shine" x="128.855" y="330.26" width="194.383" height="17.452" fill={`url(#${ipHomeHintShineId})`} mask={`url(#${ipHomeHintMaskId})`} />
      </g>}
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

function ArcProgress({ percent, color, animate = false }: { percent: number; color: string; animate?: boolean }) {
  const safePercent = Math.max(0, Math.min(100, percent));
  return <svg className="arc-progress-svg" viewBox="0 0 432 432" aria-hidden="true">
    <g transform="translate(40 40)">
      <path d={arcPath} fill="none" stroke="#252525" strokeWidth="11" strokeLinecap="round" />
      <path className={animate ? "level-progress-path" : "suction-progress-path"} d={arcPath} fill="none" stroke={color} strokeWidth="11" strokeLinecap="round" pathLength="100"
        strokeDasharray={`${safePercent} ${100 - safePercent}`} strokeDashoffset={safePercent} opacity={safePercent > 0 ? 1 : 0} />
    </g>
  </svg>;
}

function SingleLevelRing({ level, maxLevel, color, animate = true }: { level: number; maxLevel: number; color: string; animate?: boolean }) {
  return <ArcProgress percent={level / maxLevel * 100} color={color} animate={animate} />;
}

function CombinedSingleLevelScreen({ side, level, arcLevel, maxLevel, color, status, limited, showHint }: {
  side: "left" | "right"; level: number; arcLevel: number; maxLevel: number; color: string; status?: string; limited: boolean; showHint: boolean;
}) {
  const hintShineId = useId();
  const progress = Math.max(0, Math.min(100, arcLevel / maxLevel * 100));
  const ring = "M88 329 A170 170 0 1 1 344 329";
  const showSideSelector = !limited && !status;
  return <svg className="dial-settings-svg combined-single-level" viewBox="0 0 432 432" role="img" aria-label={`${side === "left" ? "左侧" : "右侧"}档位 ${level}`}>
    <defs>
      <path id={`combined-level-hint-${side}`} d="M108 345 Q216 424 324 345" />
      <linearGradient id={hintShineId} gradientUnits="userSpaceOnUse" x1="-150" y1="0" x2="0" y2="0">
        <stop stopColor="#fff" stopOpacity="0" />
        <stop offset=".3" stopColor="#fff" stopOpacity=".12" />
        <stop offset=".5" stopColor="#fff" stopOpacity="1" />
        <stop offset=".7" stopColor="#fff" stopOpacity=".12" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
        <animateTransform attributeName="gradientTransform" type="translate" values="0 0;650 0;650 0" keyTimes="0;.8;1" dur="3.6s" repeatCount="indefinite" />
      </linearGradient>
    </defs>
    <path d={ring} fill="none" stroke="#292929" strokeWidth="11" strokeLinecap="round" />
    <path className="level-progress-path" d={ring} fill="none" stroke={color} strokeWidth="11" strokeLinecap="round" pathLength="100" strokeDasharray={`${progress} 100`} />
    <text x="216" y={limited ? 218 : 207} fill="#fff" fontSize="69" fontWeight="600" textAnchor="middle">{level}</text>
    {showSideSelector && <g>
      <rect x="150" y="242" width="132" height="54" rx="27" fill="#171719" />
      <circle cx={side === "left" ? 177 : 255} cy="269" r="24" fill={color} />
      <text x="177" y="276" fill={side === "left" ? "#fff" : "rgba(255,255,255,.25)"} fontFamily="SF Compact Display, SF Pro Display, -apple-system, sans-serif" fontSize="20" fontWeight="500" textAnchor="middle">L</text>
      <text x="255" y="276" fill={side === "right" ? "#fff" : "rgba(255,255,255,.25)"} fontFamily="SF Compact Text, SF Pro Text, -apple-system, sans-serif" fontSize="20" fontWeight="500" textAnchor="middle">R</text>
    </g>}
    {limited && <g fill={color} fontSize="21" fontWeight="500" textAnchor="middle">
      <text x="216" y="263">For safety,</text>
      <text x="216" y="292">Up to 3 levels at a time.</text>
    </g>}
    {status && !limited && <SuctionStatusText text={status} y={255} fontSize={25} />}
    {showHint && <text fill="#999" fontSize="19" fontWeight="500" textAnchor="middle"><textPath href={`#combined-level-hint-${side}`} startOffset="50%">Set to 0 to pause this side</textPath></text>}
    {showHint && !limited && <text className="combined-level-hint-shine" fill={`url(#${hintShineId})`} fontSize="19" fontWeight="500" textAnchor="middle" aria-hidden="true"><textPath href={`#combined-level-hint-${side}`} startOffset="50%">Set to 0 to pause this side</textPath></text>}
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

type SuctionLevels = { left: number; right: number };

function defaultSuctionLevels(): Record<PumpMode, SuctionLevels> {
  const levels = () => ({ left: V3_CONFIG.defaultLevel, right: V3_CONFIG.defaultLevel });
  return {
    stimulation: { left: V3_CONFIG.stimulationDefaultLevel, right: V3_CONFIG.stimulationDefaultLevel },
    expression: levels(),
    powerPumping: levels(),
    milkBoost: levels(),
    cozyFlow: levels(),
    customized: levels(),
  };
}

function DeviceExperience({ solution, active, onSolutionChange }: { solution: 1 | 2; active: boolean; onSolutionChange: (solution: 1 | 2) => void }) {
  const [state, setState] = useState<ScreenState>("off");
  const [previousState, setPreviousState] = useState<ScreenState>("home");
  const [mode, setMode] = useState<PumpMode>(V3_CONFIG.defaultMode);
  const [suctionLevels, setSuctionLevels] = useState(defaultSuctionLevels);
  const modeMaxLevel = maxLevelForMode(mode);
  const leftLevel = Math.min(modeMaxLevel, suctionLevels[mode].left);
  const rightLevel = Math.min(modeMaxLevel, suctionLevels[mode].right);
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
  const holdCompletionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionCompletionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionFinished = useRef(false);
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
  const [nightClosing, setNightClosing] = useState(false);
  const [nightHoldProgress, setNightHoldProgress] = useState(0);
  const [nightOffFeedback, setNightOffFeedback] = useState(false);
  const [nightOffRemaining, setNightOffRemaining] = useState(2);
  const [nightDimmed, setNightDimmed] = useState(false);
  const [levelLimit, setLevelLimit] = useState(false);
  const [levelLimitPreview, setLevelLimitPreview] = useState<{ left: number; right: number } | null>(null);
  const [levelInteractionVersion, setLevelInteractionVersion] = useState(0);
  const levelEntry = useRef({ left: leftLevel, right: rightLevel });
  const pendingLevelLimit = useRef<{ side: "left" | "right" | "both"; mode: PumpMode; levels: { left: number; right: number } } | null>(null);
  const pausePromptSeen = useRef({ left: false, right: false });
  const pendingSidePause = useRef<{ side: "left" | "right"; mode: PumpMode } | null>(null);
  const [pauseSide, setPauseSide] = useState<"left" | "right">("left");
  const [pauseCountdown, setPauseCountdown] = useState(5);
  const [suctionFeedback, setSuctionFeedback] = useState<SuctionFeedbackBySide>({ left: null, right: null });
  const activeSuctionFeedback = state === "bothLevel"
    ? suctionFeedback.left || suctionFeedback.right
    : activeControl === "speed" ? null : suctionFeedback[activeControl];
  const actualKpa = useRef({ left: suctionKpa(mode, leftLevel), right: suctionKpa(mode, rightLevel) });
  const suctionRiseAnchor = useRef({ left: suctionKpa(mode, leftLevel), right: suctionKpa(mode, rightLevel) });
  const suctionDelayTimer = useRef<Record<SuctionSide, ReturnType<typeof setTimeout> | null>>({ left: null, right: null });
  const suctionTimer = useRef<Record<SuctionSide, ReturnType<typeof setInterval> | null>>({ left: null, right: null });
  const suctionStageTimer = useRef<Record<SuctionSide, ReturnType<typeof setTimeout> | null>>({ left: null, right: null });
  const stateRef = useRef(state);
  stateRef.current = state;
  const nightReturn = useRef<ScreenState>("off");
  const nightTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const nightCompletionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nightHeld = useRef(false);
  const nightFirstOn = useRef(true);
  const screenRef = useRef<HTMLDivElement>(null);
  const wheelAccumulator = useRef(0);
  const wheelGestureLocked = useRef(false);
  const wheelGestureEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPowered = !(state === "nightLight" && nightReturn.current === "off") && state !== "off" && state !== "powerOnPrompt" && state !== "poweringOff";
  const isRunning = pumpStatus === "running";
  const deviceControlsLocked = nightOffFeedback || levelLimit || !isPowered || state === "boot" || state === "theme" || state === "leakCheck";
  const modeColor = MODE_COLORS[mode];
  const lampIntensity = nightAuto ? .88 - ambientLight / 100 * .56 : [0, .32, .62, 1][nightLevel];

  const clearSuctionTimers = useCallback((side?: SuctionSide) => {
    for (const currentSide of side ? [side] : suctionSides) {
      if (suctionDelayTimer.current[currentSide]) clearTimeout(suctionDelayTimer.current[currentSide]);
      if (suctionTimer.current[currentSide]) clearInterval(suctionTimer.current[currentSide]);
      if (suctionStageTimer.current[currentSide]) clearTimeout(suctionStageTimer.current[currentSide]);
      suctionDelayTimer.current[currentSide] = null;
      suctionTimer.current[currentSide] = null;
      suctionStageTimer.current[currentSide] = null;
    }
  }, []);

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
    if (!isPowered || levelLimit || ["boot", "endingPump", "poweringOff", "leakCheck", "theme"].includes(state)) return;
    if (state === "standby") { wake(); return; }
    pendingSidePause.current = null;
    setSuctionLevels(levels => ({
      ...levels,
      [nextMode]: {
        left: leftLevel === 0 ? 0 : Math.min(maxLevelForMode(nextMode), levels[nextMode].left),
        right: rightLevel === 0 ? 0 : Math.min(maxLevelForMode(nextMode), levels[nextMode].right),
      },
    }));
    actualKpa.current = {
      left: suctionKpa(nextMode, leftLevel === 0 ? 0 : Math.min(maxLevelForMode(nextMode), suctionLevels[nextMode].left)),
      right: suctionKpa(nextMode, rightLevel === 0 ? 0 : Math.min(maxLevelForMode(nextMode), suctionLevels[nextMode].right)),
    };
    suctionRiseAnchor.current = { ...actualKpa.current };
    clearSuctionTimers();
    setSuctionFeedback({ left: null, right: null });
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
  }, [clearSuctionTimers, isPowered, leftLevel, levelLimit, mode, pumpStatus, rightLevel, state, suctionLevels, wake]);

  const togglePump = useCallback(() => {
    if (!isPowered || levelLimit || state === "boot" || state === "theme" || state === "endingPump" || state === "leakCheck") return;
    if (state === "standby") { wake("home"); return; }
    if (pumpStatus === "running") {
      setPumpStatus("paused"); setState("paused"); setToast("吸奶已暂停");
    } else if (pumpStatus === "paused") {
      setPumpStatus("running"); setState("pumping"); setToast("继续吸奶");
    } else {
      actualKpa.current = { left: suctionKpa(mode, leftLevel), right: suctionKpa(mode, rightLevel) };
      setSeconds(0); setPumpStatus("running"); setState("pumping"); setToast("已开始吸奶");
    }
  }, [isPowered, leftLevel, levelLimit, mode, pumpStatus, rightLevel, seconds, state, wake]);

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

  const beginSuctionFeedback = useCallback((side: "left" | "right" | "both", levels: { left: number; right: number }, resume = false, increasing = true) => {
    const target = { left: suctionKpa(mode, levels.left), right: suctionKpa(mode, levels.right) };
    const activeSides = side === "both" ? suctionSides : [side];
    let started = false;
    for (const currentSide of activeSides) {
      const initial = actualKpa.current[currentSide];
      const gap = resume ? Math.abs(target[currentSide] - initial) : target[currentSide] - initial;
      const cumulativeRise = target[currentSide] - suctionRiseAnchor.current[currentSide];
      const wasAdjusting = suctionDelayTimer.current[currentSide] !== null || suctionTimer.current[currentSide] !== null;
      clearSuctionTimers(currentSide);
      if (resume ? gap <= 0 : !increasing || (gap <= 3 && cumulativeRise <= 3 && !wasAdjusting)) {
        actualKpa.current[currentSide] = target[currentSide];
        setSuctionFeedback(current => ({ ...current, [currentSide]: null }));
        continue;
      }
      started = true;
      setSuctionFeedback(current => ({ ...current, [currentSide]: { phase: "pending", kpa: initial } }));
      suctionDelayTimer.current[currentSide] = setTimeout(() => {
        suctionDelayTimer.current[currentSide] = null;
        setSuctionFeedback(current => ({ ...current, [currentSide]: { phase: "adjusting", kpa: initial } }));
        const startedAt = Date.now();
        const duration = Math.max(resume ? 600 : 1200, gap / 3 * 1000);
        suctionTimer.current[currentSide] = setInterval(() => {
          const progress = Math.min(1, (Date.now() - startedAt) / duration);
          const kpa = initial + (target[currentSide] - initial) * progress;
          actualKpa.current[currentSide] = kpa;
          setSuctionFeedback(current => ({ ...current, [currentSide]: { phase: "adjusting", kpa } }));
          if (progress < 1) return;
          if (suctionTimer.current[currentSide]) clearInterval(suctionTimer.current[currentSide]);
          suctionTimer.current[currentSide] = null;
          suctionStageTimer.current[currentSide] = setTimeout(() => {
            // A completed suction ramp starts a new three-level adjustment window.
            levelEntry.current[currentSide] = levels[currentSide];
            suctionRiseAnchor.current[currentSide] = target[currentSide];
            setSuctionFeedback(current => ({ ...current, [currentSide]: { phase: "complete", kpa: target[currentSide] } }));
            suctionStageTimer.current[currentSide] = null;
          }, 110);
        }, 80);
      }, SUCTION_SETTLE_DELAY_MS);
    }
    if (resume && !started && (stateRef.current === "level" || stateRef.current === "bothLevel")) setState(levelReturnState.current);
    return started;
  }, [clearSuctionTimers, mode]);

  const confirmLevel = useCallback((automatic = false) => {
    if (levelConfirmTimer.current) clearTimeout(levelConfirmTimer.current);
    levelConfirmTimer.current = null;
    if (automatic) setSuctionFeedback({ left: null, right: null });
    for (const side of suctionSides) {
      if (!suctionDelayTimer.current[side] && !suctionTimer.current[side]) actualKpa.current[side] = suctionKpa(mode, side === "left" ? leftLevel : rightLevel);
    }
    setLevelLimit(false);
    setLevelLimitPreview(null);
    setState(levelReturnState.current);
    const label = activeControl === "left" ? "左侧档位" : activeControl === "right" ? "右侧档位" : "韵律速度";
    setToast(`${state === "bothLevel" ? "双侧档位" : label}已${automatic ? "自动" : ""}确认`);
  }, [activeControl, leftLevel, mode, rightLevel, state]);

  const commitSidePause = useCallback(() => {
    const pending = pendingSidePause.current;
    if (!pending) return;
    pendingSidePause.current = null;
    pausePromptSeen.current[pending.side] = true;
    setSuctionLevels(levels => ({
      ...levels,
      [pending.mode]: { ...levels[pending.mode], [pending.side]: 0 },
    }));
    actualKpa.current = { ...actualKpa.current, [pending.side]: 0 };
    setState(levelReturnState.current);
    setToast(`${pending.side === "left" ? "左侧" : "右侧"}已暂停`);
  }, []);

  const openLevel = useCallback((side: "left" | "right" | "speed") => {
    if (!isPowered || state === "boot" || state === "theme" || state === "endingPump" || state === "leakCheck") return;
    if (levelLimit) return;
    if (state === "sidePauseConfirm") {
      if (side === pauseSide) commitSidePause();
      return;
    }
    if (state === "suctionProgress") return;
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
    if (state === "level" && activeControl === side) { confirmLevel(false); return; }
    levelEntry.current = { left: leftLevel, right: rightLevel };
    if (side !== "speed") suctionRiseAnchor.current[side] = suctionKpa(mode, side === "left" ? leftLevel : rightLevel);
    setLevelLimit(false);
    setLevelLimitPreview(null);
    setActiveControl(side); setState("level");
    setToast(side === "speed" ? "韵律速度调节" : `${side === "left" ? "左侧" : "右侧"}档位调节`);
  }, [activeControl, commitSidePause, confirmLevel, leftLevel, rightLevel, isPowered, levelLimit, mode, pauseSide, pumpStatus, state, wake]);

  const openCombinedLevel = useCallback(() => {
    if (state === "sidePauseConfirm") return;
    // The combined key alternates between sides; only dial confirmation or inactivity exits.
    const nextSide = state === "level" && activeControl === "left" ? "right" : "left";
    openLevel(nextSide);
  }, [activeControl, openLevel, state]);

  useEffect(() => {
    if (state !== "sidePauseConfirm") return;
    const interval = setInterval(() => setPauseCountdown(value => Math.max(0, value - 1)), 1000);
    const timer = setTimeout(commitSidePause, 5000);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [commitSidePause, state]);

  useEffect(() => () => clearSuctionTimers(), [clearSuctionTimers]);

  useEffect(() => {
    if ((state !== "level" && state !== "bothLevel") || levelLimit) return;
    if (levelConfirmTimer.current) clearTimeout(levelConfirmTimer.current);
    const feedbackInProgress = state === "bothLevel"
      ? suctionSides.some(side => suctionFeedback[side]?.phase === "pending" || suctionFeedback[side]?.phase === "adjusting")
      : activeSuctionFeedback?.phase === "pending" || activeSuctionFeedback?.phase === "adjusting";
    if (feedbackInProgress) return;
    levelConfirmTimer.current = setTimeout(() => confirmLevel(true), 5000);
    return () => {
      if (levelConfirmTimer.current) clearTimeout(levelConfirmTimer.current);
      levelConfirmTimer.current = null;
    };
  }, [activeControl, activeSuctionFeedback, confirmLevel, levelInteractionVersion, levelLimit, state, suctionFeedback.left?.phase, suctionFeedback.right?.phase]);

  useEffect(() => {
    if (state !== "home" && state !== "pumping") return;
    const feedback = suctionSides.map(side => suctionFeedback[side]);
    if (!feedback.some(value => value?.phase === "complete") || feedback.some(value => value?.phase === "pending" || value?.phase === "adjusting")) return;
    const timer = setTimeout(() => {
      setSuctionFeedback({ left: null, right: null });
    }, 3000);
    return () => clearTimeout(timer);
  }, [state, suctionFeedback.left?.phase, suctionFeedback.right?.phase]);

  useEffect(() => () => {
    if (levelConfirmTimer.current) clearTimeout(levelConfirmTimer.current);
  }, []);
  useEffect(() => {
    if (!levelLimit) return;
    const pending = pendingLevelLimit.current;
    if (!pending) return;
    const rollbackTimer = setTimeout(() => {
      setSuctionLevels(levels => ({
        ...levels,
        [pending.mode]: pending.levels,
      }));
      setLevelLimitPreview(null);
    }, 1000);
    const hideTimer = setTimeout(() => {
      pendingLevelLimit.current = null;
      setLevelLimit(false);
      beginSuctionFeedback(pending.side, pending.levels, true);
    }, 2000);
    return () => { clearTimeout(rollbackTimer); clearTimeout(hideTimer); };
  }, [beginSuctionFeedback, levelLimit]);
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
    if (state !== "nightLight" || nightClosing || nightOffFeedback || nightDimmed) return;
    const timer = setTimeout(() => {
      if (nightReturn.current === "off") setNightDimmed(true);
      else setState(nightReturn.current);
    }, 5000);
    return () => clearTimeout(timer);
  }, [state, nightLevel, nightAuto, nightClosing, nightOffFeedback, nightDimmed]);

  useEffect(() => {
    if (!nightOffFeedback) return;
    const countdown = setTimeout(() => setNightOffRemaining(1), 1000);
    const timer = setTimeout(() => {
      setNightOffFeedback(false);
      setState(nightReturn.current);
    }, 2000);
    return () => { clearTimeout(countdown); clearTimeout(timer); };
  }, [nightOffFeedback]);

  useEffect(() => () => {
    if (nightTimer.current) clearInterval(nightTimer.current);
    if (nightCompletionTimer.current) clearTimeout(nightCompletionTimer.current);
    if (holdTimer.current) clearInterval(holdTimer.current);
    if (holdCompletionTimer.current) clearTimeout(holdCompletionTimer.current);
    if (transitionTimer.current) clearInterval(transitionTimer.current);
    if (transitionCompletionTimer.current) clearTimeout(transitionCompletionTimer.current);
  }, []);

  const toggleNight = useCallback(() => {
    if (nightHeld.current || nightOffFeedback || levelLimit || ["boot", "poweringOff", "endingPump", "theme"].includes(state)) return;
    if (!nightOn) {
      setNightOn(true);
      setNightAuto(nightFirstOn.current || nightLevel === 1);
      nightFirstOn.current = false;
    }
    if (state !== "nightLight") nightReturn.current = state === "standby" ? "home" : state === "powerOnPrompt" ? "off" : state;
    setNightDimmed(false);
    setState("nightLight");
    setToast("夜灯：滚轮调整亮度，长按夜灯键关闭");
  }, [levelLimit, nightLevel, nightOn, nightOffFeedback, state]);

  const stopNightHold = useCallback(() => {
    if (nightTimer.current) clearInterval(nightTimer.current);
    nightTimer.current = null;
    if (nightCompletionTimer.current) return;
    setNightClosing(false); setNightHoldProgress(0);
    setTimeout(() => { nightHeld.current = false; }, 250);
  }, []);

  const beginNightHold = useCallback(() => {
    if (!nightOn || nightOffFeedback || ["boot", "poweringOff", "endingPump", "theme"].includes(state)) return;
    const start = Date.now();
    nightHeld.current = false;
    setNightDimmed(false);
    nightTimer.current = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed > 350) {
        nightHeld.current = true;
        setNightClosing(true);
        setNightHoldProgress(Math.min(100, elapsed / 2000 * 100));
      }
      if (elapsed >= 2000) {
        if (nightTimer.current) clearInterval(nightTimer.current);
        nightTimer.current = null;
        setNightHoldProgress(100);
        nightCompletionTimer.current = setTimeout(() => {
          nightCompletionTimer.current = null;
          setTimeout(() => { nightHeld.current = false; }, 250);
          setNightOn(false); setNightClosing(false); setNightHoldProgress(0); setNightDimmed(false);
          setToast("夜灯已关闭，已记住上次亮度");
          if (state !== "nightLight") nightReturn.current = state === "standby" ? "home" : state === "powerOnPrompt" ? "off" : state;
          setState("nightLight");
          setNightOffRemaining(2);
          setNightOffFeedback(true);
        }, 180);
      }
    }, 40);
  }, [nightOn, nightOffFeedback, state]);

  const startPowerOn = useCallback(() => {
    if (state !== "off" && state !== "powerOnPrompt" && !(state === "nightLight" && nightReturn.current === "off")) return;
    if (!nightOn) nightFirstOn.current = true;
    setState("boot"); setToast("设备启动中…");
    setTimeout(() => { setState(themeChosen.current ? "home" : "theme"); setToast(themeChosen.current ? "Stimulation 默认主页" : "滚轮选择皮肤，点按圆盘确认"); }, V3_CONFIG.bootDurationMs);
  }, [nightOn, state]);

  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    if (nightOffFeedback) return;
    if (state === "standby") { wake("home"); return; }
    const gestureDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : -event.deltaX;
    const suctionAdjusting = (state === "level" || state === "bothLevel") &&
      (activeSuctionFeedback?.phase === "pending" || activeSuctionFeedback?.phase === "adjusting");
    if (wheelGestureLocked.current && !suctionAdjusting && !(state === "sidePauseConfirm" && gestureDelta > 0)) return;
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
    if (state === "sidePauseConfirm") {
      const pending = pendingSidePause.current;
      if (direction <= 0 || !pending) return;
      pendingSidePause.current = null;
      setSuctionLevels(levels => ({
        ...levels,
        [pending.mode]: { ...levels[pending.mode], [pending.side]: 1 },
      }));
      setState("level");
      setToast(`${pending.side === "left" ? "左侧" : "右侧"}继续调节`);
      return;
    }
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
      suctionRiseAnchor.current = { left: suctionKpa(mode, leftLevel), right: suctionKpa(mode, rightLevel) };
      levelReturnState.current = state;
      setLevelLimit(false); setLevelLimitPreview(null); setState("bothLevel");
      setToast("双侧吸力：滚轮向下增加、向上减少；点按圆盘确认");
      return;
    }
    if (state === "level" || state === "bothLevel") {
      if (levelLimit || pendingLevelLimit.current) return;
      setLevelInteractionVersion(value => value + 1);
      const changesLeft = (state === "bothLevel" && leftLevel > 0) || (state === "level" && activeControl === "left");
      const changesRight = (state === "bothLevel" && rightLevel > 0) || (state === "level" && activeControl === "right");
      const limit = (value: number, initial: number, minimum: number) => Math.min(modeMaxLevel, initial + 3, Math.max(minimum, value + direction));
      const left = changesLeft ? limit(leftLevel, levelEntry.current.left, state === "bothLevel" ? 1 : 0) : leftLevel;
      const right = changesRight ? limit(rightLevel, levelEntry.current.right, state === "bothLevel" ? 1 : 0) : rightLevel;
      const hit = direction > 0 && (changesLeft && leftLevel >= levelEntry.current.left + 3 || changesRight && rightLevel >= levelEntry.current.right + 3);
      if (hit) {
        const attempted = {
          left: changesLeft ? Math.min(modeMaxLevel, leftLevel + 1) : leftLevel,
          right: changesRight ? Math.min(modeMaxLevel, rightLevel + 1) : rightLevel,
        };
        pendingLevelLimit.current = {
          side: state === "bothLevel" ? "both" : activeControl as "left" | "right",
          mode,
          levels: {
            left: leftLevel,
            right: rightLevel,
          },
        };
        if (state === "bothLevel") clearSuctionTimers();
        else if (activeControl !== "speed") clearSuctionTimers(activeControl);
        setSuctionFeedback(current => state === "bothLevel" ? { left: null, right: null } : { ...current, [activeControl]: null });
        setLevelLimitPreview(attempted);
        if (levelConfirmTimer.current) clearTimeout(levelConfirmTimer.current);
        levelConfirmTimer.current = null;
        setLevelLimit(true);
        return;
      }
      if (state === "level" && activeControl !== "speed" && direction < 0 && (activeControl === "left" ? left : right) === 0 && (activeControl === "left" ? leftLevel : rightLevel) > 0 && !pausePromptSeen.current[activeControl]) {
        pendingSidePause.current = { side: activeControl, mode };
        setPauseSide(activeControl);
        setPauseCountdown(5);
        setState("sidePauseConfirm");
        if (levelConfirmTimer.current) clearTimeout(levelConfirmTimer.current);
        return;
      }
      if (state === "bothLevel" || activeControl !== "speed") {
        setSuctionLevels((levels) => ({
          ...levels,
          [mode]: {
            left: changesLeft ? left : levels[mode].left,
            right: changesRight ? right : levels[mode].right,
          },
        }));
        if (changesLeft || changesRight) {
          if (direction < 0) {
            if (changesLeft && left < leftLevel) {
              levelEntry.current.left = left;
              suctionRiseAnchor.current.left = suctionKpa(mode, left);
            }
            if (changesRight && right < rightLevel) {
              levelEntry.current.right = right;
              suctionRiseAnchor.current.right = suctionKpa(mode, right);
            }
          }
          beginSuctionFeedback(state === "bothLevel" ? "both" : activeControl as "left" | "right", { left, right }, false, direction > 0);
        }
      }
      if (state === "level" && activeControl === "speed") setSpeedLevel(value => Math.min(V3_CONFIG.maxSpeed, Math.max(1, value + direction)));
    }
  }, [activeControl, activeSuctionFeedback, beginSuctionFeedback, clearSuctionTimers, leftLevel, levelLimit, mode, modeMaxLevel, rightLevel, nightAuto, nightLevel, nightOn, nightOffFeedback, state, wake]);

  const handleScreenClick = useCallback(() => {
    if (clickLock.current || nightOffFeedback) return;
    if (state === "off") { setState("powerOnPrompt"); setPowerOnPromptActivity((value) => value + 1); setToast("长按圆屏 2 秒即可开机"); return; }
    if (state === "powerOnPrompt") { setPowerOnPromptActivity((value) => value + 1); setToast("长按圆屏 2 秒即可开机"); return; }
    if (state === "boot") return;
    if (state === "theme") {
      themeChosen.current = true;
      try { localStorage.setItem("v3pro.theme.v1", theme); } catch { /* Session selection still applies. */ }
      setState("home"); setToast(`已选择 ${theme === "minimal" ? "Minimal" : "IP"} 皮肤`); return;
    }
    if (state === "standby") { wake(); return; }
    if (state === "sidePauseConfirm") { commitSidePause(); return; }
    if (state === "suctionProgress") { setState("pumping"); return; }
    if (state === "level" || state === "bothLevel") { if (!levelLimit) confirmLevel(false); return; }
    if (state === "nightLight") {
      if (nightOffFeedback) return;
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
  }, [commitSidePause, confirmLevel, handlePauseButton, menuIndex, mode, nightOffFeedback, pumpStatus, showTemporary, state, theme, togglePump, wake]);

  const clearTransition = useCallback(() => {
    if (transitionTimer.current) clearInterval(transitionTimer.current);
    transitionTimer.current = null;
    if (transitionCompletionTimer.current) clearTimeout(transitionCompletionTimer.current);
    transitionCompletionTimer.current = null;
    transitionFinished.current = false;
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
        if (transitionTimer.current) clearInterval(transitionTimer.current);
        transitionTimer.current = null;
        transitionFinished.current = true;
        setTransitionProgress(100);
        transitionCompletionTimer.current = setTimeout(() => {
          clearTransition();
          setPumpStatus("idle"); setState("off"); setNightOn(false);
          setSeconds(0);
          setToast("吸奶已结束，设备已关机");
        }, 220);
      }
    }, 40);
  }, [clearTransition, state]);

  const stopHold = useCallback(() => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = null;
    if (holdCompletionTimer.current) { setTimeout(() => { clickLock.current = false; }, 250); return; }
    setHoldProgress(0);
    if (state === "powerOnPrompt") setPowerOnPromptActivity((value) => value + 1);
    if (transitionFinished.current) { setTimeout(() => { clickLock.current = false; }, 250); return; }
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
    if (nightOffFeedback || levelLimit) return;
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
        holdTimer.current = null;
        setHoldProgress(100);
        holdCompletionTimer.current = setTimeout(() => {
          holdCompletionTimer.current = null;
          setHoldProgress(0);
          startPowerOn();
        }, 180);
      }
    }, 40);
  }, [beginTransitionHold, leakStep, levelLimit, nightOffFeedback, pumpStatus, startPowerOn, state, stopHold]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!active || event.repeat) return;
      const key = event.key.toLowerCase();
      if (event.target instanceof HTMLElement && event.target.closest("input,select,textarea")) return;
      if (key === "q") showTemporary("stimulation");
      if (key === "w") showTemporary("expression");
      if (key === "e") openLevel("speed");
      if (key === "a") solution === 2 ? openCombinedLevel() : openLevel("left");
      if (key === "s") solution === 2 ? handlePauseButton() : handleScreenClick();
      if (key === "d") solution === 2 ? toggleNight() : openLevel("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, handlePauseButton, handleScreenClick, openCombinedLevel, openLevel, showTemporary, solution, toggleNight]);

  const screenImage = useMemo(() => {
    if (state === "home" || state === "pumping" || state === "paused" || state === "level" || state === "bothLevel" || state === "sidePauseConfirm" || state === "suctionProgress" || state === "endingPump" || state === "poweringOff" || state === "sealChecking" || state === "sealPassed" || state === "leakCheck") return undefined;
    if (state === "menu") return undefined;
    return fixedImages[state];
  }, [menuIndex, mode, state]);

  const currentLevel = activeControl === "left" ? leftLevel : activeControl === "right" ? rightLevel : speedLevel;
  const actualArcLeft = suctionFeedback.left ? levelForSuctionKpa(mode, suctionFeedback.left.kpa) : leftLevel;
  const actualArcRight = suctionFeedback.right ? levelForSuctionKpa(mode, suctionFeedback.right.kpa) : rightLevel;
  const displayedArcLeft = levelLimit && levelLimitPreview ? levelLimitPreview.left : actualArcLeft;
  const displayedArcRight = levelLimit && levelLimitPreview ? levelLimitPreview.right : actualArcRight;
  const currentSuctionFeedback = activeControl === "speed" ? null : suctionFeedback[activeControl];
  const sharedSuctionFeedback = suctionFeedback.left?.phase === "adjusting" || suctionFeedback.right?.phase === "adjusting"
    ? suctionFeedback.left?.phase === "adjusting" ? suctionFeedback.left : suctionFeedback.right
    : suctionFeedback.left?.phase === "complete" ? suctionFeedback.left
    : suctionFeedback.right?.phase === "complete" ? suctionFeedback.right
    : suctionFeedback.left ?? suctionFeedback.right;
  const visibleSuctionFeedback = state === "bothLevel" ? sharedSuctionFeedback : state === "level" ? currentSuctionFeedback
    : sharedSuctionFeedback?.phase === "adjusting" ? sharedSuctionFeedback : currentSuctionFeedback;
  const suctionStatus = visibleSuctionFeedback?.phase === "adjusting" ? "Suction adjusting..." : visibleSuctionFeedback?.phase === "complete" ? "Adjustment complete" : undefined;
  const showingNightPowerOnHold = state === "nightLight" && nightReturn.current === "off" && holdProgress > 0;

  const reset = () => {
    if (holdCompletionTimer.current) clearTimeout(holdCompletionTimer.current);
    holdCompletionTimer.current = null;
    if (nightCompletionTimer.current) clearTimeout(nightCompletionTimer.current);
    nightCompletionTimer.current = null;
    if (levelConfirmTimer.current) clearTimeout(levelConfirmTimer.current);
    levelConfirmTimer.current = null;
    if (modeSwitchTimer.current) clearTimeout(modeSwitchTimer.current);
    modeSwitchTimer.current = null;
    stopHold(); clearTransition(); clearSuctionTimers(); setSuctionFeedback({ left: null, right: null }); pausePromptSeen.current = { left: false, right: false }; pendingSidePause.current = null; pendingLevelLimit.current = null;
    actualKpa.current = { left: suctionKpa(V3_CONFIG.defaultMode, V3_CONFIG.stimulationDefaultLevel), right: suctionKpa(V3_CONFIG.defaultMode, V3_CONFIG.stimulationDefaultLevel) };
    suctionRiseAnchor.current = { ...actualKpa.current };
    setState("off"); setMode(V3_CONFIG.defaultMode); setSuctionLevels(defaultSuctionLevels()); setPauseCountdown(5);
    setSpeedLevel(V3_CONFIG.defaultSpeed); setSeconds(0); setPumpStatus("idle"); setMenuIndex(0); setToast("长按圆屏 2 秒开机");
    setLeakStep(0); setBluetoothConnected(false); setNightOn(false); setNightOffFeedback(false); setLevelLimit(false); setLevelLimitPreview(null); stopNightHold();
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

  return (
    <main className="demo-shell" onPointerMove={resetIdle} style={active ? undefined : { display: "none" }}>
      <header className="topbar">
        <div className="brand-block"><span className="eyebrow">MOMCOZY · V3 PRO</span><h1>整机交互 Demo</h1></div>
        <div className="solution-switch" aria-label="交互方案">
          <button className={solution === 1 ? "active" : ""} onClick={() => onSolutionChange(1)}>方案一</button>
          <button className={solution === 2 ? "active" : ""} onClick={() => onSolutionChange(2)}>方案二</button>
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
            {showingNightPowerOnHold && <img src={fixedImages.powerOnPrompt} alt="" draggable={false} />}
            {state === "standby" && <StandbyScreen />}
            {state === "menu" && <MenuScreen index={menuIndex} showHint={pumpStatus === "idle"} />}
            {state === "modeSuccess" && <SuccessTimerArea seconds={seconds} status={pumpStatus} />}
            {state === "leakCheck" && leakStep < 3 && <LeakInspectionScreen key={`leak-step-${leakStep}`} step={leakStep} />}
            {state === "leakCheck" && leakStep === 3 && <LeakFinalAnimation key={`leak-final-${mode}`} />}
            {(state === "home" || state === "pumping" || state === "paused" || state === "sealChecking" || state === "sealPassed") && <PumpScreenSvg key={`pump-${state}-${mode}`} state={state} mode={mode} seconds={seconds} leftLevel={leftLevel} rightLevel={rightLevel} speedLevel={speedLevel} bluetoothConnected={bluetoothConnected} theme={theme} suctionFeedback={(state === "home" || state === "pumping") && visibleSuctionFeedback?.phase !== "pending" ? visibleSuctionFeedback : null} />}
            {state === "sidePauseConfirm" && <SidePauseConfirmation side={pauseSide} seconds={formatTime(seconds)} running={pumpStatus === "running"} countdown={pauseCountdown} />}
            {state === "theme" && <div className="theme-picker">
              <h2>Theme Settings</h2><p>Turn the knob to select a theme</p>
              <div className="theme-options">{(["minimal", "ip"] as const).map(value => <div key={value} className={theme === value ? "selected" : ""}>
                <div className="theme-preview"><PumpScreenSvg state="home" mode="stimulation" seconds={0} leftLevel={leftLevel} rightLevel={rightLevel} speedLevel={speedLevel} bluetoothConnected={bluetoothConnected} theme={value} /></div>
                <span>{theme === value ? "●" : "○"} {value === "minimal" ? "Minimal" : "IP"}</span>
              </div>)}</div><DialHint text="Press to confirm" shine />
            </div>}
            {state === "bothLevel" && <>
              <DualLevelScreen left={leftLevel} right={rightLevel} color={modeColor} limited={levelLimit} status={levelLimit ? undefined : suctionStatus} arcLeft={displayedArcLeft} arcRight={displayedArcRight} maxLevel={modeMaxLevel} animate={!suctionFeedback.left && !suctionFeedback.right} />
              {pumpStatus === "idle" ? <DialHint text="Turn left - · Turn right +" shine fontSize={19} fontWeight={500} /> : <MiniTimer seconds={seconds} status={pumpStatus} dual />}
            </>}
            {state === "nightLight" && nightOn && !showingNightPowerOnHold && <NightLightScreen auto={nightAuto} level={nightLevel} dimmed={nightDimmed} color={modeColor} />}
            {nightOffFeedback && <NightLightOffScreen remaining={nightOffRemaining} />}
            {nightClosing && <NightLightHoldScreen progress={nightHoldProgress} />}
            {state === "level" && solution === 2 && activeControl !== "speed" && <div className="dynamic-level">
              <CombinedSingleLevelScreen side={activeControl} level={currentLevel} arcLevel={activeControl === "left" ? displayedArcLeft : displayedArcRight} maxLevel={modeMaxLevel} color={modeColor} status={levelLimit ? undefined : suctionStatus} limited={levelLimit} showHint={pumpStatus === "idle"} />
              {pumpStatus !== "idle" && <MiniTimer seconds={seconds} status={pumpStatus} />}
            </div>}
            {state === "level" && (solution === 1 || activeControl === "speed") && <div className="dynamic-level">
              {activeControl === "speed"
                ? <SpeedProgress level={speedLevel} color={modeColor} />
                : <SingleLevelRing level={activeControl === "left" ? displayedArcLeft : displayedArcRight} maxLevel={modeMaxLevel} color={modeColor} animate={!currentSuctionFeedback} />}
              <strong>{currentLevel}</strong>
              {levelLimit && <em className="level-limit">For safety,<br />Up to 3 levels at a time.</em>}
              {!levelLimit && (activeControl !== "speed" && suctionStatus
                ? <svg className="suction-status-svg" viewBox="0 0 432 432" aria-label={suctionStatus}><SuctionStatusText text={suctionStatus} y={273} fontSize={26} /></svg>
                : <span>{activeControl === "left" ? "Left Level" : activeControl === "right" ? "Right Level" : "Speed"}</span>)}
              {pumpStatus === "idle" ? <DialHint text={activeControl === "speed" ? "Press the knob to confirm" : "Set to 0 to pause this side"} shine fontSize={19} fontWeight={500} /> : <MiniTimer seconds={seconds} status={pumpStatus} />}
            </div>}
            {state === "menu" && pumpStatus !== "idle" && <MiniTimer seconds={seconds} status={pumpStatus} />}
            {(state === "endingPump" || state === "poweringOff") && <div className="transition-screen power-off-screen" style={{ "--reveal-angle": `${transitionProgress * 2.25}deg` } as React.CSSProperties}>
              <ArcProgress percent={transitionProgress} color="#EF4C4E" />
              <img className="power-off-progress" src="/assets/v3-pro/power-off/progress.svg" alt="" />
              <div className="power-off-content">
                <div className="power-off-badge"><img src="/assets/v3-pro/power-off/icon.svg" alt="" /></div>
                <p><span>Press &amp; hold to power</span><br />off.</p>
              </div>
              <span>{Math.max(0, Math.ceil((100 - transitionProgress) / 100 * 2))} s</span>
            </div>}
            {(state === "powerOnPrompt" || state === "nightLight") && holdProgress > 0 && <ArcProgress percent={holdProgress} color="#F3F4FF" />}
          </div>

          <div className={`device-controls solution-${solution}${(!isPowered && state !== "poweringOff") || state === "boot" ? " is-unpowered" : ""}${state === "theme" || state === "poweringOff" || state === "endingPump" || (nightOffFeedback && isPowered) || (levelLimit && isPowered) ? " is-controls-lit" : ""}${state === "leakCheck" ? " is-leak-check" : ""}`} aria-label="设备实体按键">
            {MODES.map((item) => <button key={item.id} onClick={() => showTemporary(item.id)} disabled={deviceControlsLocked} aria-label={item.id === "stimulation" ? "Stimulation" : item.label}><img className="button-art" src={item.id === "stimulation" ? "/assets/v3-pro/controls/stimulation-key.svg" : "/assets/v5/device-buttons/Expression.svg"} alt={item.id === "stimulation" ? "Stimulation" : item.label} /></button>)}
            <button onClick={() => openLevel("speed")} disabled={deviceControlsLocked} aria-label="Speed"><img className="button-art" src="/assets/v5/device-buttons/Speed.svg" alt="Speed" /></button>
            {solution === 1 ? <button onClick={() => openLevel("left")} disabled={deviceControlsLocked} aria-label="Left"><img className="button-art" src="/assets/v5/device-buttons/Left.svg" alt="Left" /></button>
              : <button onClick={openCombinedLevel} disabled={deviceControlsLocked} aria-label="Level：切换左侧和右侧档位"><img className="button-art" src="/assets/v3-pro/controls/combined-level-key.svg" alt="Level" /></button>}
            {solution === 2 && <button onClick={handlePauseButton} disabled={deviceControlsLocked} aria-label="Start/Pause"><img className="button-art" src="/assets/v5/device-buttons/SP.svg" alt="Start/Pause" /></button>}
            <button className={`night-control-button${state === "off" || state === "boot" ? " is-unpowered" : ""}`} data-asset-slot="night-light-key" onClick={toggleNight}
              onPointerDown={beginNightHold} onPointerUp={stopNightHold} onPointerCancel={stopNightHold} onPointerLeave={stopNightHold}
              disabled={nightOffFeedback || ["boot", "poweringOff", "endingPump", "theme"].includes(state)} aria-label="夜灯：短按开启，长按两秒关闭">
              {V3_CONFIG.nightKeyAsset ? <img className="button-art" src={V3_CONFIG.nightKeyAsset} alt="夜灯" /> : <span className={`night-key-placeholder${nightOn ? " is-on" : ""}`}><span>夜灯</span><small>Light</small></span>}
            </button>
            {solution === 1 && <button onClick={() => openLevel("right")} disabled={deviceControlsLocked} aria-label="Right"><img className="button-art" src="/assets/v5/device-buttons/Right.svg" alt="Right" /></button>}
          </div>
        </div>
        <div className="status-toast"><span className={isPowered ? "dot on" : "dot"} />{toast}</div>
      </section>

      <aside className="guide-panel">
        <button className="panel-toggle" onClick={() => setShowGuide(!showGuide)}>{showGuide ? "收起操作指南" : "展开操作指南"}</button>
        {showGuide && <div className="guide-content"><h2>Demo 操作指南</h2><div className="guide-grid"><div><b>鼠标 / 触控板</b><p>点按：确认 / 开始暂停</p><p>长按 2 秒：开机</p><p>长按 2 秒：结束并关机</p><p>圆盘上滚轮：双侧吸力 / 亮度</p>{solution === 2 && <p>Level 键：左侧 ↔ 右侧循环切换；点按圆屏或静默超时返回一级页面</p>}</div></div></div>}
      </aside>

      <aside className="debug-panel">
        <button className="debug-toggle" onClick={() => setShowDebug(!showDebug)}>{showDebug ? "收起演示状态" : "演示状态"}</button>
        {showDebug && <div className="debug-content">
          <div className="app-simulator"><b>设备事件模拟</b><div className="simulator-row">{MENU_ITEMS.filter(item => item.mode !== "stimulation" && item.mode !== "expression").map(item => <button disabled={deviceControlsLocked} key={item.mode} onClick={() => { setBluetoothConnected(true); showTemporary(item.mode); }}>{item.label}</button>)}</div>
            {nightOn && nightAuto && <div className="ambient-control"><label htmlFor="ambient-light">外部光线模拟 <span>{ambientLight < 34 ? "昏暗" : ambientLight < 67 ? "适中" : "明亮"}</span></label><input id="ambient-light" type="range" min="0" max="100" value={ambientLight} onChange={event => setAmbientLight(Number(event.target.value))} aria-label="外部光线亮度" /><div className="ambient-scale"><span>暗</span><span>亮</span></div></div>}
          </div>
          <button disabled={pumpStatus !== "idle" || deviceControlsLocked} onClick={() => setState("theme")}>皮肤选择</button>
          <button onClick={reset}>重置演示</button>
          <button onClick={() => jumpToDemoState("sealChecking")}>启动自检</button>
          <button onClick={() => jumpToDemoState("home")}>主页</button>
          <button onClick={() => { setBluetoothConnected((value) => !value); setToast(bluetoothConnected ? "蓝牙已断开" : "蓝牙已连接"); }}>{bluetoothConnected ? "断开蓝牙" : "连接蓝牙"}</button>
        </div>}
      </aside>
    </main>
  );
}

export default function DeviceDemo() {
  const [solution, setSolution] = useState<1 | 2>(1);
  return <>
    <DeviceExperience solution={1} active={solution === 1} onSolutionChange={setSolution} />
    <DeviceExperience solution={2} active={solution === 2} onSolutionChange={setSolution} />
  </>;
}
