"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useT } from "@/i18n";

const ZUS_GREEN = "rgb(0,153,63)";
const ZUS_NAVY = "rgb(0,65,110)";

type Point = { year: number; value: number };

export default function HeroGrowthChart({
  base = 1000,
  growth = 0.06,
  years = 18,
  loopEveryMs = 10800, // okres między kolejnymi startami animacji linii
  height = 480,
}: {
  base?: number;
  growth?: number;
  years?: number;
  loopEveryMs?: number;
  height?: number;
}) {
  const { t, lang } = useT();

  const nf = useMemo(
    () => new Intl.NumberFormat(lang === "pl" ? "pl-PL" : "en-GB"),
    [lang]
  );
  const nfPLN = useMemo(
    () =>
      new Intl.NumberFormat(lang === "pl" ? "pl-PL" : "en-GB", {
        style: "currency",
        currency: "PLN",
        maximumFractionDigits: 0,
      }),
    [lang]
  );

  // --- konfiguracja animacji linii ---
  const LINE_ANIM_MS = 1200; // tyle trwa animacja kreski (Area)
  const SAFE_PERIOD_MS = Math.max(loopEveryMs, LINE_ANIM_MS + 200); // gwarancja: nowy start po zakończeniu poprzedniego

  const [animateKey, setAnimateKey] = useState(0);
  const reduced = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const schedule = useCallback(() => {
    if (typeof window === "undefined") return;

    // nie kumulujemy timeoutów
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // nie planuj, jeśli karta ukryta lub prefers-reduced-motion
    if (document.hidden || reduced.current) return;

    timeoutRef.current = window.setTimeout(() => {
      // wymuszamy nowy mount komponentu Area przez zmianę key
      setAnimateKey((k) => k + 1);
      // łańcuszek timeoutów (kolejny cykl)
      schedule();
    }, SAFE_PERIOD_MS);
  }, [SAFE_PERIOD_MS]);

  const data: Point[] = useMemo(() => {
    const arr: Point[] = [];
    let v = base;
    for (let i = 0; i <= years; i++) {
      if (i > 0) v *= 1 + growth;
      arr.push({ year: i, value: Math.round(v) });
    }
    return arr;
  }, [base, growth, years]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = mq.matches;

    const onMqChange = (e: MediaQueryListEvent) => {
      reduced.current = e.matches;
      if (e.matches) {
        if (timeoutRef.current !== null) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      } else {
        schedule();
      }
    };
    mq.addEventListener?.("change", onMqChange);

    const onVis = () => {
      if (!document.hidden) schedule();
    };
    document.addEventListener("visibilitychange", onVis);

    // start pierwszego cyklu
    if (!mq.matches) schedule();

    return () => {
      mq.removeEventListener?.("change", onMqChange);
      document.removeEventListener("visibilitychange", onVis);
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [schedule]);

  // --- OSTATNIA KROPKA: stała kropka + SMIL ring (r oraz opacity) ---
  const LastDot = (props: any) => {
    const { index, cx, cy } = props;
    if (index !== data.length - 1) return null;
    return (
      <g>
        {/* stała kropka */}
        <circle cx={cx} cy={cy} r={4} fill={ZUS_GREEN} />
        {/* ring SMIL: rośnie mocniej i zanika (zmienisz to="32"/"36" aby „bardziej rosło”) */}
        <circle cx={cx} cy={cy} r={8} fill={ZUS_GREEN} opacity="0.5">
          <animate
            attributeName="r"
            from="8"
            to="32"
            dur="1.8s"
            begin="0s"
            repeatCount="indefinite"
            calcMode="spline"
            keyTimes="0;1"
            keySplines=".22 .61 .36 1"
          />
          <animate
            attributeName="opacity"
            from="0.5"
            to="0"
            dur="1.8s"
            begin="0s"
            repeatCount="indefinite"
            calcMode="spline"
            keyTimes="0;1"
            keySplines=".22 .61 .36 1"
          />
        </circle>
      </g>
    );
  };

  return (
    <div
      className="relative w-full rounded-2xl bg-white/70 backdrop-blur border border-black/5 shadow-[0_10px_30px_-12px_rgba(0,0,0,.15)]"
      style={{ height }}
      role="img"
      aria-label={t("chart_title")}
    >
      <div className="px-4 pt-3 text-xs text-[color:var(--zus-navy)]/70">
        {t("chart_title")}
      </div>

      <div className="mt-2 h-[calc(100%-42px)]">
        <ResponsiveContainer width="100%" height="100%" debounce={200}>
          <AreaChart data={data} margin={{ top: 8, right: 18, left: 12, bottom: 10 }}>
            <defs>
              {/* gradient wypełnienia */}
              <linearGradient id="fillZUS" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ZUS_GREEN} stopOpacity={0.35} />
                <stop offset="90%" stopColor={ZUS_GREEN} stopOpacity={0.02} />
              </linearGradient>

              {/* delikatny cień pod krzywą */}
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
                <feOffset dy="1" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.35" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <CartesianGrid vertical={false} stroke="rgba(0,0,0,.06)" />

            <XAxis
              dataKey="year"
              tick={{ fill: ZUS_NAVY, opacity: 0.55, fontSize: 11 }}
              axisLine={{ stroke: "rgba(0,0,0,.10)" }}
              tickLine={{ stroke: "rgba(0,0,0,.10)" }}
            />

            <YAxis
              width={56}
              tickFormatter={(v) => nf.format(v as number)}
              tick={{ fill: ZUS_NAVY, opacity: 0.55, fontSize: 11 }}
              axisLine={{ stroke: "rgba(0,0,0,.10)" }}
              tickLine={{ stroke: "rgba(0,0,0,.10)" }}
            />

            <Tooltip
              formatter={(v) => [nfPLN.format(Number(v)), ""]}
              labelFormatter={(y) => (lang === "pl" ? `Rok ${y}` : `Year ${y}`)}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,.08)",
                boxShadow: "0 10px 20px -12px rgba(0,0,0,.25)",
              }}
            />

            <Area
              key={animateKey}
              type="monotone"
              dataKey="value"
              stroke={ZUS_GREEN}
              strokeWidth={2.5}
              fill="url(#fillZUS)"
              dot={<LastDot />}
              activeDot={false}
              isAnimationActive={!reduced.current}
              animationDuration={LINE_ANIM_MS}
              animationEasing="ease-out"
              filter="url(#softShadow)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="px-4 pb-2 -mt-[13px] text-[11px] text-[color:var(--zus-navy)]/55">
        {t("chart_disclaimer")}
      </div>
    </div>
  );
}
