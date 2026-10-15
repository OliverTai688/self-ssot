"""總覽：從各章已切好的錄影（chNN/comp/footage.mp4）剪片段，接成 ch00/precut.mp4，並產生對應的 marks/boxes。"""
import json,subprocess,os
spec=json.load(open('ch00/shots.json'));dur=json.load(open('ch00/durations.json'))
def M(ch): return json.load(open(ch+'/marks.json'))['marks']
def first(ch):
    sp=json.load(open(ch+'/shots.json'));return [s for s in sp['shots'] if s.get('kind') not in('title','recap')][0]['id']
def ev(ch,e):
    m=M(ch);t=0
    for tok in e.replace('-','+-').split('+'):
        tok=tok.strip()
        if not tok: continue
        neg=tok.startswith('-');tok=tok.lstrip('-')
        v=float(tok) if tok.replace('.','').isdigit() else m[tok.split('.')[0]][tok.split('.')[1]]
        t+=-v if neg else v
    return t-m[first(ch)]['start']
marks={};boxes={};clips=[];t=0.0;n=0
for s in spec['shots']:
    if s.get('kind')=='title': continue
    need=dur[s['id']]+0.9;marks[s['id']]={'start':round(t,2)}
    parts=s.get('parts')
    if not parts:  # 圖解卡：用黑畫面墊著
        f=f'ch00/seg{n}.mp4';subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i',f'color=c=0x0a0c0f:s=1920x1080:r=30:d={need}','-c:v','libx264','-crf','14','-pix_fmt','yuv420p','-g','15',f],check=True);clips.append(f);n+=1;t+=need
    else:
        for i,pt in enumerate(parts):
            d=need*pt.get('frac',1.0);src=pt['ch']+'/comp/footage.mp4';ss=max(0,ev(pt['ch'],pt['at']))
            if i: marks[s['id']]['part%d'%i]=round(t-marks[s['id']]['start'],2)
            f=f'ch00/seg{n}.mp4';subprocess.run(['ffmpeg','-v','error','-y','-ss',f'{ss:.2f}','-t',f'{d:.3f}','-i',src,'-an','-c:v','libx264','-crf','14','-pix_fmt','yuv420p','-r','30','-g','15',f],check=True);clips.append(f);n+=1;t+=d
            for k,v in json.load(open(pt['ch']+'/boxes.json')).items(): boxes[pt['ch']+'.'+k]=v
    marks[s['id']]['end']=round(t,2)
marks['done']=round(t,2)
open('ch00/list.txt','w').write(''.join(f"file '{os.path.basename(c)}'\n" for c in clips))
subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i','ch00/list.txt','-c','copy','ch00/precut.mp4'],check=True)
json.dump({'video':'precut.mp4','marks':marks,'errs':[]},open('ch00/marks.json','w'),indent=1);json.dump(boxes,open('ch00/boxes.json','w'))
print(marks)
