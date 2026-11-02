"""main.py

FastAPI application for AgriShield AI Recommendation Service.
Implements:
- M3-AI01: GET /health returns service status and artifact readiness.
- M3-AI02 - M3-AI09: POST /recommend generates crop-stage tailored insurance advisory.
- M3-AI10: CORS restricted to frontend client origins.
- M3-AI12: Secure logging with no secrets.
- Interactive OpenAPI documentation at /docs and /redoc with resilient multi-CDN fallback.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse

from schemas import RecommendRequest, RecommendResponse, HealthResponse
from model_loader import ArtifactManager, MODEL_METADATA
from recommend import generate_recommendation

# Configure structured logging without secrets (M3-AI12)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("agrishield_ai_service")

# Resilient Swagger UI HTML with multi-CDN fallback and offline fallback view
SWAGGER_UI_HTML = """<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgriShield AI Recommendation Service - Swagger UI</title>
  <link rel="icon" type="image/png" href="https://fastapi.tiangolo.com/img/favicon.png">
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" id="swagger-css">
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #loading-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: #4b5563;
      font-size: 15px;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e5e7eb;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    #fallback-container {
      display: none;
      max-width: 900px;
      margin: 40px auto;
      padding: 30px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      border: 1px solid #e5e7eb;
    }
    .banner {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      color: #1e40af;
      font-size: 14px;
      line-height: 1.5;
    }
    .endpoint-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    .endpoint-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      font-family: monospace;
      font-size: 14px;
      font-weight: 600;
    }
    .get-header { background: #ecfdf5; border-bottom: 1px solid #a7f3d0; color: #065f46; }
    .post-header { background: #eff6ff; border-bottom: 1px solid #bfdbfe; color: #1e40af; }
    .badge {
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      color: #ffffff;
    }
    .get-badge { background: #059669; }
    .post-badge { background: #2563eb; }
    .endpoint-body {
      padding: 16px;
      font-size: 13px;
      color: #374151;
      background: #ffffff;
    }
    pre {
      background: #f9fafb;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
      overflow-x: auto;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div id="loading-indicator">
    <div class="spinner"></div>
    <div>Loading AgriShield API Documentation...</div>
  </div>

  <div id="swagger-ui"></div>

  <div id="fallback-container">
    <div class="banner">
      <strong>Interactive Documentation Notice:</strong> External CDN assets (jsdelivr) could not be loaded directly by your browser (common on restricted/offline networks). The application has initialized a resilient documentation interface below.
      <br><br>
      • Raw OpenAPI Schema: <a href="/openapi.json" target="_blank" style="color:#2563eb; font-weight:600;">/openapi.json</a>
      <br>
      • Alternative ReDoc View: <a href="/redoc" target="_blank" style="color:#2563eb; font-weight:600;">/redoc</a>
    </div>

    <h2 style="margin-top:0; color:#111827;">AgriShield AI Recommendation Service API</h2>
    <p style="color:#4b5563; font-size:14px;">Version 1.0.0 | Operational</p>

    <div class="endpoint-card">
      <div class="endpoint-header get-header">
        <span class="badge get-badge">GET</span>
        <span>/health</span>
      </div>
      <div class="endpoint-body">
        <p><strong>Summary:</strong> Service Health and Artifact Status (M3-AI01)</p>
        <p>Returns health status and verifies that the model and crop vulnerability tables are loaded.</p>
        <pre>curl -X GET http://127.0.0.1:8000/health</pre>
      </div>
    </div>

    <div class="endpoint-card">
      <div class="endpoint-header post-header">
        <span class="badge post-badge">POST</span>
        <span>/recommend</span>
      </div>
      <div class="endpoint-body">
        <p><strong>Summary:</strong> Generate Insurance Policy Recommendation (M3-AI02 to M3-AI09)</p>
        <p>Evaluates catalogue options and calculates deficit probabilities based on crop critical growth stages.</p>
        <pre>curl -X POST http://127.0.0.1:8000/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 16.31,
    "longitude": 80.44,
    "crop": "maize",
    "sowing_date": "2026-06-15",
    "options": [
      { "option_id": 5, "duration_seconds": 2592000, "trigger_mm": 60, "payout": 60 }
    ]
  }'</pre>
      </div>
    </div>
  </div>

  <script>
    const CSS_FALLBACKS = [
      "https://unpkg.com/swagger-ui-dist@5/swagger-ui.css",
      "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2/swagger-ui.min.css",
      "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"
    ];

    const JS_FALLBACKS = [
      "https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js",
      "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2/swagger-ui-bundle.min.js",
      "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"
    ];

    function tryLoadScript(index) {
      if (index >= JS_FALLBACKS.length) {
        // All CDNs failed or browser offline
        document.getElementById("loading-indicator").style.display = "none";
        document.getElementById("fallback-container").style.display = "block";
        return;
      }

      const script = document.createElement("script");
      script.src = JS_FALLBACKS[index];
      script.crossOrigin = "anonymous";
      script.onload = function() {
        document.getElementById("loading-indicator").style.display = "none";
        try {
          window.ui = SwaggerUIBundle({
            url: "/openapi.json",
            dom_id: "#swagger-ui",
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIBundle.SwaggerUIStandalonePreset || SwaggerUIBundle.presets.standalone || (window.SwaggerUIStandalonePreset)
            ].filter(Boolean),
            layout: "BaseLayout"
          });
        } catch (e) {
          console.warn("SwaggerUIBundle initialization error, displaying fallback:", e);
          document.getElementById("fallback-container").style.display = "block";
        }
      };
      script.onerror = function() {
        console.warn("Failed loading Swagger UI from " + JS_FALLBACKS[index] + ", trying next source...");
        tryLoadScript(index + 1);
      };
      document.head.appendChild(script);
    }

    // Try loading Swagger CSS fallback if needed
    const cssLink = document.getElementById("swagger-css");
    cssLink.onerror = function() {
      cssLink.onerror = null;
      cssLink.href = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2/swagger-ui.min.css";
    };

    // Begin script load
    tryLoadScript(0);
  </script>
</body>
</html>
"""

# Resilient ReDoc HTML with multi-CDN fallback
REDOC_HTML = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AgriShield AI Recommendation Service - ReDoc</title>
  <link rel="icon" type="image/png" href="https://fastapi.tiangolo.com/img/favicon.png">
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="redoc-container"></div>
  <script>
    const REDOC_SCRIPTS = [
      "https://unpkg.com/redoc@2/bundles/redoc.standalone.js",
      "https://cdnjs.cloudflare.com/ajax/libs/redoc/2.1.5/redoc.standalone.min.js",
      "https://cdn.jsdelivr.net/npm/redoc@2/bundles/redoc.standalone.js"
    ];

    function tryLoadRedoc(index) {
      if (index >= REDOC_SCRIPTS.length) {
        document.body.innerHTML = `
          <div style="padding:40px; font-family:sans-serif; max-width:800px; margin:auto;">
            <h2>ReDoc Offline Notice</h2>
            <p>Could not load ReDoc scripts from external CDNs. You can view the raw OpenAPI schema here:</p>
            <p><a href="/openapi.json">/openapi.json</a></p>
            <p><a href="/docs">Go to Swagger UI /docs</a></p>
          </div>
        `;
        return;
      }
      const s = document.createElement("script");
      s.src = REDOC_SCRIPTS[index];
      s.onload = function() {
        Redoc.init("/openapi.json", {}, document.getElementById("redoc-container"));
      };
      s.onerror = function() {
        tryLoadRedoc(index + 1);
      };
      document.head.appendChild(s);
    }

    tryLoadRedoc(0);
  </script>
</body>
</html>
"""

@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan manager for singleton model initialization (M3-AI01 / Phase 3)."""
    logger.info("Initializing AgriShield AI Recommendation Service and loading ML artifacts...")
    ArtifactManager.load()
    app.state.risk_predictor = ArtifactManager.get_risk_predictor()
    logger.info(
        "Artifacts loaded. Mode: %s, Model: %s (%s)",
        MODEL_METADATA["mode"],
        MODEL_METADATA["model_name"],
        MODEL_METADATA["model_version"],
    )
    yield
    logger.info("Shutting down AgriShield AI Recommendation Service...")


app = FastAPI(
    title="AgriShield AI Recommendation Service",
    description=(
        "Advisory AI service for rainfall-based crop insurance. "
        "Provides probabilistic risk assessments and crop-stage aligned policy recommendations. "
        "Advisory only — does not execute transactions or determine smart contract claims."
    ),
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS configuration (M3-AI10: restricted to frontend origins)
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/docs", include_in_schema=False, response_class=HTMLResponse)
def swagger_ui_html():
    """Resilient interactive Swagger UI documentation with multi-CDN fallback."""
    return HTMLResponse(content=SWAGGER_UI_HTML)


@app.get("/redoc", include_in_schema=False, response_class=HTMLResponse)
def redoc_html():
    """Resilient ReDoc documentation with multi-CDN fallback."""
    return HTMLResponse(content=REDOC_HTML)


@app.get("/", tags=["Info"])
def root():
    """Service metadata and interactive documentation links."""
    return {
        "service": "AgriShield AI Recommendation Service",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
        "redoc": "/redoc",
        "openapi": "/openapi.json",
        "health": "/health",
    }


@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["System"],
    summary="Service Health and Artifact Status",
)
def health_check():
    """M3-AI01: Returns service status and verifies that the model and crop table are loaded."""
    model_ready = ArtifactManager.is_ready()
    return HealthResponse(
        status="healthy" if model_ready else "degraded",
        model_loaded=model_ready,
        crop_table_loaded=True,
        recommendation_rule_loaded=True,
        model_name=MODEL_METADATA["model_name"],
        model_version=MODEL_METADATA["model_version"],
        mode=MODEL_METADATA["mode"],
    )


@app.post(
    "/recommend",
    response_model=RecommendResponse,
    tags=["Recommendations"],
    summary="Generate Insurance Policy Recommendation",
)
def recommend(request: RecommendRequest):
    """M3-AI02 to M3-AI09: Evaluates catalogue options and recommends the optimal coverage window."""
    if not ArtifactManager.is_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI model or crop database is not ready to serve predictions.",
        )

    try:
        recommendation = generate_recommendation(request)
        return recommendation
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(val_err),
        )
    except Exception as err:
        logger.error("Error generating recommendation: %s", err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Weather service or recommendation inference encountered a temporary failure.",
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
