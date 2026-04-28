import express from "express";
import { createServer as createViteServer } from "vite";
import si from 'systeminformation';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // API Route for system stats
  app.get("/api/stats", async (req, res) => {
    try {
      const [time, fsSize, load, mem] = await Promise.all([
        si.time(),
        si.fsSize(),
        si.currentLoad(),
        si.mem()
      ]);

      // Calculate total/used storage across all relevant partitions
      const rootFs = fsSize.find(f => f.mount === '/') || fsSize[0] || { used: 0, size: 0, use: 0 };
      
      const cpuLoad = isNaN(load.currentLoad) ? 0 : load.currentLoad;

      res.json({
        uptime: time.uptime || 0,
        storage: {
          used: rootFs.used || 0,
          size: rootFs.size || 0,
          use: rootFs.use || 0
        },
        cpu: {
          load: cpuLoad.toFixed(1),
        },
        mem: {
          used: ((mem.active || 0) / 1e9).toFixed(1),
          total: ((mem.total || 0) / 1e9).toFixed(1),
          percent: mem.total > 0 ? ((mem.active / mem.total) * 100).toFixed(1) : "0.0"
        }
      });
    } catch (error) {
      console.error("System stats error:", error);
      res.status(500).json({ error: "Failed to fetch system stats" });
    }
  });

  // API Route to check service availability
  app.get("/api/health", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      // Use fetch with a short timeout to check if the heart of the service is beating
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

      const response = await fetch(url, { 
        method: 'GET', // Changed to GET as many local services block HEAD
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      res.json({ online: response.status < 500 }); // Consider anything not a server error as "online"
    } catch (error) {
      res.json({ online: false });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
