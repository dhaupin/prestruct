/**
 * Accordion - DSL for FAQ/items
 * Usage: <Accordion items={[{q, a}, ...]} or <AccordionItem q="?" a={<>!</>}/>
 */
export function Accordion({ children }) {
  return <div className="accordion">{children}</div>
}

export function AccordionItem({ q, children }) {
  return (
    <details className="accordion-item">
      <summary className="accordion-q">{q}</summary>
      <div className="accordion-a">{children}</div>
    </details>
  )
}