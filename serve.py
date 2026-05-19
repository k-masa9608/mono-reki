import http.server
import os

PORT = int(os.environ.get('PORT', 8080))

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # suppress logs

with http.server.HTTPServer(('', PORT), Handler) as httpd:
    print(f'Serving on port {PORT}')
    httpd.serve_forever()
