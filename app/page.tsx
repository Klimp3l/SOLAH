export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        padding: "2rem",
        textAlign: "center"
      }}
    >
      <section>
        <h1 style={{ marginBottom: "0.75rem" }}>SOLAH API online</h1>
        <p style={{ opacity: 0.8 }}>
          A raiz do projeto est&aacute; funcionando. Use os endpoints em{" "}
          <code>/app/api</code>.
        </p>
      </section>
    </main>
  );
}
