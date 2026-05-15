"""
NexusTrade AI - Smart Launcher
Starts the FastAPI server + ngrok tunnel automatically.
Run this instead of uvicorn directly.
"""

import subprocess
import time
import sys
import webbrowser

print("=" * 55)
print("   NexusTrade AI - Professional Trading Terminal")
print("=" * 55)

# Try to start ngrok tunnel
try:
    from pyngrok import ngrok, conf

    # Check if auth token is set, if not prompt
    try:
        tunnel = ngrok.connect(8000, "http")
        public_url = tunnel.public_url
        
        print(f"\n✅ AI Backend is LIVE at:")
        print(f"   {public_url}")
        print(f"\n🌐 Your Vercel frontend:")
        print(f"   https://treding-ai.vercel.app")
        print(f"\n⚡ To connect frontend to this backend:")
        print(f"   Copy this URL: {public_url}")
        print(f"   Open: https://treding-ai.vercel.app/?backend={public_url}")
        print("\n" + "=" * 55)
        
        # Save the current tunnel URL to a file for the frontend to read
        with open("current_tunnel.txt", "w") as f:
            f.write(public_url)
            
    except Exception as e:
        print(f"\n⚠️  ngrok needs a free auth token to work.")
        print(f"   1. Sign up free at: https://ngrok.com")
        print(f"   2. Copy your token from: https://dashboard.ngrok.com/get-started/your-authtoken")
        print(f"   3. Run: ngrok authtoken YOUR_TOKEN_HERE")
        print(f"\n   Running locally only for now...\n")

except ImportError:
    print("\n⚠️  pyngrok not installed. Running locally only.\n")

# Start the FastAPI server
print("\n🚀 Starting NexusTrade AI Backend Server...")
print("   Local URL: http://localhost:8000")
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
    print("\n\n✅ NexusTrade AI Server stopped.")
    ngrok.kill()
