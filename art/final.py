import json, random, math
from PIL import Image
import plants as PL
from garden2 import plant_img
SP=json.load(open('sprites.json'))
W,H=97,140; hx=PL.hx

class S:
    def __init__(s,time):
        s.t=time; s.im=Image.new('RGB',(W,H),(0,0,0)); s.sky=set(); s.lit=set()
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

# Slate machine room, one dusty rose light, foliage kept cool so it never reads red and green.
S0,S1,S2,S3,S4='#141D20','#1E2A2E','#2B3A3F','#3D4F54','#5C7174'
ROSE_LIGHT,ROSE,ROSE_DEEP,ICE,ICE2='#FFDCE0','#E9879A','#C9506E','#BFE3F2','#7FB4D6'
TEAL_LED,AMBER,MUSTARD='#7FD8D0','#E8B860','#BE962C'
LEAF0,LEAF1,LEAF2='#12282A','#1E4440','#3A7468'
WIN_TOP,WIN_BOT=4,60
PANES=[(4,20),(26,22),(50,22),(74,19)]

# mul grades everything that is not sky or lit. shaft is the light from the panes across the floor.
BANDS={
 'morning':dict(sky=['#8FA3A8','#A8B8B4','#C2CABC','#DAD6BE','#ECE2C2'],towers=('#7C9296','#889C9E'),windows=['#E8C98A','#F2D9A0'],rain='#E6EAE0',rain_n=14,mul=(1.0,1.0,.96),shaft=(18,16,10),sign=.45),
 'day':dict(sky=['#14262E','#1B3440','#264655','#37607A','#5A8DAA'],towers=('#0F1C22','#13242B'),windows=[AMBER,'#8FD0E8'],rain=ICE2,rain_n=26,mul=(.9,.97,1.0),shaft=(8,16,24),sign=.9),
 'golden':dict(sky=['#5E3420','#7E4624','#A05E2A','#C27A32','#DE9A42','#EDB65C'],towers=('#6A3A20','#7A4424'),windows=['#FFD98A','#FFE9B0'],rain='#F0CC96',rain_n=14,mul=(1.02,.86,.7),shaft=(28,14,2),sign=.8),
 'night':dict(sky=['#14262E','#1B3440','#264655','#37607A','#5A8DAA'],towers=('#0F1C22','#13242B'),windows=[AMBER,'#8FD0E8'],rain=ICE2,rain_n=26,mul=(.5,.58,.76),shaft=(8,16,24),sign=1.12),
}
ADD=(0,0,0)
GLYPH={'L':['100','100','100','100','111'],'I':['111','010','010','010','111'],'B':['110','101','110','101','110'],
       'R':['110','101','110','101','101'],'O':['111','101','101','101','111'],'S':['011','100','010','001','110']}

def wall(s):
    # hull plating: long plates and structural ribs, seams line up so it never reads as masonry
    s.rect(0,0,W,88,S2)
    s.rect(0,0,W,3,S1); s.rect(0,3,W,1,S0)
    for x,w in ((0,4),(24,2),(48,2),(72,2),(93,4)):
        s.rect(x,0,w,62,S3); s.rect(x,0,1,62,S4); s.rect(x+w-1,0,1,62,S0)
    for x in (1,94):
        for y in range(6,60,9): s.px(x+1,y,S4)
    s.rect(0,62,W,26,S1)
    x=0
    for w in (26,22,30,19):
        s.rect(x,62,w,26,S2); s.rect(x,62,w,1,S3); s.rect(x,87,w,1,S0); s.rect(x+w-1,62,1,26,S0)
        for cx,cy in ((x,62),(x+w-1,62),(x,87),(x+w-1,87)): s.px(cx,cy,S0)
        x+=w
    for y in range(74,84,2): s.rect(33,y,9,1,S0)
    s.px(72,72,TEAL_LED,lit=True); s.px(74,72,AMBER,lit=True)
    for x in range(2,W,8): s.rect(x,86,4,1,ICE2,lit=True)

