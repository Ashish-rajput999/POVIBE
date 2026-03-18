---
description: Restart both the POVibe server and client dev servers
---

// turbo-all

1. Kill any existing processes on ports 8000 and 5173:
```bash
lsof -ti:8000,5173 | xargs kill -9 2>/dev/null; echo "Ports cleared"
```

2. Start both server and client from the project root:
```bash
cd /Users/ashishrajput/Desktop/POVibe && npm run dev
```

The app will be available at:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8000
