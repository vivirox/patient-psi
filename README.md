# Patient PSI - Astro Version

A modern web application for generating Cognitive Conceptualization Diagrams (CCDs) from therapy session transcripts.

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd patient-psi-astro
   ```

2. **Run the setup script**
   ```bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env` in the python directory
   - Update the values in `.env` according to your needs

4. **Start the development server**
   ```bash
   npm run dev
   ```

## 📦 Dependencies

### Backend Requirements
- Python 3.11
- Redis 6.0+
- Ollama

### Key Python Packages
- langchain-ollama: LLM integration
- aioredis: Redis async client
- pydantic: Data validation
- psutil: System metrics
- structlog: Structured logging

### Frontend Requirements
- Node.js 20+
- npm 7+

## 🔧 Configuration

### Environment Variables

Key configurations in `.env`:

#### LLM Configuration
- `OLLAMA_MODEL`: Model name to use
- `GENERATOR_MODEL_TEMP`: Temperature for generation
- `MAX_ATTEMPTS`: Maximum retry attempts

#### Redis Configuration
- `REDIS_HOST`: Redis server host
- `REDIS_PORT`: Redis server port
- `REDIS_PASSWORD`: Redis password (if any)
- `CACHE_TTL_HOURS`: Cache entry lifetime

#### Metrics Configuration
- `METRICS_WINDOW_SIZE`: Size of metrics rolling window
- `METRICS_ENABLED`: Enable/disable metrics collection

See `.env.example` for all available options.

## 🔍 Monitoring

### Metrics Available
- Generation performance
  * Success rate
  * Average duration
  * Cache hit rate
- System resources
  * CPU usage
  * Memory usage
  * Disk usage
- Error rates and common errors

Access metrics through the `/metrics` endpoint.

## 🐛 Troubleshooting

Common issues and solutions:

1. **Redis Connection Failed**
   ```bash
   sudo systemctl status redis  # Check Redis status
   sudo systemctl restart redis # Restart if needed
   ```

2. **Ollama Model Not Found**
   ```bash
   ollama pull mistral  # Pull the required model
   ```

3. **Cache Issues**
   ```bash
   redis-cli flushall  # Clear Redis cache
   ```

## 📚 Development

### Running Tests
```bash
python -m pytest python/tests/
```

### Code Style
```bash
black python/
flake8 python/
mypy python/
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
