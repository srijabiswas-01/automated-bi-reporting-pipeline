"""Upload project source to a private GitHub repository using a temporary checkout.

Preserves the workspace's existing Git remote and excludes runtime/private files.
Requires an authenticated GitHub CLI. This does not initialize a database.
"""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT=Path(__file__).resolve().parents[1]
FOLDERS=('.github','apps-script','database','etl','airflow','dashboard','docs','sample_data','tests','tools','operational')
ROOT_FILES=('README.md','requirements.txt','docker-compose.yml','.env.example','.gitignore','.clasp.json','.claspignore')
SUFFIXES={'.py','.sql','.gs','.html','.json','.md','.yml','.yaml','.txt','.csv','.cjs'}


def command(args,cwd=None):
    result=subprocess.run(args,cwd=cwd,text=True,capture_output=True,timeout=180)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or 'Command failed')
    return result.stdout


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('repository',help='owner/repository')
    modes=parser.add_mutually_exclusive_group()
    modes.add_argument('--initialize-only',action='store_true',help='Upload only schema initialization code; no data, samples or portal files')
    modes.add_argument('--pipeline-only',action='store_true',help='Upload only ETL source and its automatic workflow; no data or credentials')
    args=parser.parse_args()
    gh=shutil.which('gh')
    if not gh:
        raise SystemExit('GitHub CLI is required')
    metadata=json.loads(command([gh,'repo','view',args.repository,'--json','nameWithOwner,isPrivate,url,defaultBranchRef']))
    if not metadata['isPrivate']:
        raise SystemExit('Project uploads require a private repository')
    if not metadata.get('defaultBranchRef'):
        raise SystemExit('Initialize the GitHub repository with a README first')
    identity=json.loads(command([gh,'api','user']))
    files=[ROOT/name for name in ROOT_FILES if (ROOT/name).is_file()] if not args.initialize_only else [ROOT/name for name in (
        '.github/workflows/initialize_neon.yml','tools/init_database.py','requirements.txt',
        'etl/__init__.py','etl/config.py','database/model.py','database/schema.sql',
        'database/constraints.sql','database/indexes.sql','database/reporting_views.sql')]
    if args.pipeline_only:
        files=[ROOT/name for name in ('.github/workflows/primary_etl.yml','requirements.txt','database/model.py',
            'etl/__init__.py','etl/config.py','etl/extract.py','etl/transform.py','etl/validate.py',
            'etl/load.py','etl/pipeline.py','etl/monitoring.py')]
    for name in (() if args.initialize_only or args.pipeline_only else FOLDERS):
        folder=ROOT/name
        if not folder.exists():
            continue
        files.extend(p for p in folder.rglob('*') if p.is_file()
                     and not any(part in ('__pycache__','.venv','.git','node_modules','logs') for part in p.relative_to(ROOT).parts)
                     and (p.suffix in SUFFIXES or p.name=='Dockerfile')
                     and not p.name.startswith(('credentials','service-account','.env.')))
    auth=['git','-c','credential.helper=','-c','credential.helper=!gh auth git-credential']
    with tempfile.TemporaryDirectory(prefix='superstore-private-publish-') as directory:
        checkout=Path(directory)/'repository'
        command(auth+['clone','--depth','1',metadata['url'],str(checkout)])
        paths=[]
        for source in files:
            relative=source.relative_to(ROOT)
            destination=checkout/relative
            destination.parent.mkdir(parents=True,exist_ok=True)
            shutil.copyfile(source,destination)
            paths.append(relative.as_posix())
        command(['git','add','--',*paths],cwd=checkout)
        changed=command(['git','diff','--cached','--name-only'],cwd=checkout).splitlines()
        if changed:
            author_name=identity.get('name') or identity['login']
            author_email=f"{identity['id']}+{identity['login']}@users.noreply.github.com"
            message='Add empty Neon database initialization workflow' if args.initialize_only else 'Add retail portal and automatic Sheets-to-Neon reporting'
            if args.pipeline_only:
                message='Add automatic snapshot ETL workflow for Neon'
            command(['git','-c',f'user.name={author_name}','-c',f'user.email={author_email}',
                     'commit','-m',message],cwd=checkout)
            command(auth+['push','origin','HEAD'],cwd=checkout)
        print(f"Published {len(changed)} source files to {metadata['nameWithOwner']} ({metadata['defaultBranchRef']['name']}).")
        print('Workspace Git remote preserved. Private environment files and downloaded workbooks excluded.')


if __name__=='__main__':
    main()
