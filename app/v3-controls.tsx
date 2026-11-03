import { memo, useId, type CSSProperties } from "react";

function CutoutHintArtwork({ asset, x, y, width, height, shine }: { asset: string; x: number; y: number; width: number; height: number; shine: boolean }) {
  const id = useId();
  return <g aria-hidden="true">
    <image href={asset} x={x} y={y} width={width} height={height} />
    {shine && <>
      <defs>
        <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x={x} y={y} width={width} height={height}><image href={asset} x={x} y={y} width={width} height={height} /></mask>
        <linearGradient id={`${id}-shine`} gradientUnits="userSpaceOnUse" x1={x - 51} y1="0" x2={x + 19} y2="0">
          <stop stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".78" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
          <animateTransform attributeName="gradientTransform" type="translate" values={`0 0;${width + 70} 0;${width + 70} 0`} keyTimes="0;.75;1" dur="3.6s" repeatCount="indefinite" />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={width} height={height} fill={`url(#${id}-shine)`} mask={`url(#${id}-mask)`} />
    </>}
  </g>;
}

export function ConfirmHintArtwork({ shine = true }: { shine?: boolean }) {
  // Figma's 350px Hint instance sits inside the 432px dial with a 40px rim.
  return <CutoutHintArtwork asset="/assets/v3-pro/hints/press-knob-confirm.svg" x={106} y={330} width={220} height={63} shine={shine} />;
}

function NightLightHintArtwork() {
  // Exact 182×40 vector cutout exported from the night-light Hint instance.
  return <svg className="dial-hint" viewBox="0 0 432 432" aria-hidden="true">
    <CutoutHintArtwork asset="/assets/v3-pro/hints/hold-light-turn-off.svg" x={125} y={349} width={182} height={40} shine />
  </svg>;
}

export function DialHint({ text = "Press the knob to confirm", shine = false, fontSize = 17, fontWeight = 400 }: { text?: string; shine?: boolean; fontSize?: number; fontWeight?: number }) {
  const id = useId();
  if (text === "Press the knob to confirm") return <svg className="dial-hint" viewBox="0 0 432 432" aria-hidden="true"><ConfirmHintArtwork shine={shine} /></svg>;
  if (text === "Press to confirm") return <svg className="dial-hint" viewBox="0 0 432 432" aria-hidden="true">
    <CutoutHintArtwork asset="/assets/v3-pro/hints/press-to-confirm.svg" x={145} y={359} width={140} height={28} shine={shine} />
  </svg>;
  const pathId = `${id}-path`;
  const shineId = `${id}-shine`;
  return <svg className="dial-hint" viewBox="0 0 432 432" aria-hidden="true">
    <defs>
      <path id={pathId} d="M108 345 Q216 424 324 345" />
      {shine && <linearGradient id={shineId} gradientUnits="userSpaceOnUse" x1="-150" y1="0" x2="0" y2="0">
        <stop stopColor="#fff" stopOpacity="0" />
        <stop offset=".3" stopColor="#fff" stopOpacity=".12" />
        <stop offset=".5" stopColor="#fff" stopOpacity="1" />
        <stop offset=".7" stopColor="#fff" stopOpacity=".12" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
        <animateTransform attributeName="gradientTransform" type="translate" values="0 0;650 0;650 0" keyTimes="0;.8;1" dur="3.6s" repeatCount="indefinite" />
      </linearGradient>}
    </defs>
    <text fill="#999" fontSize={fontSize} fontWeight={fontWeight} textAnchor="middle"><textPath href={`#${pathId}`} startOffset="50%">{text}</textPath></text>
    {shine && <text className="dial-hint-shine" fill={`url(#${shineId})`} fontSize={fontSize} fontWeight={fontWeight} textAnchor="middle"><textPath href={`#${pathId}`} startOffset="50%">{text}</textPath></text>}
  </svg>;
}

