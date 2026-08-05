from playwright.sync_api import sync_playwright, Page, expect
import re


BASE_URL = "http://localhost:4200"


def collect_console_and_requests(page: Page):
    console_errors = []
    failed_requests = []
    image_issues = []

    def on_console(msg):
        if msg.type in ("error", "warning"):
            console_errors.append(
                {
                    "type": msg.type,
                    "text": msg.text,
                    "location": msg.location,
                }
            )

    def on_request_failed(request):
        failed_requests.append(
            {
                "url": request.url,
                "method": request.method,
                "failure": request.failure,
                "resource_type": request.resource_type,
            }
        )

    page.on("console", on_console)
    page.on("requestfailed", on_request_failed)

    # Avalia imagens quebradas e problemas comuns de layout
    def scan_dom():
        return page.evaluate(
            """() => {
              const issues = {
                brokenImages: [],
                overlapCandidates: [],
                clippedTextCandidates: [],
                contrastCandidates: [],
              };

              // 1) Imagens quebradas (naturalWidth == 0)
              const imgs = Array.from(document.images || []);
              for (const img of imgs) {
                if (!img.currentSrc) continue;
                if (img.complete && img.naturalWidth === 0) {
                  issues.brokenImages.push({
                    src: img.currentSrc,
                    alt: img.getAttribute('alt') || null,
                  });
                }
              }

              // 2) Possíveis textos cortados: elemento tem overflow hidden/clip e scrollHeight > clientHeight
              const textNodes = Array.from(document.querySelectorAll('h1,h2,h3,p,li,a,button,span'));
              for (const el of textNodes) {
                const cs = window.getComputedStyle(el);
                const overflowY = cs.overflowY;
                const overflowX = cs.overflowX;
                const clippedY = (overflowY === 'hidden' || overflowY === 'clip') && el.scrollHeight > el.clientHeight + 1;
                const clippedX = (overflowX === 'hidden' || overflowX === 'clip') && el.scrollWidth > el.clientWidth + 1;
                if (clippedY || clippedX) {
                  const text = (el.textContent || '').trim();
                  if (text.length) {
                    issues.clippedTextCandidates.push({
                      tag: el.tagName.toLowerCase(),
                      text: text.slice(0, 120),
                    });
                  }
                }
              }

              // 3) Overlap grosseiro: bounding boxes iguais e z-index alto (heurística leve)
              // Nota: overlap real exige checagem O(n^2). Aqui pegamos sinais mais comuns: elementos fixos/sticky cobrindo.
              const fixed = Array.from(document.querySelectorAll('*')).filter((el) => {
                const cs = window.getComputedStyle(el);
                return (cs.position === 'fixed' || cs.position === 'sticky') && cs.display !== 'none' && cs.visibility !== 'hidden';
              });

              for (const el of fixed.slice(0, 50)) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  issues.overlapCandidates.push({
                    tag: el.tagName.toLowerCase(),
                    top: Math.round(rect.top),
                    left: Math.round(rect.left),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                  });
                }
              }

              // 4) Contraste (heurística): identificar textos com cor próxima do background (delta simples)
              // Não é WCAG completo, mas sinaliza problemas.
              function parseRGB(s) {
                const m = s.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
                if (!m) return null;
                return { r: +m[1], g: +m[2], b: +m[3] };
              }
              function luminance({r,g,b}) {
                const a = [r,g,b].map(v => {
                  v /= 255;
                  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
                });
                return 0.2126*a[0] + 0.7152*a[1] + 0.0722*a[2];
              }
              function contrastRatio(c1, c2) {
                const L1 = luminance(c1);
                const L2 = luminance(c2);
                const hi = Math.max(L1, L2);
                const lo = Math.min(L1, L2);
                return (hi + 0.05) / (lo + 0.05);
              }

              for (const el of textNodes.slice(0, 250)) {
                const cs = window.getComputedStyle(el);
                const color = parseRGB(cs.color);
                const bg = parseRGB(cs.backgroundColor);
                if (!color || !bg) continue;
                const ratio = contrastRatio(color, bg);
                // sinalizar só casos muito prováveis (ratio < 3) para evitar ruído
                if (ratio < 3) {
                  const text = (el.textContent || '').trim();
                  if (text.length) {
                    issues.contrastCandidates.push({
                      tag: el.tagName.toLowerCase(),
                      text: text.slice(0, 80),
                      ratio: Math.round(ratio * 100) / 100,
                      color: cs.color,
                      backgroundColor: cs.backgroundColor,
                    });
                  }
                }
              }

              return issues;
            }"""
        )

    return console_errors, failed_requests, scan_dom


def click_nav_like_links(page: Page):
    # Heurística: tenta clicar em anchors que parecem navegação in-page (hash) e botões.
    # Importante: em viewports menores, links podem ficar dentro de menu colapsado.
    # Aqui evitamos travar o teste tentando clicar em algo que não está visível.
    anchors = page.locator("a[href]")
    count = anchors.count()
    for i in range(min(count, 15)):
        loc = anchors.nth(i)
        if not loc.is_visible():
            continue

        href = loc.get_attribute("href") or ""
        if href.startswith("#"):
            try:
                # força o clique mesmo se o elemento estiver parcialmente fora do viewport
                loc.click(timeout=2000, force=True)
                page.wait_for_timeout(150)
            except Exception:
                # não falhar a auditoria por problemas de estabilidade/viewport do link
                pass

    buttons = page.locator("button")
    bcount = buttons.count()
    for i in range(min(bcount, 10)):
        loc = buttons.nth(i)
        # evita botões invisíveis
        if loc.is_visible():
            try:
                loc.click(timeout=2000, force=True)
                page.wait_for_timeout(150)
            except Exception:
                pass


def audit_viewport(page: Page, name: str, width: int, height: int):
    page.set_viewport_size({"width": width, "height": height})
    page.goto(BASE_URL, wait_until="networkidle")
    expect(page).to_have_url(re.compile(r"http://localhost:4200/?$"))
    page.wait_for_timeout(250)

    # Navegação: cliques superficiais
    click_nav_like_links(page)

    # Screenshot
    page.screenshot(path=f"playwright-audit-{name}.png", full_page=True)

    # Coleta
    console_errors, failed_requests, scan_dom = collect_console_and_requests(page)
    dom_issues = scan_dom()

    return {
        "viewport": name,
        "width": width,
        "height": height,
        "console": console_errors,
        "failed_requests": failed_requests,
        "dom_issues": dom_issues,
    }


def main():
    results = {"base_url": BASE_URL, "audits": []}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        results["audits"].append(audit_viewport(page, "desktop", 1280, 720))
        results["audits"].append(audit_viewport(page, "tablet", 820, 1180))
        results["audits"].append(audit_viewport(page, "mobile", 390, 844))

        context.close()
        browser.close()

    import json

    with open("playwright-audit-results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print("Saved playwright-audit-results.json and screenshots (playwright-audit-*.png)")


if __name__ == "__main__":
    main()
