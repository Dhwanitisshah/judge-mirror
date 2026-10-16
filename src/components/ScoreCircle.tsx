// A hand-circled score. Solid red loop for a scored criterion, dashed for "nothing to credit".

export function ScoreCircle({ score, dashed = false }: { score: number; dashed?: boolean }) {
  const label = dashed
    ? `Score ${score} out of 5. Nothing in the text addresses this criterion.`
    : `Score ${score} out of 5.`;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 64 56"
      className="h-14 w-16 shrink-0 text-redpen"
    >
      <path
        d="M12 30 C10 14 32 5 49 12 C63 18 60 42 40 49 C22 55 6 46 9 30 C10 24 16 18 22 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray={dashed ? "4 5" : undefined}
      />
      <text
        x="32"
        y="37"
        textAnchor="middle"
        fontSize="30"
        fontWeight="700"
        fill="currentColor"
        style={{ fontFamily: "var(--font-hand)" }}
      >
        {score}
      </text>
    </svg>
  );
}
