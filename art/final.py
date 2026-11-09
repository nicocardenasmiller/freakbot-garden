import json, random, math
from PIL import Image
import plants as PL
from garden2 import plant_img
SP=json.load(open('sprites.json'))
W,H=97,140; hx=PL.hx

class S:
    def __init__(s,time):
        s.t=time; s.im=Image.new('RGB',(W,H),(0,0,0)); s.sky=set(); s.r=random.Random(11); s.lit=set()
    def px(s,x,y,c,keep_sky=False,lit=False):
        x,y=int(x),int(y)
        if 0<=x<W and 0<=y<H:
            s.im.putpixel((x,y),hx(c))
            if not keep_sky: s.sky.discard((x,y))
            if lit: s.lit.add((x,y))
            else: s.lit.discard((x,y))
    def rect(s,x,y,w,h,c,**k):
        for yy in range(y,y+h):
            for xx in range(x,x+w): s.px(xx,yy,c,**k)
    def sprite(s,im,x0,y0):
        p=im.load()
        for y in range(im.height):
            for x in range(im.width):
                r,g,b,a=p[x,y]
                if a: s.px(x0+x,y0+y,(r,g,b))

SKY={'morning':[(0,'#F4E3C3'),(.45,'#DCE6E2'),(1,'#B9D3DA')],
     'golden':[(0,'#E9A66B'),(.5,'#D9806A'),(1,'#7D5A7A')],
     'night':[(0,'#0E1424'),(.6,'#18203A'),(1,'#25304A')]}
def lerp(a,b,t): return tuple(int(x+(y-x)*t) for x,y in zip(hx(a),hx(b)))
def skycol(time,t):
    st=SKY[time]
    for (t0,c0),(t1,c1) in zip(st,st[1:]):
        if t<=t1: return lerp(c0,c1,(t-t0)/(t1-t0))
    return hx(st[-1][1])

WIN_TOP,WIN_BOT=4,70
def window(s):
    # glass area with gothic arched panes
    s.rect(0,0,W,WIN_BOT+2,'#2A1D15')
    panes=[(4,20),(26,22),(50,22),(74,19)]
    for px0,pw in panes:
        cx=px0+pw/2
        for y in range(WIN_TOP,WIN_BOT):
            for x in range(px0,px0+pw):
                # pointed arch top
                dy=y-(WIN_TOP+12)
                if dy<0:
                    k=(abs(x-cx)/(pw/2))
                    if (WIN_TOP+12)-y > (1-k)*14: continue
                c=skycol(s.t,(y-WIN_TOP)/(WIN_BOT-WIN_TOP))
                s.im.putpixel((x,y),c); s.sky.add((x,y))
        # mullions
        for y in range(WIN_TOP+10,WIN_BOT): s.px(int(cx),y,'#1C130D')
        for y in (WIN_TOP+30,WIN_TOP+48): s.rect(px0,y,pw,1,'#1C130D')
    # outside: distant overgrown scrapyard silhouette
    sil='#1D2A28' if s.t!='golden' else '#5A3A48'
    if s.t=='morning': sil='#8EA6A4'
    hz=58
    shapes=[(4,hz-4,14,10),(18,hz-1,8,7),(28,hz-6,4,12),(33,hz-2,18,8),(56,hz-9,2,15),(52,hz-9,12,1),(62,hz-7,1,4),(66,hz-3,12,9),(80,hz-5,10,11)]
    for x,y,w,h in shapes:
        for yy in range(y,y+h):
            for xx in range(x,x+w):
                if (xx,yy) in s.sky: s.im.putpixel((xx,yy),hx(sil))
    for x in range(0,W):
        for yy in range(hz+5+((x*7)%3),WIN_BOT):
            if (x,yy) in s.sky: s.im.putpixel((x,yy),hx(sil))
    if s.t=='night':
        for x,y in [(10,10),(30,16),(41,8),(60,14),(78,9),(88,20),(14,30),(70,28),(47,24),(35,38),(84,38)]:
            if (x,y) in s.sky: s.im.putpixel((x,y),hx('#E6EEF8'))
        for dx in range(-3,4):
            for dy in range(-3,4):
                if dx*dx+dy*dy<=9 and (88+dx,24+dy) in s.sky and not (dx+2)**2+(dy+1)**2<=7: s.im.putpixel((88+dx,24+dy),hx('#F2EEDA'))
    if s.t=='morning':
        for x,y,w in [(30,18,8),(32,17,4),(56,24,6),(57,23,3)]:
            for xx in range(x,x+w):
                if (xx,y) in s.sky and xx not in (37,61): s.im.putpixel((xx,y),hx('#FFFFFF'))
    # frame outer
    s.rect(0,WIN_TOP-4,W,4,'#3A2A1E'); s.rect(0,WIN_BOT,W,3,'#4A3424'); s.rect(0,WIN_BOT,W,1,'#6B4A30')
    for px0,pw in panes: s.rect(px0-2,WIN_TOP,2,WIN_BOT-WIN_TOP,'#2A1D15')
    s.rect(W-4,WIN_TOP,4,WIN_BOT-WIN_TOP,'#2A1D15')

