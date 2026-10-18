/* The large demo uses a stable layout and small arrows, independent of stroke width. */
(()=>{
 'use strict';
 window.drawDNADemoGraph=(svg,graph,options)=>{
  window.drawDNAGraph(svg,graph,options);
  const complete=options.layoutGraph;if(!complete)return;
  svg.querySelectorAll('marker').forEach(m=>{m.setAttribute('markerUnits','userSpaceOnUse');m.setAttribute('markerWidth','10');m.setAttribute('markerHeight','10');});
  svg.querySelectorAll('.node-circle').forEach(c=>c.setAttribute('r','25'));
  const labels=[];
  for(const edge of graph.edges){
   const group=svg.querySelector('[data-edge="'+edge.id+'"]'),a=complete.nodes.find(n=>n.id===edge.from),b=complete.nodes.find(n=>n.id===edge.to);
   const siblings=complete.edges.filter(e=>(e.from===a.id&&e.to===b.id)||(e.from===b.id&&e.to===a.id)),index=siblings.indexOf(edge);
   let d,point;
   if(a.id===b.id){
    const r=45+index*18;d=`M ${a.x-18} ${a.y-18} C ${a.x-r-22} ${a.y-r-50}, ${a.x+r+22} ${a.y-r-50}, ${a.x+18} ${a.y-18}`;
    point=t=>({x:a.x+(t-.5)*70,y:a.y-r-23,nx:0,ny:-1});
   }else{
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),offset=(index-(siblings.length-1)/2)*28*(a.id<b.id?1:-1);
    const cx=(a.x+b.x)/2-dy/len*offset,cy=(a.y+b.y)/2+dx/len*offset;
    const sl=Math.hypot(cx-a.x,cy-a.y),el=Math.hypot(b.x-cx,b.y-cy),sx=a.x+(cx-a.x)/sl*27,sy=a.y+(cy-a.y)/sl*27,ex=b.x-(b.x-cx)/el*31,ey=b.y-(b.y-cy)/el*31;
    d=`M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
    point=t=>{const u=1-t,tx=2*u*(cx-sx)+2*t*(ex-cx),ty=2*u*(cy-sy)+2*t*(ey-cy),l=Math.hypot(tx,ty);return {x:u*u*sx+2*u*t*cx+t*t*ex,y:u*u*sy+2*u*t*cy+t*t*ey,nx:-ty/l,ny:tx/l};};
   }
   group.querySelectorAll('path').forEach(p=>p.setAttribute('d',d));
   const label=group.querySelector('.edge-text');
   label.textContent=edge.label+' #'+(complete.edges.indexOf(edge)+1);
   labels.push({label,point,selected:group.classList.contains('selected')});
  }
  // Put labels close to their own edges, avoiding nodes and other labels.
  const occupied=[];
  labels.sort((a,b)=>Number(b.selected)-Number(a.selected));
  for(const {label,point} of labels){
   let chosen=null;
   for(const offset of [-10,12,-24,26,-38,40,-52,54,-66,68,-80,82]){
    for(const t of [.5,.35,.65,.22,.78,.12,.88]){
     const p=point(t),x=p.x+p.nx*offset,y=p.y+p.ny*offset;
     label.setAttribute('x',x);label.setAttribute('y',y);const r=label.getBBox();
     if(r.x<8||r.y<5||r.x+r.width>992||r.y+r.height>540)continue;
     if(complete.nodes.some(n=>{const xx=Math.max(r.x,Math.min(n.x,r.x+r.width)),yy=Math.max(r.y,Math.min(n.y,r.y+r.height));return Math.hypot(n.x-xx,n.y-yy)<33;}))continue;
     if(occupied.some(q=>r.x<q.x+q.width+5&&r.x+r.width+5>q.x&&r.y<q.y+q.height+4&&r.y+r.height+4>q.y))continue;
     chosen={x,y,box:{x:r.x,y:r.y,width:r.width,height:r.height}};break;
    }if(chosen)break;
   }
   if(chosen){label.setAttribute('x',chosen.x);label.setAttribute('y',chosen.y);occupied.push(chosen.box);}
   else{const p=point(.5);label.setAttribute('x',p.x);label.setAttribute('y',p.y-10);}
  }
 };
})();
