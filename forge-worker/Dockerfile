FROM python:3.12-slim-bookworm

RUN apt-get update \
 && apt-get install -y --no-install-recommends blender ca-certificates fonts-dejavu-core libegl1 libgl1 libglx0 libopengl0 python3-numpy \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY forge-worker/server.py /app/server.py

ENV PYTHONUNBUFFERED=1
CMD ["blender","-b","--python","/app/server.py"]
