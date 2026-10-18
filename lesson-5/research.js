(()=>{
  'use strict';let alternate=false;
  document.getElementById('shuffle-bases').addEventListener('click',()=>{
    alternate=!alternate;const seq=alternate?'AGTCA':'ATGCA',row=document.getElementById('base-row');
    row.replaceChildren(...[...seq].map(b=>{const span=document.createElement('span');span.className='base-letter base-'+b.toLowerCase();span.textContent=b;return span;}));
    row.setAttribute('aria-label','הרצף '+seq);document.getElementById('base-feedback').textContent='הרצף עכשיו: '+seq+'. אותן אותיות, סדר '+(alternate?'שונה.':'מקורי.');
  });
  document.querySelectorAll('[data-explainer]').forEach(button=>{
    const dialog=document.getElementById(button.dataset.explainer);if(!dialog)return;
    button.addEventListener('click',()=>{if(!dialog.open)dialog.showModal();});
    dialog.querySelector('.close-explainer').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>button.focus({preventScroll:true}));
    dialog.addEventListener('keydown',event=>{
      if(event.key!=='Tab')return;
      const controls=[...dialog.querySelectorAll('button:not([disabled])')],first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
    dialog.addEventListener('click',event=>{
      if(event.target!==dialog)return;const bounds=dialog.getBoundingClientRect();
      if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)dialog.close();
    });
  });
})();
