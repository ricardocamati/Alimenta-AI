#!/usr/bin/env python3
"""Servidor estático com SPA fallback para Expo Web / expo-router.
Intercepta 404 no do_GET e serve index.html para rotas de app."""
import http.server
import mimetypes
import os
import socket
import socketserver
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else "dist").resolve()
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8081

mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        path = self.translate_path(self.path)
        if not os.path.exists(path) and not self.path.startswith("/_expo/"):
            self.path = "/index.html"
        return super().do_GET()

    def log_message(self, fmt, *args):
        pass


class ReusableTCPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

    def server_bind(self):
        # Força SO_REUSEADDR no socket antes do bind (resolve TIME_WAIT em reconexões rápidas)
        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        super().server_bind()


if __name__ == "__main__":
    with ReusableTCPServer(("0.0.0.0", PORT), SPAHandler) as httpd:
        print(f"[spa-serve] {ROOT} em http://0.0.0.0:{PORT}", flush=True)
        httpd.serve_forever()
