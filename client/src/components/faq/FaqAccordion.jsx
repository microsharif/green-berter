import { useId, useState } from "react";
import { Link } from "react-router-dom";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import { PolicyRichText } from "../legal/PolicyRichText.jsx";

export function FaqAccordionItem({ item, isOpen, onToggle }) {
  const panelId = useId();
  const buttonId = useId();

  return (
    <div
      className={`overflow-hidden rounded-lg border-2 bg-surface-container-low/50 transition-[border-color,box-shadow] duration-300 ease-in-out motion-reduce:transition-none ${
        isOpen
          ? "border-primary/35 shadow-sm shadow-primary/10"
          : "border-primary/20"
      }`}
    >
      <h3 className="m-0">
        <button
          id={buttonId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className={`flex w-full items-start justify-between gap-4 px-4 py-3 text-left font-headline text-base font-bold text-on-surface transition-colors duration-300 ease-in-out motion-reduce:transition-none md:px-5 md:py-4 md:text-lg ${
            isOpen ? "bg-primary-fixed/25" : "bg-primary-fixed/15 hover:bg-primary-fixed/20"
          }`}
        >
          <span className="flex-1">{item.question}</span>
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
            className={`space-y-3 border-t-2 border-primary/10 px-4 py-4 transition-[opacity,transform] duration-300 ease-in-out motion-reduce:transition-none md:px-5 md:py-5 ${
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
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    {link.label}
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
