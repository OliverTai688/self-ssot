import json,sys
c=sys.argv[1];m=json.load(open(c+'/marks.json'));d=json.load(open(c+'/durations.json'))
for k,v in m['marks'].items():
    if isinstance(v,dict):print(k,'shot',round(v['end']-v['start'],2),'narr',d[k],'  ',{a:b for a,b in v.items() if a not in('start','end')})
print('errs',m['errs'],'done',m['marks']['done'])
