import MaterialIcon from "../ui/MaterialIcon.jsx";

export default function ProductRegenerativeNote() {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-primary-container/30 bg-primary-container/10 p-4">
      <div className="rounded-lg bg-primary p-2 text-on-primary">
        <MaterialIcon name="eco" className="text-xl" filled />
      </div>
      <div>
        <h4 className="font-headline text-sm font-bold text-primary">
          Regenerative Choice
        </h4>
        <p className="text-sm leading-snug text-on-surface-variant">
          By swapping instead of buying new, you prevent an estimated 14.2kg of
          waste.
        </p>
      </div>
    </div>
  );
}
