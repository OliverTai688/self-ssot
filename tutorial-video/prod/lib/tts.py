"""依 shots.json 逐鏡頭合成旁白，寫出 <id>.wav 與 durations.json。用法：python lib/tts.py ch02 [sid]"""
import sys, json, os, sherpa_onnx as so, soundfile as sf
ch=sys.argv[1]; sid=int(sys.argv[2]) if len(sys.argv)>2 else 3
k=os.environ.get('KOKORO_DIR','/home/claude/tts/kokoro-multi-lang-v1_1')
tts=so.OfflineTts(so.OfflineTtsConfig(model=so.OfflineTtsModelConfig(kokoro=so.OfflineTtsKokoroModelConfig(model=f'{k}/model.onnx',voices=f'{k}/voices.bin',tokens=f'{k}/tokens.txt',data_dir=f'{k}/espeak-ng-data',dict_dir=f'{k}/dict',lexicon=f'{k}/lexicon-us-en.txt,{k}/lexicon-zh.txt'),num_threads=2),max_num_sentences=1))
spec=json.load(open(f'{ch}/shots.json',encoding='utf8')); os.makedirs(f'{ch}/audio',exist_ok=True); d={}
for s in spec['shots']:
    if not s.get('say'): d[s['id']]=0; continue
    text=s.get('tts') or s['say'].replace('「','').replace('」','')
    a=tts.generate(text,sid=sid,speed=1.0); sf.write(f"{ch}/audio/{s['id']}.wav",a.samples,a.sample_rate); d[s['id']]=round(len(a.samples)/a.sample_rate,2)
json.dump(d,open(f'{ch}/durations.json','w'),indent=1); print(d)
