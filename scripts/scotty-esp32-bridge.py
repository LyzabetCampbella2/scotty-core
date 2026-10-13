# MicroPython ESP32 LAN LED endpoint for Scotty's hardware companion.
# Place hardware-config.json locally: {"ssid":"...","wifiPassword":"...",
# "token":"a long random local-only token","pin":2,"outputId":"status_led"}.
# This endpoint stays on the local network; do not port-forward it.
import json, network, socket, time
from machine import Pin
config=json.load(open('hardware-config.json'))
if len(config.get('token',''))<24: raise ValueError('Use a long local hardware token')
wifi=network.WLAN(network.STA_IF);wifi.active(True);wifi.connect(config['ssid'],config['wifiPassword'])
while not wifi.isconnected():time.sleep(1)
led=Pin(int(config['pin']),Pin.OUT)
server=socket.socket();server.bind(('0.0.0.0',8080));server.listen(1)
print('Scotty LED endpoint ready on the local network, port 8080.')
while True:
    client,_=server.accept();client.settimeout(5);status='400 Bad Request';body={'ok':False}
    try:
        data=b''
        while b'\r\n\r\n' not in data and len(data)<4096:
            chunk=client.recv(512)
            if not chunk:break
            data+=chunk
        header,initial=data.split(b'\r\n\r\n',1);lines=header.decode().split('\r\n')
        headers={}
        for line in lines[1:]:
            key,value=line.split(':',1);headers[key.lower()]=value.strip()
        length=int(headers.get('content-length','0'))
        if lines[0]!='POST /output HTTP/1.1' or headers.get('authorization')!='Bearer '+config['token']:status='403 Forbidden'
        elif 0<length<=2048 and 'transfer-encoding' not in headers:
            while len(initial)<length:
                chunk=client.recv(min(512,length-len(initial)))
                if not chunk:raise ValueError('Incomplete body')
                initial+=chunk
            p=json.loads(initial[:length])
            if p.get('outputId')==config['outputId'] and p.get('value') in ['0','1']:
                led.value(int(p['value']));status='200 OK';body={'ok':True}
        raw=json.dumps(body).encode();client.sendall(('HTTP/1.1 '+status+'\r\nContent-Type: application/json\r\nContent-Length: '+str(len(raw))+'\r\nConnection: close\r\n\r\n').encode()+raw)
    except Exception:pass
    finally:client.close()
