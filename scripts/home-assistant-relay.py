"""Scotty Home Assistant relay. Uses only Python's standard library.
Set SCOTTY_DEVICE_TOKEN, SCOTTY_HA_URL, SCOTTY_HA_TOKEN and
SCOTTY_HA_ENTITIES (comma-separated exact entity IDs) on your home computer.
The device token is a restricted pairing token generated inside Scotty.
"""
import json, os, time, urllib.request, urllib.error
SCOTTY_URL = os.environ.get('SCOTTY_ADDON_URL', 'https://scotty-core.onrender.com').rstrip('/')
DEVICE_TOKEN = os.environ.get('SCOTTY_DEVICE_TOKEN', '')
HA_URL = os.environ.get('SCOTTY_HA_URL', '').rstrip('/')
HA_TOKEN = os.environ.get('SCOTTY_HA_TOKEN', '')
ALLOWED = set(filter(None, (s.strip() for s in os.environ.get('SCOTTY_HA_ENTITIES', '').split(','))))
if not DEVICE_TOKEN or not HA_URL or not HA_TOKEN or not ALLOWED:
    raise SystemExit('Set the four relay environment variables described in this file. No credentials were printed.')
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(req.full_url, code, 'Redirect refused', headers, fp)
OPENER = urllib.request.build_opener(NoRedirect)
def api(base, path, token, body=None):
    req = urllib.request.Request(base+path, data=None if body is None else json.dumps(body).encode(), headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'}, method='GET' if body is None else 'POST')
    with OPENER.open(req, timeout=20) as response:
        return json.load(response)
def snapshot():
    states = api(HA_URL, '/api/states', HA_TOKEN)
    return [{'id':s['entity_id'],'state':s['state'],'name':s.get('attributes',{}).get('friendly_name',s['entity_id']),'unit':s.get('attributes',{}).get('unit_of_measurement','')} for s in states if s.get('entity_id') in ALLOWED]
print('Scotty relay started. Only explicitly allowed entities can be controlled.')
while True:
    try:
        response = api(SCOTTY_URL, '/api/connectors/device/poll', DEVICE_TOKEN, {'entities':snapshot()})
        job = response.get('job')
        if job:
            payload = job.get('payload', {}); entity = payload.get('entityId',''); domain = entity.split('.')[0]; service = payload.get('service','')
            ok = False; message = 'Relay refused an unsupported or unallowed action.'
            if job.get('provider') == 'homeassistant' and entity in ALLOWED and entity in response.get('allowedEntities',[]) and domain in ['light','switch','scene','climate'] and service in (['set_temperature'] if domain == 'climate' else ['turn_on'] if domain == 'scene' else ['turn_on','turn_off']):
                try:
                    body = {'entity_id':entity}
                    if service == 'set_temperature':
                        temperature = float(payload.get('temperature'))
                        if not 5 <= temperature <= 100: raise ValueError('Invalid temperature')
                        body['temperature'] = temperature
                    api(HA_URL, '/api/services/'+domain+'/'+service, HA_TOKEN, body)
                    ok = True; message = 'Home Assistant accepted the service call for '+entity+'. Physical effects were not independently verified.'
                except Exception:
                    message = 'The relay could not confirm the service result. This command will not be repeated automatically.'
            try:
                api(SCOTTY_URL, '/api/connectors/device/report', DEVICE_TOKEN, {'id':job['id'],'lease':job['lease'],'ok':ok,'message':message})
            except Exception:
                print('Could not save a device report. Verify the device before creating another command.')
        time.sleep(3)
    except KeyboardInterrupt:
        break
    except Exception:
        print('Relay check-in unavailable. No action was retried and no credentials were printed.')
        time.sleep(10)
