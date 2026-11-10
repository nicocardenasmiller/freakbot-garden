import json, random, math
from PIL import Image, ImageDraw
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

# Muted white hydroponics bay of a derelict ship: octagonal hull rings recede to one big viewport.
S0,S1,S2,S3,S4='#6C6E6C','#ABADA8','#C6C7C1','#D9DAD4','#EFEEE8'
DARK,POT,POT_RIM,POT_LIT='#1C2028','#3A3E46','#1C2028','#6C7078'
TEAL='#2B6CA3'
# the interface palette: warm white, black, signal red, blue, yellow
ROSE_LIGHT,ROSE,ROSE_DEEP,ICE,MINT,AMBER='#F8F7F2','#E0604A','#C4402E','#8DB8DE','#E0A92E','#E0A92E'
LEAF0,LEAF1,LEAF2='#12282A','#1E4440','#3A7468'

# mul grades everything that is not space or lit. The planet turns with the phone clock.
BANDS={
 'morning':dict(space=['#0E1430','#182048','#2A2F5E'],planet=['#27406A','#3F6E8E','#7FB0B8'],limb='#FFE9B8',light=(30,70),mul=(1.0,.98,.92),sign=.5,strip='#FFF4DC',window=.5,bloom=(255,233,190)),
 'day':dict(space=['#070A18','#0A0E22','#0E1430'],planet=['#1E5A8A','#3A8AB8','#A8DCF0'],limb='#DDF2FF',light=(55,62),mul=(1.0,1.0,1.0),sign=.75,strip='#F4FBFF',window=.55,bloom=(190,225,255)),
 'golden':dict(space=['#1A1030','#2A1436','#3E1A3C'],planet=['#5E2E3A','#B0603A','#E8A050'],limb='#FFD27A',light=(82,66),mul=(1.0,.82,.66),sign=.8,strip='#FFD79A',window=.45,bloom=(255,170,90)),
 'night':dict(space=['#05060F','#070A18','#0A0E22'],planet=['#0E1428','#141C36','#1E2A4A'],limb='#4FA0C8',light=(30,60),mul=(.46,.5,.68),sign=1.1,strip='#A9C8E4',window=.2,bloom=(90,130,190)),
}
ADD=(0,0,0)
GLYPH={'L':['100','100','100','100','111'],'I':['111','010','010','010','111'],'B':['110','101','110','101','110'],
       'R':['110','101','110','101','101'],'O':['111','101','101','101','111'],'S':['011','100','010','001','110'],
       'F':['111','100','110','100','100'],'C':['011','100','100','100','011'],'H':['101','101','111','101','101'],'A':['010','101','111','101','101'],'V':['101','101','101','101','010']}
RINGS=[0,.22,.4,.55,.68,.8,.9,1.0]

def ring(t):
    L,T,R,B,c=[a+(b-a)*t for a,b in zip((-10,-12,106,152,34),(25,26,71,80,10))]
    return [(L+c,T),(R-c,T),(R,T+c),(R,B-c),(R-c,B),(L+c,B),(L,B-c),(L,T+c)]

def P(i,u,t):
    # point u of the way along octagon edge i, on the ring at depth t
    r=ring(t); (x0,y0),(x1,y1)=r[i],r[(i+1)%8]
    return (x0+(x1-x0)*u,y0+(y1-y0)*u)

def quad(s,pts,c,lit=False):
    mask=Image.new('1',(W,H),0); ImageDraw.Draw(mask).polygon(pts,fill=1); m=mask.load()
    for y in range(H):
        for x in range(W):
            if m[x,y]: s.px(x,y,c,lit=lit)

def line(s,a,b,c,lit=False,step=1):
    n=max(1,int(max(abs(a[0]-b[0]),abs(a[1]-b[1]))))
    for k in range(0,n+1,step): s.px(a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n,c,lit=lit)

BAYER=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]]
def dq(v,x,y,n):
    # quantize to n steps with ordered dither: no smooth gradients in the art
    return round(v*n+(BAYER[y%4][x%4]+.5)/16-.5)/n

def light_at(x,y,b):
    return .74+b['window']*math.exp(-((x-48)**2/40**2+(y-60)**2/62**2))

def form(im,toward=1):
    # shade a flat sprite: lit from above and from the window side, dark underneath
    out=im.copy(); src=im.load(); p=out.load(); w,h=im.size
    keep=(hx('#9FE1CB'),hx('#085041'))
    op=lambda x,y: 0<=x<w and 0<=y<h and src[x,y][3]>0
    ys=[y for y in range(h) for x in range(w) if op(x,y)]
    if not ys: return out
    top,bot_=min(ys),max(ys)
    for y in range(h):
        for x in range(w):
            if not op(x,y) or src[x,y][:3] in keep: continue
            f=1.08-.26*(y-top)/max(1,bot_-top)
            if not op(x,y-1): f=1.24
            elif not op(x,y+1): f=.7
            if not op(x+toward,y): f*=1.12
            elif not op(x-toward,y): f*=.84
            r,g,bl,a=src[x,y]; p[x,y]=(min(255,int(r*f)),min(255,int(g*f)),min(255,int(bl*f)),a)
    return out

