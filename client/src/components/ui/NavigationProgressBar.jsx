import { useNavigationProgress } from "../../hooks/useNavigationProgress.js";

export default function NavigationProgressBar() {
  const { progress, visible } = useNavigationProgress();

  if (!visible) return null;

  return (
    <div
      className="navigation-progress fixed inset-x-0 top-0 z-[60] h-[3px] pointer-events-none"
      role="progressbar"
      aria-hidden="true"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
    >
      <div
        className="navigation-progress-bar relative h-full overflow-hidden will-change-[width]"
        style={{ width: `${progress * 100}%` }}
      >
        <span className="navigation-progress-peg" aria-hidden="true" />
      </div>
    </div>
  );
}
