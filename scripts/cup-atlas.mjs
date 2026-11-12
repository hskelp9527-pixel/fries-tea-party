import sharp from 'sharp'
// Preserve the painted porcelain and the plain gold/porcelain PBR identities in
// matching color/roughness/metallic atlases, so the whole cup can use one draw.
export async function bakeCupAtlas(doc){
  const materials=doc.getRoot().listMaterials(),mapped=materials.filter(m=>m.getBaseColorTexture())
  if(mapped.length!==1)return
  const size=512,strip=16,width=size+strip*(materials.length-1),height=size
  const color=Buffer.alloc(width*height*4),surface=Buffer.alloc(width*height*4)
  const rgb=x=>Math.round(255*(x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055))
  const pixels=await sharp(mapped[0].getBaseColorTexture().getImage()).resize(size,size).ensureAlpha().raw().toBuffer()
  const slots=new Map();let slot=0
  for(const material of materials){
    const textured=material===mapped[0],x0=textured?0:size+strip*slot++,w=textured?size:strip
    const tint=material.getBaseColorFactor();slots.set(material,{textured,x:x0,w})
    for(let y=0;y<height;y++)for(let x=0;x<w;x++){
      const index=4*(y*width+x0+x),source=4*(y*size+x)
      color[index]=textured?pixels[source]:rgb(tint[0]);color[index+1]=textured?pixels[source+1]:rgb(tint[1]);color[index+2]=textured?pixels[source+2]:rgb(tint[2]);color[index+3]=255
      surface[index]=255;surface[index+1]=Math.round(material.getRoughnessFactor()*255);surface[index+2]=Math.round(material.getMetallicFactor()*255);surface[index+3]=255
    }
  }
  const texture=async(name,bytes)=>doc.createTexture(name).setMimeType('image/png').setImage(await sharp(bytes,{raw:{width,height,channels:4}}).png().toBuffer())
  const single=doc.createMaterial('Cup porcelain and brass atlas').setDoubleSided(true).setBaseColorFactor([1,1,1,1]).setMetallicFactor(1).setRoughnessFactor(1)
    .setBaseColorTexture(await texture('Cup color atlas',color)).setMetallicRoughnessTexture(await texture('Cup PBR atlas',surface))
  for(const mesh of doc.getRoot().listMeshes())for(const primitive of mesh.listPrimitives()){
    const material=primitive.getMaterial(),slot=slots.get(material),count=primitive.getAttribute('POSITION').getCount(),uv=primitive.getAttribute('TEXCOORD_0'),array=new Float32Array(count*2)
    for(let i=0;i<count;i++){const value=uv?.getElement(i,[])??[.5,.5];array[i*2]=slot.textured?value[0]*size/width:(slot.x+slot.w/2)/width;array[i*2+1]=slot.textured?value[1]:.5}
    const coordinates=doc.createAccessor('Cup atlas coordinates').setType('VEC2').setArray(array).setBuffer(primitive.getAttribute('POSITION').getBuffer())
    primitive.setAttribute('TEXCOORD_0',coordinates).setMaterial(single)
  }
  for(const material of materials)material.dispose()
}
