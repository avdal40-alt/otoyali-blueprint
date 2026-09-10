const MAINTENANCE_HTML = `<!doctype html>
<html lang="tr" dir="ltr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Kısa bir bakımdayız | OTOYALI</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; background: #f8fafc; color: #172033; font-family: Arial, sans-serif; }
      main { align-items: center; display: flex; justify-content: center; min-height: 100vh; padding: 4rem 1.5rem; }
      section { background: #fff; border: 1px solid #e2e8f0; border-radius: 1.5rem; box-shadow: 0 1px 2px rgba(15, 23, 42, .06); max-width: 36rem; padding: 3rem; text-align: center; width: 100%; }
      .brand { color: #2563eb; font-size: .875rem; font-weight: 700; letter-spacing: .2em; }
      h1 { font-size: 1.875rem; margin: 1rem 0 0; }
      p { color: #64748b; font-size: 1rem; line-height: 1.75; margin: 1rem 0 0; }
      .english { border-top: 1px solid #e2e8f0; font-size: .875rem; margin-top: 2rem; padding-top: 1.5rem; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <div class="brand">OTOYALI</div>
        <h1>Kısa bir bakımdayız</h1>
        <p>Daha güvenli bir deneyim için kısa bir güncelleme yapıyoruz. Lütfen birkaç dakika sonra yeniden deneyin.</p>
        <p class="english">We are completing a short update. Please try again in a few minutes.</p>
      </section>
    </main>
  </body>
</html>`;

const MAINTENANCE_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "text/html; charset=utf-8",
  "Retry-After": "60"
};

function maintenanceResponse(method: string) {
  return new Response(method === "HEAD" ? null : MAINTENANCE_HTML, {
    status: 503,
    headers: MAINTENANCE_HEADERS
  });
}

export function GET() { return maintenanceResponse("GET"); }
export function HEAD() {
  return maintenanceResponse("HEAD");
}
export function POST() { return maintenanceResponse("POST"); }
export function PUT() { return maintenanceResponse("PUT"); }
export function PATCH() { return maintenanceResponse("PATCH"); }
export function DELETE() { return maintenanceResponse("DELETE"); }
export function OPTIONS() { return maintenanceResponse("OPTIONS"); }
