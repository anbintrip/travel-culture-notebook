#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent
TEXT_EXTENSIONS = {'.html','.js','.json','.css','.md','.py','.txt','.yml','.yaml','.toml'}
IGNORE = {'.git'}
PATTERNS = {
    'email address': re.compile(r'\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b', re.I),
    'private Notion/app URL': re.compile(r'https?://(?:www\.)?(?:notion\.so|app\.notion\.com)/', re.I),
    'container path': re.compile(r'/mnt/data/', re.I),
    'Windows user path': re.compile(r'[A-Z]:\\\\Users\\\\', re.I),
    'possible secret assignment': re.compile(r'(?i)\b(?:api[_-]?key|secret|token|password)\b\s*[:=]\s*["\']?[^\s"\']{8,}'),
}

findings=[]
for path in ROOT.rglob('*'):
    if not path.is_file() or path.suffix.lower() not in TEXT_EXTENSIONS:
        continue
    if path.name == 'check_public_repo.py':
        continue
    if any(part in IGNORE for part in path.parts):
        continue
    text=path.read_text(errors='ignore')
    for label, pattern in PATTERNS.items():
        for match in pattern.finditer(text):
            line=text.count('\n',0,match.start())+1
            findings.append((path.relative_to(ROOT),line,label,match.group(0)[:120]))

if findings:
    print('Public repository check FAILED:')
    for path,line,label,sample in findings:
        print(f'- {path}:{line} [{label}] {sample}')
    sys.exit(1)

print('Public repository check passed: no obvious personal data, private Notion URLs, local user paths, or secret assignments found.')
