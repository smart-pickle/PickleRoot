# Aura Home Dashboard

Aura is a minimalist, high-performance personal home dashboard designed for self-hosters and power users. It provides real-time system monitoring, service health status, and a sleek interface to organize your digital life.

![Aura Screenshot](https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2000)

## ✨ Features

- **Real-time System Stats**: Monitor CPU load, Memory usage, and Disk space directly on your dashboard.
- **Service Monitoring**: Automated health checks for your self-hosted services with visual online/offline indicators.
- **Customizable Interface**: 
  - Add, edit, and remove service shortcuts.
  - **Drag and Drop**: Reorder your service tabs easily with integrated mobile-friendly drag and drop.
  - Custom icons and categories.
- **Responsive Design**: Optimized for everything from ultra-wide monitors to vertical smartphone screens.
- **Weather Integration**: Quick glance at local weather conditions with customizable city selection in settings.
- **Persistence**: Your configuration is saved securely on the server in a `config.json` file, allowing you to access the same dashboard from any device.

## 🚀 Quick Start with Docker

The easiest way to run Aura is using Docker. It is configured to run on **port 80** by default.

### Using Docker Compose (Recommended)

1. Create a `docker-compose.yml` file:
```yaml
version: '3.8'

services:
  aura-home:
    build: .
    container_name: aura-home
    ports:
      - "80:80"
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    environment:
      - PORT=80
      - NODE_ENV=production
```

2. Start the container:
```bash
docker-compose up -d
```

### Using Dockerfile

You can also build the image yourself:

```bash
docker build -t aura-dashboard .
docker run -d -p 80:80 --name aura-home aura-dashboard
```

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons
- **Animations**: Framer Motion
- **Drag & Drop**: @dnd-kit
- **Backend**: Node.js, Express
- **System Metrics**: systeminformation

## 📱 Mobile Support

Aura is fully optimized for touch devices:
- Long-press to initiate drag and drop on mobile.
- Responsive layout that adapts stats and footer for portrait mode.
- Large touch targets for easy navigation.

---

*Built with precision for the modern homelab.*
