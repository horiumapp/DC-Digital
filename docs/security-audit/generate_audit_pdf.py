#!/usr/bin/env python3
"""
Script de Geração do Relatório de Auditoria de Segurança em PDF — DC Digital
Local: docs/security-audit/generate_audit_pdf.py

Executa a conversão fiel do relatório HTML estruturado para formato A4 de alta fidelidade
utilizando o motor headless do Microsoft Edge / Chrome, seguido de validação e rasterização
para verificação de integridade visual.
"""

import os
import sys
import subprocess
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
HTML_FILE = BASE_DIR / "relatorio.html"
PDF_FILE = BASE_DIR / "relatorio-auditoria-seguranca.pdf"
PREVIEW_DIR = BASE_DIR / "preview_pages"

EDGE_CHROME_PATHS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
]

def find_browser():
    for p in EDGE_CHROME_PATHS:
        if os.path.exists(p):
            return p
    return None

def generate_pdf():
    browser = find_browser()
    if not browser:
        print("[ERRO] Nenhum executável do Edge ou Chrome encontrado para geração headless.", file=sys.stderr)
        sys.exit(1)

    print(f"[*] Motor de renderização detectado: {browser}")
    print(f"[*] Origem HTML: {HTML_FILE}")
    print(f"[*] Destino PDF: {PDF_FILE}")

    if not HTML_FILE.exists():
        print(f"[ERRO] Arquivo HTML de origem não encontrado: {HTML_FILE}", file=sys.stderr)
        sys.exit(1)

    # Comando de impressão headless sem cabeçalhos padrões de URL do browser
    cmd = [
        browser,
        "--headless=new",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        f"--print-to-pdf={PDF_FILE}",
        "--no-pdf-header-footer",
        str(HTML_FILE),
    ]

    print("[*] Iniciando renderização em PDF...")
    start_time = time.time()
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as e:
        print(f"[ERRO] Falha ao executar o comando do navegador: {e}", file=sys.stderr)
        sys.exit(1)

    elapsed = time.time() - start_time
    if not PDF_FILE.exists():
        print("[ERRO] Arquivo PDF não foi gerado.", file=sys.stderr)
        sys.exit(1)

    size_bytes = PDF_FILE.stat().st_size
    print(f"[+] PDF gerado com sucesso em {elapsed:.2f}s ({size_bytes:,} bytes).")

def validate_and_preview():
    try:
        import pypdfium2 as pdfium
    except ImportError:
        print("[AVISO] pypdfium2 não encontrado. Pulando inspeção de páginas.")
        return

    print("[*] Validando páginas e gerando rasterização de inspeção...")
    pdf = pdfium.PdfDocument(str(PDF_FILE))
    total_pages = len(pdf)
    print(f"[+] Total de páginas auditadas no PDF: {total_pages}")

    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    for i, page in enumerate(pdf):
        img = page.render(scale=1.5).to_pil()
        preview_path = PREVIEW_DIR / f"page_{i+1}.png"
        img.save(str(preview_path))

    print(f"[+] Rasterização concluída: {total_pages} páginas salvas em '{PREVIEW_DIR}'")

if __name__ == "__main__":
    generate_pdf()
    validate_and_preview()
