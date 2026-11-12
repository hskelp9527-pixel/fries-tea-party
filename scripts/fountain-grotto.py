"""The grotto's dressing, run inside prepare-fountain.py (uses its `parts`, `bpy`, `bmesh`, `math`).
Local frame: Blender X runs along the tunnel from the far end (0.08, valve at 0.255) to the mouth (1.37);
Y is across (+-0.25), Z is up. The cut scan stays the collider; everything here is visual and sits inside the cut."""
import random
from mathutils import Vector, noise
random.seed(7)
scan=parts[0]
X0,X1=.08,1.30            # liner from the end wall to the arch frame
FLOOR=.0135             # the plaza's paving, which is what the player sees, lies 15 mm up; the cobbles sit on it
CZ=.13                    # centre height of the roof arc (radius .25)
def smooth(v,a,b):
    t=min(max((v-a)/(b-a),0),1);return t*t*(3-2*t)
def hexc(h):return tuple((int(h[i:i+2],16)/255)**2.2 for i in (1,3,5))
def mix(a,b,t):return tuple(a[i]+(b[i]-a[i])*t for i in range(3))
VIOLET,BROWN,CARAMEL,HONEY=map(hexc,('#7a6486','#b08470','#d89c5c','#f0b460'))

# 1. The collider keeps the whole cut scan; the visible scan loses only the tunnel faces the liner replaces.
col_data=scan.data.copy();col_data.materials.clear()
for uv in list(col_data.uv_layers):col_data.uv_layers.remove(uv)
collider=bpy.data.objects.new('fountain_collider',col_data);bpy.context.scene.collection.objects.link(collider)
def on_cut(p):
    x,y,z=p
    if not .07<=x<=1.96:return False
    wall=abs(abs(y)-.25) if z<=CZ else abs(math.hypot(y,z-CZ)-.25)
    return wall<1e-2 or (abs(x-.08)<1e-2 and abs(y)<=.26 and z<=.39)
bm=bmesh.new();bm.from_mesh(scan.data)
tunnel=[f for f in bm.faces if all(on_cut(tuple(v.co)) for v in f.verts)]
bmesh.ops.delete(bm,geom=tunnel,context='FACES');bm.to_mesh(scan.data);bm.free();scan.data.update()
print('Grotto: tunnel faces replaced',len(tunnel))

# 2. Shape helpers.
class Builder:
    def __init__(s,name):
        s.name=name;s.bm=bmesh.new();s.col=s.bm.loops.layers.color.new('Col');s.colours={}
    def vert(s,p,c):
        v=s.bm.verts.new(p);s.colours[v]=c;return v
    def face(s,vs,towards):
        f=s.bm.faces.new(vs);f.normal_update()
        if f.normal.dot(towards(f.calc_center_median()))<0:f.normal_flip()
    def grid(s,rows,towards):
        for a,b in zip(rows,rows[1:]):
            for i in range(len(a)-1):s.face((a[i],a[i+1],b[i+1],b[i]),towards)
    def solid(s,faces):
        c=sum((v.co for f in faces for v in f),Vector())/sum(len(f) for f in faces)
        for vs in faces:s.face(vs,lambda p:p-c)
    def build(s):
        for f in s.bm.faces:
            for l in f.loops:l[s.col]=(*s.colours[l.vert],1)
        data=bpy.data.meshes.new(s.name);s.bm.to_mesh(data);s.bm.free()
        obj=bpy.data.objects.new(s.name,data);bpy.context.scene.collection.objects.link(obj);return obj
rock,syrup,crystal=Builder('grotto_rock'),Builder('grotto_syrup'),Builder('grotto_crystal')
UP=lambda p:Vector((0,0,1))
AXIS=lambda p:Vector((p.x,0,CZ))-p

def lump(x,y,z):
    """How far the rock leans into the tunnel at a point on the cut surface."""
    n=noise.fractal(Vector((x*9,y*9,z*9)),1.0,2.0,3)
    n2=noise.noise(Vector((x*30,y*30,z*30)))
    amp=.005+.03*smooth(z,.03,.2)+.02*smooth(z,.2,.32)
    d=amp*(.6+n*.9+n2*.25)
    for side,x0,x1 in ((-1,.45,.8),(1,.95,1.15)):   # a ledge on each side
        if y*side>.2:d+=.035*smooth(x,x0-.05,x0+.05)*(1-smooth(x,x1-.05,x1+.05))*smooth(z,.11,.14)*(1-smooth(z,.17,.2))
    return .0015+max(d,0)*smooth(x,X0,X0+.07)*(1-smooth(x,X1-.1,X1))
