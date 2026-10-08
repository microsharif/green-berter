import ContactHero from "../components/contact/ContactHero.jsx";
import ContactForm from "../components/contact/ContactForm.jsx";
import ContactAside from "../components/contact/ContactAside.jsx";

export default function ContactPage() {
  return (
    <main className="pt-10 pb-20 bg-surface font-body text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed">
      <ContactHero />
      <section className="asymmetric-layout">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <ContactForm />
          <ContactAside />
        </div>
      </section>
    </main>
  );
}
