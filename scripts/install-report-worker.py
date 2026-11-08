"""Install a user LaunchAgent for this local GrantProof workspace; no secrets in plist."""
import argparse, os, pathlib, plistlib, shutil, subprocess
parser=argparse.ArgumentParser()
parser.add_argument('--database',required=True)
parser.add_argument('--enable-live',action='store_true')
parser.add_argument('--uninstall',action='store_true')
args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parent.parent
label='com.grantproof.report-worker'
plist=pathlib.Path.home()/'Library'/'LaunchAgents'/(label+'.plist')
domain='gui/'+str(os.getuid())
if args.uninstall:
 subprocess.run(['launchctl','bootout',domain+'/'+label],check=False,capture_output=True)
 if plist.exists(): plist.unlink()
 print('Worker removed. Existing schedules, drafts, and job receipts retained.')
 raise SystemExit
if plist.exists(): raise SystemExit('Worker already installed. Uninstall it before reinstalling.')
node=shutil.which('node')
if not node: raise SystemExit('Node is unavailable.')
database=str(pathlib.Path(args.database).resolve())
env={**os.environ,'GRANTPROOF_DB':database}
if args.enable_live:
 code="""import {loadEnvConfig} from '@next/env';import {initialized,read} from './lib/store.ts';import {setSchedule} from './lib/scheduler.ts';loadEnvConfig(process.cwd());if(!process.env.OPENAI_API_KEY)throw Error('Server key required.');const db=initialized();for(const g of read(db).grants)setSchedule(db,{grantId:g.id,enabled:true,live:true});db.close();"""
 subprocess.run([node,'--import','tsx','--input-type=module','-e',code],cwd=root,env=env,check=True)
logs=root/'data';logs.mkdir(exist_ok=True)
config={'Label':label,'ProgramArguments':[node,'--import','tsx',str(root/'scripts'/'report-worker.ts')],'WorkingDirectory':str(root),'EnvironmentVariables':{'GRANTPROOF_DB':database,'PATH':'/opt/homebrew/bin:/usr/bin:/bin','NODE_ENV':'production'},'RunAtLoad':True,'KeepAlive':True,'ThrottleInterval':30,'StandardOutPath':str(logs/'report-worker.log'),'StandardErrorPath':str(logs/'report-worker-error.log')}
plist.parent.mkdir(parents=True,exist_ok=True)
with plist.open('wb') as f:plistlib.dump(config,f)
plist.chmod(0o600)
subprocess.run(['launchctl','bootstrap',domain,str(plist)],check=True)
print('Worker installed. It checks every minute while this Mac is awake and signed in.')
print('Stop/remove: python3 scripts/install-report-worker.py --database '+database+' --uninstall')
