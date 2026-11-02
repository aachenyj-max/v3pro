import { useId, type CSSProperties } from "react";

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
  const pathId = `${id}-path`;
  const shineId = `${id}-shine`;
  return <svg className="dial-hint" viewBox="0 0 432 432" aria-hidden="true">
    <defs>
      <path id={pathId} d="M106 322 Q216 420 326 322" />
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

export function DualLevelScreen({ left, right, color, limited }: { left: number; right: number; color: string; limited: boolean }) {
  // Match the Figma bottom opening: arc ends sit outside the 212px timer.
  const paths = ["M88 329 A170 170 0 0 1 178 50", "M344 329 A170 170 0 0 0 254 50"];
  return <svg className="dial-settings-svg" viewBox="0 0 432 432" role="img" aria-label={`左侧 ${left}，右侧 ${right}${limited ? "，已达单次增档上限" : ""}`}>
    {paths.map((d,i) => <g key={d}><path d={d} stroke="#252525" strokeWidth="11" strokeLinecap="round" fill="none" /><path d={d} stroke={color} strokeWidth="11" strokeLinecap="round" fill="none" pathLength="100" strokeDasharray={`${(i === 0 ? left : right) / 15 * 100} 100`} /></g>)}
    <g fill="white" fontSize="56" fontWeight="600" textAnchor="middle"><text x="141" y="234">{left}</text><text x="291" y="234">{right}</text></g>
    {!limited && <g fill="#999" fontSize="26" textAnchor="middle"><text x="141" y="281">L</text><text x="291" y="281">R</text></g>}
    {limited && <g fill={color} fontSize="19" textAnchor="middle"><text x="216" y="272">For safety,</text><text x="216" y="298">Up to 3 levels at a time.</text></g>}
  </svg>;
}

export function NightLightScreen({ on, auto, level, dimmed, color }: { on: boolean; auto: boolean; level: number; dimmed: boolean; color: string }) {
  return <div className="night-screen" style={{ opacity: dimmed ? .5 : 1, "--night-color": color } as CSSProperties}>
    <svg className="dial-settings-svg" viewBox="0 0 432 432" role="img" aria-label={`Night Light ${on ? auto ? "Auto" : level : "Off"}`}>
      {on ? ["M61 150 A170 170 0 0 1 135 65", "M158 53 A170 170 0 0 1 274 53", "M297 65 A170 170 0 0 1 371 150"].map((d,i) => <path key={d} d={d} fill="none" stroke={i === (auto ? 0 : level - 1) ? color : "#252525"} strokeWidth="11" strokeLinecap="round" />) : <image href="/assets/v3-pro/controls/night-off-progress.svg" x="40" y="40" width="352" height="352" />}
      <text x="216" y="221" textAnchor="middle" fontSize="56" fontWeight="600" fill="white">{on ? auto ? "Auto" : level : "Off"}</text>
      <text x="216" y="284" textAnchor="middle" fontSize="26" fill={on ? "#999" : "#7A7A80"}>Brightness</text>
    </svg>
    {on && <NightLightHintArtwork />}
  </div>;
}

export function NightLightHoldScreen({ progress }: { progress: number }) {
  const remaining = Math.max(1, Math.ceil((100 - progress) / 50));
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
    <image href={`${base}ip-body.png`} x="49" y="91" width="226.234" height="222.619" transform="rotate(-23.71 162 202)" />
    <image href={`${base}ip-horizon.svg`} x="-365" y="219" width="1082" height="1082" transform="rotate(180 176 760)" />
    <image href={`${base}ip-hand-left.png`} x="88" y="192" width="67.878" height="49.551" transform="rotate(-10.68 122 217)" />
    <image href={`${base}ip-hand-right.png`} x="196" y="189" width="59.732" height="60.411" transform="rotate(-62.38 226 219)" />
  </g>;
}
