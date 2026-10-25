/* A touch-first view of the same translation form and provider contract. */
(function () {
  const root=document.documentElement,compact=matchMedia('(max-width:900px)');
  const form=document.querySelector('#translation-form');if(!form)return;
  const source=document.querySelector('#from_language'),target=document.querySelector('#to_language');
  const input=document.querySelector('#input'),output=document.querySelector('#output');
  const sourcePanel=document.querySelector('.editor-source'),resultPanel=document.querySelector('.editor-result');
  const shareAction=document.querySelector('.share-action'),shareMarker=document.createComment('desktop share position');shareAction.before(shareMarker);
  let view='write',previousResult='',recent=[],pickerSelect=null,returnFocus=null,baselineHeight=0,keyboardSeen=false;
  try{const value=JSON.parse(localStorage.getItem('sp.translate.recent-languages')||'[]');if(Array.isArray(value))recent=value.filter(c=>typeof c==='string').slice(0,6);}catch{}
  const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el;};
  const status=(text,error=false)=>{const el=document.querySelector('#translation-status');el.textContent=text;el.className='message'+(error?' is-error':'');};
  function button(label,cls,fn){const b=node('button',cls,label);b.type='button';b.addEventListener('click',fn);return b;}
  const done=button('Done','mobile-only mobile-keyboard-done',()=>input.blur());document.querySelector('.topbar-actions').append(done);

  const tabs=node('div','mobile-editor-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Translation view');
  const write=button('Write','',()=>setView('write')),result=button('Translation','',()=>setView('result'));
  write.id='mobile-write-tab';result.id='mobile-result-tab';sourcePanel.id='source-panel';resultPanel.id='result-panel';
  for(const [tab,panel] of [[write,sourcePanel],[result,resultPanel]]){tab.setAttribute('role','tab');tab.setAttribute('aria-controls',panel.id);}
  tabs.append(write,result);document.querySelector('.language-strip').after(tabs);
  tabs.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();const tab=event.key==='Home'?write:event.key==='End'?result:document.activeElement===write?result:write;
    if(!tab.disabled){tab.click();tab.focus();}
  });
  const edit=button('Edit original →','mobile-edit-original',()=>{setView('write');input.focus({preventScroll:true});});document.querySelector('.workspace-bottom').append(edit);
  function setView(next,{focus=false}={}){
    view=next==='result'&&output.value?'result':'write';root.dataset.mobileView=view;
    for(const [tab,panel,active] of [[write,sourcePanel,view==='write'],[result,resultPanel,view==='result']]){
      tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
      panel.hidden=compact.matches&&!active;
      if(compact.matches){panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);}
      else{panel.removeAttribute('role');panel.setAttribute('aria-labelledby',panel===sourcePanel?'source-title':'result-title');}
    }
    if(focus&&compact.matches){const heading=document.querySelector('#result-title');heading.tabIndex=-1;heading.focus({preventScroll:true});}
  }
  const linkOptions=node('details','mobile-link-options'),linkSummary=node('summary','','Link with original text');linkOptions.append(linkSummary);resultPanel.append(linkOptions);

  // Native dialog gives us focus containment and system Escape behaviour.
  const sheet=node('dialog','language-sheet');sheet.setAttribute('aria-labelledby','mobile-sheet-title');
  const head=node('div','language-sheet-header'),title=node('h2','','');title.id='mobile-sheet-title';
  const close=button('×','language-sheet-close',()=>sheet.close());close.setAttribute('aria-label','Close panel');close.autofocus=true;
  const body=node('div','language-sheet-body');head.append(title,close);sheet.append(head,body);document.body.append(sheet);
  sheet.addEventListener('close',()=>{if(!sheet.open&&returnFocus?.isConnected)returnFocus.focus({preventScroll:true});pickerSelect=null;});
  sheet.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();sheet.close();}});
  sheet.addEventListener('click',e=>{const r=sheet.getBoundingClientRect();if(e.target===sheet&&(e.clientY<r.top||e.clientX<r.left||e.clientX>r.right))sheet.close();});
  function showSheet(label,trigger){returnFocus=trigger;title.textContent=label;body.replaceChildren();sheet.showModal();}
  const pickerButtons=new Map();
  for(const [select,label] of [[source,'Translate from'],[target,'Translate to']]){
    const choice=button('','language-picker-button',()=>openPicker(select,choice,label));
    choice.setAttribute('aria-haspopup','dialog');choice.dataset.pickerLabel=label;choice.setAttribute('aria-label',label);choice.setAttribute('aria-describedby',select===source?'detected-language':'to-label');
    const name=node('span');choice.append(name);choice.insertAdjacentHTML('beforeend','<svg viewBox="0 0 12 12" aria-hidden="true"><path d="m2 4 4 4 4-4"/></svg>');select.after(choice);pickerButtons.set(select,choice);
  }
  function openPicker(select,trigger,label){
    pickerSelect=select;showSheet(label,trigger);
    const fieldLabel=node('label','visually-hidden','Search languages');fieldLabel.htmlFor='mobile-language-search';
    const search=node('input','language-search');search.id='mobile-language-search';search.type='search';search.placeholder='Search languages';search.autocomplete='off';
    const list=node('div','language-list'),empty=node('p','language-empty','No matching language.');empty.hidden=true;body.append(fieldLabel,search,list,empty);
    const options=[...select.options].filter(o=>o.value);
    const ordered=[...options].sort((a,b)=>{
      const rank=o=>o.value===select.value?-2:recent.includes(o.value)?recent.indexOf(o.value):99;
      return rank(a)-rank(b)||a.textContent.localeCompare(b.textContent);
    });
    function filter(){
      const q=search.value.trim().toLocaleLowerCase();list.replaceChildren();
      for(const option of ordered){
        if(![option.textContent,option.value].join(' ').toLocaleLowerCase().includes(q))continue;
        const item=button('','language-option',()=>{
          select.value=option.value;recent=[option.value,...recent.filter(c=>c!==option.value)].slice(0,6);
          try{localStorage.setItem('sp.translate.recent-languages',JSON.stringify(recent));}catch{}
          select.dispatchEvent(new Event('change',{bubbles:true}));refresh();sheet.close();
        });item.setAttribute('aria-pressed',String(option.value===select.value));item.append(node('span','',option.textContent),node('small','',option.value));list.append(item);
      }empty.hidden=Boolean(list.children.length);
    }search.addEventListener('input',filter);filter();
  }

  const paste=button('Paste','text-button mobile-only',async()=>{
    try{
      if(!navigator.clipboard?.readText)throw Error('Unavailable');const text=await navigator.clipboard.readText();
      if(text){input.value=text;input.dispatchEvent(new Event('input',{bubbles:true}));}input.focus({preventScroll:true});
    }catch{status('Touch and hold in the writing area to paste.');input.focus({preventScroll:true});}
  });document.querySelector('.editor-source .result-actions').prepend(paste);
  const nativeShare=button('Share','text-button mobile-only',async()=>{
    const text=output.value;if(!text)return;
    try{
      if(!navigator.share)throw Error('Unavailable');await navigator.share({title:'Translation / Sync_Pundit',text});
    }catch(error){
      if(error.name==='AbortError')return;
      showSheet('Share translation',nativeShare);
      const label=node('label','share-help','Select and copy your translated text.');label.htmlFor='mobile-share-text';
      const value=node('textarea','share-textarea');value.id='mobile-share-text';value.readOnly=true;value.value=text;
      body.append(label,value,button('Select text','language-option',()=>{value.focus();value.select();}));
    }
  });nativeShare.disabled=true;document.querySelector('.editor-result .result-actions').append(nativeShare);
  // A failed clipboard write still leaves an actionable selectable share link.
  document.addEventListener('translate:copy-failed',event=>{
    if(!compact.matches)return;
    if(event.detail.kind==='result'){output.focus({preventScroll:true});output.select();return;}
    const link=document.querySelector('#share-url').value;if(!link)return;
    showSheet('Link with original text',document.querySelector('#copy-share'));
    const label=node('label','share-help','This link includes your original text. Select it to copy.');label.htmlFor='mobile-share-text';
    const value=node('textarea','share-textarea');value.id='mobile-share-text';value.readOnly=true;value.value=link;
    body.append(label,value,button('Select link','language-option',()=>{value.focus();value.select();}));
  });

  function refresh(){
    for(const [select,b] of pickerButtons){b.firstElementChild.textContent=select.selectedOptions[0]?.textContent||'Loading languages';b.setAttribute('aria-label',b.dataset.pickerLabel+': '+b.firstElementChild.textContent);b.disabled=!select.value;}
    result.disabled=!output.value;nativeShare.disabled=!output.value;
    if(output.value&&output.value!==previousResult&&compact.matches){input.blur();setView('result',{focus:true});}
    else if(!output.value&&view==='result')setView('write');
    previousResult=output.value;setView(view);
  }
  document.addEventListener('translate:state',refresh);
  new MutationObserver(refresh).observe(source,{childList:true,subtree:true});
  function layout(){
    root.classList.toggle('mobile-ready',compact.matches);
    if(compact.matches)linkOptions.append(shareAction);else{shareMarker.after(shareAction);if(sheet.open)sheet.close();}
    refresh();syncViewport();
  }
  // Keyboard layout changes only after actual viewport occlusion, never on touchstart.
  function syncViewport(){
    const vv=window.visualViewport,zoomed=(vv?.scale||1)>1.05;
    const height=zoomed?innerHeight:(vv?.height||innerHeight),top=zoomed?0:(vv?.offsetTop||0);
    const focused=document.activeElement===input;
    if(!keyboardSeen&&!focused)baselineHeight=height;
    if(focused&&baselineHeight-height>120&&!zoomed)keyboardSeen=true;
    if(keyboardSeen&&height>=baselineHeight-80)keyboardSeen=false;
    root.classList.toggle('is-typing',compact.matches&&keyboardSeen);
    root.style.setProperty('--translate-height',Math.round(height)+'px');root.style.setProperty('--translate-top',Math.round(top)+'px');
    root.style.setProperty('--translate-keyboard-inset',(zoomed?0:Math.max(0,Math.round(innerHeight-height-top)))+'px');
  }
  input.addEventListener('focus',()=>{if(!baselineHeight)baselineHeight=visualViewport?.height||innerHeight;syncViewport();});
  input.addEventListener('blur',syncViewport);
  visualViewport?.addEventListener('resize',syncViewport,{passive:true});visualViewport?.addEventListener('scroll',syncViewport,{passive:true});window.addEventListener('resize',syncViewport,{passive:true});
  compact.addEventListener('change',layout);layout();
})();
