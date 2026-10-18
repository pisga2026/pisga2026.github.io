(()=>{
 'use strict';
 const $=id=>document.getElementById(id),M=window.DNAModel,examples=window.DNADemos;
 let example='original',full,count=0,route=[],start=null;
 const total=()=>full.edges.length,byId=id=>full.nodes.find(n=>n.id===id),edgeById=id=>full.edges.find(e=>e.id===id),current=()=>route.length?edgeById(route[route.length-1]).to:start;
 const card=edge=>edge.label+' #'+(full.edges.indexOf(edge)+1);
 function message(text,kind=''){$('walk-status').textContent=text;$('walk-status').dataset.kind=kind;}
 function buildGraph(){const edges=full.edges.slice(0,count),ids=new Set(edges.flatMap(e=>[e.from,e.to]));return {nodes:full.nodes.filter(n=>ids.has(n.id)),edges};}
 function fragment(edge,i){const s=document.createElement('span');s.className='fragment'+(i===count-1&&!start?' current':route.includes(edge.id)||i<count&&!start?' done':'');s.textContent='#'+(i+1)+' '+edge.label;return s;}
 function render(){
  const graph=buildGraph(),ready=count===total(),last=graph.edges[count-1],active=route.length?edgeById(route[route.length-1]):!start?last:null;
  $('build-panel').hidden=ready;$('walk-panel').hidden=!ready;$('graph-empty').hidden=count>0;$('return-build').hidden=!ready;
  $('phase').textContent=ready?'שלב ב · מחפשים מסלול אוילר':'שלב א · בונים גרף';
  $('build-status').textContent=count?'נבנו '+count+' מתוך '+total()+' קשתות.':'נתחיל ממקטע אחד: מה הזוג הראשון ומה הזוג האחרון?';
  $('mapping').textContent=last?card(last)+': '+byId(last.from).label+' → '+byId(last.to).label:'מקטע → קשת';
  const center=active?full.edges.indexOf(active):0,offset=example==='hard'?Math.max(0,Math.min(center-2,total()-6)):0;
  $('demo-parts').replaceChildren(...full.edges.slice(offset,offset+6).map((e,i)=>fragment(e,offset+i)));
  $('demo-parts').setAttribute('aria-label','מקטעים '+(offset+1)+' עד '+Math.min(offset+6,total())+' מתוך '+total());
  $('all-parts-list').replaceChildren(...full.edges.map(fragment));$('all-parts').textContent='כל '+total()+' המקטעים';
  window.drawDNADemoGraph($('demo-graph'),graph,{layoutGraph:example==='hard'?full:null,used:route,current:current(),selected:active&&(example==='hard'||!start)?'edge:'+active.id:'',onEdge:id=>{if(ready)take(id);},onNode:id=>{if(ready&&!start){$('start-node').value=id;message('נבחר הצומת '+byId(id).label+'. לחצו על ״מתחילים״.');}}});
  $('demo-graph').setAttribute('viewBox',examples[example].viewBox);$('demo-graph').classList.toggle('all-labels',$('all-labels').checked);
  if(example==='hard'){
   for(const group of $('demo-graph').querySelectorAll('[data-edge]')){const e=edgeById(group.dataset.edge);group.classList.toggle('related',!!start&&e.from===current()&&!route.includes(e.id));}

  }
  $('build-back').disabled=!count;$('build-next').disabled=ready;$('build-all').disabled=ready;$('walk-undo').disabled=!route.length;$('walk-reset').disabled=!start;$('start-walk').disabled=!!start;$('start-node').disabled=!!start;$('euler-next').disabled=route.length===total();
  renderDegrees(graph);renderWalk();
 }
 function renderDegrees(graph){const table=document.createElement('table');table.className='degree-table';const head=document.createElement('thead'),tr=document.createElement('tr');for(const text of ['צומת','כניסות','יציאות']){const th=document.createElement('th');th.scope='col';th.textContent=text;tr.append(th);}head.append(tr);table.append(head);const body=document.createElement('tbody');for(const d of M.degrees(graph)){const row=document.createElement('tr');for(const text of [d.label,d.in,d.out]){const td=document.createElement('td');td.textContent=text;row.append(td);}body.append(row);}table.append(body);$('degree-box').replaceChildren(table);}
 function renderWalk(){
  const choices=$('walk-choices');choices.replaceChildren();if(start)for(const edge of full.edges.filter(e=>e.from===current()&&!route.includes(e.id))){const b=document.createElement('button');b.type='button';b.textContent=card(edge);b.addEventListener('click',()=>take(edge.id));choices.append(b);}
  document.body.classList.toggle('has-walk',!!start);
  $('manual-choice').hidden=example!=='hard'||!choices.children.length;
  $('current-step').hidden=example!=='hard'||!route.length;
  const recent=route.length?edgeById(route.at(-1)):null;
  $('current-step').textContent=recent?card(recent)+' · '+byId(recent.from).label+' → '+byId(recent.to).label:'';
  const shown=example==='hard'?route.slice(-4):route;
  $('route-title').textContent=example==='hard'?'נוצלו '+route.length+' מתוך '+total()+' מקטעים':'המקטעים שבחרנו';
  $('walk-route').textContent=shown.map(id=>card(edgeById(id))).join(' → ')||'-';
  $('walk-sequence').textContent=M.spell(full,route)||'-';$('full-sequence').textContent=M.spell(full,route)||'-';
  $('full-route-list').replaceChildren(...route.map(id=>{const li=document.createElement('li');li.textContent=card(edgeById(id));return li;}));
  $('output-help').textContent=count<total()?'כרטיסים זהים יוצרים קשתות נפרדות בין אותם צמתים.':'המקטע הראשון במלואו; כל מקטע נוסף מוסיף רק את האות האחרונה.';
 }
 function take(id){
  if(count<total())return;if(!start){message('בחרו צומת התחלה לפני שבוחרים קשת.','error');return;}
  const edge=edgeById(id);if(route.includes(id)){message('הקשת הזאת כבר נוצלה. כל כרטיס משמש פעם אחת.','error');return;}if(edge.from!==current()){message('אפשר לצאת רק מהצומת הנוכחי: '+byId(current()).label+'.','error');return;}
  route.push(id);render();if($('choices-dialog').open)$('choices-dialog').close();
  if(route.length===total()){message('הצלחתם! כל '+total()+' הקשתות נוצלו פעם אחת. הרצף המלא מופיע למטה.','success');return;}
  const remaining=full.edges.filter(e=>!route.includes(e.id));
  if(!remaining.some(e=>e.from===current()))message('מבוי סתום: הגעתם ל־'+byId(current()).label+', אבל נותרו '+remaining.length+' מקטעים. חזרו צעד אחורה.','error');
  else message('נוצלו '+route.length+' מתוך '+total()+'. כעת ב־'+byId(current()).label+'. '+(route.length===1?'המקטע הראשון נכתב במלואו.':'נוספה האות '+edge.label.slice(-1)+'.'));
 }
 function begin(){start=$('start-node').value;route=[];render();const answer=M.euler(full,start);message(answer.error?'אפשר לנסות, אך מהצומת הזה אי אפשר להשלים מסלול אוילר.':'מתחילים ב־'+byId(start).label+'. בחרו קשת או בקשו צעד מחושב.',answer.error?'error':'');}
 function changeCount(n){const wasReady=count===total();count=n;route=[];start=null;message(n===total()?'כל הקשתות מוכנות. היכן כדאי להתחיל?':'');render();if(n===total()&&!wasReady)$('euler-next').focus({preventScroll:true});else if(n<total()&&wasReady)$('build-next').focus({preventScroll:true});}
 function setExample(value){
  example=Object.hasOwn(examples,value)?value:'original';const config=examples[example];full=M.fromParts(config.parts);if(config.positions)for(const node of full.nodes)[node.x,node.y]=config.positions[node.label];
  $('demo-example').value=example;
  (example==='hard'?document.querySelector('.demo-tools'):document.querySelector('.parts-bar')).append($('all-parts'));
  (example==='hard'?$('dialog-choices'):$('inline-choices')).append($('walk-choices'));
  $('manual-choice').hidden=example!=='hard';document.body.classList.toggle('demo-hard',example==='hard');$('all-labels').checked=false;
  for(const id of ['all-parts','all-route','labels-option'])$(id).hidden=example!=='hard';
  $('start-node').replaceChildren(...full.nodes.map(n=>{const o=document.createElement('option');o.value=n.id;o.textContent=n.label;return o;}));
  const solution=M.euler(full);$('start-node').value=solution.start;
  $('example-endpoints').textContent='בגרף המלא של הדוגמה מתחילים ב־'+byId(solution.start).label+' ומסיימים ב־'+byId(solution.nodes.at(-1)).label+'.';
  $('model-intro').textContent='נחזור ל־'+total()+' המקטעים מהתרגיל הקודם. נבנה גרף, ואז נחפש סדר שמשתמש בכל מקטע פעם אחת.';
  $('recap-duplicate').textContent='למה מחיקת קשת אחת של '+(example==='hard'?'AGC':'ATG')+' משנה את הבעיה?';
  $('recap-trap').textContent=example==='hard'?'מה יקרה אם נגיע לצומת TG לפני שהשתמשנו בכל המקטעים?':'אחרי שמגיעים ל־TG, האם כדאי לבחור מיד ב־TGC?';
  $('model-example').textContent=example==='hard'?'AGC: AG → GC':'ATG: AT → TG';
  $('model-duplicate').textContent='שני כרטיסי '+(example==='hard'?'AGC':'ATG')+' יוצרים שתי קשתות נפרדות. הצמתים נשארים משותפים.';
  count=0;route=[];start=null;message('');render();
 }
 $('demo-example').addEventListener('change',()=>{setExample($('demo-example').value);const url=new URL(location.href);if(example==='hard')url.searchParams.set('example','hard');else url.searchParams.delete('example');history.replaceState(null,'',url);});
 $('all-labels').addEventListener('change',render);
 $('build-next').addEventListener('click',()=>changeCount(Math.min(total(),count+1)));$('build-back').addEventListener('click',()=>changeCount(Math.max(0,count-1)));$('build-all').addEventListener('click',()=>changeCount(total()));$('demo-reset').addEventListener('click',()=>changeCount(0));$('return-build').addEventListener('click',()=>changeCount(total()-1));$('start-walk').addEventListener('click',begin);
 $('euler-next').addEventListener('click',()=>{if(!start){const answer=M.euler(full);start=answer.start;$('start-node').value=start;route=[];render();}const remaining={nodes:full.nodes,edges:full.edges.filter(e=>!route.includes(e.id))};if(!remaining.edges.length)return;const answer=M.euler(remaining,current());if(answer.error){message('אין מסלול שמנצל את כל הקשתות שנותרו. חזרו צעד אחורה או התחילו ניסיון חדש.','error');return;}take(answer.edges[0]);});
 $('walk-undo').addEventListener('click',()=>{route.pop();render();message('חזרנו לצומת '+byId(current()).label+'. אפשר לנסות קשת אחרת.');});$('walk-reset').addEventListener('click',()=>{start=null;route=[];render();message('בחרו צומת התחלה לניסיון חדש.');});
 document.querySelectorAll('[data-demo-dialog]').forEach(button=>{
  const dialog=$(button.dataset.demoDialog);button.addEventListener('click',()=>dialog.showModal());dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{const target=button.getClientRects().length?button:$('walk-reset');target.focus({preventScroll:true});});
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  dialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const controls=[...dialog.querySelectorAll('button,summary,a[href]')].filter(el=>el.getClientRects().length),first=controls[0],last=controls[controls.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
 });
 $('fullscreen').hidden=!document.fullscreenEnabled;
 $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('fullscreen').textContent='מסך מלא לא זמין';}});
 document.addEventListener('fullscreenchange',()=>{const active=!!document.fullscreenElement;$('fullscreen').textContent=active?'יציאה ממסך מלא':'מסך מלא';$('fullscreen').setAttribute('aria-pressed',String(active));});
 setExample(new URLSearchParams(location.search).get('example'));
})();
