(function(root){
 const plain=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const fixed={
  'abre el espacio de voz':'open voice workspace','abre el espacio de trabajo de voz':'open voice workspace','abre los ajustes de idioma':'open language settings','abre los paneles de control':'open control panels',
  'siguiente coincidencia':'next file match','siguiente resultado':'next file match','coincidencia anterior':'previous file match','resultado anterior':'previous file match','repite la coincidencia':'repeat file match','repite el resultado':'repeat file match','primera coincidencia':'first file match','ultima coincidencia':'last file match','abre el archivo de esta coincidencia':'open file match source',
  'confirmar restauracion':'confirm workspace restore','confirma la restauracion':'confirm workspace restore','cancela la restauracion':'cancel workspace restore','guarda el panel':'save control panel preview','guardar el panel':'save control panel preview','cancela el panel':'cancel panel preview',
  'solo subtitulos':'captions only','habla espanol':'speak Spanish','habla japones':'speak Japanese','habla ingles':'speak English','detente':'stop speaking','deja de hablar':'stop speaking',
  '音声ワークスペースを開いて':'open voice workspace','言語設定を開いて':'open language settings','操作パネルを開いて':'open control panels',
  '次の検索結果':'next file match','前の検索結果':'previous file match','検索結果をもう一度読んで':'repeat file match','最初の検索結果':'first file match','最後の検索結果':'last file match','検索結果のファイルを開いて':'open file match source',
  'ワークスペース復元を確認':'confirm workspace restore','復元をキャンセル':'cancel workspace restore','操作パネルを保存':'save control panel preview','パネルをキャンセル':'cancel panel preview','字幕のみ':'captions only','日本語で話して':'speak Japanese','英語で話して':'speak English','スペイン語で話して':'speak Spanish','話すのをやめて':'stop speaking','停止':'stop speaking'
 };
 const aliases=Object.fromEntries(Object.entries(fixed).map(([key,value])=>[plain(key),value]));
 const number=v=>({uno:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10}[plain(v)]||Number(v));
 function normalizeCommand(value){const original=String(value||'').trim(),n=original.replace(/[.!?。！？]+$/,'').trim();if(aliases[plain(n)])return aliases[plain(n)];let m;
  if((m=n.match(/^(?:lee|leer) (?:la )?(?:coincidencia|resultado) (\d+|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)$/i)))return 'read file match '+number(m[1]);
  if((m=n.match(/^検索結果(?:の)?(\d+|[一二三四五六七八九十])(?:番)?を読んで$/)))return 'read file match '+number(m[1]);
  if((m=n.match(/^(?:busca|buscar) (?:dentro de|en) (?:mis |los )?archivos (?:por |sobre )?(.+)$/i)))return 'search inside files for '+m[1];
  if((m=n.match(/^ファイル内で(.+)を検索$/)))return 'search inside files for '+m[1];
  if((m=n.match(/^guarda (?:mi |el )?espacio de trabajo como (.+)$/i)))return 'save workspace as '+m[1];
  if((m=n.match(/^ワークスペースを(.+)として保存$/)))return 'save workspace as '+m[1];
  if((m=n.match(/^(reanuda|restaura|previsualiza) (?:mi |el )?espacio de trabajo (.+)$/i)))return (plain(m[1])==='restaura'?'restore':'resume')+' workspace '+m[2];
  if((m=n.match(/^(.+)のワークスペースを(再開|復元|プレビュー)$/)))return (m[2]==='復元'?'restore':'resume')+' workspace '+m[1];
  if((m=n.match(/^abre (?:el )?panel de control (.+)$/i)))return 'open control panel '+m[1];
  if((m=n.match(/^(.+)の操作パネルを開いて$/)))return 'open control panel '+m[1];
  if((m=n.match(/^(?:read (?:file )?match \d+|(?:next|previous|repeat|first|last) file match|open file match source|confirm workspace restore|save (?:this |the )?control panel(?: preview)?|cancel (?:workspace restore|panel preview|file reading)|captions only|restore English Scotty|use device speech)$/i)))return n;
  return original;
 }
 function stripWake(value){return String(value||'').trim().replace(/^(?:(?:hey|hola)\s+)?(?:scotty|scottie|scoty|scotti)(?=$|[\s,.:;!?-])[,.:;!?\s-]*|^(?:ねえ[、,\s]*)?(?:スコッティ|スコティ)[、,。.:;\s-]*/i,'').trim();}
 function hasWake(value){const n=String(value||'').trim();return stripWake(n)!==n;}
 function isInterruption(value){return /^(?:stop speaking|(?:next|previous|repeat|first|last) file match|read (?:file )?match \d+|cancel (?:workspace restore|panel preview|file reading))$/i.test(normalizeCommand(stripWake(value)));}
 function matchIndex(current,count,action){if(!count)throw Error('Search for passages first.');const index=action==='first'?0:action==='last'?count-1:action==='next'?current+1:action==='previous'?current-1:action==='repeat'?current:Number(action)-1;if(!Number.isInteger(index)||index<0||index>=count)throw Error(action==='repeat'?'Read a displayed match first.':action==='previous'?'There is no earlier match.':action==='next'?'There are no more matches.':'Choose a displayed match number.');return index;}
 function reviewGate(now=()=>Date.now(),thread=()=>null){const slots=new Map();let serial=0;function validate(token,checkThread=true){if(!token||slots.get(token.kind)!==token)throw Error('This preview was cancelled or replaced. Prepare it again.');if(token.state==='done')throw Error('This preview was already applied.');if(token.state==='failed')throw Error('This attempt stopped. Prepare and review a fresh preview.');if(now()>=token.expires||checkThread&&thread()!==token.thread)throw Error('This preview expired or belongs to another conversation. Preview it again.');return token;}
  return {stage(kind,id,label){const old=slots.get(kind);if(old?.state==='running')throw Error('This preview is already being applied. Wait for it to finish.');const token={kind,id,label,serial:++serial,thread:thread(),expires:now()+120000,state:'pending'};slots.set(kind,token);return token;},get(kind){return validate(slots.get(kind));},claim(token){validate(token);if(token.state!=='pending')throw Error('This preview is already being applied.');token.state='running';return token;},assert:validate,finish(token){if(slots.get(token.kind)===token)token.state='done';},fail(token){if(slots.get(token.kind)===token)token.state='failed';},cancel(kind){if(kind)slots.delete(kind);else slots.clear();}};
 }
 root.SCOTTYVoiceWorkspaceCore={normalizeCommand,stripWake,hasWake,isInterruption,matchIndex,reviewGate};
})(typeof window==='undefined'?globalThis:window);
