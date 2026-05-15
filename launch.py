# -*- coding: utf-8 -*-
"""
NexusTrade AI - Smart Launcher
Starts the FastAPI server + ngrok tunnel automatically.
Run: python launch.py
"""

import subprocess
import sys
import os

# Fix Windows Unicode console
os.environ["PYTHONIOENCODING"] = "utf-8"

print("=" * 55)
print("   NexusTrade AI - Professional Trading Terminal")
print("=" * 55)

try:
    from pyngrok import ngrok

    tunnel = ngrok.connect(8000, "http")
    public_url = tunnel.public_url

    print(f"\n[OK] Platform is LIVE at:")
    print(f"   {public_url}")
    print(f"\n[LINK] Open this URL in your browser to use the app:")
    print(f"   {public_url}")
    print("\n" + "=" * 55)
    print("   Copy the link above and open it in your browser!")
    print("=" * 55)

    # Save tunnel URL for reference
    with open("current_tunnel.txt", "w") as f:
        f.write(public_url)

except Exception as e:
    print(f"\n[WARN] Could not start ngrok tunnel: {e}")
    print("   Running locally at http://localhost:8000 only.\n")

# Start FastAPI server
print("\n[START] Starting NexusTrade AI Backend Server...")
print("   Local: http://localhost:8000")
print("   Press CTRL+C to stop\n")

try:
    subprocess.run([
        sys.executable, "-m", "uvicorn",
        "server:app",
        "--reload",
        "--host", "0.0.0.0",
        "--port", "8000"
    ])
except KeyboardInterrupt:
    print("\n\n[STOP] NexusTrade AI Server stopped.")
    try:
        from pyngrok import ngrok
        ngrok.kill()
    except:
        pass
