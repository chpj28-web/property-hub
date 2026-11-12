/* Text rules and ranking over existing listings; no customer text leaves this page. */
function requirementNumber(value, unit) {
  const number=Number(String(value).replace(/,/g,''));
  return number*(/^(?:k|พัน)$/i.test(unit||'')?1000:unit==='หมื่น'?10000:/^(?:m|ล้าน)$/i.test(unit||'')?1000000:1);
}
function parseRequirements(text) {
  const t=normalizePost(text), result={mode:/(?:ต้องการ|หา|ซื้อ|ซื้อคอนโด).*ซื้อ|ต้องการซื้อ|หาซื้อ|ซื้อบ้าน|ซื้อคอนโด/i.test(t)?'sale':'rent',area:'',min:'',max:'',beds:'',type:'',keywords:''};
  const amount='(\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?)\\s*(k\\b|พัน|หมื่น|m\\b|ล้าน)?';
  const range=t.match(new RegExp('(?:งบ(?:ประมาณ)?|budget|ราคา)\\s*(?:ไม่เกิน|ประมาณ|สูงสุด|ไม่เกินเดือนละ)?\\s*[:：=]?\\s*'+amount+'\\s*[-–ถึง]+\\s*'+amount,'i'));
  if(range){result.min=String(requirementNumber(range[1],range[2]||range[4]));result.max=String(requirementNumber(range[3],range[4]||range[2]));}
  else {
    const budget=t.match(new RegExp('(?:งบ(?:ประมาณ)?|budget|ไม่เกิน|สูงสุด)\\s*(?:ไม่เกิน|ประมาณ|สูงสุด|เดือนละ)?\\s*[:：=]?\\s*'+amount,'i'));
    if(budget)result.max=String(requirementNumber(budget[1],budget[2]));
    else {const rent=extractRent(t);if(rent)result.max=rent;}
  }
  const bed=t.match(/(\d+)\s*(?:ห้องนอน|bedrooms?|beds?|br\b)/i);
  if(bed)result.beds=bed[1];else if(/studio|สตูดิโอ/i.test(t))result.beds='0';
  if(/คอนโด|condo/i.test(t))result.type='คอนโด';
  else if(/ทาวน์เฮ้าส์|ทาวน์โฮม|townhouse|townhome/i.test(t))result.type='ทาวน์โฮม';
  else if(/บ้าน|house/i.test(t))result.type='บ้าน';
  const location=t.match(/(?:ทำเล|ทําเล|ย่าน|แถว|โซน|ใกล้|ติด|area|location)\s*[:：]?\s*([^\n,;]{2,100})/i);
  if(location) result.area=location[1].split(/(?:งบ|budget|ราคา|ไม่เกิน|ขอ|ต้องการ|อยาก|ห้อง|เลี้ยง|พร้อม|เฟอร์|ที่จอด|\d+\s*(?:ห้องนอน|bed|br\b))/i)[0].replace(/[\s:：\-]+$/,'').trim();
  else {
    const station=t.match(/\b(?:BTS|MRT|ARL)\s*[-:]?\s*([^\n,;]{2,60})/i);
    if(station)result.area=station[0].split(/(?:งบ|budget|ราคา|ไม่เกิน|ขอ|ต้องการ|\d+\s*(?:ห้องนอน|bed|br\b))/i)[0].trim();
  }
  const features=[['เลี้ยงแมว',/เลี้ยงแมว|มีแมว/],['เลี้ยงสุนัข',/เลี้ยงสุนัข|เลี้ยงหมา|มีหมา/],['ที่จอดรถ',/ที่จอดรถ/]];
  result.keywords=features.filter(([,pattern])=>pattern.test(t)).map(([word])=>word).join(', ');
  return result;
}
function rankRequirements(items,c) {
  const norm=v=>String(v??'').normalize('NFKC').toLowerCase().replace(/[\s\-–_/.,:：()[\]]/g,'');
  const price=v=>Number(String(v??'').replace(/,/g,''));
  const areaTerms=String(c.area||'').split(/[,;\/]|\s+หรือ\s+|\s+or\s+/i).map(v=>v.trim()).filter(Boolean);
  const keywords=String(c.keywords||'').split(/[,;\n]/).map(v=>v.trim()).filter(Boolean);
  const hasBudget=c.min!==''||c.max!=='';
  const hasCriteria=areaTerms.length||hasBudget||c.beds!==''||c.type||keywords.length;
  if(!hasCriteria)return [];
  const results=[];
  for(const record of items) {
    if(record.status==='ปล่อยแล้ว')continue;
    const reasons=[],checks=[];let score=0,matched=0;
    const all=[record.project,record.location,normalizePost(record.notes||'')].join(' ');
    if(areaTerms.length) {
      const area=areaTerms.find(term=>matchesArea(record,term));
      if(area){score+=5;matched++;reasons.push('พบทำเล: '+area);}else checks.push('ไม่พบทำเลที่ระบุในข้อมูล');
    }
    if(hasBudget) {
      const value=price(record[c.mode]);
      if(!(value>0))checks.push('ยังไม่มี'+(c.mode==='sale'?'ราคาขาย':'ราคาเช่า'));
      else if((c.min===''||value>=Number(c.min))&&(c.max===''||value<=Number(c.max))){score+=4;matched++;reasons.push('ราคาอยู่ในงบ');}
      else checks.push('ราคาอยู่นอกช่วงงบ');
    }
    if(c.beds!=='') {
      const studio=/studio|สตูดิโอ/i.test([record.beds,record.roomType].join(' '))||String(record.beds)==='0';
      const count=studio?0:Number.parseInt(record.beds||((String(record.roomType||'').match(/^(\d+)\s*(?:bed|ห้องนอน)/i)||[])[1]),10);
      if(Number.isFinite(count)&&count===Number(c.beds)){score+=3;matched++;reasons.push(count===0?'Studio ตรงตามต้องการ':'ตรง '+count+' ห้องนอน');}
      else checks.push(Number.isFinite(count)?'จำนวนห้องนอนไม่ตรง':'ยังไม่มีข้อมูลห้องนอน');
    }
    if(c.type) {
      const aliases=c.type==='คอนโด'?/คอนโด|condo/i:c.type==='ทาวน์โฮม'?/ทาวน์|townhouse|townhome/i:/บ้าน|house/i;
      // Prefer the explicit property type; use the project heading only when absent.
      if(aliases.test(record.type||record.project||'')){score+=2;matched++;reasons.push('ประเภททรัพย์ตรง');}
      else checks.push(record.type?'ประเภททรัพย์ไม่ตรง':'ยังไม่มีข้อมูลประเภททรัพย์');
    }
    for(const word of keywords) {
      const text=norm(all),needle=norm(word);
      if(text.includes(needle)){score++;matched++;reasons.push('พบคำว่า “'+word+'” — ต้องตรวจสอบรายละเอียด');}
      else checks.push('ไม่พบคำว่า “'+word+'”');
    }
    if(matched)results.push({record,score,reasons,checks,exact:checks.length===0});
  }
  return results.sort((a,b)=>Number(b.exact)-Number(a.exact)||b.score-a.score||price(a.record[c.mode])-price(b.record[c.mode]));
}
function readRequirementFields(){return Object.fromEntries(['mode','area','min','max','beds','type','keywords'].map(key=>[key,document.getElementById('req_'+key).value.trim()]));}
function findCustomerMatches(parseText) {
  if(parseText) {
    const text=document.getElementById('customerText').value;
    if(!text.trim()){document.getElementById('customerSummary').textContent='กรุณาวางข้อความความต้องการลูกค้าก่อน';return;}
    const parsed=parseRequirements(text);
    for(const[key,value]of Object.entries(parsed))document.getElementById('req_'+key).value=value;
  }
  const criteria=readRequirementFields();
  if((criteria.min!==''&&(!Number.isFinite(Number(criteria.min))||Number(criteria.min)<0))||(criteria.max!==''&&(!Number.isFinite(Number(criteria.max))||Number(criteria.max)<0))||(criteria.min!==''&&criteria.max!==''&&Number(criteria.min)>Number(criteria.max))){document.getElementById('customerSummary').textContent='กรุณาตรวจสอบช่วงงบประมาณ';return;}
  const matches=rankRequirements(records,criteria),exact=matches.filter(m=>m.exact).length;
  const hasCriteria=criteria.area||criteria.min!==''||criteria.max!==''||criteria.beds!==''||criteria.type||criteria.keywords;
  document.getElementById('customerSummary').textContent=hasCriteria?'พบ '+exact+' รายการตรงตามข้อมูล และ '+(matches.length-exact)+' รายการใกล้เคียง • ตรวจสอบเกณฑ์ที่แยกได้ด้านบน':'ยังไม่พบเกณฑ์ที่ชัดเจน กรุณาระบุทำเล งบ หรือจำนวนห้องก่อนค้นหา';
  const cards=matches.slice(0,30).map(({record:r,reasons,checks,exact})=>{
    const value=Number(String(r[criteria.mode]||'').replace(/,/g,''));
    return '<article class="listing"><div class="info"><span class="pill">'+(exact?'ตรงตามข้อมูล':'ใกล้เคียง / ต้องตรวจสอบ')+'</span><h3>'+escapeHTML(r.project||'ไม่ระบุโครงการ')+'</h3><p>'+escapeHTML(r.location||'ยังไม่ระบุทำเล')+'</p><p><b>'+(value>0?value.toLocaleString()+(criteria.mode==='sale'?' บาท (ขาย)':' บาท/เดือน'):'ยังไม่ระบุราคา')+'</b></p><p>'+escapeHTML(r.roomType||(String(r.beds)==='0'?'Studio':r.beds?r.beds+' ห้องนอน':'ยังไม่ระบุห้องนอน'))+' · '+escapeHTML(r.size||'-')+' ตร.ม.</p><p>'+escapeHTML(reasons.join(' • '))+'</p>'+(checks.length?'<p class="match-check">'+escapeHTML(checks.join(' • '))+'</p>':'')+'<p class="muted">สถานะ: '+escapeHTML(r.status||'ยังไม่ระบุ — ต้องเช็กห้องว่าง')+'</p><button onclick="edit(\''+r.id+'\')">ดูรายละเอียด Listing</button></div></article>';
  });
  document.getElementById('customerMatches').innerHTML=cards.join('')||(hasCriteria?'<p class="muted">ยังไม่มีรายการที่ตรงกับเกณฑ์ ลองเปลี่ยนทำเลหรือช่วงงบประมาณ</p>':'');
}
