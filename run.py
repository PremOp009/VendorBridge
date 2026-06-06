# VendorBridge ERP — Quick Start Script

# Run this from the VendorBridge directory
# Usage: venv\Scripts\python run.py

import subprocess
import sys
import os

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    subprocess.run([
        sys.executable, '-m', 'flask',
        '--app', 'backend.app',
        'run',
        '--host=0.0.0.0',
        '--port=5000',
        '--debug'
    ])
