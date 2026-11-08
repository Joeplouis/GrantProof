"use client";
import { useEffect, useState } from "react";

const themes = [
  ["sprig", "Sprig"],
  ["vice-nights", "Wynwood"],
  ["ocean-drive", "South Beach"],
  ["sunset-strip", "Little Havana"],
  ["classic", "Original"],
] as const;
const storageKey = "grantproof.theme.v1";

export default function ThemePicker() {
  const [theme, setTheme] = useState("sprig");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (themes.some(([id]) => id === saved)) {
        setTheme(saved!);
        document.documentElement.dataset.theme = saved!;
      }
    } catch {
      setNotice(
        "Theme changes apply for this session; browser storage is unavailable.",
      );
    }
  }, []);
  return (
    <label className="theme-picker">
      <span className="theme-swatches" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="sr-only">Workspace theme</span>
      <select
        value={theme}
        onChange={(event) => {
          const next = event.target.value;
          setTheme(next);
          document.documentElement.dataset.theme = next;
          try {
            localStorage.setItem(storageKey, next);
            setNotice("");
          } catch {
            setNotice(
              "Theme changes apply for this session; browser storage is unavailable.",
            );
          }
        }}
      >
        {themes.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
      <span className="sr-only" role="status">
        {notice}
      </span>
    </label>
  );
}

export function ViceScene() {
  return (
    <svg
      className="vice-scene"
      viewBox="0 0 300 180"
      fill="none"
      aria-hidden="true"
    >
      <g className="scene-ocean">
        <defs>
          <mask id="vice-sun-stripes">
            <circle cx="186" cy="76" r="61" fill="white" />
            {[85, 97, 109, 121, 133].map((y) => (
              <path
                key={y}
                d={`M120 ${y}H250`}
                stroke="black"
                strokeWidth="5"
              />
            ))}
          </mask>
        </defs>
        <circle
          cx="186"
          cy="76"
          r="61"
          fill="var(--vice-sun)"
          mask="url(#vice-sun-stripes)"
        />
        <path
          d="M0 151H300M22 161H273M59 172H245"
          stroke="var(--vice-accent)"
          strokeOpacity=".5"
        />
        <path
          className="vice-grid"
          d="M20 180L135 151M80 180L148 151M150 180L160 151M220 180L172 151M290 180L184 151"
          stroke="var(--vice-accent)"
          strokeOpacity=".3"
        />
        <path
          d="M109 145V108H129V90H143V143H151V115H171V145H180V99H197V86H209V146H218V121H242V146H261V137H279V148H91Z"
          fill="var(--vice-silhouette)"
        />
        <g stroke="var(--vice-palm)" strokeWidth="5" strokeLinecap="round">
          <path d="M66 151Q83 102 72 61" />
          <path d="M73 64Q47 43 24 61M73 64Q61 29 39 32M73 64Q84 29 105 27M73 64Q107 42 124 60M73 64Q102 63 114 88M73 64Q43 68 36 92" />
        </g>
      </g>
      <g className="scene-wynwood">
        <rect
          x="38"
          y="39"
          width="231"
          height="113"
          rx="5"
          fill="var(--vice-raised)"
          stroke="var(--vice-accent)"
        />
        <path
          d="M42 142L123 43H167L87 151H42Z"
          fill="var(--vice-pink)"
          opacity=".8"
        />
        <circle
          cx="200"
          cy="91"
          r="45"
          fill="var(--vice-accent)"
          opacity=".8"
        />
        <circle cx="200" cy="91" r="27" fill="var(--vice-surface)" />
        <path
          d="M88 145Q112 73 144 100T238 141M119 49Q150 78 177 43"
          stroke="var(--vice-sun)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {[60, 72, 84].map((y) => (
          <path
            key={y}
            d={`M45 ${y}H80`}
            stroke="var(--vice-surface)"
            strokeWidth="3"
          />
        ))}
        <path d="M20 155H286" stroke="var(--vice-accent)" strokeOpacity=".5" />
        <text
          x="151"
          y="174"
          textAnchor="middle"
          fontSize="10"
          letterSpacing="4"
          fill="var(--vice-accent)"
        >
          WYNWOOD
        </text>
      </g>
      <g className="scene-havana">
        <circle cx="224" cy="51" r="34" fill="var(--vice-sun)" opacity=".8" />
        <path
          d="M41 153V62H96V40H188V64H259V153Z"
          fill="var(--vice-silhouette)"
        />
        <path
          d="M102 61H181M102 69H181"
          stroke="var(--vice-palm)"
          strokeWidth="3"
        />
        <path
          d="M53 96Q53 75 73 75T93 96V151H53ZM111 102Q111 83 132 83T153 102V151H111ZM179 102Q179 83 200 83T221 102V151H179Z"
          fill="var(--vice-surface)"
        />
        <path d="M103 81H233L241 103H95Z" fill="var(--vice-palm)" />
        {[110, 137, 164, 191, 218].map((x) => (
          <path
            key={x}
            d={`M${x} 82L${x - 4} 102`}
            stroke="var(--vice-surface)"
            strokeWidth="12"
          />
        ))}
        <path d="M24 155H282" stroke="var(--vice-palm)" strokeWidth="2" />
        <text
          x="151"
          y="174"
          textAnchor="middle"
          fontSize="10"
          letterSpacing="3"
          fill="var(--vice-palm)"
        >
          CALLE OCHO
        </text>
      </g>
    </svg>
  );
}

export function NeighborhoodSignature() {
  return (
    <div className="neighborhood-signature">
      <span className="signature-wynwood">Wynwood · Miami, Florida</span>
      <span className="signature-ocean">
        South Beach · Miami Beach, Florida
      </span>
      <span className="signature-havana">Little Havana · Miami, Florida</span>
    </div>
  );
}
