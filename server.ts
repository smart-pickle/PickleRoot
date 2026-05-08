import express from "express";
import { createServer as createViteServer } from "vite";
import systeminfo from 'systeminformation';
const si = (systeminfo as any).default || systeminfo;
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const DATA_DIR = path.join(process.cwd(), 'data');
  const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

  // Ensure data directory exists
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create data directory:", err);
  }

  // API Route to fetch configuration
  app.get("/api/config", async (req, res) => {
    try {
      const data = await fs.readFile(CONFIG_FILE, 'utf-8');
      res.json(JSON.parse(data));
    } catch (err) {
      // Return null so frontend knows to use defaults or handle appropriately
      res.json(null);
    }
  });

  // API Route to save configuration
  app.post("/api/config", async (req, res) => {
    try {
      await fs.writeFile(CONFIG_FILE, JSON.stringify(req.body, null, 2));
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to save config:", err);
      res.status(500).json({ error: "Failed to save configuration" });
    }
  });

  // API Route to fetch system information (like local IP)
  app.get("/api/info", (req, res) => {
    res.json({
      localIp: getLocalIp()
    });
  });

  // API Route for system stats
  app.get("/api/stats", async (req, res) => {
    const statsTimeout = setTimeout(() => {
      console.error("Stats request timed out");
      if (!res.headersSent) {
        res.status(504).json({ error: "System stats request timed out" });
      }
    }, 4500); // Slightly less than the 5s fetch interval

    try {
      // Use individual catch for si calls as some might fail in containers
      // Wrap in Promise.resolve to handle cases where they might not return a promise (though they should)
      const [time, load, mem] = await Promise.all([
        Promise.resolve(si.time()).catch(e => { console.error("si.time error:", e); return { uptime: 0 }; }),
        Promise.resolve(si.currentLoad()).catch(e => { console.error("si.currentLoad error:", e); return { currentLoad: 0 }; }),
        Promise.resolve(si.mem()).catch(e => { console.error("si.mem error:", e); return { active: 0, total: 0 }; })
      ]);

      let fsSize: any[] = [];
      try {
        // Run fsSize separately with its own timeout/catch
        const fsPromise = Promise.resolve(si.fsSize());
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('si.fsSize timeout')), 2000));
        fsSize = await Promise.race([fsPromise, timeoutPromise]) as any[];
      } catch (e) {
        console.error("si.fsSize error or timeout:", e);
      }

      clearTimeout(statsTimeout);
      if (res.headersSent) return;

      // Calculate total/used storage across all relevant partitions
      const rootFs = (Array.isArray(fsSize) ? (fsSize.find(f => f.mount === '/') || fsSize[0]) : null) || { used: 0, size: 0, use: 0 };
      
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
      clearTimeout(statsTimeout);
      console.error("System stats error handler:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to fetch system stats" });
      }
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
