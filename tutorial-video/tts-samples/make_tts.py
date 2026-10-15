"""中文語音合成（離線，sherpa-onnx）。2026-10-03 在雲端工作區實測可跑。
安裝：pip install sherpa-onnx soundfile
模型：https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_1.tar.bz2
     https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-melo-tts-zh_en.tar.bz2
用法：python make_tts.py "要念的文字" out.wav [kokoro|melo] [sid]
"""
import sys, sherpa_onnx as so, soundfile as sf
text, out = sys.argv[1], sys.argv[2]
engine = sys.argv[3] if len(sys.argv) > 3 else "kokoro"
sid = int(sys.argv[4]) if len(sys.argv) > 4 else 3   # kokoro：3、50 女聲，60 男聲
if engine == "kokoro":
    k = "kokoro-multi-lang-v1_1"
    m = so.OfflineTtsModelConfig(kokoro=so.OfflineTtsKokoroModelConfig(
        model=f"{k}/model.onnx", voices=f"{k}/voices.bin", tokens=f"{k}/tokens.txt",
        data_dir=f"{k}/espeak-ng-data", dict_dir=f"{k}/dict",
        lexicon=f"{k}/lexicon-us-en.txt,{k}/lexicon-zh.txt"), num_threads=2)
else:
    k = "vits-melo-tts-zh_en"; sid = 0
    m = so.OfflineTtsModelConfig(vits=so.OfflineTtsVitsModelConfig(
        model=f"{k}/model.onnx", lexicon=f"{k}/lexicon.txt", tokens=f"{k}/tokens.txt", dict_dir=f"{k}/dict"), num_threads=2)
tts = so.OfflineTts(so.OfflineTtsConfig(model=m, max_num_sentences=1))
a = tts.generate(text, sid=sid, speed=1.0)
sf.write(out, a.samples, a.sample_rate)
