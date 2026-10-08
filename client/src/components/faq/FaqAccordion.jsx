import { useId, useState } from "react";
import { Link } from "react-router-dom";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import { PolicyRichText } from "../legal/PolicyRichText.jsx";

export function FaqAccordionItem({ item, isOpen, onToggle }) {
  const panelId = useId();
  const buttonId = useId();

  return (
    <div
      className={`overflow-hidden rounded-xl border-2 bg-surface-container-lowest transition-[border-color,box-shadow] duration-300 ease-in-out motion-reduce:transition-none ${
        isOpen
          ? "border-primary/30 shadow-md shadow-primary/8"
          : "border-outline-variant/50 hover:border-primary/20 hover:shadow-sm"
      }`}
    >
      <h3 className="m-0">
        <button
          id={buttonId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className={`flex w-full items-start justify-between gap-4 px-5 py-4 text-left font-headline text-sm font-bold text-on-surface transition-colors duration-200 ease-in-out motion-reduce:transition-none md:px-6 md:py-4 md:text-base ${
            isOpen
              ? "bg-primary/8"
              : "hover:bg-surface-container-low"
          }`}
        >
          <span className="flex-1 leading-snug">{item.question}</span>
          <MaterialIcon
            name="expand_more"
            className={`mt-0.5 shrink-0 text-primary transition-transform duration-300 ease-in-out motion-reduce:transition-none ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
            aria-hidden
          />
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        aria-hidden={!isOpen}
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={`space-y-3 border-t border-outline-variant/40 px-5 py-4 text-sm text-on-surface-variant leading-relaxed transition-[opacity,transform] duration-300 ease-in-out motion-reduce:transition-none md:px-6 md:py-5 ${
              isOpen
                ? "translate-y-0 opacity-100"
                : "pointer-events-none -translate-y-1 opacity-0"
            }`}
          >
            <PolicyRichText parts={item.answer} />
            {item.links?.length ? (
              <div className="flex flex-wrap gap-3 pt-1">
                {item.links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline underline-offset-2"
                  >
                    {link.label}
                    <MaterialIcon name="arrow_forward" className="text-xs" />
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FaqAccordionGroup({ items }) {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <FaqAccordionItem
          key={item.id}
          item={item}
          isOpen={openId === item.id}
          onToggle={() =>
            setOpenId((current) => (current === item.id ? null : item.id))
          }
        />
      ))}
    </div>
  );
}
