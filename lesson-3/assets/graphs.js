'use strict';
(function(root){
  const triangle = [[120,290],[300,80],[480,290]];
  const bow = [[100,90],[100,290],[300,190],[500,90],[500,290]];
  const cycle = [[0,1],[1,2],[2,0],[2,3],[3,4],[4,2]];
  const graphs = {
    recallCycle:{v:triangle,e:[[0,1],[1,2],[2,0]],directed:false},
    recallOpen:{v:[[90,190],[240,80],[390,190],[510,290]],e:[[0,1],[1,2],[2,0],[2,3]],directed:false},
    recallNo:{v:[[300,190],[100,90],[500,90],[300,340]],e:[[0,1],[0,2],[0,3]],directed:false},
    definitions:{v:triangle,e:[[0,1],[1,0],[1,2],[2,0],[1,1]],directed:true},
    a:{v:triangle,e:[[0,1],[1,2],[2,0]],directed:true},
    b:{v:[[90,190],[240,80],[390,190],[510,290]],e:[[0,1],[1,2],[2,0],[2,3]],directed:true},
    c:{v:bow,e:[[1,0],[1,2],[2,0],[2,3],[3,4],[4,2]],directed:true},
    d:{v:bow,e:cycle,directed:true},
    e:{v:bow,e:[[0,1],[1,2],[2,3],[3,4],[4,2]],directed:true},
    f:{v:[[300,190],[100,90],[500,90],[300,340]],e:[[0,1],[0,2],[0,3]],directed:true},
    disconnected:{v:[[65,290],[155,90],[245,290],[355,290],[445,90],[535,290]],e:[[0,1],[1,2],[2,0],[3,4],[4,5],[5,3]],directed:true},
  };
  function lockGraph(n){
    const v = n===3 ? [[300,95],[130,305],[470,305]] : Array.from({length:n},(_,i)=>[300+185*Math.cos(-Math.PI/2+i*2*Math.PI/n),210+145*Math.sin(-Math.PI/2+i*2*Math.PI/n)]);
    return {v,e:Array.from({length:n},(_,a)=>Array.from({length:n},(_,b)=>[a,b])).flat(),directed:true,lock:true};
  }
  graphs.lock3=lockGraph(3);graphs.lock4=lockGraph(4);
  const lockData=typeof module!=='undefined'?require('./lock-model.js'):root.LessonLock;
  graphs.openLock={
    v:[[100,170],[730,170],[1000,170],[100,430],[1000,430],[370,430],[370,170],[730,430]],
    e:lockData.config('open8').codes.map(code=>[Number(code[0])-1,Number(code[1])-1]),
    directed:true,lock:true,hideEdgeLabels:true,viewBox:'0 0 1100 600',
    centers:[[235,300],[865,300],[865,300],[235,300],[865,300],[235,300],[235,300],[865,300]]
  };
  function analyse(g){
    const incoming=g.v.map(()=>0),outgoing=g.v.map(()=>0),degree=g.v.map(()=>0);
    g.e.forEach(([a,b])=>{outgoing[a]++;incoming[b]++;degree[a]++;degree[b]++;});
    const active=degree.map((d,i)=>d?i:-1).filter(i=>i>=0),seen=new Set(active.slice(0,1)),todo=active.slice(0,1);
    while(todo.length){const a=todo.pop();for(const [u,v] of g.e){const b=u===a?v:v===a?u:-1;if(b>=0&&!seen.has(b)){seen.add(b);todo.push(b);}}}
    const connected=seen.size===active.length;
    const delta=outgoing.map((d,i)=>d-incoming[i]);
    let kind='none';
    if(connected){if(g.directed){if(delta.every(d=>d===0))kind='cycle';else if(delta.filter(d=>d===1).length===1&&delta.filter(d=>d===-1).length===1&&delta.every(d=>Math.abs(d)<=1))kind='open';}else{const odd=degree.filter(d=>d%2).length;if(odd===0)kind='cycle';else if(odd===2)kind='open';}}
    return {incoming,outgoing,degree,delta,connected,kind};
  }
  function witness(g,start){
    const a=analyse(g);if(a.kind==='none')return null;
    if(start===undefined)start=a.kind==='open'?(g.directed?a.delta.indexOf(1):a.degree.findIndex(d=>d%2)):0;
    const stack=[start],used=new Set(),route=[];
    while(stack.length){const v=stack.at(-1);const i=g.e.findIndex(([x,y],i)=>!used.has(i)&&(x===v||(!g.directed&&y===v)));if(i<0)route.push(stack.pop());else{used.add(i);const[x,y]=g.e[i];stack.push(x===v?y:x);}}
    return route.reverse();
  }
  root.LessonGraphs={graphs,analyse,witness,lockGraph};
  if(typeof module!=='undefined')module.exports=root.LessonGraphs;
})(typeof window!=='undefined'?window:globalThis);
