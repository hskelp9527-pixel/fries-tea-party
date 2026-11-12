"""Regular surface-fitted lip annulus, recessed cavity and skinned landmark.

The scan has disconnected mouth fragments. A regular annulus overlaps original
skin outside the excision; arbitrary scan boundaries never define lip topology.
"""
import math
import bpy
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

LANDMARKS={'fries':(384,478,.10,.014,.135),'hatter':(384,506,.115,.014,.18),'hare':(384,520,.065,.004,.11),'dormouse':(384,482,.065,.004,.10)}

def author_mouth(name,arm,meshes,head_name):
    eyes=[o.matrix_world@v.co for o in meshes if 'eyelid' in o.name.lower()for v in o.data.vertices]
    lo=Vector([min(p[i]for p in eyes)for i in range(3)]);hi=Vector([max(p[i]for p in eyes)for i in range(3)])
    size=(hi.x-lo.x)*2.2;aim=(lo+hi)/2;aim.z-=size*.1
    px,py,width,curve,outer_width=LANDMARKS[name]
    body=max(meshes,key=lambda o:len(o.data.vertices));matrix=body.matrix_world.copy();inverse=matrix.inverted()
    original=[matrix@v.co for v in body.data.vertices]
    bvh=BVHTree.FromPolygons(original,[list(p.vertices)for p in body.data.polygons])
    def ray(x,z):return bvh.ray_cast(Vector((x,aim.y-1,z)),Vector((0,1,0)))
    mouth=ray(aim.x+(px-384)/768*size,aim.z+(384-py)/768*size)[0]
    if mouth is None:raise RuntimeError(f'{name}: lip landmark missed the face')
    radius=size*width;outer_x=size*outer_width;gap=size*.0007
    def line(x):return mouth.z+size*curve*((x-mouth.x)/outer_x)**2
    # Hatter's scan has unusually long triangles joining nose, smile and chin;
    # a wider surface-fitted skirt covers their excision without moving the nose.
    def height(s):return size*((.05 if s>=0 else .065)if name=='hatter'else(.027 if s>=0 else .05))*s
    front=[ray(mouth.x+x*outer_x,line(mouth.x+x*outer_x)+size*z)[0]for x in [-.5,0,.5]for z in [-.035,.035]]
    mouth.y=sum(p.y for p in front if p is not None)/sum(p is not None for p in front)
    nearest=min(body.data.vertices,key=lambda v:(matrix@v.co-mouth).length)
    binding={g.group:g.weight for g in nearest.groups};names={g.index:g.name for g in body.vertex_groups}
    images={}
    for i,material in enumerate(body.data.materials):
        if not material.use_nodes:continue
        bsdf=material.node_tree.nodes.get('Principled BSDF')
        pending=[link.from_node for link in bsdf.inputs['Base Color'].links]if bsdf else [];visited=set()
        while pending:
            node=pending.pop()
            if node in visited:continue
            visited.add(node)
            if node.type=='TEX_IMAGE'and node.image:
                im=node.image;images[i]=(tuple(im.size),list(im.pixels),im.colorspace_settings.name=='sRGB');break
            pending.extend(link.from_node for socket in node.inputs for link in socket.links)
    uv=body.data.uv_layers.active
    def sample(point):
        hit,_,index,_=ray(point.x,point.z)
        if hit is None:return Vector((.7,.4,.25))
        face=body.data.polygons[index];entry=images.get(face.material_index)
        if not entry or not uv:return Vector((.7,.4,.25))
        ids=list(face.vertices)[:3];a,b,c=[original[i]for i in ids];u=b-a;v=c-a;w=hit-a;den=u.dot(u)*v.dot(v)-u.dot(v)**2
        q=(w.dot(u)*v.dot(v)-w.dot(v)*u.dot(v))/den if abs(den)>1e-14 else 0
        r=(w.dot(v)*u.dot(u)-w.dot(u)*u.dot(v))/den if abs(den)>1e-14 else 0
        tex=[uv.data[i].uv for i in list(face.loop_indices)[:3]];coord=tex[0]*(1-q-r)+tex[1]*q+tex[2]*r
        (iw,ih),pixels,srgb=entry;x=max(0,min(iw-1,int(coord.x*iw)));y=max(0,min(ih-1,int(coord.y*ih)))
        rgb=pixels[(y*iw+x)*4:(y*iw+x)*4+3]
        return Vector([c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in rgb])if srgb else Vector(rgb)
    count=96;outer=[];colors=[]
    for i in range(count):
        angle=2*math.pi*i/count;x=mouth.x+outer_x*math.cos(angle);z=line(x)+height(math.sin(angle));p=ray(x,z)[0]
        if p is None:p=Vector((x,mouth.y,z))
        p.y-=size*.0015;outer.append(p);colors.append(sample(p))
    average=sum(colors,Vector())/count;lip_color=Vector((average.x*.94,average.y*.80,average.z*.82))
    bm=bmesh.new();bm.from_mesh(body.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
    near=[f for f in bm.faces if abs((matrix@f.calc_center_median()).x-mouth.x)<outer_x*1.15 and abs((matrix@f.calc_center_median()).z-mouth.z)<size*.075 and abs((matrix@f.calc_center_median()).y-mouth.y)<size*.3]
    bmesh.ops.subdivide_edges(bm,edges=list({e for f in near for e in f.edges}),cuts=1,use_grid_fill=True)
    deform=bm.verts.layers.deform.verify()
    tint=bm.loops.layers.float_color.new('MouthTint');motion=bm.verts.layers.float.new('mouth_motion')
    for face in bm.faces:
        for loop in face.loops:loop[tint]=(1,1,1,1)
    remove=[]
    for face in bm.faces:
        points=[matrix@v.co for v in face.verts]
        for p in points:
            s=p.z-line(p.x);vertical=size*(.020 if s>=0 else .041)
            if abs(p.y-mouth.y)<size*.3 and ((p.x-mouth.x)/(outer_x*.85))**2+(s/vertical)**2<1:
                remove.append(face);break
    bmesh.ops.delete(bm,geom=remove,context='FACES')
    skin=bpy.data.materials.new('Lip skin');skin.use_nodes=True;skin.roughness=.85
    node=skin.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='MouthTint'
    skin.node_tree.links.new(node.outputs['Color'],skin.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    body.data.materials.append(skin);skin_index=len(body.data.materials)-1
    dark=bpy.data.materials.new('Mouth interior');dark.use_nodes=True;dark.roughness=1
    bsdf=dark.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(.004,.0003,.0006,1);bsdf.inputs['Specular IOR Level'].default_value=0
    body.data.materials.append(dark);dark_index=len(body.data.materials)-1
    previous=None;previous_colors=None
    for j in range(9):
        t=j/8;ring=[];ring_colors=[]
        for i in range(count):
            angle=2*math.pi*i/count;x=mouth.x+radius*math.cos(angle)
            inner=Vector((x,mouth.y+size*.004*math.cos(angle)**2,line(x)+gap*math.sin(angle)))
            p=outer[i].lerp(inner,t)
            if j<7:
                hit=ray(p.x,p.z)[0]
                if hit:p.y=min(p.y,hit.y-size*.0015)
            vertex=bm.verts.new(inverse@p);vertex[motion]=t*t
            for joint,weight in binding.items():vertex[deform][joint]=weight
            ring.append(vertex);ring_colors.append(colors[i].lerp(lip_color,t*t))
        if previous:
            for i in range(count):
                k=(i+1)%count;face=bm.faces.new((previous[i],previous[k],ring[k],ring[i]));face.material_index=skin_index
                for loop,c in zip(face.loops,[previous_colors[i],previous_colors[k],ring_colors[k],ring_colors[i]]):loop[tint]=(*c,1)
        previous=ring;previous_colors=ring_colors
    inside=[]
    for vertex in previous:
        p=matrix@vertex.co;p.y=mouth.y+size*.065;v=bm.verts.new(inverse@p);v[motion]=1
        for joint,weight in binding.items():v[deform][joint]=weight
        inside.append(v)
    for i in range(count):
        k=(i+1)%count;face=bm.faces.new((previous[i],previous[k],inside[k],inside[i]));face.material_index=dark_index
    cap=bm.faces.new(tuple(reversed(inside)));cap.material_index=dark_index
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    for face in bm.faces:
        if face.material_index==skin_index and(matrix.to_3x3()@face.normal).y>0:face.normal_flip()
        if face==cap and(matrix.to_3x3()@face.normal).y>0:face.normal_flip()
    bm.to_mesh(body.data);bm.free();body.data.update()
    for p in body.data.polygons:p.use_smooth=True
    if body.data.has_custom_normals:body.data.normals_split_custom_set([(0,0,0)]*len(body.data.loops))
    body.shape_key_add(name='Basis');shape=body.shape_key_add(name='mouth_open');affected=0
    for i,vertex in enumerate(body.data.vertices):
        amount=body.data.attributes['mouth_motion'].data[i].value
        if amount<=0:continue
        p=matrix@vertex.co;x=(p.x-mouth.x)/radius;opening=math.sqrt(max(0,1-min(1,x*x)));upper=math.tanh((p.z-line(p.x))/(gap*.5))
        p.z+=size*.026*amount*opening*(.5*upper-.25);shape.data[i].co=inverse@p;affected+=1
    marker=bpy.data.meshes.new('Mouth contact landmark')
    marker.from_pydata([mouth,mouth+Vector((.00001,0,0)),mouth+Vector((0,0,.00001))],[],[(0,1,2)])
    anchor=bpy.data.objects.new('MouthContact',marker);bpy.context.scene.collection.objects.link(anchor)
    anchor.parent=arm;anchor.matrix_parent_inverse=arm.matrix_world.inverted();anchor.modifiers.new('Armature','ARMATURE').object=arm
    for joint,weight in binding.items():anchor.vertex_groups.new(name=names[joint]).add([0,1,2],weight,'REPLACE')
    return mouth,{'landmark':[px,py],'affectedVertices':affected,'skinAlbedo':list(average),'cutFaces':len(remove),'lipSegments':count,'anchorWorld':list(mouth),'contactWeights':[(names[j],w)for j,w in binding.items()],'method':'regular surface-fitted skin annulus and recessed oral cavity'}
