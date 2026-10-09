FROM python:3.12-slim-bookworm

RUN apt-get update \
 && apt-get install -y --no-install-recommends blender ca-certificates fonts-dejavu-core \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY forge-worker/server.py /app/server.py

ENV PYTHONUNBUFFERED=1
CMD ["blender","-b","--python","/app/server.py"]