def window(s):
    b=BANDS[s.t]; bands=b['sky']
    for px0,pw in PANES:
        cx=px0+pw/2
        for y in range(WIN_TOP,WIN_BOT):
            for x in range(px0,px0+pw):
                if y<WIN_TOP+12 and (WIN_TOP+12)-y>(1-abs(x-cx)/(pw/2))*14: continue
                band=min(len(bands)-1,int((y-WIN_TOP)/(WIN_BOT-WIN_TOP)*len(bands)))
                s.im.putpixel((x,y),hx(bands[band])); s.sky.add((x,y))
    for x,y in list(s.sky):
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
            ex,ey=x+dx,y+dy
            if 0<=ex<W and 0<=ey<H and (ex,ey) not in s.sky: s.im.putpixel((ex,ey),hx(S4 if dy>0 or dx>0 else S0))
    def put(x,y,c):
        if (x,y) in s.sky: s.im.putpixel((x,y),hx(c))
    r=random.Random(5); x=0
    while x<W:
        w,top=r.randint(5,10),r.randint(20,46); tone=r.choice(b['towers'])
        for xx in range(x,x+w):
            for y in range(top,WIN_BOT): put(xx,y,tone)
        for y in range(top+2,WIN_BOT,3):
            for xx in range(x+1,x+w-1,2):
                if r.random()<.2: put(xx,y,r.choice(b['windows']))
        x+=w
    # one tall billboard, the only bright thing out there
    for y in range(30,44):
        for xx in range(55,60): put(xx,y,ICE if (y+xx)%5 else ICE2)
    rain=random.Random(9)
    for _ in range(b['rain_n']):
        xx,y=rain.randint(4,92),rain.randint(WIN_TOP+8,WIN_BOT-3)
        put(xx,y,b['rain']); put(xx,y+1,b['rain'])
    for px0,pw in PANES:
        cx=int(px0+pw/2)
        for y in range(WIN_TOP+10,WIN_BOT): s.px(cx,y,S0)
        for y in (WIN_TOP+22,WIN_TOP+40): s.rect(px0,y,pw,1,S0)
    s.rect(0,WIN_BOT,W,2,S3); s.rect(0,WIN_BOT,W,1,S4)

def machinery(s):
    s.rect(0,64,W,3,S3); s.rect(0,64,W,1,S4); s.rect(0,66,W,1,S0)
    for x in range(6,W,19): s.rect(x,63,3,5,S4); s.rect(x,67,3,1,S0)
    s.rect(0,70,W,1,S0)
    for x0,x1,sag,c in ((34,66,8,S0),(40,72,5,'#6A5564'),(2,30,6,S0)):
        for x in range(x0,x1):
            t=(x-x0)/(x1-x0); s.px(x,62+int(sag*4*t*(1-t)),c)
    s.rect(47,62,4,26,S2); s.rect(47,62,1,26,S4); s.rect(50,62,1,26,S0)
    s.rect(44,74,10,9,S3); s.rect(44,74,10,1,S4)
    s.px(46,76,TEAL_LED,lit=True); s.px(48,76,AMBER,lit=True)
    s.rect(46,79,6,1,S0); s.rect(46,81,6,1,S0)
    for y in range(76,87):
        for x in range(58,66): s.px(x,y,MUSTARD if (x+y)%6<3 else S0)

def room(s):
    # ship's deck: plates widen toward the viewer, seams run to the viewport
    rows=[90,98,110,126,140]
    s.rect(0,88,W,2,S1)
    for i,(y0,y1) in enumerate(zip(rows,rows[1:])):
        s.rect(0,y0,W,y1-y0,S2 if i%2 else '#27353A')
    for y in rows[:-1]:
        s.rect(0,y,W,1,S0); s.rect(0,y+1,W,1,S3)
    for xb in range(-60,160,26):
        for y in range(90,H):
            s.px(48+(xb-48)*(y-62)/78,y,S0)
    for x in range(36,62,2): s.rect(x,90,1,7,S0)
    s.rect(35,90,28,1,S4); s.rect(35,96,28,1,S4)
    # worn wine rug
    rx,ry,rw,rh=18,104,61,30
    s.rect(rx,ry,rw,rh,'#4A2034'); s.rect(rx+2,ry+2,rw-4,rh-4,'#B08D4A'); s.rect(rx+3,ry+3,rw-6,rh-6,'#5E2A44')
    s.rect(rx+8,ry+8,rw-16,rh-16,'#2F3A4A'); s.rect(rx+9,ry+9,rw-18,rh-18,'#5E2A44')
    for x in range(rx+5,rx+rw-5,4): s.px(x,ry+5,'#C9A86A'); s.px(x,ry+rh-6,'#C9A86A')
    for x in range(rx,rx+rw,2): s.px(x,ry-1,'#C9B48A'); s.px(x,ry+rh,'#C9B48A')

