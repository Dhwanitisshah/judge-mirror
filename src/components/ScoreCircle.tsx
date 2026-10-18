// A hand-circled score. A solid loop for a scored criterion, a dashed one for "nothing to credit".

import { PenCircle } from "./PenCircle";

export function ScoreCircle({ score, dashed = false, seed }: { score: number; dashed?: boolean; seed: number }) {
  const label = dashed
    ? `Score ${score} out of 5. Nothing in the text addresses this criterion.`
    : `Score ${score} out of 5.`;
  return (
    <PenCircle
      seed={seed * 31 + score}
      dashed={dashed}
      strokeWidth={2.8}
      className="h-14 w-16 font-hand text-4xl font-bold leading-none"
      label={label}
    >
      {score}
    </PenCircle>
  );
}