def prof(i):
    """Point i of the 85-point profile: left wall up, roof arc, right wall down. Returns y,z,inward y,inward z."""
    if i<6:return -.25,i*CZ/6,1,0
    if i<79:
        a=math.radians(-90+(i-6)*2.5);return .25*math.sin(a),CZ+.25*math.cos(a),-math.sin(a),-math.cos(a)
    return .25,CZ*(84-i)/6,-1,0
P=[prof(i) for i in range(85)]
def tint(x,y,z,d):
    """Rock albedo: cool violet in the dark, brown on the lumps, caramel and honey on lump tops near the valve."""
    t=min(1,d/.04)*.8+noise.noise(Vector((x*14,y*14,z*14)))*.25
    c=mix(VIOLET,BROWN,min(max(t,0),1))
    near=math.exp(-(x-.2)/.5) if x>.2 else 1
    c=mix(c,CARAMEL,min(1,near*(.25+.6*min(1,d/.04))))
    c=mix(c,HONEY,smooth(d,.035,.07)*near*.7)
    k=.55+.45*smooth(z,0,.06)
    return tuple(v*k for v in c)
def surface(x,i):
    y,z,ny,nz=P[i];d=lump(x,y,z);return y+ny*d,z+nz*d,d

# 3. The rock liner and the brick end wall.
rows=[]
for k in range(int((X1-X0)/.02)+1):
    x=X0+k*.02;row=[]
    for i in range(85):
        y,z,d=surface(x,i);row.append(rock.vert((x,y,z),tint(x,y,z,d)))
    rows.append(row)
rock.grid(rows,AXIS)
cols=[.25*math.sin(math.radians(-90+k*2.5)) for k in range(73)]
zmax=lambda y:CZ+math.sqrt(max(.0625-y*y,0))
def brick(y,z):
    r=math.floor(z/.04);u=((y+.5+.04*(r%2))%.08)/.08;v=(z%.04)/.04
    return smooth(min(u*.08,(1-u)*.08,v*.04,(1-v)*.04),.002,.007)
cap=[]
for j in range(41):
    row=[]
    for y in cols:
        z=zmax(y)*j/40
        edge=smooth(min(.25-abs(y),.25-math.hypot(y,z-CZ)) if z>CZ else .25-abs(y),0,.012)
        b=brick(y,z);h=(.004+.011*b*(.6+.4*noise.noise(Vector((y*40,z*40,1)))))*edge
        c=mix(mix(VIOLET,CARAMEL,.55),HONEY,.5*b*math.exp(-math.hypot(y,z-.17)/.2))
        row.append(rock.vert((X0+h,y,z),tuple(v*(.5+.5*b) for v in c)))
    cap.append(row)
rock.grid(cap,lambda p:Vector((1,0,0)))

# 4. Cobbled floor (tops 3 mm above the ground, which stays the walking surface), syrup pools and a rivulet.
plate=[rock.vert((px,py,FLOOR+.0016),tuple(k*.12 for k in VIOLET)) for px,py in((.085,-.25),(1.43,-.25),(1.43,.25),(.085,.25))]
rock.face(plate,UP)
x=.085
while x<1.43:
    lx=random.uniform(.07,.12);y=-.245;widths=[random.uniform(.13,.2) for _ in range(2)];widths.append(.49-sum(widths))
    for w in widths:
        x0,x1,y0,y1=x,x+lx-.014,y,y+w-.014;y+=w
        warm=math.exp(-(x-.2)/.6) if x>.2 else 1
        top=mix(mix(VIOLET,BROWN,.6),CARAMEL,warm*.5);top=tuple(v*random.uniform(1.1,1.7) for v in top)
        pts=[(x0,y0),(x1,y0),(x1,y1),(x0,y1)]
        lo=[rock.vert((px,py,FLOOR-.003),tuple(v*.25 for v in top)) for px,py in pts]
        hi=[rock.vert((px+(.004 if px==x0 else -.004),py+(.004 if py==y0 else -.004),FLOOR+.0045+random.uniform(-.0006,.0006)),top) for px,py in pts]
        rock.solid([lo,hi]+[[lo[i],lo[(i+1)%4],hi[(i+1)%4],hi[i]] for i in range(4)])
    x+=lx
