import numpy as np, wave
sr=44100; D=30.0; N=int(sr*D); T=np.arange(N)/sr
dry=np.zeros((N,2)); wet=np.zeros((N,2))
rng=np.random.default_rng(1)
hz=lambda m:440*2**((m-69)/12)
def add(buf,sig,start,g=1.0,pan=0.0):
    i=int(start*sr); n=min(len(sig),N-i)
    if n<=0 or i<0: return
    l=np.cos((pan+1)*np.pi/4)*1.414; r=np.sin((pan+1)*np.pi/4)*1.414
    buf[i:i+n,0]+=sig[:n]*g*l; buf[i:i+n,1]+=sig[:n]*g*r
def tt(d): return np.arange(int(d*sr))/sr
def lp(x,k):  # moving-average lowpass
    return np.convolve(x,np.ones(k)/k,'same')
beat=0.5
CH=[[57,60,64,67],[53,57,60,64],[48,55,59,64],[55,59,62,67]]
ROOT=[33,29,36,31]
def kick(g):
    t=tt(.45); f=48+130*np.exp(-t/.035); s=np.sin(2*np.pi*np.cumsum(f)/sr)*np.exp(-t/.2)
    s[:200]+=rng.standard_normal(200)*.3*np.linspace(1,0,200); return s*g
def hat(d=.04):
    t=tt(.12); n=np.diff(rng.standard_normal(len(t)+1)); return n*np.exp(-t/d)*.5
def clap():
    t=tt(.3); n=lp(np.diff(rng.standard_normal(len(t)+1)),3); e=np.exp(-t/.11)
    for o in (.0,.012,.024): e+=np.where((t>=o)&(t<o+.01),1,0)*.5
    return n*e*.6
def pad(notes,d,bright=0.3):
    t=tt(d); s=np.zeros(len(t))
    for m in notes:
        for det in (-.08,0,.08):
            f=hz(m+12)*2**(det/12)
            s+=np.sin(2*np.pi*f*t+rng.random()*6)+bright*np.sin(4*np.pi*f*t)+bright*.4*np.sin(6*np.pi*f*t)
    a=np.minimum(1,t/.4)*np.minimum(1,(d-t)/.4); return s*a/ (len(notes)*3)
def pluck(m,d=.3):
    t=tt(d); f=hz(m); return (np.sin(2*np.pi*f*t)+.4*np.sin(4*np.pi*f*t)+.15*np.sin(6*np.pi*f*t))*np.exp(-t/.11)
def bassn(m,d):
    t=tt(d); f=hz(m); s=np.sin(2*np.pi*f*t)+.35*np.sin(4*np.pi*f*t)+.12*np.sin(6*np.pi*f*t)
    return s*np.minimum(1,t/.005)*np.exp(-t/.25)*np.minimum(1,(d-t)/.01)
def bell(m,d=2.5):
    t=tt(d); f=hz(m); return (np.sin(2*np.pi*f*t)+.5*np.sin(2*np.pi*f*2.76*t)*np.exp(-t/.3))*np.exp(-t/.8)
def riser(d):
    t=tt(d); n=lp(rng.standard_normal(len(t)),4); env=(t/d)**2.2
    sw=np.sin(2*np.pi*np.cumsum(200+1400*(t/d)**2)/sr)*.3
    return (n*.6+sw)*env
def impact():
    t=tt(2.0); s=np.sin(2*np.pi*np.cumsum(35+90*np.exp(-t/.06))/sr)*np.exp(-t/.6)
    return s+lp(rng.standard_normal(len(t)),6)*np.exp(-t/.35)*.5

# intro shimmer + pads
add(wet,bell(88),0.3,.25,.2); add(wet,bell(95),0.5,.15,-.3); add(wet,bell(100),1.3,.12,.4)
for b in range(15):
    st=b*2.0; g=.28 if st<5 else (.34 if st<20 else .42)
    br=.2 if st<12 else .4
    add(wet,pad(CH[b%4],2.3,br),st,g,0)
add(dry,riser(1.8),3.2,.35); add(dry,riser(2.0),24.0,.4)
add(wet,impact(),5.0,.5); add(wet,impact(),26.0,.6)
duck=np.ones(N)
def K(s,g=1.0):
    add(dry,kick(g),s,.9); i=int(s*sr); n=min(int(.25*sr),N-i)
    duck[i:i+n]=np.minimum(duck[i:i+n],1-.55*np.exp(-np.arange(n)/sr/.09))
for i in range(60):
    s=i*beat
    if 5<=s<12 and i%2==0: K(s,.7)
    if 12<=s<24: K(s)
    if 24<=s<26: K(s); K(s+.25,.8)
    if 26<=s<29: K(s)
    if 12<=s<26 and i%2==1: add(wet,clap(),s,.35,.1)
    if 26<=s<29 and i%2==1: add(wet,clap(),s,.35,.1)
for i in range(240):
    s=i*.125
    if 5<=s<29.5:
        if (s%.25)>.1: add(dry,hat(.04),s,.16,.35)
        elif s>=12: add(dry,hat(.02),s,.07,-.3)
# bass (8ths)
bass=np.zeros((N,2))
for i in range(int(5/0.25),int(29/0.25)):
    s=i*.25; m=ROOT[int(s//2)%4]+12
    add(bass,bassn(m,.24),s,.45)
# arp
ARP=[0,1,2,3,2,1,3,2]
for i in range(int(12/.125),int(29/.125)):
    s=i*.125; ch=CH[int(s//2)%4]; m=ch[ARP[i%8]]+12+(12 if (s>=20 and i%16>=8) else 0)
    add(wet,pluck(m),s,.13,.5*np.sin(i*.7))
# tap + success chime
t=tt(.08); add(dry,np.sin(2*np.pi*np.cumsum(1100-500*t/.08)/sr)*np.exp(-t/.02),28.05,.5)
add(wet,bell(84,1.5),28.22,.3,-.2); add(wet,bell(91,2.0),28.34,.3,.2)
# final chord
add(wet,pad([48,55,59,64,67],3.0,.25),27.0,.4)
# reverb
L=int(1.8*sr); tr=np.arange(L)/sr
def conv(x,ir):
    n=1<<int(np.ceil(np.log2(len(x)+len(ir))))
    return np.fft.irfft(np.fft.rfft(x,n)*np.fft.rfft(ir,n),n)[:len(x)]
rv=np.zeros_like(wet)
for c in range(2):
    ir=rng.standard_normal(L)*np.exp(-tr/.55); ir=lp(ir,3); ir/=np.sqrt((ir**2).sum())
    rv[:,c]=conv(wet[:,c],ir)
mix=dry+(wet*.75+rv*.6+bass)*duck[:,None]
fade=np.ones(N); f0=int(29.0*sr); fade[f0:]=np.linspace(1,0,N-f0)**1.5
fi=int(.05*sr); fade[:fi]*=np.linspace(0,1,fi)
mix*=fade[:,None]
mix=np.tanh(mix/np.max(np.abs(mix))*1.6)/np.tanh(1.6)*.89
w=wave.open('music.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
w.writeframes((mix*32767).astype(np.int16).tobytes()); w.close(); print('ok')
