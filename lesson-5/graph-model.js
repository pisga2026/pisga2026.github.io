(function(root){
  'use strict';
  const examples={small:['TGC','GAT','TGA','ATG'],original:['TGC','ATG','GCA','GAT','TGA','ATG']};
  function fromParts(parts){
    const labels=[...new Set(parts.flatMap(p=>[p.slice(0,-1),p.slice(1)]))];
    const positions={AT:[150,135],TG:[380,135],GA:[255,350],GC:[620,135],CA:[620,350]};
    return {nodes:labels.map((label,i)=>({id:'n'+i,label,x:(positions[label]||[120+i*130,230])[0],y:(positions[label]||[120+i*130,230])[1]})),edges:parts.map((label,i)=>({id:'e'+i,label,from:'n'+labels.indexOf(label.slice(0,-1)),to:'n'+labels.indexOf(label.slice(1))}))};
  }
  function degrees(graph){return graph.nodes.map(n=>({id:n.id,label:n.label,in:graph.edges.filter(e=>e.to===n.id).length,out:graph.edges.filter(e=>e.from===n.id).length}));}
  function euler(graph,preferredStart){
    if(!graph.edges.length)return {error:'הגרף עדיין אינו מכיל קשתות.'};
    const ds=degrees(graph),active=ds.filter(n=>n.in+n.out),starts=ds.filter(n=>n.out-n.in===1),ends=ds.filter(n=>n.in-n.out===1);
    if(ds.some(n=>Math.abs(n.out-n.in)>1)||!((!starts.length&&!ends.length)||(starts.length===1&&ends.length===1)))return {error:'מאזן הכניסות והיציאות אינו מתאים למסלול אוילר.'};
    const seen=new Set([active[0].id]);let changed=true;
    while(changed){changed=false;for(const e of graph.edges)if(seen.has(e.from)||seen.has(e.to)){if(!seen.has(e.from)||!seen.has(e.to))changed=true;seen.add(e.from);seen.add(e.to);}}
    if(active.some(n=>!seen.has(n.id)))return {error:'יש קשתות בחלקים נפרדים של הגרף.'};
    if(preferredStart&&((starts.length&&starts[0].id!==preferredStart)||!active.some(n=>n.id===preferredStart)))return {error:'מהצומת הנוכחי אין מסלול שמשתמש בכל הקשתות שנותרו. חזרו לבחירה קודמת.'};
    const start=preferredStart||starts[0]?.id||active[0].id,used=new Set(),stack=[{node:start,edge:null}],reverse=[];
    while(stack.length){const top=stack[stack.length-1],edge=graph.edges.find(e=>e.from===top.node&&!used.has(e.id));if(edge){used.add(edge.id);stack.push({node:edge.to,edge:edge.id});}else reverse.push(stack.pop());}
    reverse.reverse();
    if(used.size!==graph.edges.length)return {error:'לא נמצאה דרך להשתמש בכל הקשתות.'};
    return {start,edges:reverse.slice(1).map(s=>s.edge),nodes:reverse.map(s=>s.node)};
  }
  function spell(graph,edgeIds){if(!edgeIds.length)return '';const es=edgeIds.map(id=>graph.edges.find(e=>e.id===id));return es[0].label+es.slice(1).map(e=>e.label.slice(-1)).join('');}
  function checkAssembly(graph,parts){
    const labels=graph.nodes.map(n=>n.label.trim().toUpperCase());
    if(new Set(labels).size!==labels.length)return {ok:false,message:'אותו רצף צריך להיות צומת משותף אחד. בדקו צמתים בעלי שם זהה.'};
    const expected=parts.map(p=>p.slice(0,-1)+'|'+p+'|'+p.slice(1)).sort();
    const actual=graph.edges.map(e=>{const a=graph.nodes.find(n=>n.id===e.from),b=graph.nodes.find(n=>n.id===e.to);return (a?.label.trim().toUpperCase()||'')+'|'+e.label.trim().toUpperCase()+'|'+(b?.label.trim().toUpperCase()||'');}).sort();
    if(expected.length!==actual.length)return {ok:false,message:'בדקו את מספר הקשתות: לכל כרטיס מקטע נדרשת קשת נפרדת, גם אם מופיע כרטיס זהה.'};
    if(expected.some((v,i)=>v!==actual[i]))return {ok:false,message:'בדקו את שמות הצמתים, את כיוון החצים ואת שמות הקשתות: כל מקטע מחבר את הזוג הראשון שלו לזוג האחרון.'};
    const needed=new Set(parts.flatMap(p=>[p.slice(0,-1),p.slice(1)]));
    if(labels.length!==needed.size||labels.some(l=>!needed.has(l)))return {ok:false,message:'יש צמתים שאינם נחוצים למקטעים האלה. בדקו את זוגות האותיות.'};
    return {ok:true,message:'הגרף מתאים לכל המקטעים! עכשיו הסבירו: איזו משימת מסלול תשתמש בכל מקטע בדיוק פעם אחת?'};
  }
  const api={examples,fromParts,degrees,euler,spell,checkAssembly};root.DNAModel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
