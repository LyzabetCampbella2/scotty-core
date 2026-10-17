(function(root){
 const cleanName=v=>String(v||'').trim().replace(/[.!?]+$/,'').replace(/^["“”]+|["“”]+$/g,'').trim();
 const norm=v=>cleanName(v).toLowerCase();
 function resolve(rows,name){const query=norm(name).replace(/^["“]|["”]$/g,'');const exact=rows.filter(r=>norm(r.id)===query||norm(r.name)===query||norm(r.fullPath)===query);if(exact.length===1)return exact[0];if(exact.length>1)throw Error('More than one item is named '+name+'. Use its full folder path.');throw Error('No item named '+name+'.');}
 function parse(text){const s=String(text).trim().replace(/^(?:hey\s+)?scott(?:y|ie)[,\s]+/i,'').replace(/[.!?]+$/,'').replace(/ (inside|in|under) this folder$/i,' $1 folder this').replace(/^(create|make|add) (?:a |an )?new /i,'$1 ');let m;
 if((m=s.match(/^(?:create|make|add) (?:a |an |new )?(?:project )?folder(?: called| named)? (.+?)(?: (?:inside|in|under) (?:the )?folder (.+)| in (?:the )?project (.+))?$/i)))return {kind:'create',name:m[1],parent:m[2],project:m[3]};
 if((m=s.match(/^(?:create|make|add) (?:a |new )?project(?: called| named)? (.+)$/i)))return {kind:'project',name:m[1]};
 if(/^(?:create|make|add) (?:a |new )?(project folder|project|folder)$/i.test(s))return {kind:'name-needed',type:/project$/i.test(s)?'project':'folder'};
 if((m=s.match(/^(?:change|set) (?:the |this folder's |its )?name (?:to|as) (.+)$/i))|| (m=s.match(/^(?:rename|label|call|name) (?:it|that|this folder|this|the selected folder) (?:to |as )?(.+)$/i)))return {kind:'rename',source:'this',name:m[1]};
 if(/^(?:rename|label) (?:it|this|that|this folder|the folder|the selected folder)$/i.test(s))return {kind:'rename-needed',source:'this'};
 if((m=s.match(/^(?:rename|label) (?:the )?(?:folder (.+?)|this(?: folder)?) (?:to|as) (.+)$/i)))return {kind:'rename',source:m[1]||'this',name:m[2]};
 if((m=s.match(/^(?:move|put) (?:the )?(folder|file) (.+?) (?:into|inside|in|to) (?:the )?folder (.+)$/i)))return {kind:'move',type:m[1].toLowerCase(),source:m[2],parent:m[3]};
 if((m=s.match(/^(?:move|put) (?:this|it|that)(?: item| folder| file)? (?:into|inside|in|to) (?:the )?folder (.+)$/i)))return {kind:'move',type:'selected',source:'this',parent:m[1]};
 if((m=s.match(/^(?:open|show|select|find) (?:the |my )?folder (.+)$/i)))return {kind:'open',name:m[1]};
 if(/^(?:open|show) (?:this|that|the selected) folder$/i.test(s))return {kind:'open',name:'this'};
 if(/^(?:open|show) (?:my |the )?(?:folders|folder workspace)$/i.test(s))return {kind:'home'};
 if(/^(?:go (?:up|back)|parent folder)$/i.test(s))return {kind:'up'};
 if((m=s.match(/^(?:upload|add|choose) (?:photos?|videos?|files?)(?: (?:into|to|in) (?:the )?folder (.+))?$/i)))return {kind:'upload',parent:m[1]};
 if((m=s.match(/^add google doc (https:\/\/\S+?) to (?:the )?folder (.+)$/i)))return {kind:'doc',url:m[1],parent:m[2]};
 if((m=s.match(/^add (google doc|apple calendar event) (.+?) to (?:the )?folder (.+)$/i)))return {kind:'connected',provider:/google/i.test(m[1])?'googledocs':'appleplanner',name:m[2],parent:m[3]};
 return null;}
 function itemType(f){if(f.kind==='folder')return 'Folder';if(f.metadata?.source==='scotty-note')return 'Note';if(f.metadata?.source==='apple-calendar')return 'Calendar';if(f.metadata?.source==='google-doc')return 'Google Doc';const mime=f.mimeType||'';if(/^image\//.test(mime))return 'Photo';if(/^video\//.test(mime))return 'Video';if(/^audio\//.test(mime))return 'Audio';if(/pdf|document|text|sheet|presentation/.test(mime))return 'Document';return 'File';}
 function databaseRows(state,id,view={}){let rows=[...state.folders.filter(f=>(f.parentFolderId||null)===id).map(f=>({...f,kind:'folder'})),...state.files.filter(f=>(f.folderId||null)===id).map(f=>({...f,kind:'file'}))].map(f=>({...f,itemType:itemType(f)}));const q=String(view.search||'').toLowerCase();rows=rows.filter(f=>(view.filter==='all'||!view.filter||f.itemType===view.filter)&&(!q||[f.name,f.itemType,f.metadata?.text||''].some(v=>String(v).toLowerCase().includes(q))));const time=f=>Number(new Date(f.updatedAt||f.createdAt||0))||0;return rows.sort((a,b)=>{if(view.group==='type'&&a.itemType!==b.itemType)return a.itemType.localeCompare(b.itemType);if(view.sort==='newest')return time(b)-time(a)||a.name.localeCompare(b.name);if(view.sort==='oldest')return time(a)-time(b)||a.name.localeCompare(b.name);if(view.sort==='size')return Number(b.sizeBytes||0)-Number(a.sizeBytes||0)||a.name.localeCompare(b.name);return (view.sort==='name-desc'?-1:1)*a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'});});}
 const api={norm,resolve,parse,cleanName,itemType,databaseRows};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.SCOTTYFoldersCore=api;
})(typeof window!=='undefined'?window:globalThis);
