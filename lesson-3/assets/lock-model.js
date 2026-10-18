'use strict';
(function(root){
  const codes8=['35','71','22','64','58','17','33','46','82','11','53','77','28','61','44','85','14','32','67','55','41','88','76','23','47','52','16','83','66','25','74','38','72'];
  function config(size='open8'){
    if(size==='open8')return {keys:[...'12345678'],codes:[...codes8]};
    if(size==='open10'){
      const groups=['01467','23589'];
      const codes=groups.flatMap(g=>[...g].flatMap(a=>[...g].map(b=>a+b))).concat('72');
      // Stable mixing, so changing the setting never changes the code list order.
      let seed=917;for(let i=codes.length-1;i>0;i--){seed=(seed*1664525+1013904223)>>>0;const j=seed%(i+1);[codes[i],codes[j]]=[codes[j],codes[i]];}
      return {keys:[...'0123456789'],codes};
    }
    throw Error('Unknown lock configuration');
  }
  function createModel(size='open8'){
    const {keys,codes}=config(size),valid=new Set(codes),digits=[];
    function snapshot(){
      const seen=new Set(),previous=new Set();
      for(let i=1;i<digits.length;i++){const pair=digits[i-1]+digits[i];if(valid.has(pair))seen.add(pair);if(i<digits.length-1)previous.add(pair);}
      const current=digits.length>1?digits.slice(-2).join(''):'';
      let kind=digits.length?'first':'empty';
      if(current)kind=!valid.has(current)?'invalid':previous.has(current)?'repeat':'new';
      if(seen.size===valid.size)kind='complete';
      return {sequence:digits.join(''),current,presses:digits.length,covered:seen.size,checked:[...seen],total:valid.size,kind};
    }
    return {keys,codes,snapshot,press(d){d=String(d);if(keys.includes(d))digits.push(d);return snapshot();},undo(){digits.pop();return snapshot();},reset(){digits.length=0;return snapshot();}};
  }
  root.LessonLock={config,createModel};if(typeof module!=='undefined')module.exports=root.LessonLock;
})(typeof window!=='undefined'?window:globalThis);
