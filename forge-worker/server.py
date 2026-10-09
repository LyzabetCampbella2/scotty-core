import base64, json, math, os, tempfile
from http.server import BaseHTTPRequestHandler, HTTPServer
import bpy, mathutils

PORT=int(os.environ.get("PORT","10000"))
TOKEN=os.environ.get("SCOTTY_FORGE_WORKER_TOKEN","")
MAX_BODY=1024*1024
MAX_FILE=12*1024*1024

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def add_scene(spec):
    primitive=str(spec.get("primitive") or "cube").lower()
    title=str(spec.get("title") or "S.C.O.T.T.Y. Forge")
    if primitive in ("sphere","uvsphere","uv_sphere"):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, location=(0,0,1))
    elif primitive in ("ico","icosphere","ico_sphere"):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, location=(0,0,1))
    elif primitive=="cylinder":
        bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=1, depth=2, location=(0,0,1))
    elif primitive=="cone":
        bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=1, radius2=0, depth=2.4, location=(0,0,1.2))
    elif primitive=="torus":
        bpy.ops.mesh.primitive_torus_add(major_segments=64, minor_segments=24, major_radius=1.1, minor_radius=.32, location=(0,0,1.1))
    else:
        bpy.ops.mesh.primitive_cube_add(size=2, location=(0,0,1))
    obj=bpy.context.active_object
    obj.name="SCOTTY_FORGE_OBJECT"
    h=abs(hash(title))
    mat=bpy.data.materials.new("SCOTTY_MATERIAL")
    mat.diffuse_color=((70+(h%120))/255.0,(160+((h>>8)%80))/255.0,(190+((h>>16)%60))/255.0,1)
    mat.metallic=.35
    mat.roughness=.28
    obj.data.materials.append(mat)

    bpy.ops.mesh.primitive_plane_add(size=20, location=(0,0,0))
    ground=bpy.context.active_object
    gmat=bpy.data.materials.new("SCOTTY_GROUND")
    gmat.diffuse_color=(.015,.035,.055,1)
    gmat.roughness=.7
    ground.data.materials.append(gmat)

    for loc,energy,color,size in [
        ((4,-4,6),900,(1,1,1),5),
        ((-4,-2,3),500,(.2,.8,1),4),
        ((1,4,5),650,(1,.68,.25),3)
    ]:
        bpy.ops.object.light_add(type='AREA', location=loc)
        light=bpy.context.active_object
        light.data.energy=energy
        light.data.color=color
        light.data.size=size

    bpy.ops.object.camera_add(location=(5.2,-5.2,4.3))
    cam=bpy.context.active_object
    bpy.context.scene.camera=cam
    direction=mathutils.Vector((0,0,1))-cam.location
    cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()

def render_job(spec,td):
    clear_scene()
    add_scene(spec)
    scene=bpy.context.scene
    scene.render.resolution_x=512
    scene.render.resolution_y=512
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.world.color=(.005,.012,.02)
    try:
        scene.render.engine='BLENDER_EEVEE'
    except:
        pass
    job=str(spec.get("jobId") or "forge")
    blend_path=os.path.join(td,job+".blend")
    png_path=os.path.join(td,job+".png")
    glb_path=os.path.join(td,job+".glb")
    scene.render.filepath=png_path
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    bpy.ops.render.render(write_still=True)
    try:
        bpy.ops.export_scene.gltf(filepath=glb_path,export_format='GLB')
    except Exception:
        glb_path=None
    return blend_path,png_path,glb_path

def encode_file(path):
    if not path or not os.path.exists(path) or os.path.getsize(path)>MAX_FILE:
        return None
    with open(path,"rb") as f:
        return base64.b64encode(f.read()).decode()

class Handler(BaseHTTPRequestHandler):
    server_version="SCOTTYForgeWorker/1.0"
    def log_message(self, fmt, *args):
        print("[forge-worker]",fmt%args,flush=True)
    def send_json(self,obj,status=200):
        body=json.dumps(obj,separators=(",",":")).encode()
        self.send_response(status)
        self.send_header("content-type","application/json")
        self.send_header("cache-control","no-store")
        self.send_header("content-length",str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def authorized(self):
        return bool(TOKEN) and self.headers.get("authorization","")==("Bearer "+TOKEN)
    def do_GET(self):
        if self.path=="/health":
            return self.send_json({"ok":True,"service":"scotty-forge-worker","blenderReady":True,"version":bpy.app.version_string})
        return self.send_json({"error":"Not found"},404)
    def do_POST(self):
        if self.path!="/run":
            return self.send_json({"error":"Not found"},404)
        if not self.authorized():
            return self.send_json({"error":"Worker authentication required"},401)
        size=int(self.headers.get("content-length","0") or 0)
        if size<=0 or size>MAX_BODY:
            return self.send_json({"error":"Invalid request size"},413)
        try:
            spec=json.loads(self.rfile.read(size))
        except:
            return self.send_json({"error":"Invalid JSON"},400)
        job=str(spec.get("jobId") or "forge")
        try:
            with tempfile.TemporaryDirectory(prefix="scotty-forge-") as td:
                blend,png,glb=render_job(spec,td)
                return self.send_json({
                    "ok":True,
                    "jobId":job,
                    "outputBlend":"cloud://forge/"+job+".blend",
                    "blendBase64":encode_file(blend),
                    "previewPngBase64":encode_file(png),
                    "glbBase64":encode_file(glb)
                })
        except Exception as e:
            return self.send_json({"error":"Blender job failed","detail":str(e)[:2500]},500)

print("S.C.O.T.T.Y. Forge worker listening",PORT,flush=True)
HTTPServer(("0.0.0.0",PORT),Handler).serve_forever()
