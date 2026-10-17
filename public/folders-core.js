(function(root){
 const cleanName=v=>String(v||'').trim().replace(/[.!?]+$/,'').replace(/^["“”]+|["“”]+$/g,'').trim();
 const norm=v=>cleanName(v).toLowerCase();
 function resolve(rows,name){const query=norm(name).replace(/^["“]|["”]$/g,'');const exact=rows.filter(r=>norm(r.id)===query||norm(r.name)===query||norm(r.fullPath)===query);if(exact.length===1)return exact[0];if(exact.length>1)throw Error('More than one item is named '+name+'. Use its full folder path.');throw Error('No item named '+name+'.');}
 function parse(text){const s=String(text).trim().replace(/^(?:hey\s+)?scott(?:y|ie)[,\s]+/i,'').replace(/[.!?]+$/,'').replace(/ (inside|in|under) this folder$/i,' $1 folder this').replace(/^(create|make|add) (?:a |an )?new /i,'$1 ');let m;
 if((m=s.match(/^(?:create|make|add) (?:a |an |new )?(?:project )?folder(?: called| named)? (.+?)(?: (?:inside|in|under) (?:the )?folder (.+)| in (?:the )?project (.+))?$/i)))return {kind:'create',name:m[1],parent:m[2],project:m[3]};
 if((m=s.match(/^(?:create|make|add) (?:a |new )?project(?: called| named)? (.+)$/i)))return {kind:'project',name:m[1]};
 if(/^(?:create|make|add) (?:a |new )?(project|folder)$/i.test(s))return {kind:'name-needed',type:/project$/i.test(s)?'project':'folder'};
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
 const api={norm,resolve,parse,cleanName};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.SCOTTYFoldersCore=api;
})(typeof window!=='undefined'?window:globalThis);