def desk(s,time):
    # writing desk left
    s.rect(0,82,34,3,'#5E3E26'); s.rect(0,82,34,1,'#7A5236'); s.rect(1,85,3,15,'#3E2818'); s.rect(29,85,3,15,'#3E2818')
    s.rect(4,85,24,5,'#4A3020'); s.rect(14,87,4,1,'#B08D4A')
    # books stack + standing books
    for i,(w,c) in enumerate([(12,'#3B3F5C'),(11,'#6E2230'),(13,'#2F4A35')]):
        s.rect(2+i%2,81-2*i,w,2,c); s.rect(2+i%2,81-2*i,w,1,'#B08D4A' if i==1 else c)
    # bankers lamp
    on = time in ('golden','night')
    s.rect(22,80,6,2,'#8A6A2E'); s.rect(24,74,1,6,'#B08D4A'); s.rect(20,71,9,3,'#2F6B4A'); s.rect(20,71,9,1,'#4E8E68')
    if on: s.rect(21,74,7,1,'#FFE7A0',lit=True)
    # open notebook + inkwell
    s.rect(10,79,9,2,'#E9DCC0'); s.rect(14,79,1,2,'#B9A880'); s.rect(11,79,2,1,'#5A4A3A'); s.rect(16,80,2,1,'#5A4A3A')
    s.rect(30,78,2,3,'#1A1412'); s.px(31,77,'#E9DCC0')
    if time=='night':
        s.rect(6,76,2,4,'#E9DCC0'); s.px(6,75,'#FFE7A0',lit=True); s.px(7,74,'#F6B85A',lit=True)

def sign(s):
    for x in (6,28): s.rect(x,52,1,6,S0)
    s.rect(3,58,28,9,S0); s.rect(4,59,26,7,ROSE_DEEP,lit=True); s.rect(4,59,26,1,ROSE,lit=True)
    for i,ch in enumerate('LIBROS'):
        for dy,row in enumerate(GLYPH[ch]):
            for dx,bit in enumerate(row):
                if bit=='1': s.px(6+i*4+dx,60+dy,ROSE_LIGHT,lit=True)

