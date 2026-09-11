export const metadata = { title: "bower — support" };

// The public support contact App Store Connect requires. One address, and it
// is the same one given as the App Review contact.
const SUPPORT_EMAIL = "SUPPORT_EMAIL_TO_SET";

export default function Support() {
  return (
    <main style={{ maxWidth: "38rem", margin: "0 auto", padding: "3rem 1.5rem 5rem", lineHeight: 1.6 }}>
      <p style={{ fontSize: "2rem", fontStyle: "italic", margin: 0 }}>
        bower<span style={{ color: "#E1563C" }}>.</span>
      </p>
      <h1 style={{ fontWeight: 400, fontSize: "1.75rem", marginTop: "1.5rem" }}>Support</h1>

      <p>
        bower values a secondhand item from photographs and writes the listing for you. If
        something is wrong, or a listing came out badly, the quickest route is the{" "}
        <strong>Tell us</strong> button beside the thumbs on any listing — it sends the note
        with the exact listing attached, so it can be fixed.
      </p>

      <h2>Get in touch</h2>
      <p>
        Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Replies come from a person,
        usually within a couple of days.
      </p>

      <h2>Common questions</h2>
      <p>
        <strong>Why did bower say it only does clothing?</strong> The photos were read as something
        other than a garment, or as not appropriate. The listing was not charged.
      </p>
      <p>
        <strong>Where is my allowance shown?</strong> On the Profile screen: listings and market
        checks each have a monthly count that resets on the first of the month.
      </p>
      <p>
        <strong>How do I delete my account?</strong> Profile &rarr; Delete account. It removes your
        sign-in, your preferences and your item history at once. bower never kept your photos.
      </p>

      <p style={{ color: "#86807A", marginTop: "2.5rem" }}>
        <a href="/privacy">Privacy</a>
      </p>
    </main>
  );
}
