FROM python:3.12-slim

WORKDIR /app

COPY server.py categorizer.py seed_data.py ./

ENV PYTHONUNBUFFERED=1

EXPOSE 5055

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5055/health').read()" || exit 1

CMD ["python", "server.py"]
