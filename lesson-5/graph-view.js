(function(){
  'use strict';
  const ns='http://www.w3.org/2000/svg';let instance=0;
  const el=(tag,attrs={},text)=>{const n=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text!==undefined)n.textContent=text;return n;};
  window.drawDNAGraph=function(svg,graph,options={}){
    svg.replaceChildren();svg.setAttribute('viewBox','0 0 800 460');const id='arrow-'+(++instance);
    const defs=el('defs');for(const [suffix,color] of [['','#263e61'],['-used','#15764d'],['-selected','#9c3351']]){const marker=el('marker',{id:id+suffix,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto'});marker.append(el('path',{d:'M 0 0 L 10 5 L 0 10 Z',fill:color}));defs.append(marker);}svg.append(defs);
    const used=new Set(options.used||[]);
    for(const edge of graph.edges){
      const a=graph.nodes.find(n=>n.id===edge.from),b=graph.nodes.find(n=>n.id===edge.to);if(!a||!b)continue;
      const siblings=graph.edges.filter(e=>(e.from===edge.from&&e.to===edge.to)||(e.from===edge.to&&e.to===edge.from));const index=siblings.indexOf(edge);let d,lx,ly;
      if(a.id===b.id){const r=52+index*23;d=`M ${a.x-22} ${a.y-20} C ${a.x-r-35} ${a.y-r-65}, ${a.x+r+35} ${a.y-r-65}, ${a.x+22} ${a.y-20}`;lx=a.x;ly=a.y-r-34;}
      else {const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
        // A canonical normal separates parallel and opposing directed edges.
        const sign=a.id<b.id?1:-1,offset=(index-(siblings.length-1)/2)*65;
        const cx=(a.x+b.x)/2-uy*offset*sign,cy=(a.y+b.y)/2+ux*offset*sign;
        const sdx=cx-a.x,sdy=cy-a.y,sl=Math.hypot(sdx,sdy)||1,edx=b.x-cx,edy=b.y-cy,ee=Math.hypot(edx,edy)||1;
        d=`M ${a.x+sdx/sl*33} ${a.y+sdy/sl*33} Q ${cx} ${cy} ${b.x-edx/ee*38} ${b.y-edy/ee*38}`;
        lx=(a.x+2*cx+b.x)/4;ly=(a.y+2*cy+b.y)/4-12;
      }
      const selected=options.selected==='edge:'+edge.id,group=el('g',{'class':'edge-group'+(used.has(edge.id)?' used':'')+(selected?' selected':''),'data-edge':edge.id});
      if(options.onEdge){group.setAttribute('role','button');group.setAttribute('tabindex','0');group.setAttribute('aria-label',`קשת ${edge.label}, מ־${a.label} אל ${b.label}${used.has(edge.id)?', כבר בשימוש':''}`);group.addEventListener('click',()=>options.onEdge(edge.id));group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();options.onEdge(edge.id);}});}
      group.append(el('path',{d,'class':'edge-line','marker-end':`url(#${id+(selected?'-selected':used.has(edge.id)?'-used':'')})`}),el('path',{d,'class':'edge-hit'}),el('text',{x:lx,y:ly,'text-anchor':'middle','class':'edge-text'},edge.label+(siblings.filter(e=>e.label===edge.label).length>1?' #'+(graph.edges.indexOf(edge)+1):'')));svg.append(group);
    }
    for(const node of graph.nodes){const selected=options.selected==='node:'+node.id,g=el('g',{'class':'node-group'+(selected?' selected':'')+(options.current===node.id?' current':''),'data-node':node.id,transform:`translate(${node.x},${node.y})`});
      if(options.onNode){g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label','צומת '+node.label);g.addEventListener('click',()=>options.onNode(node.id));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();options.onNode(node.id);}});}
      g.append(el('circle',{r:32,'class':'node-circle'}),el('text',{y:7,'text-anchor':'middle','class':'node-label',style:node.label.length>4?'font-size:'+Math.max(7,76/node.label.length)+'px':''},node.label));svg.append(g);
    }
  };
})();
