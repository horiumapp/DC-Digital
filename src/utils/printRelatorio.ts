/**
 * Prepara a impressão de um relatório ocultando o app (#root) e movendo
 * o nó imprimível para o body — evita página em branco / cabeçalho no
 * final da 1ª folha causados por layout invisível que ainda ocupa altura.
 */
export function imprimirRelatorio(elementId = 'printable-relatorio'): void {
  const relatorio = document.getElementById(elementId);
  const appRoot = document.getElementById('root');
  if (!relatorio) {
    window.print();
    return;
  }

  const marcador = document.createComment('relatorio-print-marker');
  const paiOriginal = relatorio.parentNode;
  paiOriginal?.insertBefore(marcador, relatorio);
  document.body.appendChild(relatorio);
  relatorio.setAttribute('data-printing', 'true');
  relatorio.style.display = 'block';
  if (appRoot) appRoot.style.display = 'none';
  document.body.classList.add('printing-relatorio');

  const restaurar = () => {
    document.body.classList.remove('printing-relatorio');
    if (appRoot) appRoot.style.display = '';
    relatorio.style.display = 'none';
    relatorio.removeAttribute('data-printing');
    if (marcador.parentNode) {
      marcador.parentNode.insertBefore(relatorio, marcador);
      marcador.remove();
    }
    window.removeEventListener('afterprint', restaurar);
  };

  window.addEventListener('afterprint', restaurar);
  window.print();
  window.setTimeout(() => {
    if (document.body.classList.contains('printing-relatorio')) {
      restaurar();
    }
  }, 1000);
}

/** CSS compartilhado do bloco @media print dos relatórios paisagem do professor. */
export const PRINT_RELATORIO_MEDIA_CSS = `
  @media print {
    @page { margin: 1cm; size: A4 landscape; }
    html, body {
      height: auto !important;
      overflow: visible !important;
      background: white !important;
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body.printing-relatorio #root {
      display: none !important;
    }
    body.printing-relatorio > #printable-relatorio,
    #printable-relatorio[data-printing='true'] {
      display: block !important;
      position: static !important;
      left: auto !important;
      top: auto !important;
      width: 100% !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      overflow: visible !important;
      z-index: auto !important;
    }
    .no-print { display: none !important; }
    #printable-relatorio .doc-header {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    #printable-relatorio thead {
      display: table-header-group;
    }
  }
`;
