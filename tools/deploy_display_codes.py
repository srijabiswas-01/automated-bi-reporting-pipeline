"""Stage only the readable-reference update, preserve the manifest and current URLs."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT=Path(__file__).resolve().parents[1]
FILES=('Config.gs','Helpers.gs','DisplayCodes.gs','Code.gs','ValidationService.gs','DashboardService.gs',
       'Partial_CoreJS.html','Partial_ProductsJS.html')


def main():
    executable=shutil.which('clasp.cmd') or shutil.which('clasp')
    if not executable:
        raise SystemExit('Install clasp and sign in first')
    project=json.loads((ROOT/'.clasp.json').read_text())
    with tempfile.TemporaryDirectory(prefix='superstore-display-codes-') as folder:
        stage=Path(folder)
        source=stage/'src'
        source.mkdir()
        config=stage/'.clasp.json'
        config.write_text(json.dumps({'scriptId':project['scriptId'],'rootDir':str(source)}))
        def clasp(*args):
            result=subprocess.run([executable,'-P',str(config),*args],cwd=stage,text=True,capture_output=True,timeout=180)
            if result.returncode:
                raise RuntimeError(result.stderr or result.stdout or 'clasp failed')
            return result.stdout
        clasp('pull')
        manifest=(source/'appsscript.json').read_bytes()
        deployments=json.loads(clasp('--json','list-deployments'))
        deployments=[d for d in deployments if d.get('versionNumber')]
        if not deployments:
            raise RuntimeError('No existing versioned deployment found; refusing to publish a new URL')
        clasp('create-version','Backup before readable display-code update')
        for name in FILES:
            local=ROOT/'apps-script'/name
            stem=local.stem
            matches=list(source.glob(stem+'.*'))
            if len(matches)>1:
                raise RuntimeError('Ambiguous remote file: '+stem)
            destination=matches[0] if matches else source/name
            destination.write_text(local.read_text(encoding='utf-8'),encoding='utf-8')
        clasp('push','--force')
        verify=stage/'verify'
        verify.mkdir()
        config.write_text(json.dumps({'scriptId':project['scriptId'],'rootDir':str(verify)}))
        clasp('pull')
        if (verify/'appsscript.json').read_bytes()!=manifest:
            raise RuntimeError('Remote manifest changed; refusing to redeploy')
        for name in FILES:
            matches=list(verify.glob(Path(name).stem+'.*'))
            if len(matches)!=1 or matches[0].read_text(encoding='utf-8').strip()!=(ROOT/'apps-script'/name).read_text(encoding='utf-8').strip():
                raise RuntimeError('Remote code readback mismatch: '+name)
        versions_before=json.loads(clasp('--json','list-versions'))
        clasp('create-version','Readable references; UUID relationships preserved')
        versions_after=json.loads(clasp('--json','list-versions'))
        before_numbers={v['versionNumber'] for v in versions_before}
        new=[v['versionNumber'] for v in versions_after if v['versionNumber'] not in before_numbers]
        if len(new)!=1:
            raise RuntimeError('Could not identify the new version unambiguously')
        for deployment in deployments:
            clasp('update-deployment',deployment['deploymentId'],'--versionNumber',str(new[0]),'--description','Readable display codes; same internal UUID keys')
        print(f'Verified {len(FILES)} updated files and preserved manifest. Updated {len(deployments)} existing deployment URLs to version {new[0]}.')
        print('Refresh the portal to back up and upgrade the existing Sheet; the scheduled exporter can also perform the upgrade.')


if __name__=='__main__':
    main()