def sh(c,f):
    return tuple(max(0,min(255,int(v*f))) for v in hx(c))

def darken(s,x,y,f):
    if 0<=x<W and 0<=y<H and (x,y) not in s.sky and (x,y) not in s.lit:
        s.im.putpixel((x,y),sh(s.im.getpixel((x,y)),f))

# Ceiling undersides and lower corners sit in shade. Each section gets brighter toward the window.
FACE={0:'#B8B9B4',1:'#CFD0CA',2:'#D2D3CD',3:'#A1A39E',4:'#C2C3BD',5:'#A1A39E',6:'#E0E0DA',7:'#CFD0CA'}
SECTION=[.52,.62,.72,.82,.9,.96,1.0]

CELLS={0:(0,.15,.85,1),2:(0,.33,.66,1),4:(0,.25,.5,.75,1),6:(0,.33,.66,1)}

def hull(s):
    s.rect(0,0,W,H,sh(S0,.6)); r=random.Random(31); s.lights=[]
    strip=BANDS[s.t]['strip']
    for j,(t0,t1) in enumerate(zip(RINGS,RINGS[1:])):
        f=SECTION[j]
        for i in range(8):
            us=CELLS.get(i,(0,1))
            # no two plates are quite the same white
            for u0,u1 in zip(us,us[1:]):
                quad(s,[P(i,u0,t0),P(i,u1,t0),P(i,u1,t1),P(i,u0,t1)],sh(FACE[i],f*(1+r.uniform(-.05,.05))))
    for j,(t0,t1) in enumerate(zip(RINGS,RINGS[1:])):
        f=SECTION[j]
        for i in range(8):
            if j%2==0:
                # major rib, with the shadow it throws
                quad(s,[P(i,0,t0),P(i,1,t0),P(i,1,t0+.028),P(i,0,t0+.028)],sh(FACE[i],f*.94))
                line(s,P(i,0,t0),P(i,1,t0),sh(S4,f*.96))
                quad(s,[P(i,0,t0+.028),P(i,1,t0+.028),P(i,1,t0+.05),P(i,0,t0+.05)],sh(FACE[i],f*.78))
                line(s,P(i,0,t0+.028),P(i,1,t0+.028),sh(S0,f*.8))
            else:
                line(s,P(i,0,t0),P(i,1,t0),sh(S0,f*.92))
        a,b=t0+.06,t1-.015
        for i,us in ((4,(.25,.5,.75)),(0,(.15,.85)),(2,(.33,.66)),(6,(.33,.66))):
            for u in us: line(s,P(i,u,a),P(i,u,b),sh(S0,f))
        # the nearest sections have lost power; lights start further in
        if j>1:
            quad(s,[P(0,.38,a),P(0,.62,a),P(0,.62,b),P(0,.38,b)],strip,lit=True)
            s.lights.append(P(0,.5,(a+b)/2))
        if j in (2,3,4):
            for i in (2,6):
                for k in (.3,.4,.5,.6): line(s,P(i,k,a+.03),P(i,k,b-.03),sh(S0,f*.8))
    # corner light strips run unbroken down the length of the ship
    for i,c in ((1,sh(strip,.72)),(7,sh(strip,.72)),(3,sh(TEAL,.8)),(5,sh(TEAL,.8))): line(s,P(i,.5,.4),P(i,.5,.9),c,lit=True)
    # the viewport is set deep into the hull
    for i,c in {0:sh(S0,.62),1:sh(S0,.72),2:sh(S0,.9),3:S1,4:S3,5:S1,6:sh(S0,.9),7:sh(S0,.72)}.items():
        quad(s,[P(i,0,.91),P(i,1,.91),P(i,1,1),P(i,0,1)],c)

