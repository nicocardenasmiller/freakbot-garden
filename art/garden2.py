import json, random
from PIL import Image, ImageDraw
import plants as PL
SP=json.load(open('sprites.json'))
W,H=97,140
hx=PL.hx
def plant_img(name,stage,thirsty=False,with_soil=False):
    p=PL.P(1); fn=dict(PL.SPECIES)[name]
    if with_soil: PL.soil(p,thirsty)
    fn(p,stage)
    return PL.thirst(p.im) if thirsty else p.im
class C:
    def __init__(s,bg): s.im=Image.new('RGB',(W,H),hx(bg)); s.r=random.Random(4)
    def rect(s,x,y,w,h,c): ImageDraw.Draw(s.im).rectangle([x,y,x+w-1,y+h-1],fill=hx(c))
    def px(s,x,y,c):
        if 0<=x<W and 0<=y<H: s.im.putpixel((x,y),hx(c))
    def speck(s,x0,y0,w,h,cols,n):
        for _ in range(n): s.px(x0+s.r.randrange(w),y0+s.r.randrange(h),s.r.choice(cols))
    def paste(s,im,x,y): s.im.paste(im,(x,y),im)
    def shade(s,x,y,w,h,k=.8):
        for yy in range(y,y+h):
            for xx in range(x,x+w):
                if 0<=xx<W and 0<=yy<H:
                    r,g,b=s.im.getpixel((xx,yy)); s.im.putpixel((xx,yy),(int(r*k),int(g*k),int(b*k)))
    def bot(s,ox,oy,face='d'):
        s.shade(ox-2,oy+22,22,2,.82)
        for x,y,c in SP[face]: s.px(ox+x,oy+y,c)

# plant canvas is 26x34; base (soil line) at y≈29
def place(c,name,st,cx,base,thirsty=False):
    im=plant_img(name,st,thirsty); c.paste(im,cx-13,base-28)

# ---------- R1: raised beds ----------
def r1():
    c=C('#8FB86A')
    c.rect(0,0,W,12,'#CFE4EA')
    c.rect(0,12,W,16,'#E8D9BE'); c.rect(0,12,W,2,'#D4C19E'); c.rect(0,27,W,1,'#BFA982')   # low adobe wall
    for x,y in [(10,18),(40,21),(72,17)]: c.rect(x,y,5,2,'#DCC9A8')
    c.rect(0,28,W,H-28,'#8FB86A'); c.speck(0,29,W,H-29,['#84AE60','#9CC476'],160)
    def bed(cx,base):
        c.shade(cx-15,base+3,30,2,.85)
        c.rect(cx-14,base-3,28,6,'#7A5230'); c.rect(cx-13,base-3,26,2,'#5A3A1E'); c.rect(cx-14,base+2,28,1,'#5A3A1E')
        c.rect(cx-14,base-3,28,1,'#A8783F')
    slots=[(17,74),(48,74),(79,74),(17,120),(79,120)]
    for cx,b in slots: bed(cx,b)
    place(c,'limonero',4,17,74); place(c,'copihue',3,48,74); place(c,'araucaria',3,79,74)
    place(c,'quisco',2,17,120); place(c,'tomatera',4,79,120,thirsty=True)
    c.bot(39,100)
    return c.im

# ---------- R2: terrace with pots ----------
def r2():
    c=C('#C9A27A')
    c.rect(0,0,W,58,'#F2E6D4'); c.rect(0,0,W,2,'#E3D3BB')
    c.rect(56,10,26,20,'#B5D4E8'); c.rect(56,10,26,1,'#7A5230'); c.rect(56,29,26,1,'#7A5230'); c.rect(68,10,1,20,'#7A5230'); c.rect(56,10,1,20,'#7A5230'); c.rect(81,10,1,20,'#7A5230')  # window
    c.rect(4,40,46,3,'#8A5E36'); c.rect(4,43,46,1,'#5A3A1E')        # shelf
    c.rect(0,58,W,H-58,'#C9A27A')
    for y in range(62,H,8): c.rect(0,y,W,1,'#B38C64')                 # deck boards
    for y in range(58,H,8):
        for x in range((y//8%2)*12,W,24): c.rect(x,y,1,8,'#B38C64')
    def pot(cx,base,col='#C2672F'):
        c.rect(cx-6,base-2,13,2,'#A8562A'); c.rect(cx-5,base,11,6,col); c.rect(cx-4,base+6,9,1,'#8A3F1F'); c.rect(cx-4,base,1,6,'#D88A54')
    # shelf pots (small stages)
    for cx,(n,s) in zip((13,27,41),[('liuto',2),('quisco',1),('copihue',1)]):
        im=plant_img(n,s); c.paste(im,cx-13,40-28-3); pot(cx,37)
    # floor pots (big)
    for cx,base,(n,s,t) in [(16,96,('nalca',3,False)),(80,96,('maravilla',4,False)),(18,132,('limonero',3,False)),(78,132,('tomatera',2,True))]:
        im=plant_img(n,s,t); c.paste(im,cx-13,base-28-3); c.shade(cx-7,base+7,15,2,.82); pot(cx,base)
    c.bot(39,104)
    return c.im

# ---------- R3: one long bed in open grass ----------
def r3():
    c=C('#9CC476')
    c.rect(0,0,W,22,'#D3E8EE'); c.rect(0,16,W,6,'#E6F0EE')
    for x in range(0,W,3): c.rect(x,22,2,8,'#B9A27E'); c.rect(x,21,2,1,'#D6C3A0')   # picket fence
    c.rect(0,25,W,1,'#8A7350')
    c.speck(0,30,W,H-30,['#8EB868','#A9CF84'],140)
    c.rect(0,100,W,26,'#7A5230'); c.rect(0,100,W,2,'#5A3A1E'); c.speck(0,102,W,24,['#6B4A2B','#8E6438'],60)   # long bed
    for i,(n,s,t) in enumerate([('copihue',4,False),('maravilla',3,False),('nalca',4,False),('liuto',4,False)]):
        im=plant_img(n,s,t); c.paste(im,6+i*23,104-28)
    for i,(n,s,t) in enumerate([('tomatera',3,False),('araucaria',2,True),('quisco',4,False)]):
        im=plant_img(n,s,t); c.paste(im,16+i*25,124-28)
    c.bot(66,46)
    # watering can by him
    c.rect(56,64,5,4,'#85B7EB'); c.rect(61,64,3,1,'#85B7EB'); c.rect(57,62,3,1,'#378ADD')
    return c.im

for n,f in [('r1',r1),('r2',r2),('r3',r3)]:
    im=f(); im.save(f'{n}.png'); im.resize((W*4,H*4),Image.NEAREST).save(f'{n}@4.png')
ims=[Image.open(f'{n}@4.png') for n in ('r1','r2','r3')]
out=Image.new('RGB',(sum(i.width for i in ims)+20,ims[0].height),(255,255,255)); x=0
for i in ims: out.paste(i,(x,0)); x+=i.width+10
out.save('r_all.png'); print('ok')