def pool(cx,cy,r,seed):
    k=18;mid=syrup.vert((cx,cy,FLOOR+.0068),HONEY);ring=[]
    for i in range(k):
        a=i*2*math.pi/k;rr=r*(.75+.5*noise.noise(Vector((cx*50+seed,cy*50,math.cos(a)+seed))))
        ring.append(syrup.vert((cx+rr*math.cos(a),cy+rr*math.sin(a),FLOOR+.0052),CARAMEL))
    for i in range(k):syrup.face((mid,ring[i],ring[(i+1)%k]),UP)
for n,(cx,cy,r) in enumerate(((.5,.13,.045),(.78,-.15,.06),(1.05,.12,.04),(.37,-.12,.05),(.3,.06,.05),(.2,-.02,.04),(.62,.0,.03),(1.22,-.1,.05))):pool(cx,cy,r,n)
rivulet=[]
for k in range(61):
    t=k/60;cx=1.4-1.12*t;cy=.07*math.sin(cx*8)*(.4+t);w=.014+.012*math.sin(cx*21)**2
    rivulet.append([syrup.vert((cx,cy-w,FLOOR+.0052),CARAMEL),syrup.vert((cx,cy,FLOOR+.0066),HONEY),syrup.vert((cx,cy+w,FLOOR+.0052),CARAMEL)])
syrup.grid([[r[j] for r in rivulet] for j in range(3)],UP)

# 5. Syrup running down the walls, and stalactite drips from the ceiling.
def wall_run(x,i0,i1,w):
    step=1 if i1>i0 else -1;grid=[]
    for n,i in enumerate(range(i0,i1+step,step)):
        t=n/abs(i1-i0);width=w*(.7+.5*smooth(t,.85,1)+.3*math.sin(t*9)**2);row=[]
        for k in range(5):
            u=(k-2)/2;y,z,d=surface(x+u*width,i);_,_,ny,nz=P[i];lift=.0035+.004*(1-u*u)
            row.append(syrup.vert((x+u*width,y+ny*lift,z+nz*lift),mix(CARAMEL,HONEY,1-abs(u))))
        grid.append(row)
    syrup.grid(grid,AXIS)
wall_run(.62,28,0,.008);wall_run(.95,60,84,.009);wall_run(1.12,52,84,.007)
def stalactite(x,i,length,r,b):
    y,z,d=surface(x,i);top=Vector((x,y,z+.004));tip=Vector((x,y,z-length));wet=b is syrup;vs=[]
    for t,rad in ((0,r),(.45,r*.6),(.85,r*.35)):
        c=top.lerp(tip,t)
        vs.append([b.vert((c.x+rad*math.cos(a*math.pi/4),c.y+rad*math.sin(a*math.pi/4),c.z),CARAMEL if wet else tint(x,y,c.z,.03)) for a in range(8)])
    apex=b.vert(tuple(tip),HONEY if wet else tint(x,y,tip.z,.05))
    out=lambda p:p-Vector((x,y,p.z))
    for a,c in zip(vs,vs[1:]):
        for k in range(8):b.face((a[k],a[(k+1)%8],c[(k+1)%8],c[k]),out)
    for k in range(8):b.face((vs[-1][k],vs[-1][(k+1)%8],apex),out)
    if wet:   # a bead of syrup hanging from the tip
        bc=tip-Vector((0,0,.004));out=lambda p:p-bc
        top_r=[syrup.vert((bc.x+.0045*math.cos(a*math.pi/3),bc.y+.0045*math.sin(a*math.pi/3),bc.z),HONEY) for a in range(6)]
        up,low=syrup.vert((bc.x,bc.y,bc.z+.005),CARAMEL),syrup.vert((bc.x,bc.y,bc.z-.006),HONEY)
        for k in range(6):syrup.face((top_r[k],top_r[(k+1)%6],up),out);syrup.face((top_r[k],top_r[(k+1)%6],low),out)
for n in range(22):
    stalactite(random.uniform(.2,1.25),random.randint(25,60),random.uniform(.025,.07),random.uniform(.006,.012),syrup if n%2 else rock)

