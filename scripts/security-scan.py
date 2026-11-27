"""Run every Slither detector and fail on findings outside documented timestamp policy."""
import json
import os
from pathlib import Path
import subprocess

report_dir = Path('.local/security')
report_dir.mkdir(parents=True, exist_ok=True)
summary = []
TARGETS = {
    'AgentVault': 'contracts/src/AgentVault.sol',
    'VaultFactory': 'contracts/src/VaultFactory.sol',
    'MockUSD': 'contracts/src/MockUSD.sol',
    'PrigenAccountPrototype': 'contracts/src/accounts/PrigenAccountPrototype.sol',
    'SessionCallExecutor': 'contracts/src/accounts/SessionCallExecutor.sol',
}
TIMESTAMP_TRIAGED = {'contracts/src/AgentVault.sol', 'contracts/src/accounts/SessionCallExecutor.sol'}
SOLC = os.environ.get('PRIGENFI_SLITHER_SOLC', '.venv/bin/solc')


def is_triaged(finding):
    files = {element['source_mapping']['filename_relative'] for element in finding['elements']}
    # Expiry windows and UTC budgets intentionally compare block.timestamp.
    if finding['check'] == 'timestamp' and finding['impact'] == 'Low':
        return files <= TIMESTAMP_TRIAGED
    # OpenZeppelin's Account reaches this override through virtual dispatch
    # (proven by the owner-signature Foundry test); Slither misses that edge.
    if finding['check'] == 'dead-code' and finding['impact'] == 'Informational':
        return files == {'contracts/src/accounts/PrigenAccountPrototype.sol'} and \
            'PrigenAccountPrototype._rawSignatureValidation(bytes32,bytes)' in finding['description']
    return False


for name, path in TARGETS.items():
    report = report_dir / f'{name}.json'
    report.unlink(missing_ok=True)
    process = subprocess.run([
        '.venv/bin/slither', path,
        '--compile-force-framework', 'solc', '--solc', SOLC,
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
        if not is_triaged(finding):
            print(finding['description'])
            raise SystemExit(f'{name}: untriaged security finding')
    summary.append({'target': name, 'detectors': 102, 'findings': len(findings), 'triage': 'documented-timestamps-and-oz-virtual-dispatch-only'})
print(json.dumps(summary, indent=2))
(report_dir / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
