"""Run from the repository root; read-only source/doc checks plus JSON evidence."""
from pathlib import Path
import hashlib
import json
import re
from urllib.parse import unquote, urlsplit

root = Path(__file__).resolve().parents[4]
asset = root / 'docs/03_feature-reference/REF-004_yuanzhan-operating-interface'
manifest = json.loads((asset / 'source-manifest.json').read_text())
errors = []
for item in manifest['files']:
    source = (root / item['source']).read_bytes()
    archived = (asset / item['archived']).read_bytes()
    if source != archived or len(archived) != item['bytes'] or hashlib.sha256(archived).hexdigest() != item['sha256']:
        errors.append('Source mismatch: ' + item['archived'])

formal = []
for prefix in ['PRD-006_', 'ARC-040_', 'REF-004_', 'RES-029_', 'PLN-070_', 'ACC-008_']:
    formal.extend((root / 'docs').glob('*/' + prefix + '*.md'))
assert len(formal) == 6
texts = {p: p.read_text() for p in formal}
for name in ['scenario-notes.md', 'decisions.md']:
    p = asset / name
    texts[p] = p.read_text()
sections = {
    'docs/05_execution-plans/PLN-060_task-backlog.md': '\nStatuses:',
    'docs/05_execution-plans/PLN-061_current-sprint.md': '\nOwner-directed prototype module isolation',
    'tasks.md': '\nThis file is the lightweight',
    'docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md': '\n## OWNEROS-UI-006',
    'docs/06_audits-and-reports/RPT-007_completed-log.md': '\n## 2026-09-02',
}
for name, end in sections.items():
    p = root / name
    text = p.read_text()
    assert end in text
    texts[p] = text.split(end, 1)[0]
p = root / 'docs/00_manual-and-index/MAN-001_document-index.md'
texts[p] = '\n'.join(line for line in p.read_text().splitlines() if any(x in line for x in ['PRD-006', 'ARC-040', 'REF-004', 'RES-029', 'PLN-070', 'ACC-008']))
links = 0
for p, content in texts.items():
    for target in re.findall(r'\[[^\]]*\]\(([^\n)]+)\)', content):
        target = target.strip('<>')
        parsed = urlsplit(target)
        if parsed.scheme or not parsed.path:
            continue
        links += 1
        resolved = p.parent / unquote(parsed.path)
        if not resolved.exists():
            errors.append(f'Missing link: {p.relative_to(root)} -> {target}')

for mode in ['showcase', 'empty']:
    text = (asset / f'ui-{mode}.env.example').read_text()
    if f'PERSONAL_OS_UI_DATA_MODE={mode}' not in text:
        errors.append('Missing mode example: ' + mode)

result = {'date': '2026-09-13', 'task': 'YZUI-001', 'sourceCopiesVerified': len(manifest['files']), 'formalDocuments': len(formal), 'localLinksChecked': links, 'linkScope': 'new documents and added canonical sections; historical links excluded', 'errors': errors, 'runtimeModeVerification': 'NOT_COVERED_BY_THIS_SOURCE_DOC_CHECK — see ../yuanzhan-ui-runtime/'}
Path(__file__).with_name('docs-verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=False, indent=2))
raise SystemExit(bool(errors))
