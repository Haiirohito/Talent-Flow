@echo off
echo Starting TalentFlow Backend...
echo.

cd /d "%~dp0backend"

echo Running database pre-start check...
uv run python -m app.backend_pre_start
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Database pre-start check failed.
    pause
    exit /b 1
)

echo Running database migrations...
uv run alembic upgrade head
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Database migrations failed.
    pause
    exit /b 1
)

echo Loading initial data...
uv run python -m app.initial_data
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Initial data loading failed. Continuing anyway...
)

echo.
echo Starting uvicorn server on http://localhost:8000 ...
echo Press Ctrl+C to stop.
echo.
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
