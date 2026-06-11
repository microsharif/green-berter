import MaterialIcon from "../ui/MaterialIcon.jsx";
import RevealOnScroll from "../ui/RevealOnScroll.jsx";

const MAP_EMBED_URL =
  "https://maps.google.com/maps?q=Dhaka%2C%20Bangladesh&t=m&z=15&output=embed&iwloc=near";

const CONTACT_DETAILS = [
  {
    icon: "location_on",
    label: "Address",
    value: "Dhaka, Bangladesh",
    href: null,
  },
  {
    icon: "call",
    label: "Phone",
    value: "+8809611526698",
    href: "tel:+8809611526698",
  },
  {
    icon: "mail",
    label: "E-mail",
    value: "info@greenbarter.com",
    href: "mailto:info@greenbarter.com",
  },
];

export default function ContactAside() {
  return (
    <RevealOnScroll className="lg:col-span-5 space-y-10" delay={180}>
      <div className="bg-surface-container-low rounded-xl overflow-hidden aspect-video relative">
        <iframe
          title="Dhaka, Bangladesh"
          src={MAP_EMBED_URL}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
        <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-4 rounded-lg flex items-center gap-4 pointer-events-none">
          <div className="bg-primary-fixed p-2 rounded-lg shrink-0">
            <MaterialIcon name="map" className="text-on-primary-fixed" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-primary uppercase">Location</p>
            <p className="text-sm font-medium text-on-surface">Dhaka, Bangladesh</p>
          </div>
        </div>
      </div>

      <RevealOnScroll delay={80}>
        <div className="rounded-xl border border-outline-variant/25 bg-surface-container-lowest p-6 md:p-8">
          <h3 className="font-headline text-xl font-bold mb-5">Send Us A Message</h3>
          <ul className="space-y-4">
            {CONTACT_DETAILS.map((item) => (
              <li key={item.label} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MaterialIcon name={item.icon} className="text-lg" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    {item.label}
                  </p>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="text-sm font-medium text-primary hover:underline break-words"
                    >
                      {item.value}
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-on-surface break-words">
                      {item.value}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </RevealOnScroll>
    </RevealOnScroll>
  );
}