def room(s):
    # wainscot under window
    s.rect(0,73,W,15,'#3A271A')
    for x in range(2,W,12): s.rect(x,75,10,11,'#43301F'); s.rect(x,75,10,1,'#4E3826')
    # floor planks
    s.rect(0,88,W,52,'#4A3122')
    for y in range(88,H,6):
        s.rect(0,y,W,1,'#3C2719')
        for x in range((y//6%3)*9,W,27): s.rect(x,y,1,6,'#3C2719')
    s.rect(0,88,W,1,'#2A1A10')
    # rug
    rx,ry,rw,rh=18,104,61,30
    s.rect(rx,ry,rw,rh,'#5A1E26'); s.rect(rx+2,ry+2,rw-4,rh-4,'#B08D4A'); s.rect(rx+3,ry+3,rw-6,rh-6,'#6E2230')
    s.rect(rx+8,ry+8,rw-16,rh-16,'#2F3A4A'); s.rect(rx+9,ry+9,rw-18,rh-18,'#6E2230')
    for x in range(rx+5,rx+rw-5,4): s.px(x,ry+5,'#C9A86A'); s.px(x,ry+rh-6,'#C9A86A')
    for x in range(rx,rx+rw,2): s.px(x,ry-1,'#C9B48A'); s.px(x,ry+rh,'#C9B48A')

def desk(s,time):
    # writing desk left
    s.rect(0,82,34,3,'#5E3E26'); s.rect(0,82,34,1,'#7A5236'); s.rect(1,85,3,15,'#3E2818'); s.rect(29,85,3,15,'#3E2818')
    s.rect(4,85,24,5,'#4A3020'); s.rect(14,87,4,1,'#B08D4A')
    # books stack + standing books
    cols=['#6E2230','#2F4A35','#3B3F5C','#7A5A2E']
    for i,(w,c) in enumerate([(12,'#3B3F5C'),(11,'#6E2230'),(13,'#2F4A35')]):
        s.rect(2+i%2,81-2*i,w,2,c); s.rect(2+i%2,81-2*i,w,1,'#B08D4A' if i==1 else c)
    # bankers lamp
    on = time!='morning'
    s.rect(22,80,6,2,'#8A6A2E'); s.rect(24,74,1,6,'#B08D4A'); s.rect(20,71,9,3,'#2F6B4A'); s.rect(20,71,9,1,'#4E8E68')
    if on: s.rect(21,74,7,1,'#FFE7A0',lit=True)
    # open notebook + inkwell
    s.rect(10,79,9,2,'#E9DCC0'); s.rect(14,79,1,2,'#B9A880'); s.rect(11,79,2,1,'#5A4A3A'); s.rect(16,80,2,1,'#5A4A3A')
    s.rect(30,78,2,3,'#1A1412'); s.px(31,77,'#E9DCC0')
    if time=='night':
        s.rect(6,76,2,4,'#E9DCC0'); s.px(6,75,'#FFE7A0',lit=True); s.px(7,74,'#F6B85A',lit=True)

def stand(s):
    # tiered étagère right
    x0=68
    for i,(y,w) in enumerate([(66,24),(78,26),(90,28)]):
        s.rect(x0+ (28-w)//2,y,w,2,'#5E3E26'); s.rect(x0+(28-w)//2,y,w,1,'#7A5236')
    s.rect(x0+1,64,1,30,'#3E2818'); s.rect(x0+26,64,1,30,'#3E2818')
def pot(s,cx,base,col='#9A5A36',small=False):
    w=9 if small else 13
    s.rect(cx-w//2,base-2,w,2,'#7A4228'); s.rect(cx-w//2+1,base,w-2,5 if small else 6,col); s.rect(cx-w//2+1,base,1,5 if small else 6,'#B87850')
def scarf(img):
    p=img.load()
    R,R2,D,G='#C9932E','#E0AE48','#8A5E1A','#7A2632'
    pts=[]
    for x in range(2,16):
        pts.append((x,10,R2 if x%3 else G)); pts.append((x,11,R if x%2 else R2)); pts.append((x,12,D))
    # knot on the right + two tails hanging outside the body
    pts+= [(15,10,R2),(16,10,R),(15,11,R2),(16,11,R2),(16,12,D),(17,11,D)]
    for y in range(12,20):
        pts.append((17,y,R if y%2 else R2)); pts.append((18,y,D))
        if y in (14,17): pts.append((17,y,G)); pts.append((18,y,G))
    for y in range(12,18):
        pts.append((16,y+1,R2 if y%2 else R))
    pts+= [(16,19,G),(17,20,G),(18,20,G)]
    for x,y,c in pts:
        X,Y=x+6,y+5
        if 0<=X<img.width and 0<=Y<img.height: p[X,Y]=hx(c)+(255,)
    return img
def bot_img(name):
    img=Image.new('RGBA',(32,34),(0,0,0,0))
    for x,y,c in SP[name]:
        if 0<=x+6<32 and 0<=y+5<34: img.putpixel((x+6,y+5),hx(c)+(255,))
    return scarf(img)
def bot(s,name,ox,oy):
    img=bot_img(name)
    # shadow
    for x in range(ox-1,ox+19):
        for y in range(oy+23,oy+25):
            r,g,b=s.im.getpixel((x,y)); s.im.putpixel((x,y),(int(r*.7),int(g*.7),int(b*.7)))
    s.sprite(img,ox-6,oy-5)
    # face screen glows a bit
    for x,y,c in SP[name]:
        if c.upper() in ('#9FE1CB','#085041'): s.lit.add((ox+x,oy+y))

def hanging(s):
    s.rect(48,0,1,10,'#8A6A2E')
    for dx in range(-6,7): s.px(48+dx,10+abs(dx)//3,'#8A6A2E')
    s.rect(43,11,11,4,'#6E4A2A'); s.rect(43,11,11,1,'#8E6438')
    for i,x in enumerate(range(43,54,2)):
        L=4+((x*5)%9)
        for k in range(L): s.px(x+(k%2),15+k,'#3B6D11' if k%3 else '#5E9A32')
        if i%2: s.px(x,15+L,'#D7263D'); s.px(x,16+L,'#A31621')

def build(time, face='fbo', with_bot=True):
    s=S(time); window(s); room(s); desk(s,time); stand(s)
    # shelf plants (small)
    for cx,base,(n,st) in [(74,64,('liuto',2)),(86,64,('quisco',2)),(73,76,('copihue',3)),(88,76,('maravilla',2)),(76,88,('tomatera',3)),(90,88,('nalca',2))]:
        s.sprite(plant_img(n,st).resize((19,25),Image.NEAREST) if False else plant_img(n,st), cx-13, base-28-2); 
    for cx,base,c in [(74,64,'#9A5A36'),(86,64,'#8E4A2A'),(73,76,'#9A5A36'),(88,76,'#8E4A2A'),(76,88,'#9A5A36'),(90,88,'#8E4A2A')]:
        pot(s,cx,base-2,c,small=True)
    hanging(s)
    # floor big pots
    s.sprite(plant_img('limonero',4),14-13,124-28-3); pot(s,14,121)
    s.sprite(plant_img('araucaria',3),84-13,136-28-3); pot(s,84,133,'#8E4A2A')
    s.sprite(plant_img('liuto',4,thirsty=True),30-13,138-28-3); pot(s,30,135,'#9A5A36')
    if with_bot: bot(s,'fbn' if time=='night' else face,44,102)
    # watering can
    if time!='night' and with_bot: s.rect(68,120,5,4,'#B08D4A'); s.rect(73,120,3,1,'#B08D4A'); s.px(76,119,'#B08D4A'); s.rect(69,118,3,1,'#8A6A2E')
    return grade(s)

def grade(s):
    p=s.im.load(); t=s.t
    mul={'morning':(1.06,1.03,.98),'golden':(1.0,.84,.7),'night':(.34,.36,.5)}[t]
    add={'morning':(6,6,4),'golden':(12,0,6),'night':(4,6,16)}[t]
    for y in range(H):
        for x in range(W):
            if (x,y) in s.sky or (x,y) in s.lit: continue
            r,g,b=p[x,y]; p[x,y]=tuple(max(0,min(255,int(v*m+a))) for v,m,a in zip((r,g,b),mul,add))
    def glow(gx,gy,rad,col,st):
        cr,cg,cb=hx(col)
        for y in range(gy-rad,gy+rad+1):
            for x in range(gx-rad,gx+rad+1):
                if 0<=x<W and 0<=y<H and (x,y) not in s.sky:
                    d=math.hypot((x-gx)*.9,y-gy)/rad
                    if d<1:
                        k=round(st*(1-d)**2.4*10)/10; r,g,b=p[x,y]
                        p[x,y]=(min(255,int(r+cr*k*.55)),min(255,int(g+cg*k*.42)),min(255,int(b+cb*k*.22)))
    if t=='morning':
        # sun shafts from window onto floor
        for k in range(3):
            for y in range(70,H):
                x0=8+k*26+int((y-70)*0.45)
                for x in range(x0,x0+9):
                    if 0<=x<W and (x,y) not in s.sky:
                        r,g,b=p[x,y]; p[x,y]=(min(255,r+22),min(255,g+18),min(255,b+8))
    if t=='golden':
        for k in range(2):
            for y in range(70,H):
                x0=10+k*34+int((y-70)*0.9)
                for x in range(x0,x0+12):
                    if 0<=x<W and (x,y) not in s.sky:
                        r,g,b=p[x,y]; p[x,y]=(min(255,r+30),min(255,g+16),min(255,b+2))
        glow(24,76,16,'#F6C46B',.5)
    if t=='night':
        glow(24,76,20,'#F6C46B',.65); glow(6,75,14,'#F6B85A',.55); glow(52,108,8,'#9FE1CB',.25)
        # moonlight patch on floor
        for y in range(96,112):
            for x in range(70+int((y-96)*.3),80+int((y-96)*.3)):
                if 0<=x<W: r,g,b=p[x,y]; p[x,y]=(min(255,r+10),min(255,g+12),min(255,b+22))
    return s.im

bg=build('morning',with_bot=False); bg.save('f_morning_bg.png')
for n in ('fbo','fbb','fbw','fbn'):
    im=bot_img(n); im.save(f'fr_{n}.png')
can=Image.new('RGBA',(9,6),(0,0,0,0))
for x,y,c in [(0,2,'#B08D4A'),(1,2,'#B08D4A'),(2,2,'#B08D4A'),(3,2,'#B08D4A'),(4,2,'#B08D4A'),(0,3,'#B08D4A'),(1,3,'#D4B06A'),(2,3,'#B08D4A'),(3,3,'#B08D4A'),(4,3,'#8A6A2E'),(0,4,'#B08D4A'),(1,4,'#B08D4A'),(2,4,'#B08D4A'),(3,4,'#B08D4A'),(4,4,'#8A6A2E'),(0,5,'#8A6A2E'),(1,5,'#8A6A2E'),(2,5,'#8A6A2E'),(3,5,'#8A6A2E'),(5,2,'#B08D4A'),(6,1,'#B08D4A'),(7,0,'#B08D4A'),(8,0,'#D4B06A'),(1,1,'#8A6A2E'),(2,0,'#8A6A2E'),(3,1,'#8A6A2E')]:
    can.putpixel((x,y),hx(c)+(255,))
can.save('fr_can.png')
for t in ('morning','golden','night'):
    im=build(t); im.save(f'f_{t}.png'); im.resize((W*4,H*4),Image.NEAREST).save(f'f_{t}@4.png')
ims=[Image.open(f'f_{t}@4.png') for t in ('morning','golden','night')]
out=Image.new('RGB',(sum(i.width for i in ims)+20,ims[0].height),(255,255,255)); x=0
for i in ims: out.paste(i,(x,0)); x+=i.width+10
out.save('f_all.png'); print('ok')
