/* Print one element (e.g. the receipt) instead of the whole screen.
   The element is copied into #print-root at the end of <body>; while printing,
   globals.css hides everything else and @page is set to the paper width.
   Thermal printers (58/80mm) are reached through the phone's print service. */

export type PaperSize = '58' | '80' | 'a4'

const PAGE_RULE: Record<PaperSize, string> = {
  '58': '@page { size: 58mm auto; margin: 2mm; }',
  '80': '@page { size: 80mm auto; margin: 3mm; }',
  a4:   '@page { margin: 12mm; }',
}

export function printElement(node: HTMLElement, paper: PaperSize): void {
  const root = document.createElement('div')
  root.id = 'print-root'
  root.dataset.paper = paper
  root.appendChild(node.cloneNode(true))

  const style = document.createElement('style')
  style.textContent = PAGE_RULE[paper]

  const html = document.documentElement
  let done = false
  const cleanup = () => {
    if (done) return
    done = true
    root.remove()
    style.remove()
    html.classList.remove('printing')
    window.removeEventListener('afterprint', cleanup)
  }

  document.head.appendChild(style)
  document.body.appendChild(root)
  html.classList.add('printing')
  window.addEventListener('afterprint', cleanup)
  window.print()   // blocks on desktop; on phones 'afterprint' cleans up
}
