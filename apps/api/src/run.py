"""
Run the FastAPI application with settings from .env
"""

import uvicorn

from .config import settings

if __name__ == "__main__":
    uvicorn.run("src.main:app", host=settings.host, port=settings.port, reload=True)
