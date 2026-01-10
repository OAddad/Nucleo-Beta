# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file para Núcleo Backend
Gera um executável standalone do servidor FastAPI
"""

import os
import sys

# Caminho base
base_path = os.path.dirname(os.path.abspath(SPEC))

a = Analysis(
    ['server.py'],
    pathex=[base_path],
    binaries=[],
    datas=[
        # Incluir seed database para bootstrap
        ('data_backup/nucleo.db', 'data_backup'),
    ],
    hiddenimports=[
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'fastapi',
        'starlette',
        'starlette.responses',
        'starlette.staticfiles',
        'pydantic',
        'pydantic_core',
        'sqlite3',
        'json',
        'jwt',
        'PIL',
        'PIL.Image',
        'multipart',
        'python_multipart',
        'dotenv',
        'anyio',
        'anyio._backends',
        'anyio._backends._asyncio',
        'h11',
        'httptools',
        'watchfiles',
        'database',
        'bug_tracker',
        'excel_backup',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib',
        'numpy.tests',
        'pandas.tests',
        'test',
        'tests',
    ],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='nucleo-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # SEM console - backend roda em background
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='../build-resources/icon.ico' if os.path.exists('../build-resources/icon.ico') else None,
)