export const SuctionStatusText = memo(function SuctionStatusText({ text, y, fontSize, color = "#999" }: { text: string; y: number; fontSize: number; color?: string }) {
  const id = useId();
  return <g aria-label={text}>
    <defs>
      <mask id={`${id}-text-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="432" height="432">
        <text className="suction-status-text" x="216" y={y} fill="#fff" fontSize={fontSize} fontWeight="500" textAnchor="middle">{text}</text>
      </mask>
      <linearGradient id={`${id}-sweep`} gradientUnits="userSpaceOnUse" x1="95" y1="0" x2="215" y2="0">
        <stop stopColor="#fff" stopOpacity="0" />
        <stop offset=".5" stopColor="#fff" stopOpacity=".95" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
    </defs>
    <text className="suction-status-text" x="216" y={y} style={{ fill: color }} fontSize={fontSize} fontWeight="500" textAnchor="middle">{text}</text>
    <g mask={`url(#${id}-text-mask)`} aria-hidden="true">
      <rect className="suction-status-sweep" x="95" y={y - fontSize} width="120" height={fontSize * 1.35} fill={`url(#${id}-sweep)`} />
    </g>
  </g>;
});

export function DualLevelScreen({ left, right, color, limited, increaseLimit = 3, status, arcLeft = left, arcRight = right, animate = true, maxLevel = 15 }: { left: number; right: number; color: string; limited: boolean; increaseLimit?: number; status?: string; arcLeft?: number; arcRight?: number; animate?: boolean; maxLevel?: number }) {
  // Match the Figma bottom opening: arc ends sit outside the 212px timer.
  const paths = ["M88 329 A170 170 0 0 1 178 50", "M344 329 A170 170 0 0 0 254 50"];
  return <svg className="dial-settings-svg" viewBox="0 0 432 432" role="img" aria-label={`左侧 ${left}，右侧 ${right}${limited ? "，已达单次增档上限" : ""}`}>
    {paths.map((d,i) => <g key={d}><path d={d} stroke="#252525" strokeWidth="11" strokeLinecap="round" fill="none" /><path className={animate ? "level-progress-path" : "suction-progress-path"} d={d} stroke={color} strokeWidth="11" strokeLinecap="round" fill="none" pathLength="100" strokeDasharray={`${(i === 0 ? arcLeft : arcRight) / maxLevel * 100} 100`} /></g>)}
    <g fill="white" fontSize="69" fontWeight="600" textAnchor="middle"><text x="141" y="228">{left}</text><text x="291" y="228">{right}</text></g>
    {!limited && !status && <g fill="#999" fontSize="26" fontWeight="500" textAnchor="middle"><text x="141" y="274">L</text><text x="291" y="274">R</text></g>}
    {status && <SuctionStatusText text={status} y={273} fontSize={26} />}
    {limited && <g fill={color} fontSize="22" fontWeight="500" textAnchor="middle"><text x="216" y="266">For safety,</text><text x="216" y="295">Up to {increaseLimit} levels at a time.</text></g>}
  </svg>;
}

export function SidePauseConfirmation({ side, seconds, running, countdown }: { side: "left" | "right"; seconds: string; running: boolean; countdown: number }) {
  const name = side === "left" ? "Left" : "Right";
  return <svg className="dial-settings-svg" viewBox="0 0 432 432" role="img" aria-label={`Pause ${name} pump? Increase the level to resume. Press knob to confirm. ${running ? seconds : `${countdown} seconds remaining`}`}>
    <circle cx="216" cy="216" r="216" fill="#000" />
    <image href="/assets/v3-pro/suction/pause-confirm.svg" x="174" y="79" width="84" height="84" />
    <text x="216" y="208" fill="#fff" fontSize="26" fontWeight="500" textAnchor="middle">Pause {name} pump?</text>
    <text x="216" y="249" fill="#999" fontSize="26" fontWeight="500" textAnchor="middle">Increase the level to resume.</text>
    <text x="216" y="283" fill="#999" fontSize="26" fontWeight="500" textAnchor="middle">Press knob to confirm.</text>
    {running && <g><image href="/assets/v5/timer/Union.svg" x="110" y="329" width="212" height="63" /><image href="/assets/v5/timer/State=Pause.svg" x="168" y="348" width="18" height="19" /><text x="205" y="367" fill="#fff" fontSize="23" fontWeight="600">{seconds}</text></g>}
    {!running && <text x="216" y="385" fill="#999" fontSize="19" fontWeight="500" textAnchor="middle">{countdown} s</text>}
  </svg>;
}

export function NightLightScreen({ auto, level, dimmed, color }: { auto: boolean; level: number; dimmed: boolean; color: string }) {
  return <div className="night-screen" style={{ opacity: dimmed ? .5 : 1, "--night-color": color } as CSSProperties}>
    <svg className="dial-settings-svg" viewBox="0 0 432 432" role="img" aria-label={`Night Light ${auto ? "Auto" : level}`}>
      {["M61 150 A170 170 0 0 1 135 65", "M158 53 A170 170 0 0 1 274 53", "M297 65 A170 170 0 0 1 371 150"].map((d,i) => <path key={d} d={d} fill="none" stroke={i === (auto ? 0 : level - 1) ? color : "#252525"} strokeWidth="11" strokeLinecap="round" />)}
      <text x="216" y="221" textAnchor="middle" fontSize="56" fontWeight="600" fill="white">{auto ? "Auto" : level}</text>
      <text x="216" y="284" textAnchor="middle" fontSize="26" fill="#999">Brightness</text>
    </svg>
    <NightLightHintArtwork />
  </div>;
}

export function NightLightOffScreen({ remaining }: { remaining: number }) {
  const base = "/assets/v3-pro/controls/";
  return <svg className="night-hold-screen" viewBox="0 0 432 432" role="img" aria-label="Light off，夜灯已关闭">
    <circle cx="216" cy="216" r="216" fill="#000" />
    <image href={`${base}night-off-feedback-ring.svg`} x="40" y="40" width="352" height="352" />
    <image href={`${base}night-off-feedback-badge.svg`} x="188" y="120" width="56" height="56" />
    <image href={`${base}night-off-feedback-icon.svg`} x="196" y="129" width="40" height="40" />
    <text x="216" y="258" textAnchor="middle" fill="#fff" fontSize="26" fontWeight="500">Light off</text>
    <text x="216" y="390" textAnchor="middle" fill="#999" fontSize="19" fontWeight="500">{remaining} s</text>
  </svg>;
}

export function NightLightHoldScreen({ progress }: { progress: number }) {
  const remaining = Math.max(0, Math.ceil((100 - progress) / 50));
  const base = "/assets/v3-pro/controls/";
  const holdArc = "M47.9056 288.526 A170 170 0 1 1 304.366 288.216";
  const completed = Math.max(0, Math.min(100, progress));
  return <svg className="night-hold-screen" viewBox="0 0 432 432" role="img" aria-label={`长按关闭夜灯，剩余 ${remaining} 秒`}>
    <circle cx="216" cy="216" r="216" fill="#000" />
    <g transform="translate(40 40)" fill="none" strokeWidth="11" strokeLinecap="round">
      <path d={holdArc} stroke="#252525" />
      {completed > 0 && <path d={holdArc} stroke="#F3F4FF" pathLength="100" strokeDasharray={`${completed} 100`} />}
    </g>
    <image href={`${base}night-hold-badge.svg`} x="189" y="120" width="56" height="56" />
    <image href={`${base}night-hold-bulb.svg`} x="208" y="134" width="18" height="19" />
    <rect x="213" y="152" width="8" height="4" rx="1" fill="#FFB830" />
    <rect x="214" y="157" width="6" height="2" rx="1" fill="#FFB830" />
    <g fill="#fff" textAnchor="middle" fontSize="26" fontWeight="500"><text x="216" y="264">Press &amp; hold to</text><text x="216" y="298">turn off the light</text></g>
    <text x="216" y="388" textAnchor="middle" fontSize="19" fontWeight="500" fill="#999">{remaining} s</text>
  </svg>;
}

export function IpArtwork() {
  const base = "/assets/v3-pro/controls/";
  return <g className="ip-artwork" transform="translate(40 40)">
    <image href={`${base}ip-back.svg`} x="0" y="0" width="352" height="352" transform="translate(0 352) scale(1 -1)" />
    <image href={`${base}ip-body.png`} x="67.5" y="80.09" width="226.234" height="222.619" transform="rotate(-23.71 180.6 191.4)" />
    <image href={`${base}ip-horizon.svg`} x="-365" y="219" width="1082" height="1082" transform="rotate(180 176 760)" />
    <image href={`${base}ip-hand-left.png`} x="88" y="192" width="67.878" height="49.551" transform="rotate(-10.68 122 217)" />
    <image href={`${base}ip-hand-right.png`} x="196" y="189" width="59.732" height="60.411" transform="rotate(-62.38 226 219)" />
  </g>;
}
