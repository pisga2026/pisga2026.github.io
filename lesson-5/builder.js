(()=>{
  'use strict';const $=id=>document.getElementById(id),M=window.DNAModel,svg=$('editor-graph'),copy=v=>JSON.parse(JSON.stringify(v));
  let task='small',graph={nodes:[],edges:[]},explanation='',history=[],selected='',drag=null,suppressClick=false,itemMode=null,dialogPosition=null,dialogDrag=null;
  const activeKey='pisga-dna-lesson5-builder-active-task',key=()=> 'pisga-dna-lesson5-builder-v1-'+task,returns=new Map();
  try{const t=localStorage.getItem(activeKey);if(['small','original','free'].includes(t))task=t;}catch{}
  $('task').value=task;
  function feedback(text,kind=''){$('editor-feedback').textContent=text;$('editor-feedback').dataset.kind=kind;}
  function save(){try{localStorage.setItem(key(),JSON.stringify({graph,explanation}));localStorage.setItem(activeKey,task);$('save-status').textContent='נשמר בדפדפן הזה';}catch{$('save-status').textContent='השמירה אינה זמינה בדפדפן הזה. השאירו את העמוד פתוח.';}}
  function valid(g){return g&&Array.isArray(g.nodes)&&Array.isArray(g.edges)&&g.nodes.length<=24&&g.edges.length<=60&&new Set(g.nodes.map(n=>n.id)).size===g.nodes.length&&new Set(g.edges.map(e=>e.id)).size===g.edges.length&&g.nodes.every(n=>typeof n.id==='string'&&typeof n.label==='string'&&n.label.length<=24&&Number.isFinite(n.x)&&Number.isFinite(n.y)&&n.x>=40&&n.x<=760&&n.y>=70&&n.y<=410)&&g.edges.every(e=>typeof e.id==='string'&&typeof e.label==='string'&&e.label.length<=24&&g.nodes.some(n=>n.id===e.from)&&g.nodes.some(n=>n.id===e.to));}
  function load(){graph={nodes:[],edges:[]};explanation='';selected='';history=[];try{const saved=JSON.parse(localStorage.getItem(key()));if(saved&&valid(saved.graph)){graph=saved.graph;explanation=typeof saved.explanation==='string'?saved.explanation.slice(0,5000):'';}}catch{}$('explanation').value=explanation;render();}
  function remember(){history.push(copy(graph));if(history.length>60)history.shift();}
  function uid(prefix){let n=1;while([...graph.nodes,...graph.edges].some(x=>x.id===prefix+n))n++;return prefix+n;}
  function currentItem(){const [kind,id]=selected.split(':');return {kind,item:(kind==='node'?graph.nodes:graph.edges).find(x=>x.id===id)};}
  function openDialog(id,focusId){const d=$(id),active=document.activeElement,focusable=active?.matches('button,select,input,textarea,a[href],[tabindex="0"]')&&active.isConnected&&!active.disabled;returns.set(d,active?.closest('dialog')?$('more-tools'):focusable?active:$('edit-selected').disabled?$('new-node'):$('edit-selected'));document.querySelectorAll('dialog[open]').forEach(other=>{if(other!==d)other.close();});if(!d.open)d.showModal();if(id==='item-dialog'&&dialogPosition)positionItemDialog(dialogPosition.x,dialogPosition.y);if(focusId)$(focusId).focus({preventScroll:true});}
  document.querySelectorAll('.builder-dialog').forEach(d=>{
    d.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>d.close()));
    d.addEventListener('close',()=>{if(document.querySelector('dialog[open]'))return;const target=returns.get(d);(target?.isConnected&&!target.disabled?target:$('new-node')).focus({preventScroll:true});});
    d.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const controls=[...d.querySelectorAll('button,input,select,textarea,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);if(!controls.length)return;const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
    d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();});
  });
  const itemDialog=$('item-dialog'),dialogHandle=itemDialog.querySelector('.item-drag-handle');
  function positionItemDialog(x,y){
    const v=window.visualViewport,bounds={x:v?.offsetLeft||0,y:v?.offsetTop||0,width:v?.width||innerWidth,height:v?.height||innerHeight};
    Object.assign(itemDialog.style,{position:'fixed',margin:'0',right:'auto',bottom:'auto',maxWidth:Math.max(100,bounds.width-32)+'px',maxHeight:Math.max(100,bounds.height-36)+'px'});
    const rect=itemDialog.getBoundingClientRect(),left=Math.max(bounds.x+8,Math.min(x,bounds.x+bounds.width-rect.width-8)),top=Math.max(bounds.y+8,Math.min(y,bounds.y+bounds.height-rect.height-8));
    itemDialog.style.left=left+'px';itemDialog.style.top=top+'px';dialogPosition={x:left,y:top};
  }
  dialogHandle.addEventListener('pointerdown',e=>{
    if(e.button!==0||e.target.closest('button,input,select,textarea'))return;$('item-title').focus({preventScroll:true});
    const r=itemDialog.getBoundingClientRect();positionItemDialog(r.left,r.top);dialogDrag={pointer:e.pointerId,x:e.clientX,y:e.clientY,left:dialogPosition.x,top:dialogPosition.y};
    dialogHandle.setPointerCapture(e.pointerId);dialogHandle.classList.add('dragging');
  });
  dialogHandle.addEventListener('pointermove',e=>{if(dialogDrag?.pointer!==e.pointerId)return;positionItemDialog(dialogDrag.left+e.clientX-dialogDrag.x,dialogDrag.top+e.clientY-dialogDrag.y);});
  function stopDialogDrag(){const previous=dialogDrag;dialogDrag=null;dialogHandle.classList.remove('dragging');if(previous&&dialogHandle.hasPointerCapture(previous.pointer))dialogHandle.releasePointerCapture(previous.pointer);}
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>dialogHandle.addEventListener(type,stopDialogDrag));itemDialog.addEventListener('close',stopDialogDrag);
  dialogHandle.addEventListener('keydown',e=>{
    if(e.target!==$('item-title')||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const r=itemDialog.getBoundingClientRect(),step=e.shiftKey?40:10;
    positionItemDialog(r.left+(e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0),r.top+(e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0));
  });
  function keepDialogVisible(){if(!itemDialog.open)return;const r=itemDialog.getBoundingClientRect();positionItemDialog(dialogPosition?.x??r.left,dialogPosition?.y??r.top);}
  window.addEventListener('resize',keepDialogVisible);window.visualViewport?.addEventListener('resize',keepDialogVisible);
  function draw(){window.drawDNAGraph(svg,graph,{selected,onNode:id=>{if(suppressClick){suppressClick=false;return;}selected='node:'+id;render();editItem();},onEdge:id=>{selected='edge:'+id;render();editItem();}});}
  function render(){draw();$('empty-message').hidden=!!graph.nodes.length;$('new-edge').disabled=!graph.nodes.length;$('undo').disabled=!history.length;$('edit-selected').disabled=!currentItem().item;
    $('graph-stats').textContent=graph.nodes.length+' צמתים · '+graph.edges.length+' קשתות';
    const parts=M.examples[task]||[];$('task-parts').replaceChildren(...parts.map((p,i)=>{const s=document.createElement('span');s.className='fragment';s.textContent='#'+(i+1)+' '+p;return s;}));
    $('task-rule').textContent=task==='free'?'גרף חופשי · נסו רעיונות וייצוגים משלכם.':'כל כרטיס פעם אחת · חפיפה של שתי אותיות בין מקטעים עוקבים.';
    $('task-description').textContent=task==='free'?'במצב החופשי תוכלו ליצור גרף מכוון משלכם.':'הרכיבו רצף שמשתמש בכל כרטיס מקטע פעם אחת. כל שני מקטעים עוקבים חופפים בשתי אותיות. מספרי הכרטיסים מזהים מופעים נפרדים, ולא את הסדר שלהם.';
    $('reset').disabled=!graph.nodes.length;
  }
  function fillEndpoints(from,to){for(const select of [$('edge-from'),$('edge-to')]){select.replaceChildren();for(const n of graph.nodes){const o=document.createElement('option');o.value=n.id;o.textContent=n.label;select.append(o);}}if(graph.nodes.some(n=>n.id===from))$('edge-from').value=from;if(graph.nodes.some(n=>n.id===to))$('edge-to').value=to;showDirection();}
  function showDirection(){const a=graph.nodes.find(n=>n.id===$('edge-from').value),b=graph.nodes.find(n=>n.id===$('edge-to').value);$('edge-direction').textContent=a&&b?a.label+' → '+b.label:'';}
  function prepareItem(kind,item,position){itemMode={kind,id:item?.id||null,position};$('item-form').reset();$('item-title').textContent=(item?'עריכת ':'הוספת ')+(kind==='node'?'צומת':'קשת מכוונת');$('item-name').maxLength=kind==='node'?18:24;$('item-name').value=item?.label||'';$('edge-fields').hidden=kind!=='edge';$('edge-from').disabled=kind!=='edge';$('edge-to').disabled=kind!=='edge';$('delete-selected').hidden=!item;$('delete-note').hidden=!(item&&kind==='node'&&graph.edges.some(e=>e.from===item.id||e.to===item.id));$('save-item').textContent=item?'שמירה':'הוספה';if(kind==='edge'){const chosen=currentItem();fillEndpoints(item?.from||(chosen.kind==='node'?chosen.item?.id:null),item?.to);}openDialog('item-dialog','item-name');}
  function editItem(){const {kind,item}=currentItem();if(item)prepareItem(kind,item);}
  $('new-node').addEventListener('click',()=>{if(graph.nodes.length>=24){feedback('אפשר להוסיף עד 24 צמתים.','error');return;}prepareItem('node');});
  $('new-edge').addEventListener('click',()=>{if(graph.edges.length>=60){feedback('אפשר להוסיף עד 60 קשתות.','error');return;}prepareItem('edge');});
  $('edit-selected').addEventListener('click',editItem);$('edge-from').addEventListener('change',showDirection);$('edge-to').addEventListener('change',showDirection);
  $('item-form').addEventListener('submit',e=>{e.preventDefault();const label=$('item-name').value.trim();if(!label)return;const {kind,id,position}=itemMode,collection=kind==='node'?graph.nodes:graph.edges;remember();
    if(id){const item=collection.find(x=>x.id===id);if(!item){history.pop();return;}item.label=label;if(kind==='edge'){item.from=$('edge-from').value;item.to=$('edge-to').value;}}
    else if(kind==='node'){if(graph.nodes.length>=24){history.pop();feedback('אפשר להוסיף עד 24 צמתים.','error');return;}const i=graph.nodes.length,positions=[[140,140],[400,100],[650,160],[260,350],[600,350]],pos=position||positions[i]||[80+(i%6)*125,85+Math.floor(i/6)*80],node={id:uid('n'),label,x:pos[0],y:pos[1]};graph.nodes.push(node);selected='node:'+node.id;}
    else{if(graph.edges.length>=60||!graph.nodes.length){history.pop();return;}const edge={id:uid('e'),label,from:$('edge-from').value,to:$('edge-to').value};graph.edges.push(edge);selected='edge:'+edge.id;}
    save();render();$('item-dialog').close();feedback(id?'הפריט עודכן.':'נוסף '+(kind==='node'?'צומת.':'חץ מכוון.'));
  });
  $('delete-selected').addEventListener('click',()=>{if(!itemMode?.id)return;remember();const {kind,id}=itemMode;if(kind==='node'){graph.nodes=graph.nodes.filter(n=>n.id!==id);graph.edges=graph.edges.filter(e=>e.from!==id&&e.to!==id);}else graph.edges=graph.edges.filter(e=>e.id!==id);selected='';save();render();$('item-dialog').close();feedback('הפריט נמחק. אפשר לשחזר בצעד אחורה.');});
  $('undo').addEventListener('click',()=>{if(!history.length)return;graph=history.pop();selected='';save();render();feedback('חזרנו צעד אחד בבנייה.');});
  $('self-check').addEventListener('click',()=>openDialog('check-dialog'));$('more-tools').addEventListener('click',()=>openDialog('tools-dialog'));
  $('open-task').addEventListener('click',()=>openDialog('task-dialog'));$('open-notes').addEventListener('click',()=>openDialog('notes-dialog','explanation'));
  $('open-list').addEventListener('click',()=>{const list=$('selection-list');list.replaceChildren();if(!graph.nodes.length)list.textContent='עדיין אין פריטים בגרף.';
    for(const [kind,items] of [['node',graph.nodes],['edge',graph.edges]])for(const item of items){const b=document.createElement('button');b.type='button';let title=(kind==='node'?'צומת: ':'קשת: ')+item.label;if(kind==='edge')title+=' (\u2066'+graph.nodes.find(n=>n.id===item.from).label+' → '+graph.nodes.find(n=>n.id===item.to).label+'\u2069)';b.textContent=title;b.addEventListener('click',()=>{selected=kind+':'+item.id;render();editItem();});list.append(b);}openDialog('list-dialog');});
  $('reset').addEventListener('click',()=>openDialog('clear-dialog'));$('confirm-clear').addEventListener('click',()=>{remember();graph={nodes:[],edges:[]};selected='';save();render();$('clear-dialog').close();feedback('הגרף נוקה. אפשר לשחזר בצעד אחורה.');});
  $('task').addEventListener('change',()=>{save();task=$('task').value;load();save();feedback('הבנייה לכל משימה נשמרת בנפרד.');});
  $('explanation').addEventListener('input',()=>{explanation=$('explanation').value;save();});
  function point(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());}
  svg.addEventListener('click',e=>{if(suppressClick){suppressClick=false;return;}if(e.target.closest('[data-node],[data-edge]'))return;if(graph.nodes.length>=24){feedback('אפשר להוסיף עד 24 צמתים.','error');return;}const p=point(e);prepareItem('node',null,[Math.min(760,Math.max(40,p.x)),Math.min(410,Math.max(70,p.y))]);});
  svg.addEventListener('pointerdown',e=>{const group=e.target.closest('[data-node]');if(!group||e.button!==0)return;const n=graph.nodes.find(n=>n.id===group.dataset.node),p=point(e);drag={id:n.id,x:p.x,y:p.y,dx:p.x-n.x,dy:p.y-n.y,moved:false,before:copy(graph)};});
  svg.addEventListener('pointermove',e=>{if(!drag)return;const p=point(e);if(!drag.moved&&Math.hypot(p.x-drag.x,p.y-drag.y)<4)return;if(!drag.moved){svg.setPointerCapture(e.pointerId);history.push(drag.before);if(history.length>60)history.shift();drag.moved=true;}const n=graph.nodes.find(n=>n.id===drag.id);n.x=Math.min(760,Math.max(40,p.x-drag.dx));n.y=Math.min(410,Math.max(70,p.y-drag.dy));draw();});
  function endDrag(){if(!drag)return;if(drag.moved){suppressClick=true;setTimeout(()=>{suppressClick=false;},0);selected='node:'+drag.id;save();render();feedback('הצומת הוזז.');}drag=null;}
  $('fullscreen').hidden=!document.fullscreenEnabled;
  $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('fullscreen').textContent='מסך מלא לא זמין';}});
  document.addEventListener('fullscreenchange',()=>{const active=!!document.fullscreenElement;$('fullscreen').textContent=active?'יציאה ממסך מלא':'מסך מלא';$('fullscreen').setAttribute('aria-pressed',String(active));keepDialogVisible();});
  svg.addEventListener('pointerup',endDrag);svg.addEventListener('pointercancel',endDrag);load();
})();
