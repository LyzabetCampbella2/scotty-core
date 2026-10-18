import {test,expect} from 'bun:test';
import {documentText} from './project-documents.ts';
test('Google document text includes tabs and paragraphs without metadata or instructions',()=>{const r=documentText('googledocs',{title:'Metadata title',tabs:[{documentTab:{body:{content:[{paragraph:{elements:[{textRun:{content:'Approved paragraph'}}]}}]}}}]});expect(r.body).toBe('Approved paragraph');expect(r.partial).toBe(false);});
test('Notion nested or paginated content is explicitly partial',()=>{const r=documentText('notion',{has_more:true,results:[{type:'paragraph',has_children:true,paragraph:{rich_text:[{plain_text:'Visible text'}]}}]});expect(r.body).toBe('Visible text');expect(r.partial).toBe(true);});
test('empty and oversized documents cannot silently become complete evidence',()=>{expect(()=>documentText('googledocs',{title:'Reference only'})).toThrow('No readable');expect(()=>documentText('googledocs',{textRun:{content:'x'.repeat(24001)}})).toThrow('24,000');});