def grime(s):
    # streaks running down from seams, scuffs on the deck
    r=random.Random(44)
    for _ in range(70):
        x,y=r.randint(0,W-1),r.randint(6,100); n=r.randint(3,13)
        for k in range(n):
            if k%2==0 or r.random()<.5: darken(s,x,y+k,.91)
    for _ in range(26):
        x,y=r.randint(0,W-1),r.randint(92,136); dx=r.choice([-1,1])
        for k in range(r.randint(3,7)): darken(s,x+dx*k,y+k//3,.9)

def floor_shadows(s):
    # contact shadows, darkest where the furniture meets the deck, thrown toward the viewer
    for y in range(110,118):
        f=.54+(y-110)*.06
        for x in range(0,34-(y-110)):
            if dq(1,x,y,1)>=0: darken(s,x,y,f)
        for x in range(64+(y-110),97): darken(s,x,y,f)

def pot_shadow(s,cx,y,half):
    for yy in range(y,y+5):
        f=.58+(yy-y)*.08
        for x in range(cx-half-(yy-y),cx+half+1): darken(s,x+1,yy,f)

def bot_shadow(s):
    # falls away from the window, under Freakbot and toward the viewer
    for y in range(124,134):
        for x in range(38,70):
            d=math.hypot((x-53)/15,(y-127)/5)
            if d<1: darken(s,x,y,dq(.52+d*.42,x,y,6))

def viewport(s):
    b=BANDS[s.t]; r=ring(1)
    mask=Image.new('1',(W,H),0); ImageDraw.Draw(mask).polygon(r,fill=1); m=mask.load()
    area=[(x,y) for y in range(H) for x in range(W) if m[x,y]]
    for x,y in area:
        s.im.putpixel((x,y),hx(b['space'][min(2,int((y-26)/54*3))])); s.sky.add((x,y)); s.lit.discard((x,y))
    st=random.Random(5)
    px=lambda x,y,c: s.im.putpixel((x,y),hx(c)) if (x,y) in s.sky else None
    for _ in range(36):
        px(st.randint(25,71),st.randint(26,78),st.choice(['#FFFFFF','#CFE4FF','#FFE9B8']))
    # planet, shaded in hard steps away from the light
    cx,cy,rad=62,104,50; lx,ly=b['light']; tones=b['planet']; cl=random.Random(8)
    for x,y in area:
        d=math.hypot(x-cx,y-cy)
        if d>rad: continue
        li=math.hypot(x-lx,y-ly)
        s.im.putpixel((x,y),hx(tones[2 if li<24 else 1 if li<42 else 0]))
        if d>rad-1.2: s.im.putpixel((x,y),hx(b['limb']))
    bands=[]  # clouds are drawn live by js/windowfx.js
    for y,h in bands:
        x0=cl.randint(30,44); w=cl.randint(14,24)
        for yy in range(y,y+h):
            for x in range(x0,x0+w):
                if (x,yy) in s.sky and math.hypot(x-cx,yy-cy)<rad-2 and s.t!='night':
                    s.im.putpixel((x,yy),hx('#E6F2F8' if s.t in('day','morning') else '#F0C080'))
    if s.t=='night':
        for _ in range(40):
            x,y=cl.randint(30,71),cl.randint(58,79)
            if (x,y) in s.sky and math.hypot(x-cx,y-cy)<rad-2: s.im.putpixel((x,y),hx(AMBER))
    # frame
    for i in range(8):
        line(s,r[i],r[(i+1)%8],S4)
        a=ring(.97); line(s,a[i],a[(i+1)%8],S3)
    for y in range(26,81): s.px(48,y,S0)

def console(s):
    # research console left, chest height on Freakbot: books and a terminal the size of his head
    quad(s,[(0,94),(28,94),(31,87),(11,87)],S3)
    line(s,(28,94),(31,87),S4)
    quad(s,[(28,94),(31,87),(31,100),(28,110)],sh(S1,.74))
    line(s,(31,87),(31,100),sh(S0,.7))
    s.rect(0,94,28,16,S2); s.rect(0,94,28,1,S4); s.rect(0,95,28,1,S3); s.rect(0,109,28,1,S0); s.rect(27,94,1,16,S0)
    s.rect(3,98,9,9,S1); s.rect(3,98,9,1,S3)
    for y in range(100,107,2): s.rect(4,y,7,1,S0)
    s.rect(15,98,10,4,S1); s.rect(15,103,10,4,S1); s.rect(15,98,10,1,S3); s.rect(15,103,10,1,S3)
    s.px(17,100,MINT,lit=True); s.px(19,100,AMBER,lit=True); s.px(17,105,ROSE,lit=True)
    for i,(w,c,g) in enumerate([(9,'#3B3F7C','#F4C25E'),(8,'#7A2C55','#F4C25E'),(9,'#2F6A6A','#CFE4FF')]):
        s.rect(2+i%2,92-2*i,w,2,c); s.rect(2+i%2,92-2*i,1,2,g)
    s.rect(14,84,12,10,S3); s.rect(14,84,12,1,S4); s.rect(15,85,10,7,S0); s.rect(16,86,8,5,'#0A1A2A',lit=True)
    for y,w in ((87,6),(89,4)): s.rect(17,y,w,1,MINT,lit=True)
    s.px(22,89,AMBER,lit=True); s.rect(18,92,4,2,S2)

def sign(s,word='LIBROS'):
    for x in (10,20): s.rect(x,38,1,6,S0)
    s.rect(7,43,28,9,S0); s.rect(8,44,26,7,ROSE_DEEP,lit=True); s.rect(8,44,26,1,ROSE,lit=True)
    for i,ch in enumerate(word):
        for dy,row in enumerate(GLYPH[ch]):
            for dx,bit in enumerate(row):
                if bit=='1': s.px(10+i*4+dx,45+dy,ROSE_LIGHT,lit=True)

def sign_on_gallery(s,word):
    width=len(word)*4+3; x0=48-width//2
    for x in (x0+3,x0+width-4): s.rect(x,52,1,3,WOOD0)
    s.rect(x0-1,54,width+2,9,S0); s.rect(x0,55,width,7,ROSE_DEEP,lit=True); s.rect(x0,55,width,1,ROSE,lit=True)
    for i,ch in enumerate(word):
        for dy,row in enumerate(GLYPH[ch]):
            for dx,bit in enumerate(row):
                if bit=='1': s.px(x0+2+i*4+dx,56+dy,ROSE_LIGHT,lit=True)

def rack(s):
    # three-tier grow rack right, about twice Freakbot's height, with a side panel running back into the room
    quad(s,[(70,66),(66,69),(66,98),(70,110)],sh(S1,.7))
    line(s,(66,69),(66,98),sh(S0,.7))
    line(s,(66,69),(70,66),S4)
    s.rect(70,66,27,44,DARK); s.rect(70,66,27,1,S0); s.rect(70,67,27,1,ICE,lit=True); s.rect(70,66,1,44,S0)
    for y in (82,92,102):
        s.rect(72,y,24,2,S3); s.rect(72,y,24,1,S4)
    for y in (72,86,96): s.rect(73,y,22,1,ROSE,lit=True)
    s.rect(70,106,27,4,S2); s.rect(70,106,27,1,S4)
    for x in range(74,96,6): s.px(x,108,MINT,lit=True)

def glass(s):
    # window reflected as two pale diagonals across the rack's glass
    p=s.im.load()
    for y in range(68,106):
        for x in range(71,97):
            d=(x+y)%64
            if d in range(20,25) or d in range(30,32):
                r,g,b=p[x,y]; p[x,y]=(min(255,r+16),min(255,g+20),min(255,b+28))

def pot(s,cx,base,col=POT,small=False):
    w=7 if small else 11; h=3 if small else 5
    s.rect(cx-w//2,base-2,w,2,POT_RIM); s.rect(cx-w//2+1,base,w-2,h,col); s.rect(cx-w//2+1,base,1,h,POT_LIT)
    if not small: s.rect(cx-w//2+2,base+2,w-4,1,ICE,lit=True)
SPINES=['#C4402E','#2B6CA3','#E0A92E','#1C2028','#EFEEE8','#6C7078','#8A3A2E','#3A5F85']

WOOD0,WOOD1,WOOD2,WOOD3,PLASTER='#2A1E16','#3E2C1E','#5A4230','#7A5C42','#C9C2B0'
BRASS,GREEN_LAMP='#B08D4A','#2F6B4A'

def shelf(s,r,x0,x1,top,bottom,rows,shade=1.0):
    # a frontal bookcase: wooden uprights, books standing at uneven heights
    s.rect(x0,top,x1-x0,bottom-top,sh(WOOD0,shade))
    h=(bottom-top)/rows
    for k in range(rows):
        y0=int(top+k*h)+1; y1=int(top+(k+1)*h)
        x=x0+1
        while x<x1-1:
            w=r.randint(1,3); tall=r.randint(max(2,y1-y0-3),y1-y0)
            if r.random()<.1:
                x+=w; continue
            c=r.choice(SPINES)
            for xx in range(x,min(x+w,x1-1)):
                f=shade*(.78 if xx==x+w-1 and w>1 else 1)
                s.rect(xx,y1-tall,1,tall,sh(c,f))
            x+=w
        s.rect(x0,y1,x1-x0,1,sh(WOOD3,shade))
    for x in range(x0,x1,15): s.rect(x,top,1,bottom-top,sh(WOOD2,shade))

def side_shelves(s,r,x0,x1,near_is_x0):
    # bookcases along a side wall, shrinking toward the back
    rows=7
    for x in range(x0,x1):
        t_=(x-x0)/max(1,x1-x0-1) if near_is_x0 else 1-(x-x0)/max(1,x1-x0-1)
        top=-8+18*t_; bottom=150-64*t_; f=.5+.34*t_
        c=r.choice(SPINES)
        for k in range(rows):
            y0=top+(bottom-top)*k/rows; y1=top+(bottom-top)*(k+1)/rows
            if x%3==0: c=r.choice(SPINES)
            tall=int((y1-y0)*(.7+.25*((x*7+k*3)%4)/3))
            s.rect(x,int(y1)-tall,1,tall,sh(c,f))
            s.rect(x,int(y1),1,1,sh(WOOD3,f))

def rose_window(s):
    # a round port high on the back wall, the only sight of space from in here
    b=BANDS[s.t]; cx,cy,rad=48,23,12
    area=[(x,y) for y in range(cy-rad-1,cy+rad+2) for x in range(cx-rad-1,cx+rad+2) if math.hypot(x-cx,y-cy)<=rad]
    for x,y in area:
        s.im.putpixel((x,y),hx(b['space'][min(2,int((y-cy+rad)/(rad*2)*3))])); s.sky.add((x,y)); s.lit.discard((x,y))
    tones=b['planet']
    for x,y in area:
        if math.hypot(x-54,y-46)<26: s.im.putpixel((x,y),hx(tones[1]))
        if 25<=math.hypot(x-54,y-46)<26: s.im.putpixel((x,y),hx(b['limb']))
    st=random.Random(3)
    for _ in range(9):
        x,y=st.randint(cx-9,cx+9),st.randint(cy-9,cy+4)
        if (x,y) in s.sky: s.im.putpixel((x,y),hx('#FFFFFF'))
    for k in range(8):
        a=k*math.pi/4
        line(s,(cx,cy),(cx+rad*math.cos(a),cy+rad*math.sin(a)),WOOD1)
    for y in range(cy-rad-3,cy+rad+4):
        for x in range(cx-rad-3,cx+rad+4):
            d=math.hypot(x-cx,y-cy)
            if rad<d<=rad+2.4: s.px(x,y,BRASS if y<cy else sh(BRASS,.68))
    for k in range(12):
        a=k*math.pi/6; s.px(cx+(rad+1.2)*math.cos(a),cy+(rad+1.2)*math.sin(a),WOOD0)

def archive_room(s,r):
    s.rect(0,0,W,H,WOOD0)
    L,T,R,B=16,10,80,86
    # plaster vault with dark beams
    quad(s,[(0,0),(W,0),(R,T),(L,T)],PLASTER)
    for k in range(1,6):
        f=k/6; y=T*f; xl=L*f; xr=W-(W-R)*f
        s.rect(int(xl),int(y),int(xr-xl),1,WOOD1)
    for x in (0,24,48,72,96):
        line(s,(x,0),(L+(x/96)*(R-L),T),WOOD1)
    side_shelves(s,r,0,L,True)
    side_shelves(s,r,R,W,False)
    # plank floor running to the back wall
    quad(s,[(L,B),(R,B),(W+18,H),(-18,H)],WOOD2)
    for xb in range(-30,130,9):
        line(s,(48+(xb-48)*.42,B),(xb,H),WOOD1)
    for y,k in ((96,.8),(110,.9),(126,1.0)):
        s.rect(0,y,W,1,sh(WOOD1,k))
    # two storeys of books
    shelf(s,r,L,R,T,46,3,.82)
    shelf(s,r,L,R,52,B,3,.72)
    rose_window(s)
    # gallery running across the room
    s.rect(L,46,R-L,6,WOOD3); s.rect(L,46,R-L,1,'#957555'); s.rect(L,51,R-L,1,WOOD0)
    for x in range(L+2,R,7): s.px(x,49,BRASS)
    s.rect(L,38,R-L,1,'#957555')
    for x in range(L+1,R,3): s.rect(x,39,1,7,WOOD1)
    s.rect(L,86,R-L,2,WOOD0)

def archive_furniture(s):
    # long reading table with two green lamps
    for y in range(92,102):
        for x in range(22,76): darken(s,x,y,.62)
    quad(s,[(27,80),(69,80),(75,90),(21,90)],WOOD3)
    line(s,(21,90),(75,90),'#957555')
    s.rect(21,91,55,4,WOOD1); s.rect(21,94,55,1,WOOD0)
    s.rect(24,95,3,9,WOOD0); s.rect(69,95,3,9,WOOD0)
    for cx in (34,62):
        s.rect(cx-2,84,5,1,BRASS); s.rect(cx,79,1,5,BRASS)
        s.rect(cx-4,76,9,3,GREEN_LAMP); s.rect(cx-4,76,9,1,'#4E8E68')
        s.rect(cx-3,79,7,1,'#FFE7A0',lit=True)
    # open book and a stack
    s.rect(44,84,9,3,'#E9DCC0'); s.rect(48,84,1,3,'#B9A880'); s.rect(45,85,2,1,'#5A4A3A'); s.rect(50,85,2,1,'#5A4A3A')
    for i,(x,w,c) in enumerate(((54,6,'#2B6CA3'),(55,5,'#C4402E'))): s.rect(x,86-2*i,w,2,c)
    # card catalog against the left wall
    s.rect(0,62,21,46,WOOD2); s.rect(0,62,21,1,'#8A6C4C'); s.rect(20,62,1,46,WOOD0); s.rect(0,107,21,1,WOOD0)
    for y in range(65,105,6):
        for x in range(1,19,6):
            s.rect(x,y,5,5,'#7E6244'); s.rect(x,y,5,1,'#957555'); s.rect(x+1,y+1,3,1,'#EFEEE8'); s.px(x+2,y+3,BRASS)
    for y in range(108,114):
        for x in range(0,24-(y-108)): darken(s,x,y,.6)
    # library ladder leaning on the gallery
    line(s,(84,40),(70,118),WOOD1); line(s,(90,40),(76,118),WOOD1)
    line(s,(85,40),(71,118),WOOD3); line(s,(91,40),(77,118),WOOD3)
    for k in range(1,11):
        f=k/11; s.rect(int(85+f*-14),int(40+78*f),6,1,WOOD3)
    # worn rug under Freakbot
    quad(s,[(26,112),(70,112),(79,136),(17,136)],'#6E2230')
    quad(s,[(29,114),(67,114),(74,134),(22,134)],'#B08D4A')
    quad(s,[(30,115),(66,115),(73,133),(23,133)],'#2B4A73')
    quad(s,[(34,118),(62,118),(67,130),(29,130)],'#6E2230')
    for x in range(30,67,4): s.px(x,116,'#E0A92E')
    for x in range(25,72,4): s.px(x,132,'#E0A92E')

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
    img=form(bot_img(name),1)
    s.sprite(img,ox-6,oy-5)
    # face screen glows a bit
    for x,y,c in SP[name]:
        if c.upper() in ('#9FE1CB','#085041'): s.lit.add((ox+x,oy+y))

def hanging(s):
    s.rect(48,0,1,10,POT_RIM)
    for dx in range(-6,7): s.px(48+dx,10+abs(dx)//3,POT_RIM)
    s.rect(43,11,11,4,POT); s.rect(43,11,11,1,POT_LIT)
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
    # plants escaping the bay along the hull, thickest in the corners
    for _ in range(26):
        lo,hi,depth=r.choice([(0,16,16),(0,16,16),(80,96,12),(80,96,12)])
        leaf(s,r.randint(lo,hi),r.randint(0,depth),r)
    px=2
    for y in range(44):
        px+=r.choice([-1,0,0,1]) if y%3==0 else 0
        px=max(0,min(W-1,px)); s.px(px,y,LEAF1)
        if y%5==2: leaf(s,px,y,r)
    for x,y in ((6,136),(40,138),(62,137),(92,132),(70,110)):
        for k in range(r.randint(3,6)): s.px(x+k%2,y-k,LEAF2); s.px(x+1-k%2,y-k+1,LEAF1)

def pad(s):
    # Freakbot's charging pad
    cx,cy=48,124
    for y in range(108,140):
        for x in range(W):
            d=math.hypot((x-cx)/33,(y-cy)/12)
            if d<=1: s.px(x,y,'#3A3E46' if d>.82 else '#1C2028' if d>.62 else '#2B2F37')
    for a in range(0,360,18):
        s.px(cx+31*math.cos(math.radians(a)),cy+11*math.sin(math.radians(a)),MINT,lit=True)

def build(time, face='fbo', with_bot=True, room='bay'):
    s=S(time); s.room=room; s.lights=[]; s.floor={}; r=random.Random(21)
    if room=='archive':
        archive_room(s,r); archive_furniture(s); sign_on_gallery(s,'ARCHIVO')
    else:
        hull(s); viewport(s)
        # remember the bare deck, for reflections
        mask=Image.new('1',(W,H),0); d=ImageDraw.Draw(mask)
        for i in (3,4,5): d.polygon([P(i,0,0),P(i,1,0),P(i,1,1),P(i,0,1)],fill=1)
        m=mask.load(); s.floor={(x,y):s.im.getpixel((x,y)) for y in range(H) for x in range(W) if m[x,y] and (x,y) not in s.sky and (x,y) not in s.lit}
        grime(s); floor_shadows(s); console(s); sign(s); rack(s); pad(s); glass(s)
    bot_shadow(s)
    overgrowth(s,r)
    if with_bot: bot(s,'fbn' if time=='night' else face,44,102)
    return grade(s)

def grade_sprite(im,t):
    # same band light as grade() at Freakbot's spot on the deck; the face screen stays lit
    out=form(im,1); p=out.load(); b=BANDS[t]; mul=[m*light_at(48,114,b) for m in b['mul']]
    for y in range(out.height):
        for x in range(out.width):
            r,g,bl,a=p[x,y]
            if a and (r,g,bl) not in (hx('#9FE1CB'),hx('#085041')):
                p[x,y]=tuple(max(0,min(255,int(v*m+d))) for v,m,d in zip((r,g,bl),mul,ADD))+(a,)
    return out

def grade(s):
    p=s.im.load(); t=s.t; b=BANDS[t]; mul=b['mul']; raw=s.im.copy().load(); bloom=b['bloom']
    free=lambda x,y: (x,y) not in s.sky and (x,y) not in s.lit
    for y in range(H):
        for x in range(W):
            if free(x,y): p[x,y]=tuple(max(0,min(255,int(v*m))) for v,m in zip(p[x,y],mul))
    # the polished deck mirrors the viewport and the lights
    for (x,y),c in s.floor.items():
        if raw[x,y]!=c or y<82: continue
        sy=int(80-(y-82)*.55)
        if sy<26 or free(x,sy): continue
        k=dq(.22*(1-(y-82)/62),x,y,12)
        if k>0: p[x,y]=tuple(int(v+(c2-v)*k) for v,c2 in zip(p[x,y],raw[x,sy]))
    # light falls off away from the window and picks up its color near it
    for y in range(H):
        for x in range(W):
            if not free(x,y): continue
            L=dq(light_at(x,y,b),x,y,32); w=(light_at(x,y,b)-.74)/max(.01,b['window'])
            p[x,y]=tuple(max(0,min(255,int((v*L)+(c-v*L)*.09*w))) for v,c in zip(p[x,y],bloom))
    def glow(gx,gy,rad,col,st):
        for y in range(int(gy-rad),int(gy+rad+1)):
            for x in range(int(gx-rad),int(gx+rad+1)):
                if 0<=x<W and 0<=y<H and free(x,y):
                    d=math.hypot(x-gx,(y-gy)*1.1)/rad
                    if d<1:
                        k=dq(min(1,st*(1-d)**1.4),x,y,20)
                        if k>0: p[x,y]=tuple(int(v+(c-v)*k) for v,c in zip(p[x,y],col))
    strip=hx(b['strip'])
    for lx,ly in s.lights: glow(lx,ly,8,strip,.16)
    if s.room=='archive':
        lamp=.62 if t in ('golden','night') else .4
        glow(34,86,24,(255,206,120),lamp); glow(62,86,24,(255,206,120),lamp)
        glow(48,59,16,(224,96,74),b['sign']*.26)
        return s.im
    glow(21,47,22,(224,96,74),b['sign']*.26)
    glow(20,89,10,(224,169,46),.3)
    glow(83,88,18,(224,96,74),.1)
    # haze just around the window
    for y in range(H):
        for x in range(W):
            if not free(x,y): continue
            d=math.hypot((x-48)/27,(y-53)/31)
            if 1<=d<1.5:
                k=dq(b['window']*.16*(1-(d-1)/.5),x,y,20)
                if k>0: p[x,y]=tuple(min(255,int(v+(c-v)*k)) for v,c in zip(p[x,y],bloom))
    return s.im

BAND_NAMES=('morning','day','golden','night')
for t in BAND_NAMES:
    build(t,with_bot=False).save(f'f_{t}_bg.png')
    build(t,with_bot=False,room='archive').save(f'f_{t}_archive_bg.png')
for n in ('fbo','fbb','fbw','fbn'):
    im=bot_img(n); im.save(f'fr_{n}.png')
can=Image.new('RGBA',(9,6),(0,0,0,0))
for x,y,c in [(0,2,'#B08D4A'),(1,2,'#B08D4A'),(2,2,'#B08D4A'),(3,2,'#B08D4A'),(4,2,'#B08D4A'),(0,3,'#B08D4A'),(1,3,'#D4B06A'),(2,3,'#B08D4A'),(3,3,'#B08D4A'),(4,3,'#8A6A2E'),(0,4,'#B08D4A'),(1,4,'#B08D4A'),(2,4,'#B08D4A'),(3,4,'#B08D4A'),(4,4,'#8A6A2E'),(0,5,'#8A6A2E'),(1,5,'#8A6A2E'),(2,5,'#8A6A2E'),(3,5,'#8A6A2E'),(5,2,'#B08D4A'),(6,1,'#B08D4A'),(7,0,'#B08D4A'),(8,0,'#D4B06A'),(1,1,'#8A6A2E'),(2,0,'#8A6A2E'),(3,1,'#8A6A2E')]:
    can.putpixel((x,y),hx(c)+(255,))
can.save('fr_can.png')
# app layers, graded per band
for t,names in (('morning',('fbo','fbb','fbw')),('day',('fbo','fbb','fbw')),('golden',('fbo','fbb','fbw')),('night',('fbn','fbo','fbw'))):
    for n in names: grade_sprite(bot_img(n),t).save(f'fr_{t}_{n}.png')
    if t!='night': grade_sprite(can,t).save(f'fr_{t}_can.png')
# plant sheets: one row per species, 5 stages x normal/thirsty/wilted, then a row of pots
CELL_W,CELL_H=26,34
def pot_cell(kind):
    im=Image.new('RGBA',(CELL_W,CELL_H),(0,0,0,0)); p=im.load()
    def rect(x,y,w,h,c):
        for yy in range(y,y+h):
            for xx in range(x,x+w):
                if 0<=xx<CELL_W and 0<=yy<CELL_H: p[xx,yy]=(hx(c) if isinstance(c,str) else c[:3])+(255,)
    cx,base=13,28
    if kind=='hanging':
        rect(cx,0,1,base-3,POT_RIM)
        for dx in range(-5,6): rect(cx+dx,base-3+abs(dx)//3,1,1,POT_RIM)
    w,h=(7,3) if kind=='small' else (11,5)
    rect(cx-w//2,base-2,w,2,POT_RIM); rect(cx-w//2+1,base,w-2,h,POT); rect(cx-w//2+1,base,1,h,POT_LIT)
    if kind!='small': rect(cx-w//2+2,base+2,w-4,1,ICE)
    return im

def plant_cell(name,stage,state):
    plant=PL.P(1); dict(PL.SPECIES)[name](plant,stage); im=plant.im
    if state==1: im=PL.thirst(im)
    elif state==2: im=PL.wilt(im)
    return im

for t in BAND_NAMES:
    b=BANDS[t]; level=light_at(48,110,b); mul=[m*level for m in b['mul']]
    sheet=Image.new('RGBA',(CELL_W*15,CELL_H*9),(0,0,0,0))
    def add(im,col,row,shade=True):
        c=form(im,1) if shade else im.copy(); px=c.load()
        for y in range(CELL_H):
            for x in range(CELL_W):
                r,g,bl,a=px[x,y]
                if a: px[x,y]=tuple(max(0,min(255,int(v*m))) for v,m in zip((r,g,bl),mul))+(a,)
        sheet.paste(c,(col*CELL_W,row*CELL_H),c)
    for row,(name,_) in enumerate(PL.SPECIES):
        for state in range(3):
            for stage in range(5):
                add(plant_cell(name,stage,state),stage+state*5,row)
    for col,kind in enumerate(('small','large','hanging')):
        add(pot_cell(kind),col,8,shade=False)
    sheet.save(f'f_{t}_plants.png')
# interface materials, tiled at 4x so the UI shares the scene's pixel grid
UI_MUL={'morning':(1.0,.98,.92),'day':(1.0,1.0,1.0),'golden':(1.0,.92,.82),'night':(.3,.33,.46)}
def ui_tile(band,size,base,plate):
    mul=UI_MUL[band]; r=random.Random(9); im=Image.new('RGB',(size,size)); p=im.load(); cells={}
    for y in range(size):
        for x in range(size):
            key=(x//16,y//16)
            if key not in cells: cells[key]=1+r.uniform(-.018,.018) if plate else 1
            f=cells[key]+(BAYER[y%4][x%4]/15-.5)*(.05 if plate else .03)
            p[x,y]=sh(base,f)
    if plate:
        for y in (0,48):
            for x in range(size): p[x,y]=sh(S0,1.0); p[x,(y+1)%size]=sh(S4,1.0)
        for x in (0,48):
            for y in range(size):
                if 18<=y%48<=46: p[x,y]=sh(base,.86)
        for x,y in ((4,22),(44,22),(52,22),(92,22),(4,70),(44,70),(52,70),(92,70)):
            p[x,y]=sh(S0,1.0); p[x+1,y]=sh(S4,1.0)
        for _ in range(26):
            x,y=r.randrange(size),r.randrange(size)
            for k in range(r.randint(2,9)):
                if k%2==0 or r.random()<.5:
                    yy=(y+k)%size; p[x,yy]=tuple(int(v*.93) for v in p[x,yy])
    for y in range(size):
        for x in range(size):
            p[x,y]=tuple(max(0,min(255,int(v*m))) for v,m in zip(p[x,y],mul))
    return im
for t in BAND_NAMES:
    ui_tile(t,96,'#D9DAD4',True).save(f'ui_{t}_plate.png')
    ui_tile(t,64,'#EFEEE8',False).save(f'ui_{t}_panel.png')
ims=[build(t,with_bot=False).resize((W*4,H*4),Image.NEAREST) for t in BAND_NAMES]+[build('day',with_bot=False,room='archive').resize((W*4,H*4),Image.NEAREST)]
out=Image.new('RGB',(sum(i.width for i in ims)+40,ims[0].height),(255,255,255)); x=0
for i in ims: out.paste(i,(x,0)); x+=i.width+10
out.save('f_all.png'); print('ok')
