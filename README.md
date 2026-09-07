# IBVAP Backend

IBVAP is a prototype border-surveillance video analytics backend. It accepts a local video file or RTSP source, tracks people and vehicles with Ultralytics YOLOv8n, persists analytics events/alerts in SQLite, and exposes FastAPI routes for the existing frontend.

## Setup

Python 3.10+ is required.

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate
pip install -r requirements.txt
```

The first detector run may download `yolov8n.pt`. Optional license-plate weights can be placed at `models/license_plate_detector.pt`; if they are absent, ANPR uses the vehicle crop as a lower-accuracy fallback. Put a development video at `test_videos/sample.mp4` or update `config/cameras.yaml`.

## Run the checks

```bash
pytest -q
python scripts/test_camera.py test_videos/sample.mp4
```

The camera script opens a live annotated window. Press `q` to stop. Use `--no-window` in headless environments; a real video is needed for the visual acceptance check.

## Run the API

```bash
uvicorn app.main:app --reload
```

The API is intentionally open for this prototype. Available routes include:

- `GET /health`
- `GET /api/events?camera_id=camera-1&event_type=zone_check&page=1&page_size=50`
- `GET /api/alerts?status=new&severity=high`
- `PATCH /api/alerts/{alert_id}` with `{"status":"acknowledged","operator_id":"operator-1","operator_note":"reviewed"}`
- `GET /api/cameras`
- WebSocket `/ws/alerts`

Seed a restricted demo vehicle with:

```bash
python scripts/seed_watchlist.py AB12C3456
```

## Configuration

- `config/cameras.yaml` lists `camera_id`, `source`, and configured zone IDs.
- `config/zones.yaml` contains camera polygons and sensitivity labels.
- `config/thresholds.yaml` contains frame/time persistence thresholds.

SQLite data is stored in `ibvap.db`; evidence snapshots are stored under `evidence/`. Both are runtime artifacts and should not be used as production storage.

## Known limitations

This is a hackathon prototype: SQLite is used instead of PostgreSQL, there is no authentication, plate detection falls back to vehicle crops without optional weights, OCR accuracy depends on camera quality, and the detector uses COCO's base classes. Face recognition, optical-flow anomaly detection, and vehicle make/color classification are intentionally out of scope.
