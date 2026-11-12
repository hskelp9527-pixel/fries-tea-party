from pathlib import Path
from PIL import Image, ImageDraw
root=Path.cwd()
out=root/'art/review/2026-11-11/complete'
ids=[f's{i:02}' for i in range(1,17)]+['fp_small','fp_giant']
sheet=Image.new('RGB',(1600,18*250),(28,25,29))
draw=ImageDraw.Draw(sheet)
for row,id in enumerate(ids):
    for col,file in enumerate([root/f'art/storyboard/{id}.png',out/f'views/{id}.jpg']):
        if file.exists():
            im=Image.open(file).convert('RGB');im.thumbnail((790,225));sheet.paste(im,(col*800,row*250+24))
    draw.text((10,row*250+5),f'{id} | CONCEPT                                      CURRENT',fill=(240,220,195))
sheet.save(out/'all-18-comparison.jpg',quality=90)
overview=Image.new('RGB',(1500,6*305),(28,25,29))
for index,id in enumerate(ids):
    image=Image.open(out/f'views/{id}.jpg').convert('RGB');image.thumbnail((500,281))
    x,y=index%3*500,index//3*305;overview.paste(image,(x,y+22));ImageDraw.Draw(overview).text((x+8,y+4),id,fill='white')
overview.save(out/'overview-current.jpg',quality=92)
for id in ['s01','s14','s12']:
    image=Image.new('RGB',(1600,480),(28,25,29))
    for col,file in enumerate([root/f'art/storyboard/{id}.png',out/f'views/{id}.jpg']):
        im=Image.open(file).convert('RGB');im.thumbnail((800,450));image.paste(im,(col*800,25))
    ImageDraw.Draw(image).text((10,5),f'{id}: concept / current',fill='white')
    image.save(out/f'{id}-comparison.jpg',quality=92)
