import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
  return (
    <main className="shell">
      <header>
        <div>
          <p className="eyebrow">FEARPRIME</p>
          <h1>PTSD & fear-learning platform</h1>
          <p className="muted">Prototype — måling, hypotese, outcome og attribution.</p>
        </div>
        <div className="status">OFFLINE-FIRST</div>
      </header>

      <section className="grid">
        <article className="card">
          <h2>Klinisk state</h2>
          <div className="metric"><span>PCL-5</span><strong>—</strong></div>
          <div className="metric"><span>Funktion</span><strong>—</strong></div>
          <div className="metric"><span>Søvn</span><strong>—</strong></div>
          <div className="metric"><span>Intrusioner</span><strong>—</strong></div>
        </article>

        <article className="card">
          <h2>Fear-learning</h2>
          <div className="metric"><span>F3 Acquisition</span><strong>UKENDT</strong></div>
          <div className="metric"><span>F4 Consolidation</span><strong>UKENDT</strong></div>
          <div className="metric"><span>F5 Generalisation</span><strong>UKENDT</strong></div>
          <div className="metric"><span>F6 Relapse</span><strong>UKENDT</strong></div>
        </article>

        <article className="card wide">
          <h2>Næste bedste test</h2>
          <p className="muted">Ingen test endnu. Fearprime skal først have valide observationer.</p>
          <button type="button" disabled>Opret learning event</button>
        </article>
      </section>

      <footer>
        Eksperimentel forskning og klinisk behandling holdes adskilt. Fearprime ordinerer ikke medicin.
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
