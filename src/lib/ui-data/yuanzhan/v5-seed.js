// Generated from the owner-provided v5 reference. Synthetic UI fixtures only.
export function referenceSeed(){
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const rnd = mulberry(20260912);
const dstr = d => d.toISOString().slice(0,10);
const dadd = (s,n)=>{const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return dstr(d)};
const ddiff=(a,b)=>Math.round((new Date(b+'T00:00:00Z')-new Date(a+'T00:00:00Z'))/864e5);


const TODAY='2026-09-12';
const DB={
  today:TODAY, seq:{},
  people:{ yz:{n:'戴宇星',s:'宇',role:'owner',cls:'av-yz'}, lily:{n:'Lily',s:'L',role:'member',cls:'av-lily'} },
  me:'yz',
  goals:[
    {id:'G1',t:'AI-SSOT 系列可對外交付',period:'2026 Q3–Q4',pct:62},
    {id:'G2',t:'建立可重複的交付方法資產',period:'2026 Q4',pct:18,warn:'連續 3 週未投入'},
    {id:'G3',t:'Q4 新增付費客戶 3 家',period:'2026 Q4',pct:33}
  ],
  projects:[
    {id:'PRJ-2026-004',t:'柏翰 · Google Workspace 導入',client:'印刷業柏翰',goal:'G3',type:'行銷服務型',
     owner:'lily',status:'驗收中',rate:20,cap:25,budget:90000,repo:'v0.9',start:'2026-08-04',
     delivery:['全公司 28 帳號導入完成','2 小時教育訓練','導入後 30 日成效報告']},
    {id:'PRJ-2026-007',t:'AI landoffice SSOT',client:'地政士事務所',goal:'G1',type:'產品交付型',
     owner:'yz',status:'進行中',rate:8,cap:15,budget:60000,repo:'—',start:'2026-07-15',
     delivery:['介面 refactor','tenant test 通過','可發布']},
    {id:'PRJ-2026-009',t:'AI BA SSOT',client:'內部產品',goal:'G1',type:'產品交付型',
     owner:'yz',status:'進行中',rate:0,cap:0,budget:30000,repo:'—',start:'2026-06-02',delivery:[]},
    {id:'PRJ-2026-011',t:'會計 SSOT',client:'洽談中',goal:'G3',type:'未確認',
     owner:'yz',status:'商機',rate:0,cap:0,budget:0,repo:'—',start:'—',delivery:[]}
  ],
  issues:[
    {id:'LAND-012',t:'develop interface and tenant test',p:'PRJ-2026-007',owner:'yz',size:'M',st:'Doing',created:'2026-09-10',started:'2026-09-12',done:'',blocker:'tenant 測試資料未備齊',exp:'tenant 切換在 3 個租戶下皆正確',ev:2,pri:1,due:'2026-09-18',
     rel:[{ty:'wait',id:'BA-032',t:'品質會員模組'},{ty:'doc',id:'D2',t:'Company Handbook 03.3'}],
     cf:{'交付形式':'PR + 測試','客戶可見':'是'},sub:['建三個租戶測資','寫 RLS policy','跑隔離測試']},
    {id:'BA-031',t:'邀請函模組',p:'PRJ-2026-009',owner:'yz',size:'M',st:'Doing',created:'2026-08-28',started:'2026-09-01',done:'',blocker:'',exp:'可寄出並追蹤開啟率',ev:0,pri:2,due:'2026-09-05',
     rel:[{ty:'block',id:'BA-032',t:'品質會員模組'}],cf:{'交付形式':'模組'},sub:['寄送流程','開啟率追蹤']},
    {id:'OCE-004',t:'10 月發表計劃簡報海報整理',p:'PRJ-2026-009',owner:'yz',size:'S',st:'Review',created:'2026-09-07',started:'2026-09-09',done:'',blocker:'',exp:'簡報 + 海報各一版',ev:1,due:'2026-09-20',pri:3,rel:[],cf:{},sub:[]},
    {id:'GWS-018',t:'成效報告初稿',p:'PRJ-2026-004',owner:'lily',size:'M',st:'Done',created:'2026-08-30',started:'2026-09-02',done:'2026-09-05',blocker:'',exp:'導入前後數據對比',ev:3,pri:3,rel:[],cf:{},sub:[]},
    {id:'GWS-017',t:'教育訓練簡報',p:'PRJ-2026-004',owner:'lily',size:'S',st:'Done',created:'2026-08-29',started:'2026-09-01',done:'2026-09-02',blocker:'',exp:'2 小時訓練教材',ev:1,pri:3,rel:[],cf:{},sub:[]},
    {id:'GWS-016',t:'訪談逐字稿整理',p:'PRJ-2026-004',owner:'lily',size:'S',st:'Done',created:'2026-09-01',started:'2026-09-03',done:'2026-09-04',blocker:'',exp:'5 場訪談重點',ev:1,pri:3,rel:[],cf:{},sub:[]},
    {id:'BNI-009',t:'BNI 一對一輸入 5 筆',p:'PRJ-2026-011',owner:'yz',size:'S',st:'Done',created:'2026-09-06',started:'2026-09-08',done:'2026-09-09',blocker:'',exp:'CRM 建檔',ev:1,pri:3,rel:[],cf:{},sub:[]},
    {id:'BA-032',t:'品質會員模組',p:'PRJ-2026-009',owner:'yz',size:'L',st:'Todo',created:'2026-09-05',started:'',done:'',blocker:'',exp:'分級與權益邏輯',ev:0,due:'2026-10-10',pri:4,rel:[],cf:{},sub:[]},
    {id:'NUV-003',t:'nuva 網站文字',p:'PRJ-2026-009',owner:'yz',size:'S',st:'Todo',created:'2026-09-08',started:'',done:'',blocker:'',exp:'首頁 5 段文案',ev:0,pri:4,rel:[],cf:{},sub:[]}
  ],
  history:[],  // 由 genHistory() 產生的已完成樣本（供 P50/P85 與預測使用）
  events:[
    {id:'E1',d:'2026-09-16',t:'會計 SSOT 會面',layer:'專案',star:true,derived:'',link:'PRJ-2026-011',remind:'前 1 日',note:'第一次正式洽談'},
    {id:'E2',d:'2026-09-18',t:'月營運會議',layer:'日常',star:false,derived:'',link:'',remind:'前 1 日',note:'確認下月 WIP 上限與里程碑項目'},
    {id:'E3',d:'2026-09-28',t:'柏翰案驗收到期',layer:'專案',star:true,derived:'契約 §13.2',link:'PRJ-2026-004',remind:'前 7/3/1 日',note:'逾期未提出書面異議視為驗收通過，自動解鎖獎金閘門③'},
    {id:'E4',d:'2026-10-01',t:'發薪日',layer:'行政',star:true,derived:'契約 §7.2',link:'',remind:'前 3 日',note:''},
    {id:'E5',d:'2026-10-01',t:'Lily 到職',layer:'行政',star:true,derived:'契約 §1.2',link:'',remind:'前 7 日',note:'Onboarding Stage 1 起算'},
    {id:'E6',d:'2026-10-15',t:'勞健保繳費',layer:'行政',star:false,derived:'法定',link:'',remind:'前 3 日',note:''},
    {id:'E7',d:'2026-10-20',t:'公司學習日',layer:'日常',star:false,derived:'',link:'',remind:'前 1 日',note:'半天'},
    {id:'E8',d:'2026-10-30',t:'30 日階段對話',layer:'行政',star:true,derived:'契約 §22.3',link:'',remind:'前 3 日',note:'須留下書面紀錄'}
  ],
  txns:[
    {id:'T1',d:'2026-09-02',t:'雲端主機 Supabase',p:'PRJ-2026-007',cat:'工具',amt:-4200,pass:false,v:['發票'],note:'月費'},
    {id:'T2',d:'2026-09-05',t:'外包 UI 設計',p:'PRJ-2026-004',cat:'外包',amt:-28000,pass:false,v:['發票','合約','匯款單'],note:'統編 24xxxxxx'},
    {id:'T3',d:'2026-09-08',t:'柏翰 服務收入',p:'PRJ-2026-004',cat:'收入',amt:120000,pass:false,v:['發票'],note:'未稅'},
    {id:'T4',d:'2026-09-08',t:'Meta 廣告',p:'PRJ-2026-004',cat:'媒體',amt:-60000,pass:true,v:['發票'],note:'代收代付，不計入可分配毛利'},
    {id:'T5',d:'2026-09-09',t:'cowork 咖啡',p:'公司層級',cat:'場地',amt:-260,pass:false,v:[],note:'待補憑證'},
    {id:'T6',d:'2026-09-11',t:'金流手續費',p:'PRJ-2026-004',cat:'金流',amt:-1800,pass:false,v:['對帳單'],note:''},
    {id:'T7',d:'2026-09-11',t:'素材授權費',p:'PRJ-2026-004',cat:'素材',amt:-22200,pass:false,v:['發票'],note:''},
    {id:'T8',d:'2026-09-12',t:'Claude / OpenAI 用量',p:'公司層級',cat:'工具',amt:-6800,pass:false,v:['發票'],note:''},
    {id:'T9',d:'2026-08-20',t:'AI landoffice 首期款',p:'PRJ-2026-007',cat:'收入',amt:180000,pass:false,v:['發票'],note:''},
    {id:'T10',d:'2026-08-22',t:'外包後端',p:'PRJ-2026-007',cat:'外包',amt:-32000,pass:false,v:['發票'],note:''},
    {id:'T11',d:'2026-08-25',t:'第三方工具',p:'PRJ-2026-007',cat:'工具',amt:-4200,pass:false,v:['發票'],note:''},
    {id:'T12',d:'2026-08-28',t:'金流手續費',p:'PRJ-2026-007',cat:'金流',amt:-1800,pass:false,v:['對帳單'],note:''}
  ],
  cash:[['4月',412],['5月',438],['6月',401],['7月',455],['8月',492],['9月',468]], // 千元
  reimb:[
    {id:'R1',who:'lily',t:'cowork 場地費 ×4',amt:1840,st:'待送',d:'2026-09-09'},
    {id:'R2',who:'lily',t:'訪談交通費',amt:640,st:'已核',d:'2026-09-03'},
    {id:'R3',who:'yz',t:'BNI 月費',amt:3200,st:'已付',d:'2026-08-28'}
  ],
  capacity:{ yz:[['Client Delivery',30,null],['Product',30,null],['Research',20,null],['Management',10,null],['Buffer',10,null]],
             lily:[['Client Delivery',60,70],['Marketing 方法資產',20,20],['Internal 試驗',10,10],['Buffer',10,null]] },
  weekly:[['W29',4],['W30',6],['W31',5],['W32',3],['W33',6],['W34',5],['W35',4],['W36',6],['W37',5]],
  docs:[
    {id:'D1',dir:'內部',t:'Lily 部分工時勞動契約 v1',clauses:[
      {id:'C1',ref:'§22.3（一）',text:'甲方應提供每月一次 1:1 檢核，並於本契約生效後之第三十日、第六十日、第九十日進行階段對話。'},
      {id:'C2',ref:'§4.1',text:'乙方為部分工時人員，雙方約定每月正常工作時間為 130 小時（以每週約 30 小時為設計基準）。'},
      {id:'C3',ref:'§4.3（二）',text:'每週現場 cowork 二（2）次，日期及時段由雙方於前一週共同排定。'},
      {id:'C4',ref:'§16.1',text:'乙方因執行工作所需之公司核准軟體、AI 工具、素材、廣告、雲端服務，由甲方提供或依甲方核准程序報支。'},
      {id:'C5',ref:'§9.6',text:'甲方於每次獎金結算時，應向乙方提供該專案之收入與成本明細。'},
      {id:'C6',ref:'§22.2',text:'甲方同意提供：清楚的工作、真實的產品、資源與預算、學習與作品、回饋與透明、可持續的容量、隱私與尊重。'}]},
    {id:'D2',dir:'內部',t:'Company Handbook v0.1',clauses:[
      {id:'H1',ref:'01.3',text:'每一個 Issue 應存在一名 Owner。Owner 是確保這個 Issue 繼續往可交付的結果前進的人。'},
      {id:'H2',ref:'03.3',text:'Done 不只是 Status 被改成 Done。Done 原則上應能指向某個 observable outcome。'},
      {id:'H3',ref:'02.3',text:'Thread 結束後，應整理出 Summary、Decision、Action Item、Unresolved Question 與 Files。'}]},
    {id:'D3',dir:'內部',t:'Lily 職位說明書',clauses:[
      {id:'J1',ref:'容量配置',text:'付費案交付約 70%、方法與市場資產約 20%、產品行銷試驗約 10%。以月或季平均檢視。'}]},
    {id:'D4',dir:'外部',t:'柏翰 Proposal v2',clauses:[
      {id:'P1',ref:'交付標準',text:'① 全公司 28 個帳號導入完成 ② 2 小時教育訓練 ③ 導入後 30 日成效報告。'},
      {id:'P3',ref:'支援',text:'上線後 90 日內提供信件支援，回覆時間 1 個工作日。'}]},
    {id:'D5',dir:'外部',t:'專案獎金確認單 · 柏翰',clauses:[
      {id:'B1',ref:'主要交付標準',text:'達成三項交付標準且由該專案實際產生客戶續約者，適用交付及續約加成 +5%。'}]}
  ],
  commitments:[
    {id:'C-007',doc:'D1',clause:'C1',dir:'內部',t:'每月一次 1:1 檢核 + 30/60/90 日階段對話',owner:'yz',st:'履行中',due:'每月',
     logs:[{d:'2026-09-05',t:'9 月 1:1 已進行',src:'自動 · 行事曆',ok:true},{d:'2026-08-07',t:'8 月 1:1 已進行',src:'自動 · 行事曆',ok:true},{d:'2026-07-04',t:'7 月 1:1 已進行',src:'自動 · 行事曆',ok:true}]},
    {id:'C-011',doc:'D1',clause:'C3',dir:'內部',t:'每週現場 cowork 二次',owner:'yz',st:'落後',due:'每週',
     logs:[{d:'2026-09-08',t:'本週僅完成 1 次',src:'自動 · 行事曆',ok:false},{d:'2026-09-01',t:'完成 2 次',src:'自動 · 行事曆',ok:true},{d:'2026-08-25',t:'完成 2 次',src:'自動 · 行事曆',ok:true}]},
    {id:'C-014',doc:'D3',clause:'J1',dir:'內部',t:'容量配置 70/20/10',owner:'yz',st:'履行中',due:'月／季平均',
     logs:[{d:'2026-08-31',t:'8 月 72/18/10，落在區間內',src:'手動 · 月度回顧',ok:true},{d:'2026-07-31',t:'7 月 68/22/10',src:'手動 · 月度回顧',ok:true}]},
    {id:'C-002',doc:'D4',clause:'P1',dir:'外部',t:'柏翰三項交付標準',owner:'lily',st:'已完成',due:'2026-09-05',
     logs:[{d:'2026-09-05',t:'三項全數交付，驗收單已簽',src:'自動 · Evidence Repo',ok:true}]},
    {id:'C-005',doc:'D4',clause:'P3',dir:'外部',t:'上線後 90 日信件支援，1 工作日回覆',owner:'lily',st:'履行中',due:'2026-12-04',
     logs:[{d:'2026-09-10',t:'累計 3 封，平均回覆 0.6 日',src:'手動 · 月度回顧',ok:true}]}
  ],
  repos:{
    'PRJ-2026-004':{version:'v0.9',frozen:false,readme:'柏翰是一家 28 人的印刷廠。導入 Google Workspace 的真正目的不是換信箱，是讓報價單與版面檔案有單一版本。\n\n交付：帳號架構、2 小時訓練、30 日成效報告。\n學到：小型製造業的阻力在「誰來收信」，不在技術。',
      versions:[{v:'v0.1',t:'Kickoff 08/04',st:'past'},{v:'v0.5',t:'交付完成 09/05',st:'past'},{v:'v0.9',t:'整理中',st:'now'}],
      tree:[{f:'README.md',dir:'',note:'專案敘事',ok:true},{f:'CHANGELOG.md',dir:'',note:'自動生成',ok:true},
            {f:'報價單_v2.pdf',dir:'01_contract',note:'',ok:null},{f:'專案獎金確認單.pdf',dir:'01_contract',note:'雙方簽署',ok:true},
            {f:'訪談_0812.md',dir:'02_discovery',note:'',ok:null},{f:'需求清單_v3.xlsx',dir:'02_discovery',note:'',ok:null},
            {f:'帳號架構圖.png',dir:'03_delivery',note:'',ok:null},{f:'教育訓練簡報.pdf',dir:'03_delivery',note:'',ok:null},
            {f:'驗收單_已簽.pdf',dir:'04_evidence',note:'',ok:true},{f:'客戶回饋_0905.md',dir:'04_evidence',note:'',ok:null},
            {f:'成本明細.xlsx',dir:'05_finance',note:'由帳本自動生成',ok:null},{f:'可分配毛利表.pdf',dir:'05_finance',note:'已提供乙方 §9.6',ok:true}],
      pending:[{src:'Thread「導入設定討論」',what:'3 個檔案未歸檔',to:'03_delivery'},
               {src:'日誌 09/05 交付紀錄',what:'轉為 Evidence',to:'04_evidence'}]}
  },
  decisions:[
    {id:'D-024',t:'企業 QA 報名改為併入 CRM lead 物件',st:'現行',ctx:'BNI 引薦量上升，兩套名單開始不一致',ev:'9 月重複名單比對結果',owner:'yz',date:'2026-09-11',sup:'D-018'},
    {id:'D-018',t:'企業 QA 報名資料先進入獨立 Sheet',st:'已被推翻',ctx:'驗證階段資料量低，整合 CRM 成本高於價值',ev:'QA registration workflow test',owner:'yz',date:'2026-09-10',sup:''},
    {id:'D-021',t:'tenant 隔離採 RLS 為主要邊界',st:'現行',ctx:'應用層過濾容易因新查詢路徑而漏',ev:'rls-policy.sql + 12 項隔離測試',owner:'yz',date:'2026-09-06',sup:''}
  ],
  journal:{
    '2026-09-12':{title:'20260912　週六',blocks:[
      {id:'b1',t:'h2',ind:0,text:'Standup'},
      {id:'b2',t:'h3',ind:0,text:'Yesterday'},
      {id:'b3',t:'p',ind:1,text:'介面收斂草稿完成'},
      {id:'b4',t:'p',ind:1,text:'BNI 一對一輸入 5 筆'},
      {id:'b5',t:'h3',ind:0,text:'Today'},
      {id:'b6',t:'p',ind:1,text:'refactor 目前的介面，準備發布'},
      {id:'b7',t:'obj',ind:1,text:'',obj:{ty:'issue',rid:'LAND-012'}},
      {id:'b8',t:'h3',ind:0,text:'Blocker'},
      {id:'b9',t:'p',ind:1,text:'tenant 測試資料未備齊'},
      {id:'b10',t:'h3',ind:0,text:'Need Decision'},
      {id:'b11',t:'p',ind:1,text:'週四會計 SSOT 要不要帶價格表'},
      {id:'b12',t:'divider',ind:0,text:''},
      {id:'b13',t:'h2',ind:0,text:'地政士的推論'},
      {id:'b14',t:'p',ind:0,text:'介面收斂之後，真正的風險不在畫面，在租戶邊界。'},
      {id:'b15',t:'p',ind:1,text:'如果租戶切換會漏資料，那介面做得再好也不能發布。'},
      {id:'b16',t:'todo',ind:1,text:'準備三個租戶測資',done:false},
      {id:'b17',t:'todo',ind:1,text:'寫 RLS policy',done:true},
      {id:'b18',t:'h2',ind:0,text:'商務'},
      {id:'b19',t:'obj',ind:1,text:'',obj:{ty:'project',rid:'PRJ-2026-011'}},
      {id:'b20',t:'obj',ind:1,text:'',obj:{ty:'txn',rid:'T5'}},
      {id:'b21',t:'quote',ind:0,text:'今天有點想媽媽和大阿姨。這些體驗會回向給他們，我的聽眾一直只有他們兩個人。'},
      {id:'b22',t:'p',ind:0,text:''}
    ]},
    '2026-09-11':{title:'20260911　週五',blocks:[
      {id:'c1',t:'h2',ind:0,text:'Standup'},
      {id:'c2',t:'h3',ind:0,text:'Today'},
      {id:'c3',t:'p',ind:1,text:'BNI 更新代理人、製作綠燈會員模組'},
      {id:'c4',t:'obj',ind:0,text:'',obj:{ty:'decision',rid:'D-024'}},
      {id:'c5',t:'p',ind:0,text:'印刷業柏翰協助報帳代購 Google Workspace'}
    ]},
    '2026-09-10':{title:'20260910　週四',blocks:[
      {id:'d1',t:'p',ind:0,text:'現在在地政士這邊開始進行專案開發，也許是長久也許是短順。'},
      {id:'d2',t:'obj',ind:1,text:'',obj:{ty:'decision',rid:'D-018'}},
      {id:'d3',t:'h3',ind:0,text:'今日小行政'},
      {id:'d4',t:'p',ind:1,text:'research ocean economy'},
      {id:'d5',t:'p',ind:1,text:'research personal twin（輔大）'}
    ]}
  },
  threads:[
    {id:'TH1',p:'PRJ-2026-007',t:'介面 refactor 討論',closed:false,
     msgs:[{w:'yz',ts:'09-10 14:02',x:'目前介面收斂完了，要 refactor 才能發布'},
           {w:'lily',ts:'09-10 15:31',x:'客戶那邊比較在意 tenant 切換的流程，我整理了 3 個訪談片段'},
           {w:'yz',ts:'09-11 09:14',x:'那就先做 tenant test，@LAND-012 已經建好了'},
           {w:'lily',ts:'09-11 10:02',x:'我覺得多租戶的計價要先定，不然發布之後改會很痛'}],
     close:null,files:['interview-0910.md','wireframe-v2.fig']},
    {id:'TH2',p:'PRJ-2026-007',t:'tenant 權限模型',closed:true,
     msgs:[{w:'yz',ts:'09-05 11:20',x:'RLS 還是應用層過濾？'},
           {w:'yz',ts:'09-06 09:40',x:'先用 RLS，應用層做二次驗證'}],
     close:{sum:'採 RLS + 應用層二次驗證',dec:'RLS 為主要邊界',act:'@宇星 寫 policy',un:'—',files:'rls-policy.sql'},files:['rls-policy.sql']},
    {id:'TH3',p:'PRJ-2026-004',t:'導入設定討論',closed:false,
     msgs:[{w:'lily',ts:'09-02 13:05',x:'28 個帳號的群組要怎麼分？'},
           {w:'yz',ts:'09-02 13:40',x:'依部門，共 5 群'},
           {w:'lily',ts:'09-03 09:11',x:'已建立，截圖在附件。這樣就算完成了吧？'}],
     close:null,files:['群組設定.png','帳號清單.xlsx','驗收單.pdf']}
  ],
  timesheet:{
    lily:[
      {wk:'2026-W36',from:'2026-08-31',days:[375,330,360,300,330,0,0],est:[360,330,345,300,315,0,0],st:'locked',conf:'2026-09-07'},
      {wk:'2026-W37',from:'2026-09-07',days:[390,345,375,315,330,0,0],est:[375,330,360,300,315,0,0],st:'confirmed',conf:'2026-09-12'},
      {wk:'2026-W38',from:'2026-09-14',days:[0,0,0,0,0,0,0],est:[0,0,0,0,0,0,0],st:'draft',conf:''}
    ],
    yz:[
      {wk:'2026-W37',from:'2026-09-07',days:[480,510,450,495,420,180,0],est:[480,510,450,495,420,180,0],st:'confirmed',conf:'2026-09-12'}
    ]
  },
  bank:[
    {id:'BK1',d:'2026-09-02',t:'跨行轉出 SUPABASE',amt:-4200,m:'T1'},
    {id:'BK2',d:'2026-09-06',t:'匯出 王設計',amt:-28000,m:'T2'},
    {id:'BK3',d:'2026-09-08',t:'匯入 柏翰印刷',amt:120000,m:'T3'},
    {id:'BK4',d:'2026-09-09',t:'META PLATFORMS',amt:-60000,m:'T4'},
    {id:'BK5',d:'2026-09-11',t:'手續費',amt:-30,m:''},
    {id:'BK6',d:'2026-09-11',t:'跨行轉出 素材庫',amt:-22200,m:'T7'},
    {id:'BK7',d:'2026-09-12',t:'利息',amt:18,m:''},
    {id:'BK8',d:'2026-09-12',t:'退票 客戶 Z',amt:-15000,m:''}
  ],
  signals:[],
  audit:[],
  changelog:[]
};
function genHistory(){
  const conf={S:[0.6,1.6],M:[1.2,3.4],L:[3.0,7.0]}, out=[];
  const mix=[['S',41],['M',34],['L',6]];
  mix.forEach(([sz,n])=>{
    for(let i=0;i<n;i++){
      const [a,b]=conf[sz];
      const r=rnd(), lognormish=a+(b-a)*Math.pow(r,0.55)+(rnd()<0.12?(b-a)*1.6*rnd():0);
      const cyc=Math.max(0.5,Math.round(lognormish*10)/10);
      const back=Math.floor(rnd()*84)+3;
      const done=dadd(TODAY,-back);
      out.push({id:`H${sz}${i}`,size:sz,done,cycle:cyc,p:['PRJ-2026-004','PRJ-2026-007','PRJ-2026-009'][Math.floor(rnd()*3)]});
    }
  });
  return out.sort((x,y)=>x.done<y.done?-1:1);
}
DB.history=genHistory();
return DB;
}
