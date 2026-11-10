import random, math
from PIL import Image, ImageDraw
PW,PH=26,34
def hx(c):
    if isinstance(c,tuple): return c
    c=c.lstrip('#'); return tuple(int(c[i:i+2],16) for i in (0,2,4))
G1,G2,G3,G4='#2F5A1E','#3B6D11','#5E9A32','#8CC456'   # dark→light greens
BR1,BR2='#5A3A1E','#7A5230'
class P:
    def __init__(s,seed): s.im=Image.new('RGBA',(PW,PH),(0,0,0,0)); s.r=random.Random(seed)
    def px(s,x,y,c):
        if 0<=x<PW and 0<=y<PH: s.im.putpixel((int(x),int(y)),hx(c)+(255,))
    def rect(s,x,y,w,h,c):
        for yy in range(y,y+h):
            for xx in range(x,x+w): s.px(xx,yy,c)
    def blob(s,cx,cy,r,c,sq=1.0):
        for y in range(-r-1,r+2):
            for x in range(-r-1,r+2):
                if x*x+(y*y)/(sq*sq)<=r*r+r*.5: s.px(cx+x,cy+y,c)
    def shaded_blob(s,cx,cy,r,dark=G2,mid=G3,lite=G4,out=G1,sq=1.0):
        s.blob(cx,cy,r+1,out,sq); s.blob(cx,cy,r,dark,sq); s.blob(cx-1,cy-1,r-1,mid,sq); s.blob(cx-2,cy-2,max(1,r-3),lite,sq)
    def leaf(s,x,y,d,n=3,c=G3,edge=G2):
        # diagonal leaf of length n going direction d (-1 left, 1 right) and up
        for i in range(n):
            s.px(x+d*i,y-i//2,c); s.px(x+d*i,y-i//2+1,edge)
        s.px(x+d*n,y-n//2,G4)
    def stem(s,x,y0,y1,c=G2):
        for y in range(y1,y0+1): s.px(x,y,c)
    def flower(s,x,y,pet,ctr='#FAC775',big=False):
        for dx,dy in [(0,-1),(-1,0),(1,0),(0,1)]: s.px(x+dx,y+dy,pet)
        if big:
            for dx,dy in [(-1,-1),(1,-1),(-1,1),(1,1),(0,-2),(-2,0),(2,0),(0,2)]: s.px(x+dx,y+dy,pet)
        s.px(x,y,ctr)
def soil(p,thirsty):
    base,top,dk=(('#B08E5E','#C4A274','#8A6A40') if thirsty else (BR2,'#8E6438',BR1))
    p.rect(5,29,16,3,base); p.rect(6,28,14,1,top); p.rect(5,32,16,1,dk)
    if thirsty:
        for x,y in [(8,30),(9,31),(14,29),(15,30),(18,31)]: p.px(x,y,'#7A5C36')
    else:
        for x in (7,12,17): p.px(x,30,'#9A7044')
def seedling(p):  # shared stage 0
    p.px(13,27,'#C9A26B'); p.px(12,27,'#A8865A'); p.px(13,26,G3); p.px(14,25,G4)

def limonero(p,st):
    if st==0: return seedling(p)
    if st==1:
        p.stem(13,27,23); p.leaf(13,23,-1,3); p.leaf(13,22,1,3); return
    trunk_top={2:16,3:13,4:12}[st]
    for y in range(trunk_top,28): p.px(13,y,'#6B4A2B'); p.px(12,y,'#5A3A1E') if y>24 else None
    if st==2:
        p.px(12,18,'#6B4A2B'); p.px(11,17,'#6B4A2B'); p.px(14,19,'#6B4A2B'); p.px(15,18,'#6B4A2B')
        p.shaded_blob(10,15,3); p.shaded_blob(16,16,3); p.shaded_blob(13,12,3); return
    r=7 if st==3 else 8
    p.shaded_blob(13,10,r)
    p.shaded_blob(8,12,3); p.shaded_blob(18,12,3)
    if st==3:
        for x,y in [(9,7),(15,6),(18,10),(11,12),(16,13),(7,10)]: p.flower(x,y,'#FFFFFF','#F6E7A0')
    else:
        for x,y in [(9,8),(16,7),(18,12),(11,13),(15,14),(7,11),(13,4)]:
            p.px(x,y,'#F2C53D'); p.px(x+1,y,'#F2C53D'); p.px(x,y+1,'#D9A520'); p.px(x+1,y+1,'#F7DD6E')
        p.px(10,3,'#FFFFFF'); p.px(19,8,'#FFFFFF')

def copihue(p,st):
    if st==0: return seedling(p)
    p.rect(17,30-{1:6,2:16,3:24,4:28}[st],1,{1:6,2:16,3:24,4:28}[st],'#A8783F')  # stake
    h={1:5,2:14,3:22,4:26}[st]
    for i in range(h):
        x=13+round(2*math.sin(i/2.2)); p.px(x,27-i,G2)
        if i%3==1: p.leaf(x,27-i,-1 if i%2 else 1,2,G3)
    if st>=3:
        bells=[(12,12),(15,8),(11,18),(16,15)] + ([(14,4),(10,9),(16,21),(12,24)] if st==4 else [])
        for i,(x,y) in enumerate(bells):
            col=('#D7263D','#A31621','#F25C6E') if not (st==4 and i==5) else ('#F6F1E9','#D8CFC0','#FFFFFF')
            p.px(x,y,G1); p.px(x,y+1,col[0]); p.px(x-1,y+2,col[0]); p.px(x,y+2,col[2]); p.px(x+1,y+2,col[1]); p.px(x-1,y+3,col[1]); p.px(x+1,y+3,col[1])
    elif st==2:
        for x,y in [(12,14),(15,18)]: p.px(x,y,'#D7263D'); p.px(x,y+1,'#A31621')

def araucaria(p,st):
    if st==0:
        p.px(12,27,'#8A5E36'); p.px(13,27,'#B07A45'); p.px(13,26,'#E7C9A0'); return
    if st==1:
        p.stem(13,27,22,'#4E6B30'); 
        for y in (22,24): p.px(12,y,'#3C5A28'); p.px(14,y,'#3C5A28')
        return
    top={2:14,3:6,4:2}[st]
    for y in range(top,28): p.px(13,y,'#6E5340'); 
    for y in range(top+4,28): p.px(12,y,'#5A4232')
    tiers=[(top+3,3),(top+8,5),(top+13,7),(top+18,8)][: {2:2,3:3,4:4}[st]]
    for ty,w in tiers:
        for d in (-1,1):
            for i in range(1,w+1):
                p.px(13+d*i,ty-(1 if i>w-2 else 0),'#2E4A22'); p.px(13+d*i,ty+1-(1 if i>w-2 else 0),'#3E6A2E')
            p.px(13+d*(w+1),ty-2,'#5E8A44'); p.px(13+d*w,ty-2,'#3E6A2E')
    p.px(13,top-1,'#5E8A44'); p.px(12,top,'#3E6A2E'); p.px(14,top,'#3E6A2E')
    if st==4:
        for x,y in [(9,top+6),(17,top+11),(8,top+16)]: p.blob(x,y,1,'#8A5E36'); p.px(x,y,'#B07A45')

def quisco(p,st):
    if st==0: p.px(13,27,'#5DA36A'); p.px(13,26,'#7FC48B'); return
    H={1:5,2:11,3:16,4:18}[st]
    p.rect(11,28-H,5,H,'#3E8A55'); p.rect(12,28-H,3,H,'#5DA36A'); p.rect(13,28-H,1,H,'#7FC48B')
    p.rect(12,27-H,3,1,'#5DA36A')
    for y in range(29-H,28,2): p.px(11,y,'#E8E3C8'); p.px(15,y+1,'#E8E3C8')
    if st>=2:
        p.rect(7,18,3,3,'#3E8A55'); p.rect(7,14,3,5,'#5DA36A'); p.rect(8,14,1,5,'#7FC48B'); p.rect(9,19,2,2,'#3E8A55')
    if st>=3:
        p.rect(17,16,3,3,'#3E8A55'); p.rect(17,11,3,6,'#5DA36A'); p.rect(18,11,1,6,'#7FC48B'); p.rect(16,17,1,2,'#3E8A55')
    if st==3: p.px(13,27-H-1,'#ED93B1'); p.px(13,27-H-2,'#F7C2D4')
    if st==4:
        cy=27-H-2
        p.flower(13,cy,'#FFFFFF','#FAC775',big=True); p.px(12,cy-1,'#F7C2D4'); p.px(14,cy+1,'#F7C2D4')
        p.flower(8,12,'#F7C2D4','#FAC775')

def nalca(p,st):
    if st==0: p.px(13,27,'#8E2B2B'); p.px(13,26,'#B5432F'); return
    def big_leaf(cx,cy,r):
        p.shaded_blob(cx,cy,r,dark='#3E7A2A',mid='#5E9E36',lite='#86C24E',out='#2A5A1C',sq=.7)
        for i in range(-r,r+1,2): p.px(cx+i,cy,'#2A5A1C')
        p.px(cx,cy-1,'#2A5A1C'); p.px(cx,cy+1,'#2A5A1C')
    if st==1: p.stem(13,27,24,'#B5432F'); big_leaf(13,22,2); return
    stalks={2:[(13,18,4)],3:[(9,16,5),(17,14,6)],4:[(8,14,6),(18,12,7),(13,18,4)]}[st]
    for x,y,r in stalks:
        for yy in range(y,28): p.px(x+(0 if yy>y+3 else 0),yy,'#B5432F'); 
        for yy in range(y+2,28,3): p.px(x,yy,'#D97060')
    for x,y,r in stalks: big_leaf(x,y,r)
    if st==4:
        for y in range(19,27): p.px(14,y,'#C8584A'); p.px(15,y,'#A8402E' if y%2 else '#D97060')
        p.px(14,18,'#D97060')

def tomatera(p,st):
    if st==0: return seedling(p)
    if st==1: p.stem(13,27,23); p.leaf(13,24,-1,2); p.leaf(13,23,1,2); p.px(13,22,G4); return
    h={2:12,3:18,4:20}[st]
    if st>=3:
        for x in (9,17): p.rect(x,28-h-2,1,h+2,'#A8783F')
        p.rect(9,28-h-2,9,1,'#A8783F')
    for i in range(h):
        x=13+(1 if (i//3)%2 else 0); p.px(x,27-i,G2)
        if i%2==0: p.leaf(x,27-i,-1 if (i//2)%2 else 1,3)
    if st==3:
        for x,y in [(11,14),(15,17),(12,20)]: p.flower(x,y,'#F2D43D','#C9A21E')
    if st==4:
        for x,y in [(11,13),(15,16),(11,20),(16,22),(13,9)]:
            p.px(x,y,'#E24B4A'); p.px(x+1,y,'#C93A39'); p.px(x,y+1,'#C93A39'); p.px(x+1,y+1,'#A32D2C'); p.px(x,y,'#F07A6E'); p.px(x,y-1,G1)

def maravilla(p,st):
    if st==0: p.px(13,27,'#3A3A36'); p.px(14,27,'#E8E3C8'); return
    h={1:4,2:12,3:20,4:24}[st]
    for i in range(h): p.px(13,27-i,'#4E8A2A'); p.px(14,27-i,'#3B6D11') if i%5==0 else None
    for i in range(3,h-2,5): p.leaf(13,27-i,-1,4); p.leaf(14,26-i,1,4)
    if st==3:
        p.blob(13,27-h,2,'#4E8A2A'); p.px(13,26-h-2,'#F2C53D'); p.px(12,27-h-2,'#F2C53D')
    if st==4:
        cy=27-h
        for a in range(12):
            x=13+round(4.3*math.cos(a*math.pi/6)); y=cy+round(4.3*math.sin(a*math.pi/6)); p.px(x,y,'#F2C53D')
            x=13+round(3.4*math.cos(a*math.pi/6+.26)); y=cy+round(3.4*math.sin(a*math.pi/6+.26)); p.px(x,y,'#F7DD6E')
        p.blob(13,cy,2,'#6B4A2B'); p.px(12,cy-1,'#8A5E36'); p.px(14,cy+1,'#4A3320')

def liuto(p,st):  # alstroemeria
    if st==0: return seedling(p)
    n={1:1,2:3,3:4,4:5}[st]
    xs=[13,10,16,8,18][:n]
    for i,x in enumerate(xs):
        h=6 if st==1 else 10+((i*3)%5)
        for k in range(h): p.px(x+(k//6)*(1 if x>13 else -1 if x<13 else 0),27-k,G2)
        p.leaf(x,24,-1,2); p.leaf(x,22,1,2)
        if st>=3:
            tx=x+((h-1)//6)*(1 if x>13 else -1 if x<13 else 0); ty=27-h
            if st==3: p.px(tx,ty,'#F2A65A'); p.px(tx,ty-1,'#F7C08A')
            else:
                for dx,dy,c in [(0,-1,'#F27F3D'),(-1,0,'#F7A65A'),(1,0,'#F7A65A'),(0,0,'#FAD06B'),(-1,-2,'#E8607A'),(1,-2,'#E8607A'),(0,-2,'#F27F3D')]: p.px(tx+dx,ty+dy,c)
                p.px(tx,ty,'#6B2A1E')

SPECIES=[('limonero',limonero),('copihue',copihue),('araucaria',araucaria),('quisco',quisco),('nalca',nalca),('tomatera',tomatera),('maravilla',maravilla),('liuto',liuto)]
def thirst(img):
    out=img.copy(); px=out.load()
    for y in range(PH):
        for x in range(PW):
            r,g,b,a=px[x,y]
            if a and g>r and g>b:   # greens → dry olive
                px[x,y]=(min(255,int(r*1.25+38)),int(g*0.92),int(b*0.7),a)
    # droop: shift upper half down 1px
    top=out.crop((0,0,PW,PH//2)); out2=Image.new('RGBA',(PW,PH),(0,0,0,0)); out2.paste(out,(0,0)); 
    clear=Image.new('RGBA',(PW,1),(0,0,0,0)); out2.paste(clear,(0,0)); out2.paste(top,(0,1),top)
    return out2

def wilt(img):
    out=img.copy(); px=out.load()
    for y in range(PH):
        for x in range(PW):
            r,g,b,a=px[x,y]
            if a and g>r and g>b:   # greens -> brown
                px[x,y]=(min(255,int(r*1.45+62)),int(g*0.74),int(b*0.5),a)
    # stronger droop: shift the plant above the soil down 3px
    top=out.crop((0,0,PW,26)); out2=Image.new('RGBA',(PW,PH),(0,0,0,0)); out2.paste(out.crop((0,26,PW,PH)),(0,26))
    out2.paste(top,(0,3),top)
    return out2

SCALE=4; CELL=PW*SCALE; GAP=14
for name,fn in SPECIES:
    row=Image.new('RGBA',(6*CELL+5*GAP,PH*SCALE),(0,0,0,0))
    for st in range(6):
        p=P(1); s=min(st,4)
        soil(p,st==5); fn(p,4 if st==5 else s)
        im=p.im if st<5 else thirst(p.im)
        row.paste(im.resize((CELL,PH*SCALE),Image.NEAREST),(st*(CELL+GAP),0))
    row.save(f'plant_{name}.png')
print('ok')
