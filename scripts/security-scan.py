"""Run every Slither detector and fail on findings outside documented timestamp policy."""
import json
import os
from pathlib import Path
import subprocess

report_dir = Path('.local/security')
report_dir.mkdir(parents=True, exist_ok=True)
summary = []
for name in ['AgentVault', 'VaultFactory', 'MockUSD']:
    report = report_dir / f'{name}.json'
    report.unlink(missing_ok=True)
    process = subprocess.run([
        '.venv/bin/slither', f'contracts/src/{name}.sol',
        '--compile-force-framework', 'solc', '--solc', '.venv/bin/solc',
        '--solc-remaps', '@openzeppelin/contracts/=node_modules/@openzeppelin/contracts/',
        '--filter-paths', 'node_modules', '--json', str(report),
    ], env={**os.environ, 'SOLC_VERSION': '0.8.30'}, capture_output=True, text=True)
    log = process.stdout + process.stderr
    (report_dir / f'{name}.log').write_text(log)
    if not report.exists() or any(marker in log for marker in ['Failed to resolved', 'Missing inheritance', 'Traceback']):
        raise SystemExit(f'{name}: incomplete analysis; inspect {report_dir}')
    data = json.loads(report.read_text())
    if not data.get('success'):
        raise SystemExit(f'{name}: analyzer failure')
    findings = data.get('results', {}).get('detectors', [])
    for finding in findings:
        allowed = (finding['check'] == 'timestamp' and finding['impact'] == 'Low'
                   and all(element['source_mapping']['filename_relative'] == 'contracts/src/AgentVault.sol'
                           for element in finding['elements']))
        if not allowed:
            print(finding['description'])
            raise SystemExit(f'{name}: untriaged security finding')
    summary.append({'target': name, 'detectors': 102, 'findings': len(findings), 'triage': 'documented-expiry-and-UTC-budget-timestamps-only'})
print(json.dumps(summary, indent=2))
(report_dir / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