def stand(s):
    # three-tier steel étagère right
    x0=68
    for y,w in ((66,24),(78,26),(90,28)):
        s.rect(x0+(28-w)//2,y,w,2,S3); s.rect(x0+(28-w)//2,y,w,1,S4)
    s.rect(x0+1,64,1,30,S0); s.rect(x0+26,64,1,30,S0)
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
        for k in range(L): s.px(x+(k%2),15+k,LEAF1 if k%3 else LEAF2)
        if i%2: s.px(x,15+L,'#D7263D'); s.px(x,16+L,'#A31621')

def leaf(s,x,y,r):
    length=r.randint(4,7); dx=r.choice([-1,1])
    for k in range(length):
        half=1 if 0<k<length-1 else 0; wide=1 if k==length//2 else 0
        cx,cy=x+dx*k,y+k//2+(k%2)
        for off in range(-half-wide,half+1+wide): s.px(cx,cy+off,LEAF0 if off>0 else LEAF1)
        s.px(cx,cy,LEAF2)

def overgrowth(s,r):
    # clumps in the corners and one off centre, so it never hangs like a garland
    for _ in range(34):
        lo,hi,depth=r.choice([(0,20,20),(0,20,20),(72,96,16),(72,96,16),(30,38,6)])
        leaf(s,r.randint(lo,hi),r.randint(0,depth),r)
    for x0,length in ((1,58),(94,62)):
        px=x0
        for y in range(length):
            px+=r.choice([-1,0,0,1]) if y%3==0 else 0
            px=max(0,min(W-1,px)); s.px(px,y,LEAF1)
            if y%5==2: leaf(s,px,y,r)
    for x in list(range(0,18,3))+list(range(64,97,4))+[33,40,57]:
        for k in range(r.randint(2,5)): s.px(x+(k%2),88+r.randint(0,1)-k,LEAF2 if k else LEAF1)
    for x,y in ((12,137),(70,138),(34,101),(90,110),(3,110)):
        for k in range(r.randint(3,5)): s.px(x+k%2,y-k,LEAF2); s.px(x+1-k%2,y-k+1,LEAF1)
    for x,y,c in ((26,98,ICE2),(66,136,ROSE),(8,118,MUSTARD)):
        s.rect(x,y,2,3,c); s.px(x,y,S4)

def build(time, face='fbo', with_bot=True):
    s=S(time); r=random.Random(21); wall(s); window(s); machinery(s); room(s); desk(s,time); sign(s); stand(s)
    # shelf plants (small)
    for cx,base,(n,st) in [(74,64,('liuto',2)),(86,64,('quisco',2)),(73,76,('copihue',3)),(88,76,('maravilla',2)),(76,88,('tomatera',3)),(90,88,('nalca',2))]:
        s.sprite(plant_img(n,st), cx-13, base-28-2)
    for cx,base,c in [(74,64,'#9A5A36'),(86,64,'#8E4A2A'),(73,76,'#9A5A36'),(88,76,'#8E4A2A'),(76,88,'#9A5A36'),(90,88,'#8E4A2A')]:
        pot(s,cx,base-2,c,small=True)
    hanging(s)
    # floor big pots
    s.sprite(plant_img('limonero',4),14-13,124-28-3); pot(s,14,121)
    s.sprite(plant_img('araucaria',3),84-13,136-28-3); pot(s,84,133,'#8E4A2A')
    s.sprite(plant_img('liuto',4),30-13,138-28-3); pot(s,30,135,'#9A5A36')
    overgrowth(s,r)
    if with_bot: bot(s,'fbn' if time=='night' else face,44,102)
    # watering can
    if time!='night' and with_bot: s.rect(68,120,5,4,'#B08D4A'); s.rect(73,120,3,1,'#B08D4A'); s.px(76,119,'#B08D4A'); s.rect(69,118,3,1,'#8A6A2E')
    return grade(s)

def grade_sprite(im,t):
    # same band multipliers as grade(), for layers drawn over the baked room; the face screen stays lit
    out=im.copy(); p=out.load(); mul=BANDS[t]['mul']
    for y in range(out.height):
        for x in range(out.width):
            r,g,b,a=p[x,y]
            if a and (r,g,b) not in (hx('#9FE1CB'),hx('#085041')):
                p[x,y]=tuple(max(0,min(255,int(v*m+d))) for v,m,d in zip((r,g,b),mul,ADD))+(a,)
    return out

def grade(s):
    p=s.im.load(); t=s.t; b=BANDS[t]; mul=b['mul']
    for y in range(H):
        for x in range(W):
            if (x,y) in s.sky or (x,y) in s.lit: continue
            p[x,y]=tuple(max(0,min(255,int(v*m))) for v,m in zip(p[x,y],mul))
    def glow(gx,gy,rad,col,st):
        for y in range(gy-rad,gy+rad+1):
            for x in range(gx-rad,gx+rad+1):
                if 0<=x<W and 0<=y<H and (x,y) not in s.sky and (x,y) not in s.lit:
                    d=math.hypot(x-gx,(y-gy)*1.1)/rad
                    if d<1:
                        k=round(st*(1-d)**1.4*6)/6; r,g,bl=p[x,y]
                        p[x,y]=(min(255,int(r+col[0]*k)),min(255,int(g+col[1]*k)),min(255,int(bl+col[2]*k)))
    glow(17,72,30,(104,34,56),b['sign'])
    if t in ('golden','night'): glow(24,76,12,(70,62,30),.4)
    # stepped light from the panes across the floor
    for x0 in (10,34,58):
        for y in range(90,122):
            shift=int((y-90)*.35); k=1 if y<104 else .56
            for x in range(x0+shift,x0+shift+8):
                if 0<=x<W and (x,y) not in s.lit:
                    r,g,bl=p[x,y]; sr,sg,sb=b['shaft']
                    p[x,y]=(min(255,int(r+sr*k)),min(255,int(g+sg*k)),min(255,int(bl+sb*k)))
    return s.im

BAND_NAMES=('morning','day','golden','night')
for t in BAND_NAMES:
    build(t,with_bot=False).save(f'f_{t}_bg.png')
for n in ('fbo','fbb','fbw','fbn'):
    im=bot_img(n); im.save(f'fr_{n}.png')
can=Image.new('RGBA',(9,6),(0,0,0,0))
for x,y,c in [(0,2,'#B08D4A'),(1,2,'#B08D4A'),(2,2,'#B08D4A'),(3,2,'#B08D4A'),(4,2,'#B08D4A'),(0,3,'#B08D4A'),(1,3,'#D4B06A'),(2,3,'#B08D4A'),(3,3,'#B08D4A'),(4,3,'#8A6A2E'),(0,4,'#B08D4A'),(1,4,'#B08D4A'),(2,4,'#B08D4A'),(3,4,'#B08D4A'),(4,4,'#8A6A2E'),(0,5,'#8A6A2E'),(1,5,'#8A6A2E'),(2,5,'#8A6A2E'),(3,5,'#8A6A2E'),(5,2,'#B08D4A'),(6,1,'#B08D4A'),(7,0,'#B08D4A'),(8,0,'#D4B06A'),(1,1,'#8A6A2E'),(2,0,'#8A6A2E'),(3,1,'#8A6A2E')]:
    can.putpixel((x,y),hx(c)+(255,))
can.save('fr_can.png')
# app layers, graded per band
for t,names in (('morning',('fbo','fbb')),('day',('fbo','fbb')),('golden',('fbo','fbb')),('night',('fbn',))):
    for n in names: grade_sprite(bot_img(n),t).save(f'fr_{t}_{n}.png')
    if t!='night': grade_sprite(can,t).save(f'fr_{t}_can.png')
for t in BAND_NAMES:
    im=build(t); im.save(f'f_{t}.png'); im.resize((W*4,H*4),Image.NEAREST).save(f'f_{t}@4.png')
ims=[Image.open(f'f_{t}@4.png') for t in BAND_NAMES]
out=Image.new('RGB',(sum(i.width for i in ims)+30,ims[0].height),(255,255,255)); x=0
for i in ims: out.paste(i,(x,0)); x+=i.width+10
out.save('f_all.png'); print('ok')
