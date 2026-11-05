"""Add a selected runner to remote HEAD while preserving current project files.

GitHubSync additionally merges required OAuth scopes, preserving deployment settings.
Does not publish a deployment or execute functions. Run setup from the editor afterward.
"""
import json
import argparse
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--file',default='DemoData.gs',choices=['DemoData.gs','BulkDemoData.gs','GitHubSync.gs'])
    filename=parser.parse_args().file
    stem=Path(filename).stem
    executable = shutil.which('clasp.cmd') or shutil.which('clasp')
    if not executable:
        raise SystemExit('Install @google/clasp and sign in first')
    project = json.loads((ROOT / '.clasp.json').read_text())
    content = (ROOT / 'apps-script' / filename).read_text(encoding='utf-8')
    with tempfile.TemporaryDirectory(prefix='superstore-demo-upload-') as directory:
        staging = Path(directory).resolve()
        source = staging / 'src'
        source.mkdir()
        config = staging / '.clasp.json'
        config.write_text(json.dumps({'scriptId': project['scriptId'], 'rootDir': str(source)}))

        def clasp(*args):
            result = subprocess.run([executable, '-P', str(config), *args], cwd=staging,
                                    text=True, capture_output=True, timeout=120)
            if result.returncode:
                raise RuntimeError(result.stderr or result.stdout or 'clasp failed')
            return result.stdout

        clasp('pull')
        if not (source / 'appsscript.json').is_file():
            raise RuntimeError('Remote manifest missing; refusing to upload')
        manifest_changed=False
        if filename=='GitHubSync.gs':
            manifest_path=source/'appsscript.json'
            manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
            scopes=manifest.setdefault('oauthScopes',[])
            for scope in ('https://www.googleapis.com/auth/script.external_request','https://www.googleapis.com/auth/script.scriptapp'):
                if scope not in scopes:
                    scopes.append(scope)
                    manifest_changed=True
            if manifest_changed:
                manifest_path.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
        existing = list(source.glob(stem+'.*'))
        target = existing[0] if existing else source / filename
        if len(existing) > 1:
            raise RuntimeError('Ambiguous remote DemoData files; refusing to upload')
        if manifest_changed or not target.exists() or target.read_text(encoding='utf-8').strip() != content.strip():
            target.write_text(content, encoding='utf-8')
            clasp('push', '--force')
        # clasp can download SERVER_JS files with .js rather than .gs; read back
        # into a clean directory to avoid mistaking the old local file for a duplicate.
        verify_source = staging / 'verify-source'
        verify_source.mkdir()
        config.write_text(json.dumps({'scriptId': project['scriptId'], 'rootDir': str(verify_source)}))
        clasp('pull')
        verified = list(verify_source.glob(stem+'.*'))
        if len(verified) != 1 or verified[0].read_text(encoding='utf-8').replace('\r\n', '\n').strip() != content.replace('\r\n', '\n').strip():
            raise RuntimeError('Remote demo loader readback did not match')
        function={'BulkDemoData.gs':'loadSupermarket50','DemoData.gs':'loadAndTestDemo','GitHubSync.gs':'installAutomaticSync'}[filename]
        print(f'{filename} uploaded and verified. Remote manifest and other files preserved. Run {function} in the Apps Script editor.')


if __name__ == '__main__':
    main()