# 6. Candied crystals, brighter and denser towards the valve.
CRYSTALS=[hexc(h) for h in ('#ffb43c','#ffb43c','#ffb43c','#ff8f7a','#ffe9a8')]
def gem(base,direction,length,r):
    d=Vector(direction).normalized();u=d.cross(Vector((0,0,1)) if abs(d.z)<.9 else Vector((1,0,0))).normalized();v=d.cross(u)
    c=random.choice(CRYSTALS);tipc=mix(c,(1,1,.85),.6)
    ring=lambda t,rad,col:[crystal.vert(tuple(base+d*length*t+(u*math.cos(a*math.pi/3)+v*math.sin(a*math.pi/3))*rad),col) for a in range(6)]
    r0,r1=ring(-.15,r,tuple(k*.55 for k in c)),ring(.7,r*.85,c);apex=crystal.vert(tuple(base+d*length),tipc)
    ctr=base+d*length*.4;out=lambda p:p-ctr
    for k in range(6):
        crystal.face((r0[k],r0[(k+1)%6],r1[(k+1)%6],r1[k]),out);crystal.face((r1[k],r1[(k+1)%6],apex),out)
def cluster(x,i,n,scale):
    y,z,d=surface(x,i);_,_,ny,nz=P[i];base=Vector((x,y,z))
    for _ in range(n):
        dirn=Vector((random.uniform(-.5,.5),ny,nz))+Vector((random.uniform(-.3,.3),random.uniform(-.3,.3),random.uniform(-.3,.3)))
        gem(base+Vector((random.uniform(-.012,.012),0,random.uniform(-.01,.01))),dirn,random.uniform(.018,.04)*scale,random.uniform(.003,.006)*scale)
for n,x in enumerate((1.18,1.05,.92,.8,.7,.6,.5,.42,.35,.28,.22,.17)):
    cluster(x,random.choice((12,18,24,66,72,78) if n%2==0 else (30,36,44,50)),3+n//3,.8+.9*(1-x/1.2))
for k in range(11):   # a halo of gems round the valve on the end wall
    a=math.radians(-100+k*20)
    gem(Vector((X0+.012,.13*math.sin(a),.17+.12*math.cos(a))),(1,.6*math.sin(a),.6*math.cos(a)),random.uniform(.03,.05),.005)

# 7. The stone frame round the mouth: voussoirs over the arch, jambs beside it.
SAND=[hexc(h) for h in ('#b88d63','#c49a6a','#a87d5c','#caa070')]
def wedge(r0,r1,a0,a1,xa,xb,col):
    pts=lambda r,a:(r*math.sin(math.radians(a)),CZ+r*math.cos(math.radians(a)))
    rr=[(r0,a0),(r1,a0),(r1,a1),(r0,a1)]
    lo=[rock.vert((xa,*pts(r,a)),tuple(k*.55 for k in col)) for r,a in rr];hi=[rock.vert((xb,*pts(r,a)),col) for r,a in rr]
    rock.solid([lo,hi]+[[lo[i],lo[(i+1)%4],hi[(i+1)%4],hi[i]] for i in range(4)])
for k in range(12):
    key=abs(k-5.5)<1
    wedge(.246,.30+(.03 if key else 0)+random.uniform(0,.01),-90+k*15+.8,-90+k*15+14.2,1.29,1.40+(.02 if key else 0)+random.uniform(-.006,.006),random.choice(SAND))
for side in (-1,1):
    for z0,z1 in ((0,.065),(.065,.13)):
        y0,y1=sorted((side*.246,side*(.30+random.uniform(0,.01))));col=random.choice(SAND)
        sq=((y0,z0+.002),(y1,z0+.002),(y1,z1-.002),(y0,z1-.002))
        lo=[rock.vert((1.29,py,pz),tuple(k*.55 for k in col)) for py,pz in sq]
        hi=[rock.vert((1.40+random.uniform(-.006,.006),py,pz),col) for py,pz in sq]
        rock.solid([lo,hi]+[[lo[i],lo[(i+1)%4],hi[(i+1)%4],hi[i]] for i in range(4)])

# 8. Three materials, all driven by vertex colour.
def material(name,rough,emit=None,strength=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;nt=m.node_tree;bsdf=nt.nodes['Principled BSDF']
    attr=nt.nodes.new('ShaderNodeVertexColor');attr.layer_name='Col';nt.links.new(attr.outputs['Color'],bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value=rough
    if emit:bsdf.inputs['Emission Color'].default_value=(*emit,1);bsdf.inputs['Emission Strength'].default_value=strength
    return m
mats={'grotto_rock':material('Grotto rock',.88),'grotto_syrup':material('Grotto syrup',.08,(1,.45,.1),.12),'grotto_crystal':material('Grotto crystal',.25,(1,.72,.35),3)}
for b in (rock,syrup,crystal):
    obj=b.build();obj.data.materials.append(mats[b.name])
    print('Grotto',b.name,'tris',sum(len(p.vertices)-2 for p in obj.data.polygons))
