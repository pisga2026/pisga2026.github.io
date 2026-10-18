(()=>{
 'use strict';
 // Exact card order and visible card numbers from lesson-4/dna-hard.html.
 const hard=['CCC','TCT','ACA','AGC','AGC','CTA','CTC','TCT','CTG','GAC','GCA','TCT','AAG','TTC','CTT','CAG','ATC','CTT','AGA','ACA','GCG','ATC','TTC','ACT','GAT','AAC','CGA','TAC','CAA','TCG','CCA','CAG','CGC','GCT','TCC','CAA'];
 const positions={"CC":[349,272],"TC":[219,185],"CT":[270,376],"AC":[715,467],"CA":[483,363],"AG":[770,250],"GC":[560,261],"TA":[489,480],"TG":[60,391],"GA":[940,184],"AA":[691,355],"TT":[141,286],"AT":[464,60],"CG":[583,151]};
 window.DNADemos={original:{parts:window.DNAModel.examples.original,viewBox:'70 55 650 360'},hard:{parts:hard,positions,viewBox:'0 0 1000 550'}};
})();
