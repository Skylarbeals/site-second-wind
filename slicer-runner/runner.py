"""Benchstock workshop slicer runner.

Runs on the workshop PC. Every 30 s it asks the website for the next customer
quote, downloads the model, slices it with Elegoo Slicer (command-line mode),
reads filament grams + print time from the G-code, and sends them back.
Only Python 3 (standard library) is required. Configure config.json first.
"""
import json, re, subprocess, sys, tempfile, time, urllib.request, urllib.error
from pathlib import Path

HERE = Path(__file__).parent
CFG = json.loads((HERE / "config.json").read_text())

def call(path, payload=None):
    req = urllib.request.Request(CFG["site_url"].rstrip("/") + path, method="POST",
        data=json.dumps(payload or {}).encode(),
        headers={"x-slicer-token": CFG["slicer_token"], "content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as res:
        body = res.read()
        return json.loads(body) if res.status == 200 and body else None

def seconds_from(text):
    f = {"d": 86400, "h": 3600, "m": 60, "s": 1}
    return sum(float(n) * f[u.lower()] for n, u in re.findall(r"(\d+(?:\.\d+)?)\s*([dhms])", text, re.I))

def parse_gcode(text):
    total = re.search(r"^;\s*total filament used \[g\]\s*=\s*([\d.]+)", text, re.M | re.I)
    each = re.search(r"^;\s*filament used \[g\]\s*=\s*([\d., \t]+)", text, re.M | re.I)
    grams = float(total.group(1)) if total else (sum(float(v) for v in each.group(1).split(",") if v.strip()) if each else 0)
    t = re.search(r"^;[^\n]*total estimated time:\s*([^\n]+)", text, re.M | re.I) or \
        re.search(r"^;\s*estimated printing time \(normal mode\)\s*=\s*([^\n]+)", text, re.M | re.I)
    secs = int(seconds_from(t.group(1))) if t else 0
    if grams <= 0 or secs <= 0:
        raise RuntimeError("Slicer output had no filament/time estimate")
    return grams, secs

def slice_job(job):
    with tempfile.TemporaryDirectory() as tmp:
        safe = re.sub(r"[^A-Za-z0-9._-]", "_", job["fileName"]) or "model.stl"
        model = Path(tmp) / safe
        urllib.request.urlretrieve(job["downloadUrl"], model)
        out = Path(tmp) / "out"; out.mkdir()
        cmd = [CFG["slicer_path"], "--slice", "0",
               "--load-settings", f'{CFG["printer_profile"]};{CFG["process_profile"]}',
               "--load-filaments", CFG["filament_profile"],
               "--outputdir", str(out), str(model)]
        run = subprocess.run(cmd, capture_output=True, text=True, timeout=CFG.get("timeout_seconds", 900))
        files = list(out.rglob("*.gcode"))
        if not files:
            raise RuntimeError(f"Slicer produced no G-code (exit {run.returncode}): {(run.stderr or run.stdout)[-300:]}")
        return parse_gcode(files[0].read_text(errors="ignore"))

def main():
    print("Benchstock slicer runner started. Press Ctrl+C to stop.")
    while True:
        try:
            job = call("/api/public/slicer/next")
            if job:
                print("Slicing", job["fileName"])
                try:
                    grams, secs = slice_job(job)
                    call("/api/public/slicer/result", {"id": job["id"], "grams": grams, "seconds": secs})
                    print(f"  done: {grams:.0f} g, {secs/3600:.2f} h")
                except Exception as e:
                    call("/api/public/slicer/result", {"id": job["id"], "error": str(e)[:500]})
                    print("  failed:", e)
                continue
        except urllib.error.HTTPError as e:
            print("Website error:", e.code, "(check slicer_token)" if e.code == 401 else "")
        except Exception as e:
            print("Connection problem:", e)
        time.sleep(CFG.get("poll_seconds", 30))

if __name__ == "__main__":
    sys.exit(main())
